/**
 * POST /api/communities/join
 * Body: { communityId, action }
 * action: "join" | "leave" | "request_access"
 *
 * - Public  community: join immediately
 * - Private community: creates a pending follow request (no separate table yet, uses follows with followee_type='community')
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createFeedPost } from "@/app/api/utils/createFeedPost";

export async function POST(request) {
  const userId = await getSessionUserId();
  const { communityId, action = "join" } = await request.json();
  if (!communityId)
    return Response.json({ error: "communityId required" }, { status: 400 });

  try {
    const comm = await sql(
      `SELECT id, name, community_type, created_by FROM communities WHERE id=$1`,
      [communityId],
    );
    if (!comm.length)
      return Response.json({ error: "Community not found" }, { status: 404 });

    const community = comm[0];
    const isPrivate = community.community_type === "private";

    const existing = await sql(
      `SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, userId],
    );

    if (action === "leave") {
      if (!existing.length)
        return Response.json({ error: "Not a member" }, { status: 400 });
      // Owner cannot leave their own community
      if (community.created_by === userId)
        return Response.json(
          { error: "Owner cannot leave — transfer ownership first" },
          { status: 400 },
        );

      await sql(
        `DELETE FROM community_members WHERE community_id=$1 AND user_id=$2`,
        [communityId, userId],
      );
      await sql(
        `UPDATE communities SET member_count=GREATEST(0,member_count-1) WHERE id=$1`,
        [communityId],
      );

      return Response.json({ success: true, action: "left" });
    }

    if (action === "join" || action === "request_access") {
      if (existing.length)
        return Response.json({ success: true, action: "already_member" });

      if (isPrivate) {
        // For private communities: add a follow record as a "pending request" signal
        await sql(
          `INSERT INTO follows (follower_id, followee_type, followee_id)
           VALUES ($1, 'community', $2) ON CONFLICT DO NOTHING`,
          [userId, communityId],
        );
        // Notify owner
        await sql(
          `INSERT INTO notifications (user_id, notification_type, from_user_id, community_id, message)
           VALUES ($1, 'community_invite', $2, $3, $4)`,
          [
            community.created_by,
            userId,
            communityId,
            `requested to join ${community.name}`,
          ],
        );
        return Response.json({ success: true, action: "requested" });
      }

      // Public join
      await sql(
        `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'member')`,
        [communityId, userId],
      );
      await sql(
        `UPDATE communities SET member_count=member_count+1 WHERE id=$1`,
        [communityId],
      );

      // Activity feed
      try {
        await sql(
          `INSERT INTO activity_feed (user_id, activity_type, community_id) VALUES ($1,'joined_community',$2)`,
          [userId, communityId],
        );
      } catch (_) {}

      // Social feed post
      try {
        const authorRows = await sql(
          `SELECT first_name FROM users WHERE id = $1`,
          [userId],
        );
        const firstName = authorRows[0]?.first_name || "A golfer";
        await createFeedPost({
          userId,
          postType: "community_discussion",
          communityId: parseInt(communityId),
          caption: `${firstName} joined ${community.name}.`,
          metadata: { community_name: community.name, event: "joined" },
        });
      } catch (_) {}

      return Response.json({ success: true, action: "joined" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Join error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
