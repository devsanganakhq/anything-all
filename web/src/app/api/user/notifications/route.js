/**
 * GET  /api/user/notifications   — fetch notifications for current user
 * POST /api/user/notifications   — mark one or all as read
 *                                   body: { notificationId? }  (null = mark all)
 */
import { notificationTarget } from "@/app/api/utils/notificationTarget";
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { ensureCommunityJoinRequestsTable } from "@/app/api/utils/ensureCommunityJoinRequestsTable";
import { ensureCommunityInvitesTable } from "@/app/api/utils/ensureCommunityInvitesTable";

export async function GET(request) {
  const userId = await getSessionUserId(request);

  try {
    await ensureCommunityJoinRequestsTable();
    await ensureCommunityInvitesTable();
    // Ensure newer FK columns exist on older DBs
    try {
      await sql(
        `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS feed_post_id INTEGER`,
      );
      await sql(
        `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS community_post_id INTEGER`,
      );
    } catch (_) {}

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
        ORDER BY n.created_at DESC
        LIMIT 100`,
      [userId],
    );

    const unreadCount = notifications.filter((n) => !n.read_at).length;

    return Response.json({ notifications: notifications.map(n => ({ ...n, target_path: notificationTarget(n) })), unread_count: unreadCount });
  } catch (error) {
    console.error("Notifications error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const userId = await getSessionUserId(request);
  const { notificationId } = await request.json();

  try {
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
    return Response.json({ error: error.message }, { status: 500 });
  }
}
