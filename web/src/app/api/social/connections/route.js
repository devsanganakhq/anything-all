/**
 * GET /api/social/connections?userId=X&type=followers|following|friends|mutual
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request) {
  let viewerId;
  try {
    viewerId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawUserId = searchParams.get("userId");
  const targetId = rawUserId ? parseInt(rawUserId, 10) : viewerId;
  const type = searchParams.get("type") || "friends";
  if (!targetId || Number.isNaN(targetId))
    return Response.json({ error: "userId required" }, { status: 400 });

  try {
    const blocked = await sql(
      `SELECT 1 FROM friendships WHERE status='blocked' AND ((user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1))`,
      [viewerId, targetId],
    );
    if (blocked.length)
      return Response.json({ error: "Not available" }, { status: 403 });

    let users = [];

    if (type === "friends") {
      users = await sql(
        `SELECT
            CASE WHEN f.user_id=$1 THEN u2.id   ELSE u1.id   END AS id,
            CASE WHEN f.user_id=$1 THEN NULLIF(TRIM(CONCAT_WS(' ', u2.first_name, u2.last_name)), '') ELSE NULLIF(TRIM(CONCAT_WS(' ', u1.first_name, u1.last_name)), '') END AS name,
            CASE WHEN f.user_id=$1 THEN u2.profile_photo_url ELSE u1.profile_photo_url END AS avatar,
            CASE WHEN f.user_id=$1 THEN u2.location ELSE u1.location END AS location,
            CASE WHEN f.user_id=$1 THEN u2.home_club_name ELSE u1.home_club_name END AS home_club,
            f.created_at AS connected_at,
            (SELECT status FROM friendships WHERE (user_id=$2 AND friend_id=(CASE WHEN f.user_id=$1 THEN u2.id ELSE u1.id END)) OR (user_id=(CASE WHEN f.user_id=$1 THEN u2.id ELSE u1.id END) AND friend_id=$2) LIMIT 1) AS friendship_status,
            EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND followee_type='user' AND followee_id=(CASE WHEN f.user_id=$1 THEN u2.id ELSE u1.id END)) AS is_following,
            (SELECT COUNT(*)::int FROM played_courses WHERE user_id=(CASE WHEN f.user_id=$1 THEN u2.id ELSE u1.id END)) AS courses_played
          FROM friendships f
          JOIN users u1 ON f.user_id=u1.id
          JOIN users u2 ON f.friend_id=u2.id
          WHERE (f.user_id=$1 OR f.friend_id=$1) AND f.status='accepted'
          ORDER BY name`,
        [targetId, viewerId],
      );
    } else if (type === "followers") {
      users = await sql(
        `SELECT u.id, NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS name, u.profile_photo_url AS avatar, u.location, u.home_club_name AS home_club,
            fl.created_at AS connected_at,
            (SELECT status FROM friendships WHERE (user_id=$2 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$2) LIMIT 1) AS friendship_status,
            EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND followee_type='user' AND followee_id=u.id) AS is_following,
            (SELECT COUNT(*)::int FROM played_courses WHERE user_id=u.id) AS courses_played
          FROM follows fl JOIN users u ON fl.follower_id=u.id
          WHERE fl.followee_type='user' AND fl.followee_id=$1
            AND u.id NOT IN (SELECT friend_id FROM friendships WHERE user_id=$2 AND status='blocked' UNION SELECT user_id FROM friendships WHERE friend_id=$2 AND status='blocked')
          ORDER BY name`,
        [targetId, viewerId],
      );
    } else if (type === "following") {
      users = await sql(
        `SELECT u.id, NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS name, u.profile_photo_url AS avatar, u.location, u.home_club_name AS home_club,
            fl.created_at AS connected_at,
            (SELECT status FROM friendships WHERE (user_id=$2 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$2) LIMIT 1) AS friendship_status,
            EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND followee_type='user' AND followee_id=u.id) AS is_following,
            (SELECT COUNT(*)::int FROM played_courses WHERE user_id=u.id) AS courses_played
          FROM follows fl JOIN users u ON fl.followee_id=u.id
          WHERE fl.follower_id=$1 AND fl.followee_type='user'
            AND u.id NOT IN (SELECT friend_id FROM friendships WHERE user_id=$2 AND status='blocked' UNION SELECT user_id FROM friendships WHERE friend_id=$2 AND status='blocked')
          ORDER BY name`,
        [targetId, viewerId],
      );
    } else if (type === "mutual") {
      users = await sql(
        `SELECT u.id, NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS name, u.profile_photo_url AS avatar, u.location, u.home_club_name AS home_club,
            (SELECT status FROM friendships WHERE (user_id=$2 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$2) LIMIT 1) AS friendship_status,
            EXISTS(SELECT 1 FROM follows WHERE follower_id=$2 AND followee_type='user' AND followee_id=u.id) AS is_following,
            (SELECT COUNT(*)::int FROM played_courses WHERE user_id=u.id) AS courses_played
          FROM (
            SELECT friend_id AS mid FROM friendships WHERE user_id=$1 AND status='accepted'
            UNION SELECT user_id AS mid FROM friendships WHERE friend_id=$1 AND status='accepted'
          ) mf1
          JOIN (
            SELECT friend_id AS mid FROM friendships WHERE user_id=$2 AND status='accepted'
            UNION SELECT user_id AS mid FROM friendships WHERE friend_id=$2 AND status='accepted'
          ) mf2 ON mf1.mid=mf2.mid
          JOIN users u ON u.id=mf1.mid
          ORDER BY name`,
        [targetId, viewerId],
      );
    }

    return Response.json({ users, type });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
