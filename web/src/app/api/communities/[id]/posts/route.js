import { photoUrls as validatePhotos } from "@/app/api/utils/activity/validation";
import { notifyCommunity } from "@/app/api/utils/createNotification";
import { communityAccess } from "@/app/api/utils/communityAccess";
/**
 * GET  /api/communities/:id/posts  — paginated posts, pinned first
 * POST /api/communities/:id/posts  — create a post
 */
import sql from "@/app/api/utils/sql";
import {
  getSessionUserId,
  getSessionUserIdOrNull,
} from "@/app/api/utils/getUserId";

export async function GET(request, { params }) {
  const userId = (await getSessionUserIdOrNull(request)) ?? 0;
  const { id } = params;
  const communityId = parseInt(id, 10);

  try {
    if (!(await communityAccess(communityId, userId)))
      return Response.json(
        { error: "Community not available" },
        { status: 403 },
      );
    const posts = await sql(
      `SELECT
          cp.id,
          cp.user_id,
          cp.title,
          cp.body,
          cp.post_type,
          cp.photo_urls,
          cp.course_id,
          cp.is_pinned,
          cp.created_at,

          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') AS author_name,
          u.profile_photo_url            AS author_photo,
          u.home_club_name               AS author_club,

          COALESCE(co.name,'') AS course_name,

          (SELECT COUNT(*)::int FROM community_post_comments WHERE post_id=cp.id) AS comment_count,

          -- Reactions grouped
          (SELECT json_agg(json_build_object('type',reaction_type,'count',cnt))
            FROM (SELECT reaction_type, COUNT(*)::int AS cnt FROM community_reactions WHERE post_id=cp.id GROUP BY reaction_type) rt
          ) AS reactions,

          -- Current user's reaction
          (SELECT reaction_type FROM community_reactions WHERE post_id=cp.id AND user_id=$1 LIMIT 1) AS my_reaction,

          CASE
            WHEN cp.created_at > NOW()-INTERVAL'1 hour'   THEN EXTRACT(EPOCH FROM (NOW()-cp.created_at))::int/60||'m'
            WHEN cp.created_at > NOW()-INTERVAL'24 hours' THEN EXTRACT(EPOCH FROM (NOW()-cp.created_at))::int/3600||'h'
            WHEN cp.created_at > NOW()-INTERVAL'7 days'   THEN EXTRACT(EPOCH FROM (NOW()-cp.created_at))::int/86400||'d'
            ELSE TO_CHAR(cp.created_at,'DD Mon')
          END AS time_ago

        FROM community_posts cp
        JOIN users u ON cp.user_id=u.id
        LEFT JOIN courses co ON cp.course_id=co.id
        WHERE cp.community_id=$2 AND cp.is_deleted=false
        ORDER BY cp.is_pinned DESC, cp.created_at DESC
        LIMIT 50`,
      [userId, communityId],
    );

    return Response.json({ posts });
  } catch (error) {
    console.error("Posts GET error:", error);
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

  const { id } = params;
  const communityId = parseInt(id, 10);
  const {
    title,
    body,
    postType = "discussion",
    photoUrls = [],
    courseId,
  } = await request.json();

  try {
    validatePhotos(photoUrls);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  if (body != null && (typeof body !== "string" || body.length > 20000))
    return Response.json({ error: "Invalid post body" }, { status: 400 });
  if (!body?.trim() && photoUrls.length === 0) {
    return Response.json(
      { error: "Post body or photo required" },
      { status: 400 },
    );
  }

  try {
    // Membership check
    const member = await sql(
      `SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, userId],
    );
    if (!member.length)
      return Response.json(
        { error: "Must be a member to post" },
        { status: 403 },
      );

    const result = await sql(
      `INSERT INTO community_posts (community_id, user_id, title, body, post_type, photo_urls, course_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        communityId,
        userId,
        title || null,
        body?.trim() || "",
        postType,
        photoUrls,
        courseId || null,
      ],
    );

    // Update post count
    await sql(`UPDATE communities SET post_count=post_count+1 WHERE id=$1`, [
      communityId,
    ]);

    await notifyCommunity({
      communityId,
      fromUserId: userId,
      message: "New community post",
      eventKey: `community-post:${result[0].id}`,
      type: "community_post",
    });
    return Response.json({ success: true, postId: result[0].id });
  } catch (error) {
    console.error("Posts POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
