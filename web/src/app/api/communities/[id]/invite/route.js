/**
 * POST /api/communities/:id/invite
 * Body: { userId } — admin sends invite to join a private community
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";
import { ensureCommunityInvitesTable } from "@/app/api/utils/ensureCommunityInvitesTable";

async function requireAdmin(communityId, userId) {
  const rows = await sql(
    `SELECT role FROM community_members WHERE community_id=$1 AND user_id=$2`,
    [communityId, userId],
  );
  if (!rows.length || rows[0].role !== "admin") return null;
  return rows[0];
}

export async function POST(request, { params }) {
  const adminId = await getSessionUserId();
  const communityId = parseInt(params.id, 10);
  const { userId: inviteeId } = await request.json();
  const inviteeUserId = parseInt(inviteeId, 10);

  if (!inviteeUserId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  if (inviteeUserId === adminId) {
    return Response.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  try {
    await ensureCommunityInvitesTable();

    if (!(await requireAdmin(communityId, adminId))) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const comm = await sql(
      `SELECT id, name, community_type FROM communities WHERE id=$1`,
      [communityId],
    );
    if (!comm.length) {
      return Response.json({ error: "Community not found" }, { status: 404 });
    }
    if (comm[0].community_type !== "private") {
      return Response.json(
        { error: "Invites are only for private communities" },
        { status: 400 },
      );
    }

    const invitee = await sql(`SELECT id FROM users WHERE id=$1`, [
      inviteeUserId,
    ]);
    if (!invitee.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const member = await sql(
      `SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, inviteeUserId],
    );
    if (member.length) {
      return Response.json({ error: "User is already a member" }, { status: 400 });
    }

    const existing = await sql(
      `SELECT id, status FROM community_invites
       WHERE community_id=$1 AND invitee_id=$2`,
      [communityId, inviteeUserId],
    );

    if (existing.length && existing[0].status === "pending") {
      return Response.json({
        success: true,
        inviteId: existing[0].id,
        action: "already_invited",
      });
    }

    const wasDeclined =
      existing.length && existing[0].status === "declined";

    const rows = await sql(
      `INSERT INTO community_invites (community_id, inviter_id, invitee_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (community_id, invitee_id) DO UPDATE SET
         status = 'pending',
         inviter_id = EXCLUDED.inviter_id,
         responded_at = NULL,
         created_at = CASE
           WHEN community_invites.status = 'declined' THEN NOW()
           ELSE community_invites.created_at
         END
       RETURNING id`,
      [communityId, adminId, inviteeUserId],
    );

    if (!existing.length || wasDeclined) {
      await createNotification({
        userId: inviteeUserId,
        notificationType: "community_invite_received",
        fromUserId: adminId,
        communityId,
        message: `invited you to join ${comm[0].name}`,
      });
    }

    return Response.json({
      success: true,
      inviteId: rows[0].id,
      action: wasDeclined || !existing.length ? "invited" : "already_invited",
    });
  } catch (error) {
    console.error("Community invite error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
