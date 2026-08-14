/**
 * DELETE /api/feed/:postId
 * Delete the current user's own feed post (with all child records).
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function DELETE(request, { params }) {
  const userId = await getSessionUserId(request);
  const postId = parseInt(params.postId, 10);

  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    const post = await sql(
      `SELECT id, author_id FROM feed_posts WHERE id = $1`,
      [postId],
    );
    if (!post.length)
      return Response.json({ error: "Post not found" }, { status: 404 });
    if (post[0].author_id !== userId)
      return Response.json({ error: "Not authorised" }, { status: 403 });

    await sql(`DELETE FROM feed_posts WHERE id = $1`, [postId]);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
