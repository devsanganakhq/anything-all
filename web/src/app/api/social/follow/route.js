/**
 * POST /api/social/follow  — toggle follow/unfollow
 * GET  /api/social/follow  — check follow status
 * Body/params: { followeeId, followeeType }  type: "user"|"course"|"community"
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { followeeId, followeeType = "user" } = await request.json();
  const validTypes = ["user", "club", "course", "community"];
  if (!followeeId || !validTypes.includes(followeeType))
    return Response.json(
      { error: "followeeId and valid followeeType required" },
      { status: 400 },
    );
  if (followeeType === "user" && followeeId === userId)
    return Response.json({ error: "Cannot follow yourself" }, { status: 400 });

  try {
    if (followeeType === "user") {
      const blocked = await sql(
        `SELECT 1 FROM friendships WHERE status='blocked' AND ((user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1))`,
        [userId, followeeId],
      );
      if (blocked.length)
        return Response.json(
          { error: "Action not permitted" },
          { status: 403 },
        );
    }

    const existing = await sql(
      `SELECT id FROM follows WHERE follower_id=$1 AND followee_type=$2 AND followee_id=$3`,
      [userId, followeeType, followeeId],
    );

    if (existing.length) {
      await sql(
        `DELETE FROM follows WHERE follower_id=$1 AND followee_type=$2 AND followee_id=$3`,
        [userId, followeeType, followeeId],
      );
      return Response.json({ following: false });
    }

    await sql(
      `INSERT INTO follows (follower_id, followee_type, followee_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [userId, followeeType, followeeId],
    );

    if (followeeType === "user") {
      await createNotification({
        userId: followeeId,
        notificationType: "follow",
        fromUserId: userId,
        message: "started following you",
      });
    }

    const countRow = await sql(
      `SELECT COUNT(*)::int AS count FROM follows WHERE followee_type=$1 AND followee_id=$2`,
      [followeeType, followeeId],
    );
    return Response.json({ following: true, followerCount: countRow[0].count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const followeeId = searchParams.get("followeeId");
  const followeeType = searchParams.get("followeeType") || "user";
  if (!followeeId)
    return Response.json({ error: "followeeId required" }, { status: 400 });
  try {
    const row = await sql(
      `SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id=$1 AND followee_type=$2 AND followee_id=$3) AS following`,
      [userId, followeeType, followeeId],
    );
    const countRow = await sql(
      `SELECT COUNT(*)::int AS count FROM follows WHERE followee_type=$1 AND followee_id=$2`,
      [followeeType, followeeId],
    );
    return Response.json({
      following: row[0].following,
      followerCount: countRow[0].count,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
