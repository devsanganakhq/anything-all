/**
 * GET /api/communities/:id/invites — list pending sent invites (admin only)
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { ensureCommunityInvitesTable } from "@/app/api/utils/ensureCommunityInvitesTable";

async function requireAdmin(communityId, userId) {
  const rows = await sql(
    `SELECT role FROM community_members WHERE community_id=$1 AND user_id=$2`,
    [communityId, userId],
  );
  if (!rows.length || rows[0].role !== "admin") return null;
  return rows[0];
}

export async function GET(request, { params }) {
  const userId = await getSessionUserId();
  const communityId = parseInt(params.id, 10);

  try {
    await ensureCommunityInvitesTable();

    if (!(await requireAdmin(communityId, userId))) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const invites = await sql(
      `SELECT
          ci.id,
          ci.invitee_id AS user_id,
          ci.created_at AS invited_at,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') AS name,
          u.profile_photo_url AS avatar,
          u.home_club_name AS home_club,
          u.location
        FROM community_invites ci
        JOIN users u ON ci.invitee_id = u.id
        WHERE ci.community_id = $1 AND ci.status = 'pending'
        ORDER BY ci.created_at DESC`,
      [communityId],
    );

    return Response.json({ invites, pending_count: invites.length });
  } catch (error) {
    console.error("Community invites list error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
