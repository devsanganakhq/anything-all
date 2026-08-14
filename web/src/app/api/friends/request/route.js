/**
 * POST /api/friends/request  — send a friend request
 * DELETE /api/friends/request — cancel outbound pending request
 * Body: { friendId }
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

  const { friendId } = await request.json();
  if (!friendId || friendId === userId)
    return Response.json({ error: "Invalid friendId" }, { status: 400 });

  try {
    const blocked = await sql(
      `SELECT 1 FROM friendships WHERE status='blocked'
        AND ((user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1))`,
      [userId, friendId],
    );
    if (blocked.length)
      return Response.json({ error: "Action not permitted" }, { status: 403 });

    const existing = await sql(
      `SELECT id, status FROM friendships
        WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)`,
      [userId, friendId],
    );
    if (existing.length)
      return Response.json(
        { error: "Friendship already exists", status: existing[0].status },
        { status: 409 },
      );

    await sql(
      `INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')`,
      [userId, friendId],
    );
    await sql(
      `INSERT INTO notifications (user_id, notification_type, from_user_id, message)
       VALUES ($1, 'friend_request', $2, 'sent you a friend request')`,
      [friendId, userId],
    );
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { friendId } = await request.json();
  if (!friendId)
    return Response.json({ error: "friendId required" }, { status: 400 });
  try {
    await sql(
      `DELETE FROM friendships WHERE user_id=$1 AND friend_id=$2 AND status='pending'`,
      [userId, friendId],
    );
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
