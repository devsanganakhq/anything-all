/**
 * GET /api/friends/list?status=accepted|pending&direction=inbound|outbound
 * Returns friendships for the current user.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "accepted";
  const direction = searchParams.get("direction") || "both";

  try {
    let friends;

    if (status === "pending") {
      let whereClause;
      if (direction === "inbound")
        whereClause = `f.friend_id = ${userId} AND f.status = 'pending'`;
      else if (direction === "outbound")
        whereClause = `f.user_id = ${userId} AND f.status = 'pending'`;
      else
        whereClause = `(f.user_id = ${userId} OR f.friend_id = ${userId}) AND f.status = 'pending'`;

      friends = await sql(
        `SELECT
            f.id,
            CASE WHEN f.user_id=$1 THEN f.friend_id ELSE f.user_id END AS friend_id,
            CASE WHEN f.user_id=$1 THEN u2.first_name||' '||u2.last_name ELSE u1.first_name||' '||u1.last_name END AS friend_name,
            CASE WHEN f.user_id=$1 THEN u2.profile_photo_url ELSE u1.profile_photo_url END AS friend_photo,
            CASE WHEN f.user_id=$1 THEN u2.location ELSE u1.location END AS friend_location,
            CASE WHEN f.user_id=$1 THEN u2.home_club_name ELSE u1.home_club_name END AS home_club,
            CASE WHEN f.user_id=$1 THEN u2.bio ELSE u1.bio END AS bio,
            (SELECT COUNT(*)::int FROM played_courses
              WHERE user_id=(CASE WHEN f.user_id=$1 THEN f.friend_id ELSE f.user_id END)) AS courses_played,
            f.user_id AS requester_id,
            f.status,
            f.created_at
          FROM friendships f
          JOIN users u1 ON f.user_id=u1.id
          JOIN users u2 ON f.friend_id=u2.id
          WHERE ${whereClause}
          ORDER BY f.created_at DESC`,
        [userId],
      );
    } else {
      friends = await sql(
        `SELECT
            f.id,
            CASE WHEN f.user_id=$1 THEN f.friend_id ELSE f.user_id END AS friend_id,
            CASE WHEN f.user_id=$1 THEN u2.first_name||' '||u2.last_name ELSE u1.first_name||' '||u1.last_name END AS friend_name,
            CASE WHEN f.user_id=$1 THEN u2.profile_photo_url ELSE u1.profile_photo_url END AS friend_photo,
            CASE WHEN f.user_id=$1 THEN u2.location ELSE u1.location END AS friend_location,
            CASE WHEN f.user_id=$1 THEN u2.home_club_name ELSE u1.home_club_name END AS home_club,
            CASE WHEN f.user_id=$1 THEN u2.bio ELSE u1.bio END AS bio,
            CASE WHEN (CASE WHEN f.user_id=$1 THEN u2.privacy_settings ELSE u1.privacy_settings END ->>'stats_visible')::boolean
              THEN (SELECT COUNT(*)::int FROM played_courses
                    WHERE user_id=(CASE WHEN f.user_id=$1 THEN f.friend_id ELSE f.user_id END))
              ELSE NULL END AS courses_played,
            f.status,
            f.created_at
          FROM friendships f
          JOIN users u1 ON f.user_id=u1.id
          JOIN users u2 ON f.friend_id=u2.id
          WHERE (f.user_id=$1 OR f.friend_id=$1) AND f.status=$2
          ORDER BY friend_name ASC`,
        [userId, status],
      );
    }

    return Response.json({ friends });
  } catch (error) {
    console.error("Friends list error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
