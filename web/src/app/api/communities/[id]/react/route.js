/**
 * POST /api/communities/:id/react
 * Body: { postId, reactionType }
 * reactionType: 'like' | 'love' | 'insightful' | 'funny' | null (to remove)
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";

export async function POST(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: communityId } = params;
  const { postId, reactionType } = await request.json();

  const valid = ["like", "love", "insightful", "funny"];
  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });
  if (reactionType && !valid.includes(reactionType)) {
    return Response.json({ error: "Invalid reactionType" }, { status: 400 });
  }

  try {
    const post = await sql(
      `SELECT id, user_id, community_id FROM community_posts WHERE id=$1`,
      [postId],
    );
    if (!post.length)
      return Response.json({ error: "Post not found" }, { status: 404 });

    const existing = await sql(
      `SELECT id, reaction_type FROM community_reactions WHERE post_id=$1 AND user_id=$2`,
      [postId, userId],
    );

    let reacted = false;
    let appliedType = reactionType;

    if (existing.length) {
      if (!reactionType || existing[0].reaction_type === reactionType) {
        // Toggle off
        await sql(
          `DELETE FROM community_reactions WHERE post_id=$1 AND user_id=$2`,
          [postId, userId],
        );
        return Response.json({ reacted: false });
      } else {
        // Change type
        await sql(
          `UPDATE community_reactions SET reaction_type=$1 WHERE post_id=$2 AND user_id=$3`,
          [reactionType, postId, userId],
        );
        reacted = true;
      }
    } else if (reactionType) {
      await sql(
        `INSERT INTO community_reactions (post_id, user_id, reaction_type)
         VALUES ($1, $2, $3) ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, userId, reactionType],
      );
      reacted = true;
    }

    if (reacted) {
      await createNotification({
        userId: post[0].user_id,
        notificationType: "community_post_like",
        fromUserId: userId,
        communityId: post[0].community_id || parseInt(communityId, 10),
        communityPostId: parseInt(postId, 10),
        message: "liked your community post",
      });
    }

    // Return updated totals
    const totals = await sql(
      `SELECT reaction_type, COUNT(*)::int AS count
        FROM community_reactions WHERE post_id=$1
        GROUP BY reaction_type`,
      [postId],
    );

    return Response.json({
      reacted: true,
      reactionType: appliedType,
      totals,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
