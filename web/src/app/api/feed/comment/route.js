import { visibleFeedPost } from "@/app/api/utils/feedVisibility";
/**
 * GET  /api/feed/comment?postId=X        — list comments for a post
 * POST /api/feed/comment                 — add a comment to a post
 *
 * POST body: { postId, text }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";

export async function GET(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    if (!(await visibleFeedPost(userId, postId)))
      return Response.json({ error: "Post not available" }, { status: 404 });
    const comments = await sql(
      `SELECT
          fc.id,
          fc.post_id,
          fc.user_id,
          fc.comment_text,
          fc.created_at,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') AS author_name,
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
    const found = await visibleFeedPost(userId, postId);
    const post = found ? [found] : [];
    if (!post.length)
      return Response.json({ error: "Post not found" }, { status: 404 });

    const result = await sql(
      `INSERT INTO feed_comments (post_id, user_id, comment_text)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, comment_text, created_at`,
      [postId, userId, text.trim()],
    );

    await createNotification({
      userId: post[0].author_id,
      notificationType: "feed_comment",
      fromUserId: userId,
      message: "commented on your post",
      eventKey: `feed-comment:${result[0].id}`,
      feedPostId: parseInt(postId, 10),
    });

    // Fetch author info for the returned comment
    const author = await sql(
      `SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ',first_name,last_name)),''),'Golfer') AS author_name, profile_photo_url AS author_avatar
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
