/**
 * GET  /api/user/notifications   — fetch notifications for current user
 * POST /api/user/notifications   — mark one or all as read
 *                                   body: { notificationId? }  (null = mark all)
 */
import { notificationTarget } from "@/app/api/utils/notificationTarget";
import { feedVisibility } from "@/app/api/utils/feedVisibility";
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { ensureCommunityJoinRequestsTable } from "@/app/api/utils/ensureCommunityJoinRequestsTable";
import { ensureCommunityInvitesTable } from "@/app/api/utils/ensureCommunityInvitesTable";

export async function GET(request) {
  try {
    const userId = await getSessionUserId(request);
    await ensureCommunityJoinRequestsTable();
    await ensureCommunityInvitesTable();
    const notifications = await sql(
      `SELECT
          n.id,
          n.notification_type,
          n.from_user_id,
          n.activity_id,
          n.community_id,
          n.feed_post_id,
          n.community_post_id,
          n.message,
          n.target_path,
          af.course_id AS activity_course_id,
          a.slug AS achievement_slug,
          (SELECT f.id FROM feed_posts f WHERE f.author_id=af.user_id
            AND f.metadata->>'review_id'=af.review_id::text ORDER BY f.id DESC LIMIT 1) AS related_post_id,
          n.read_at,
          n.created_at,
          COUNT(*) FILTER (WHERE n.read_at IS NULL) OVER()::int AS unread_total,

          -- From user (safe — no email)
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer')  AS from_user_name,
          u.profile_photo_url                  AS from_user_photo,

          -- Community name (if any)
          c.name AS community_name,

          -- Related friendship id (for accept/decline from notification)
          (SELECT f.id FROM friendships f
            WHERE f.user_id = n.from_user_id AND f.friend_id = $1 AND f.status = 'pending'
            LIMIT 1) AS friendship_id,

          -- Pending community join request (for accept/decline from notification)
          (SELECT cjr.id FROM community_join_requests cjr
            WHERE cjr.community_id = n.community_id
              AND cjr.user_id = n.from_user_id
              AND cjr.status = 'pending'
            LIMIT 1) AS join_request_id,

          -- Pending community invite (for accept/decline from notification)
          (SELECT ci.id FROM community_invites ci
            WHERE ci.community_id = n.community_id
              AND ci.invitee_id = $1
              AND ci.status = 'pending'
              AND n.notification_type = 'community_invite_received'
            LIMIT 1) AS invite_id,

          -- Relative time
          CASE
            WHEN n.created_at > NOW() - INTERVAL '1 hour'
              THEN EXTRACT(EPOCH FROM (NOW()-n.created_at))::int/60 || 'm'
            WHEN n.created_at > NOW() - INTERVAL '24 hours'
              THEN EXTRACT(EPOCH FROM (NOW()-n.created_at))::int/3600 || 'h'
            WHEN n.created_at > NOW() - INTERVAL '7 days'
              THEN EXTRACT(EPOCH FROM (NOW()-n.created_at))::int/86400 || 'd'
            ELSE TO_CHAR(n.created_at, 'DD Mon')
          END AS time_ago

        FROM notifications n
        LEFT JOIN users u ON n.from_user_id = u.id
        LEFT JOIN communities c ON n.community_id = c.id
        LEFT JOIN activity_feed af ON af.id=n.activity_id
        LEFT JOIN achievements a ON a.id=af.achievement_id
        WHERE n.user_id = $1
          AND (n.from_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM friendships b
            WHERE b.status='blocked' AND ((b.user_id=$1 AND b.friend_id=n.from_user_id)
              OR (b.friend_id=$1 AND b.user_id=n.from_user_id))))
          AND (n.feed_post_id IS NULL OR EXISTS(SELECT 1 FROM feed_posts fp JOIN users u ON u.id=fp.author_id
            WHERE fp.id=n.feed_post_id AND ${feedVisibility}))
          AND (n.activity_id IS NULL OR af.user_id=$1 OR EXISTS(SELECT 1 FROM users author
            WHERE author.id=af.user_id AND COALESCE(author.is_suspended,false)=false
              AND (COALESCE((author.privacy_settings->>'profile_visible')::boolean,true)
                OR EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND
                  ((f.user_id=$1 AND f.friend_id=af.user_id) OR (f.friend_id=$1 AND f.user_id=af.user_id))))))
          AND (n.community_post_id IS NULL OR EXISTS(SELECT 1 FROM community_posts cp
            JOIN communities community ON community.id=cp.community_id
            WHERE cp.id=n.community_post_id AND NOT cp.is_deleted AND
              (community.community_type<>'private' OR EXISTS(SELECT 1 FROM community_members m
                WHERE m.community_id=community.id AND m.user_id=$1))))
        ORDER BY n.created_at DESC
        LIMIT 100`,
      [userId],
    );

    const unreadCount = notifications[0]?.unread_total ?? 0;

    return Response.json({ notifications: notifications.map(n => ({ ...n, target_path: notificationTarget(n) })), unread_count: unreadCount });
  } catch (error) {
    return notificationError(error);
  }
}

export async function POST(request) {
  try {
    const userId = await getSessionUserId(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    const { notificationId } = body;
    if (notificationId != null && (!Number.isSafeInteger(notificationId) || notificationId <= 0))
      return Response.json({ error: "Invalid notification ID" }, { status: 400 });
    if (notificationId) {
      await sql(
        `UPDATE notifications SET read_at=NOW()
          WHERE id=$1 AND user_id=$2 AND read_at IS NULL`,
        [notificationId, userId],
      );
    } else {
      await sql(
        `UPDATE notifications SET read_at=NOW()
          WHERE user_id=$1 AND read_at IS NULL`,
        [userId],
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    return notificationError(error);
  }
}

function notificationError(error) {
  const status = error.code === "ACCOUNT_SUSPENDED" ? 403
    : ["UNAUTHENTICATED", "AUTH_ERROR"].includes(error.code) ? 401 : 500;
  if (status === 500) console.error("Notifications request failed", { code: error.code });
  return Response.json({ error: status === 500 ? "Unable to load or update notifications" : error.message }, { status });
}
