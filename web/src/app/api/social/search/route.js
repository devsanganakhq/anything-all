/**
 * GET /api/social/search?q=<query>&page=1&limit=20
 * Search golfers by name or home club. Never returns email or precise location.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
  );
  const offset = (page - 1) * limit;

  try {
    const users = await sql(
      `SELECT
          u.id,
          NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS name,
          u.profile_photo_url                  AS avatar,
          u.location,
          u.home_club_name                     AS home_club,
          u.bio,

          CASE WHEN COALESCE((u.privacy_settings->>'stats_visible')::boolean, true)
            THEN u.handicap ELSE NULL END AS handicap,

          CASE WHEN COALESCE((u.privacy_settings->>'stats_visible')::boolean, true)
            THEN (SELECT COUNT(*)::int FROM played_courses WHERE user_id=u.id)
            ELSE NULL END AS courses_played,

          (SELECT status FROM friendships
            WHERE (user_id=$1 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$1)
            LIMIT 1) AS friendship_status,

          (SELECT user_id FROM friendships
            WHERE ((user_id=$1 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$1))
              AND status='pending' LIMIT 1) AS request_initiator_id,

          EXISTS(SELECT 1 FROM follows
            WHERE follower_id=$1 AND followee_type='user' AND followee_id=u.id) AS is_following,

          (SELECT COUNT(*)::int FROM follows WHERE followee_type='user' AND followee_id=u.id) AS follower_count,

          (SELECT COUNT(*)::int FROM (
            SELECT friend_id AS mid FROM friendships WHERE user_id=$1 AND status='accepted'
            UNION SELECT user_id AS mid FROM friendships WHERE friend_id=$1 AND status='accepted'
          ) AS my_friends
          WHERE mid IN (
            SELECT friend_id FROM friendships WHERE user_id=u.id AND status='accepted'
            UNION SELECT user_id FROM friendships WHERE friend_id=u.id AND status='accepted'
          )) AS mutual_friends_count

        FROM users u
        WHERE u.id != $1
          AND COALESCE(u.is_suspended, false) = false
          AND COALESCE((u.privacy_settings->>'profile_visible')::boolean, true) = true
          AND u.id NOT IN (
            SELECT friend_id FROM friendships WHERE user_id=$1 AND status='blocked'
            UNION SELECT user_id FROM friendships WHERE friend_id=$1 AND status='blocked'
          )
          AND ($2 = '' OR
            CONCAT_WS(' ', u.first_name, u.last_name) ILIKE $3 OR
            COALESCE(u.first_name, '') ILIKE $3 OR
            COALESCE(u.last_name, '') ILIKE $3 OR
            COALESCE(u.home_club_name, '') ILIKE $3 OR
            COALESCE(u.location, '') ILIKE $3
          )
        ORDER BY
          CASE
            WHEN EXISTS(SELECT 1 FROM friendships
              WHERE ((user_id=$1 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$1))
                AND status='accepted') THEN 0
            WHEN EXISTS(SELECT 1 FROM follows
              WHERE follower_id=$1 AND followee_type='user' AND followee_id=u.id) THEN 1
            ELSE 2
          END,
          u.first_name
        LIMIT $4 OFFSET $5`,
      [userId, q, `%${q}%`, limit, offset],
    );

    return Response.json({ users, page, hasMore: users.length === limit });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
