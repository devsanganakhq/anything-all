/**
 * POST /api/communities/:id/react
 * Body: { postId, reactionType }
 * reactionType: 'like' | 'love' | 'insightful' | 'funny' | null (to remove)
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

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
    const existing = await sql(
      `SELECT id, reaction_type FROM community_reactions WHERE post_id=$1 AND user_id=$2`,
      [postId, userId],
    );

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
      }
    } else if (reactionType) {
      await sql(
        `INSERT INTO community_reactions (post_id, user_id, reaction_type)
         VALUES ($1, $2, $3) ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, userId, reactionType],
      );
    }

    // Return updated totals
    const totals = await sql(
      `SELECT reaction_type, COUNT(*)::int AS count
        FROM community_reactions WHERE post_id=$1
        GROUP BY reaction_type`,
      [postId],
    );

    return Response.json({ reacted: true, reactionType, totals });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
