import { photoUrls } from "@/app/api/utils/activity/validation";
import { communityAccess } from "@/app/api/utils/communityAccess";
/**
 * GET  /api/communities/:id/comments?postId=X  — list comments for a post
 * POST /api/communities/:id/comments           — add a comment
 * Body: { postId, text }
 */
import sql from "@/app/api/utils/sql";
import {
  getSessionUserId,
  getSessionUserIdOrNull,
} from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";

export async function GET(request, { params }) {
  const { id: communityId } = params;
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    const viewer = await getSessionUserIdOrNull(request);
    if (!(await communityAccess(Number(communityId), viewer)))
      return Response.json(
        { error: "Community not available" },
        { status: 403 },
      );
    const comments = await sql(
      `SELECT
          cpc.id,
          cpc.post_id,
          cpc.user_id,
          cpc.comment_text,
          cpc.image_urls,
          cpc.created_at,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') AS author_name,
          u.profile_photo_url            AS author_avatar,
          CASE
            WHEN cpc.created_at > NOW()-INTERVAL'1 hour'   THEN EXTRACT(EPOCH FROM (NOW()-cpc.created_at))::int/60||'m'
            WHEN cpc.created_at > NOW()-INTERVAL'24 hours' THEN EXTRACT(EPOCH FROM (NOW()-cpc.created_at))::int/3600||'h'
            ELSE EXTRACT(EPOCH FROM (NOW()-cpc.created_at))::int/86400||'d'
          END AS time_ago
        FROM community_post_comments cpc
        JOIN users u ON cpc.user_id=u.id
        WHERE cpc.post_id=$1 AND EXISTS(SELECT 1 FROM community_posts WHERE id=cpc.post_id AND community_id=$2 AND is_deleted=false)
        ORDER BY cpc.created_at ASC
        LIMIT 100`,
      [parseInt(postId, 10), Number(communityId)],
    );
    return Response.json({ comments });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: communityId } = params;
  const body = await request.json();
  const { postId, text } = body;
  let images;
  try {
    images = photoUrls(body.imageUrls || []);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  if (text != null && (typeof text !== "string" || text.length > 10000))
    return Response.json({ error: "Invalid comment" }, { status: 400 });
  if (!postId || (!text?.trim() && !images.length))
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

    const post = await sql(
      `SELECT id, user_id, community_id FROM community_posts WHERE id=$1 AND community_id=$2 AND is_deleted=false`,
      [parseInt(postId, 10), Number(communityId)],
    );
    if (!post.length)
      return Response.json({ error: "Post not found" }, { status: 404 });

    const result = await sql(
      `INSERT INTO community_post_comments (post_id, user_id, comment_text,image_urls)
       VALUES ($1, $2, $3,$4::jsonb) RETURNING id, comment_text, image_urls, created_at`,
      [
        parseInt(postId, 10),
        userId,
        text?.trim() || "",
        JSON.stringify(images),
      ],
    );

    await createNotification({
      userId: post[0].user_id,
      notificationType: "community_post_comment",
      fromUserId: userId,
      communityId: post[0].community_id || parseInt(communityId, 10),
      communityPostId: parseInt(postId, 10),
      message: "commented on your community post",
      eventKey: `community-comment:${result[0].id}`,
    });

    const author = await sql(
      `SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), 'Golfer') AS author_name, profile_photo_url AS author_avatar FROM users WHERE id=$1`,
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
