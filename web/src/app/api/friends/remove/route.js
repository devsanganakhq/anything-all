/** POST /api/friends/remove — remove an accepted friend. Body: { friendId } */
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
  if (!friendId)
    return Response.json({ error: "friendId required" }, { status: 400 });
  try {
    await sql(
      `DELETE FROM friendships
        WHERE ((user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)) AND status='accepted'`,
      [userId, friendId],
    );
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
