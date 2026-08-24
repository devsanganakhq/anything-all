/**
 * POST /api/communities/:id/invites/respond
 * Body: { inviteId, action: "accept" | "decline" }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";
import { addCommunityMember } from "@/app/api/utils/addCommunityMember";
import { ensureCommunityInvitesTable } from "@/app/api/utils/ensureCommunityInvitesTable";
import { ensureCommunityJoinRequestsTable } from "@/app/api/utils/ensureCommunityJoinRequestsTable";

export async function POST(request, { params }) {
  const userId = await getSessionUserId();
  const communityId = parseInt(params.id, 10);
  const { inviteId, action } = await request.json();

  if (!inviteId || !["accept", "decline"].includes(action)) {
    return Response.json(
      { error: "inviteId and action (accept|decline) required" },
      { status: 400 },
    );
  }

  try {
    await ensureCommunityInvitesTable();
    await ensureCommunityJoinRequestsTable();

    const inviteRows = await sql(
      `SELECT ci.*, c.name AS community_name
       FROM community_invites ci
       JOIN communities c ON c.id = ci.community_id
       WHERE ci.id = $1 AND ci.community_id = $2 AND ci.status = 'pending'`,
      [inviteId, communityId],
    );
    if (!inviteRows.length) {
      return Response.json({ error: "Invite not found" }, { status: 404 });
    }

    const invite = inviteRows[0];
    if (invite.invitee_id !== userId) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === "decline") {
      await sql(
        `UPDATE community_invites SET status='declined', responded_at=NOW() WHERE id=$1`,
        [inviteId],
      );

      await createNotification({
        userId: invite.inviter_id,
        notificationType: "community_invite_declined",
        fromUserId: userId,
        communityId,
        message: `declined your invite to ${invite.community_name}`,
      });

      return Response.json({ success: true, action: "declined" });
    }

    const alreadyMember = await sql(
      `SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, userId],
    );
    if (!alreadyMember.length) {
      await addCommunityMember({
        communityId,
        userId,
        communityName: invite.community_name,
      });
    }

    await sql(
      `UPDATE community_invites SET status='accepted', responded_at=NOW() WHERE id=$1`,
      [inviteId],
    );

    await sql(
      `UPDATE community_join_requests
       SET status='accepted', reviewed_at=NOW(), reviewed_by=$1
       WHERE community_id=$2 AND user_id=$3 AND status='pending'`,
      [invite.inviter_id, communityId, userId],
    );

    await createNotification({
      userId: invite.inviter_id,
      notificationType: "community_invite_accepted",
      fromUserId: userId,
      communityId,
      message: `accepted your invite to ${invite.community_name}`,
    });

    return Response.json({ success: true, action: "accepted" });
  } catch (error) {
    console.error("Community invite respond error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
