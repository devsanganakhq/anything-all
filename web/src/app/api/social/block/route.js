/**
 * POST /api/social/block — block or unblock a user.
 * Removes friendship and mutual follows. Body: { targetUserId }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { targetUserId } = await request.json();
  if (!targetUserId || targetUserId === userId)
    return Response.json({ error: "Invalid targetUserId" }, { status: 400 });

  try {
    const existing = await sql(
      `SELECT id FROM friendships WHERE status='blocked' AND user_id=$1 AND friend_id=$2`,
      [userId, targetUserId],
    );

    if (existing.length) {
      await sql(
        `DELETE FROM friendships WHERE user_id=$1 AND friend_id=$2 AND status='blocked'`,
        [userId, targetUserId],
      );
      return Response.json({ blocked: false });
    }

    await sql(
      `DELETE FROM friendships WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)`,
      [userId, targetUserId],
    );
    await sql(
      `DELETE FROM follows WHERE (follower_id=$1 AND followee_type='user' AND followee_id=$2) OR (follower_id=$2 AND followee_type='user' AND followee_id=$1)`,
      [userId, targetUserId],
    );
    await sql(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES ($1,$2,'blocked')`,
      [userId, targetUserId],
    );
    return Response.json({ blocked: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
