/**
 * GET /api/communities/:id  — community detail + membership status + moderators
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";
import { ensureCommunityJoinRequestsTable } from "@/app/api/utils/ensureCommunityJoinRequestsTable";
import { ensureCommunityInvitesTable } from "@/app/api/utils/ensureCommunityInvitesTable";

export async function GET(request, { params }) {
  const userId = (await getSessionUserIdOrNull(request)) ?? 0;
  const { id } = params;
  const communityId = parseInt(id, 10);

  try {
    await ensureCommunityJoinRequestsTable();
    await ensureCommunityInvitesTable();

    const rows = await sql(
      `SELECT
          c.*,
          COALESCE((SELECT muted FROM community_members WHERE community_id=c.id AND user_id=$2),false) AS muted,
          (SELECT COUNT(*)::int FROM community_members WHERE community_id=c.id) AS member_count,
          (SELECT COUNT(*)::int FROM community_posts WHERE community_id=c.id AND is_deleted=false) AS post_count,
          (SELECT role FROM community_members WHERE community_id=c.id AND user_id=$2 LIMIT 1) AS my_role,
          EXISTS(SELECT 1 FROM community_members WHERE community_id=c.id AND user_id=$2) AS is_member,
          EXISTS(
            SELECT 1 FROM community_join_requests
            WHERE community_id=c.id AND user_id=$2 AND status='pending'
          ) AS join_request_pending,
          EXISTS(
            SELECT 1 FROM community_invites
            WHERE community_id=c.id AND invitee_id=$2 AND status='pending'
          ) AS invite_pending,
          (SELECT id FROM community_invites
            WHERE community_id=c.id AND invitee_id=$2 AND status='pending'
            LIMIT 1) AS pending_invite_id,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ou.first_name, ou.last_name)), ''), 'Golfer') AS owner_name,
          ou.profile_photo_url AS owner_photo
        FROM communities c
        JOIN users ou ON c.created_by=ou.id
        WHERE c.id=$1`,
      [communityId, userId],
    );

    if (!rows.length)
      return Response.json({ error: "Not found" }, { status: 404 });

    const community = rows[0];

    if (community.community_type === "private" && !community.is_member) {
      return Response.json({
        community: {
          id: community.id,
          name: community.name,
          description: community.description,
          cover_photo_url: community.cover_photo_url,
          community_type: community.community_type,
          category: community.category,
          member_count: community.member_count,
          is_member: false,
          my_role: null,
          join_request_pending: community.join_request_pending,
          invite_pending: community.invite_pending,
          pending_invite_id: community.pending_invite_id,
        },
        locked: true,
      });
    }

    const mods = await sql(
      `SELECT
          u.id,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') AS name,
          u.profile_photo_url AS avatar,
          u.home_club_name AS home_club,
          cm.role,
          cm.joined_at
        FROM community_members cm
        JOIN users u ON cm.user_id=u.id
        WHERE cm.community_id=$1 AND cm.role IN ('admin','moderator')
        ORDER BY cm.role DESC, cm.joined_at ASC`,
      [communityId],
    );

    let pending_count = 0;
    if (community.my_role === "admin") {
      const pending = await sql(
        `SELECT COUNT(*)::int AS count FROM community_join_requests
         WHERE community_id=$1 AND status='pending'`,
        [communityId],
      );
      pending_count = pending[0]?.count ?? 0;
    }

    return Response.json({
      community,
      moderators: mods,
      locked: false,
      pending_count,
    });
  } catch (error) {
    console.error("Community detail error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
