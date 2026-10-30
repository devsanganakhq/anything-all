import { visibleFeedPost } from "@/app/api/utils/feedVisibility";
/**
 * POST /api/feed/react
 * Toggle a reaction on a feed post.
 *
 * Body: { postId, reaction }
 *   reaction: "like" | "love" | "celebrate" | null (null = remove)
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";

export async function POST(request) {
  const { postId, reaction: requestedReaction } = await request.json();
  if (
    requestedReaction != null &&
    !["like", "love", "celebrate"].includes(requestedReaction)
  )
    return Response.json({ error: "Invalid reaction" }, { status: 400 });
  const reaction = requestedReaction == null ? null : "like";
  const userId = await getSessionUserId(request);

  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    // Check if post exists and is visible; need author for notifications
    const found = await visibleFeedPost(userId, postId);
    const post = found ? [found] : [];
    if (!post.length)
      return Response.json({ error: "Post not found" }, { status: 404 });

    const existing = await sql(
      `SELECT id, reaction_type FROM feed_reactions WHERE post_id = $1 AND user_id = $2`,
      [postId, userId],
    );

    let userReaction = null;

    if (!reaction || (existing.length && !!reaction)) {
      // Remove reaction (toggle off or explicit null)
      await sql(
        `DELETE FROM feed_reactions WHERE post_id = $1 AND user_id = $2`,
        [postId, userId],
      );
    } else {
      // Upsert reaction
      await sql(
        `INSERT INTO feed_reactions (post_id, user_id, reaction_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET reaction_type = $3`,
        [postId, userId, reaction],
      );
      userReaction = reaction;

      await createNotification({
        userId: post[0].author_id,
        notificationType: "feed_like",
        fromUserId: userId,
        message: "liked your post",
        eventKey: `feed-like:${postId}:${userId}`,
        feedPostId: parseInt(postId, 10),
      });
    }

    // Return updated counts
    const counts = await sql(
      `SELECT
          COUNT(*)::int                                                         AS total,
          COUNT(*) FILTER (WHERE reaction_type='like')::int                    AS like_count,
          COUNT(*) FILTER (WHERE reaction_type='love')::int                    AS love_count,
          COUNT(*) FILTER (WHERE reaction_type='celebrate')::int               AS celebrate_count
        FROM feed_reactions WHERE post_id = $1`,
      [postId],
    );

    return Response.json({ success: true, userReaction, counts: counts[0] });
  } catch (error) {
    console.error("React error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
