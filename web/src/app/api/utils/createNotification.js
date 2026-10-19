import sql from "./sql";
import { flushPushOutbox } from "./pushDelivery";
export async function createNotification({
  userId,
  notificationType,
  fromUserId = null,
  message = null,
  communityId = null,
  activityId = null,
  feedPostId = null,
  communityPostId = null,
  targetPath = null,
  eventKey = null,
  deferPush = false,
}) {
  if (!userId || !notificationType || Number(userId) === Number(fromUserId))
    return null;
  const path =
    targetPath ||
    (communityId
      ? `/communities/${communityId}${notificationType === "community_message" ? "?tab=CHAT" : ""}`
      : feedPostId
        ? `/feed/${feedPostId}`
        : fromUserId
          ? `/social/${fromUserId}`
          : "/notifications");
  try {
    // CTE atomically queues push jobs with the in-app notification. Migration is
    // required; request handlers never mutate database schema.
    const rows = await sql(
      `WITH eligible AS (
    SELECT id FROM users u WHERE id=$1
      AND COALESCE((u.notification_settings->>CASE WHEN $2='community_message' THEN 'community_messages' WHEN $2='community_post' THEN 'community_posts' WHEN $2 IN('feed_like','photo_like') THEN 'likes' WHEN $2 IN('feed_comment','community_post_comment') THEN 'comments' ELSE 'friend_requests' END)::boolean,true) AND COALESCE(is_suspended,false)=false
      AND ($5::int IS NULL OR NOT EXISTS(SELECT 1 FROM community_members WHERE community_id=$5 AND user_id=$1 AND muted=true))
      AND ($3::int IS NULL OR NOT EXISTS(SELECT 1 FROM friendships WHERE status='blocked' AND ((user_id=$1 AND friend_id=$3) OR (user_id=$3 AND friend_id=$1))))
   ), inserted AS (
    INSERT INTO notifications(user_id,notification_type,from_user_id,message,community_id,activity_id,feed_post_id,community_post_id,target_path,event_key)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 FROM eligible
    ON CONFLICT(user_id,event_key) DO NOTHING RETURNING id,user_id
   ), queued AS (
    INSERT INTO push_outbox(notification_id,token,user_id)
    SELECT i.id,t.token,i.user_id FROM inserted i JOIN device_push_tokens t ON t.user_id=i.user_id JOIN users u ON u.id=i.user_id
    WHERE COALESCE((u.notification_settings->>'push_enabled')::boolean,true)=true
    ON CONFLICT(notification_id,token) DO NOTHING
   ) SELECT id FROM inserted`,
      [
        userId,
        notificationType,
        fromUserId,
        message,
        communityId,
        activityId,
        feedPostId,
        communityPostId,
        path,
        eventKey,
      ],
    );
    if (rows.length && !deferPush)
      await flushPushOutbox({ notificationId: rows[0].id });
    return rows[0] ?? null;
  } catch (error) {
    console.error("Notification delivery error", { code: error.code });
    return null;
  }
}
export async function notifyCommunity({
  communityId,
  fromUserId,
  message,
  eventKey,
  type = "community_message",
}) {
  try {
    const members = await sql(
      "SELECT user_id FROM community_members WHERE community_id=$1 AND user_id<>$2 AND muted=false",
      [communityId, fromUserId],
    );
    // Bound concurrency; do not start detached promises in serverless handlers.
    for (let offset = 0; offset < members.length; offset += 10)
      await Promise.all(
        members.slice(offset, offset + 10).map((m) =>
          createNotification({
            userId: m.user_id,
            notificationType: type,
            fromUserId,
            message,
            communityId,
            eventKey,
            deferPush: true,
          }),
        ),
      );
    await flushPushOutbox();
  } catch (error) {
    console.error("Community notification queue failed", { code: error.code });
  }
}
