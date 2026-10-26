/**
 * POST /api/friends/respond
 * Body: { friendshipId, action }  action: "accept" | "decline"
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { friendshipId, action } = await request.json();
  if (!friendshipId || !action)
    return Response.json(
      { error: "friendshipId and action required" },
      { status: 400 },
    );

  try {
    if (action === "accept") {
      const result = await sql(
        `UPDATE friendships SET status='accepted', updated_at=NOW()
          WHERE id=$1 AND friend_id=$2 AND status='pending' RETURNING user_id`,
        [friendshipId, userId],
      );
      if (!result.length)
        return Response.json(
          { error: "Friend request not found" },
          { status: 404 },
        );

      await createNotification({
        userId: result[0].user_id,
        notificationType: "friend_accepted",
        fromUserId: userId,
        message: "accepted your friend request",
      });
      return Response.json({ success: true, status: "accepted" });
    } else if (action === "decline") {
      await sql(
        `DELETE FROM friendships WHERE id=$1 AND friend_id=$2 AND status='pending'`,
        [friendshipId, userId],
      );
      return Response.json({ success: true, status: "declined" });
    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
