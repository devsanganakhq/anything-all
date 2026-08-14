/**
 * GET  /api/communities/:id/comments?postId=X  — list comments for a post
 * POST /api/communities/:id/comments           — add a comment
 * Body: { postId, text }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request, { params }) {
  const { id: communityId } = params;
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    const comments = await sql(
      `SELECT
          cpc.id,
          cpc.post_id,
          cpc.user_id,
          cpc.comment_text,
          cpc.created_at,
          u.first_name||' '||u.last_name AS author_name,
          u.profile_photo_url            AS author_avatar,
          CASE
            WHEN cpc.created_at > NOW()-INTERVAL'1 hour'   THEN EXTRACT(EPOCH FROM (NOW()-cpc.created_at))::int/60||'m'
            WHEN cpc.created_at > NOW()-INTERVAL'24 hours' THEN EXTRACT(EPOCH FROM (NOW()-cpc.created_at))::int/3600||'h'
            ELSE EXTRACT(EPOCH FROM (NOW()-cpc.created_at))::int/86400||'d'
          END AS time_ago
        FROM community_post_comments cpc
        JOIN users u ON cpc.user_id=u.id
        WHERE cpc.post_id=$1
        ORDER BY cpc.created_at ASC
        LIMIT 100`,
      [parseInt(postId, 10)],
    );
    return Response.json({ comments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: communityId } = params;
  const { postId, text } = await request.json();
  if (!postId || !text?.trim())
    return Response.json(
      { error: "postId and text required" },
      { status: 400 },
    );

  try {
    // Membership check
    const member = await sql(
      `SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [parseInt(communityId, 10), userId],
    );
    if (!member.length)
      return Response.json(
        { error: "Must be a member to comment" },
        { status: 403 },
      );

    const result = await sql(
      `INSERT INTO community_post_comments (post_id, user_id, comment_text)
       VALUES ($1, $2, $3) RETURNING id, comment_text, created_at`,
      [parseInt(postId, 10), userId, text.trim()],
    );

    const author = await sql(
      `SELECT first_name||' '||last_name AS author_name, profile_photo_url AS author_avatar FROM users WHERE id=$1`,
      [userId],
    );

    return Response.json({
      success: true,
      comment: { ...result[0], ...author[0], time_ago: "now", user_id: userId },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
