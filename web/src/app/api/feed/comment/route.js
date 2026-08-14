/**
 * GET  /api/feed/comment?postId=X        — list comments for a post
 * POST /api/feed/comment                 — add a comment to a post
 *
 * POST body: { postId, text }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    const comments = await sql(
      `SELECT
          fc.id,
          fc.post_id,
          fc.user_id,
          fc.comment_text,
          fc.created_at,
          u.first_name || ' ' || u.last_name AS author_name,
          u.profile_photo_url                AS author_avatar,
          CASE
            WHEN fc.created_at > NOW() - INTERVAL '1 hour'   THEN EXTRACT(EPOCH FROM (NOW() - fc.created_at))::int/60 || 'm'
            WHEN fc.created_at > NOW() - INTERVAL '24 hours' THEN EXTRACT(EPOCH FROM (NOW() - fc.created_at))::int/3600 || 'h'
            ELSE EXTRACT(EPOCH FROM (NOW() - fc.created_at))::int/86400 || 'd'
          END AS time_ago
        FROM feed_comments fc
        JOIN users u ON fc.user_id = u.id
        WHERE fc.post_id = $1 AND fc.parent_comment_id IS NULL
        ORDER BY fc.created_at ASC
        LIMIT 50`,
      [parseInt(postId, 10)],
    );

    return Response.json({ comments });
  } catch (error) {
    console.error("Comments GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { postId, text } = await request.json();
  const userId = await getSessionUserId(request);

  if (!postId || !text?.trim()) {
    return Response.json(
      { error: "postId and text required" },
      { status: 400 },
    );
  }

  try {
    const result = await sql(
      `INSERT INTO feed_comments (post_id, user_id, comment_text)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, comment_text, created_at`,
      [postId, userId, text.trim()],
    );

    // Fetch author info for the returned comment
    const author = await sql(
      `SELECT first_name || ' ' || last_name AS author_name, profile_photo_url AS author_avatar
       FROM users WHERE id = $1`,
      [userId],
    );

    const comment = { ...result[0], ...author[0], time_ago: "just now" };
    return Response.json({ success: true, comment });
  } catch (error) {
    console.error("Comment POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
