import sql from "./sql";
import { pushAllowedSQL } from "./notificationPreferences";
import { notificationTarget } from "./notificationTarget";
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
  try {
    let related = {};
    if (activityId) {
      const activity = await sql(`SELECT af.course_id AS activity_course_id,a.slug AS achievement_slug,
        (SELECT f.id FROM feed_posts f WHERE f.author_id=af.user_id
         AND f.metadata->>'review_id'=af.review_id::text ORDER BY f.id DESC LIMIT 1) AS related_post_id
        FROM activity_feed af LEFT JOIN achievements a ON a.id=af.achievement_id WHERE af.id=$1`, [activityId]);
      related = activity[0] || {};
    }
    const path = targetPath || notificationTarget({ notification_type: notificationType,
      community_id: communityId, community_post_id: communityPostId, feed_post_id: feedPostId,
      from_user_id: fromUserId, ...related });
    // CTE atomically queues push jobs with the in-app notification. Migration is
    // required; request handlers never mutate database schema.
    const rows = await sql(
      `WITH eligible AS (
    SELECT id FROM users u WHERE id=$1
      AND COALESCE(is_suspended,false)=false
      AND ($5::int IS NULL OR NOT EXISTS(SELECT 1 FROM community_members WHERE community_id=$5 AND user_id=$1 AND muted=true))
      AND ($3::int IS NULL OR NOT EXISTS(SELECT 1 FROM friendships WHERE status='blocked' AND ((user_id=$1 AND friend_id=$3) OR (user_id=$3 AND friend_id=$1))))
   ), inserted AS (
    INSERT INTO notifications(user_id,notification_type,from_user_id,message,community_id,activity_id,feed_post_id,community_post_id,target_path,event_key)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 FROM eligible
    ON CONFLICT(user_id,event_key) DO NOTHING RETURNING id,user_id
   ), queued AS (
    INSERT INTO push_outbox(notification_id,token,user_id)
    SELECT i.id,t.token,i.user_id FROM inserted i JOIN device_push_tokens t ON t.user_id=i.user_id JOIN users u ON u.id=i.user_id
    WHERE ${pushAllowedSQL("$2")}
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
