/**
 * POST /api/communities/join
 * Body: { communityId, action }
 * action: "join" | "leave" | "request_access"
 *
 * - Public  community: join immediately
 * - Private community: creates a pending join request
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";
import { addCommunityMember } from "@/app/api/utils/addCommunityMember";
import { ensureCommunityJoinRequestsTable } from "@/app/api/utils/ensureCommunityJoinRequestsTable";

export async function POST(request) {
  const userId = await getSessionUserId();
  const { communityId, action = "join" } = await request.json();
  if (!communityId)
    return Response.json({ error: "communityId required" }, { status: 400 });

  try {
    await ensureCommunityJoinRequestsTable();

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

      await createNotification({
        userId: community.created_by,
        notificationType: "community_leave",
        fromUserId: userId,
        communityId: parseInt(communityId, 10),
        message: `left community ${community.name}`,
      });

      return Response.json({ success: true, action: "left" });
    }

    if (action === "join" || action === "request_access") {
      if (existing.length)
        return Response.json({ success: true, action: "already_member" });

      if (isPrivate) {
        const existingReq = await sql(
          `SELECT id, status FROM community_join_requests
           WHERE community_id=$1 AND user_id=$2`,
          [communityId, userId],
        );

        if (existingReq.length && existingReq[0].status === "pending") {
          return Response.json({ success: true, action: "requested" });
        }

        const wasDeclined =
          existingReq.length && existingReq[0].status === "declined";

        await sql(
          `INSERT INTO community_join_requests (community_id, user_id, status)
           VALUES ($1, $2, 'pending')
           ON CONFLICT (community_id, user_id) DO UPDATE SET
             status = 'pending',
             reviewed_at = NULL,
             reviewed_by = NULL,
             created_at = CASE
               WHEN community_join_requests.status = 'declined' THEN NOW()
               ELSE community_join_requests.created_at
             END`,
          [communityId, userId],
        );

        if (!existingReq.length || wasDeclined) {
          await createNotification({
            userId: community.created_by,
            notificationType: "community_invite",
            fromUserId: userId,
            communityId: parseInt(communityId, 10),
            message: `requested to join community ${community.name}`,
          });
        }

        return Response.json({ success: true, action: "requested" });
      }

      await addCommunityMember({
        communityId,
        userId,
        communityName: community.name,
      });

      await createNotification({
        userId: community.created_by,
        notificationType: "community_join",
        fromUserId: userId,
        communityId: parseInt(communityId, 10),
        message: `joined community ${community.name}`,
      });

      return Response.json({ success: true, action: "joined" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Join error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
