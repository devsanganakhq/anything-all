/**
 * POST /api/feed/hide
 * Hide a post for the current user (it won't appear in their feed).
 * Body: { postId }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function POST(request) {
  const userId = await getSessionUserId(request);
  const { postId } = await request.json();
  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    await sql(
      `INSERT INTO feed_hidden_posts (user_id, post_id) VALUES ($1, $2)
       ON CONFLICT (user_id, post_id) DO NOTHING`,
      [userId, postId],
    );
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
