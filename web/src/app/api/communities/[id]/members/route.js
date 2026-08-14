/**
 * GET /api/communities/:id/members
 * Returns members grouped by role (admin → moderator → member).
 * Never exposes email addresses.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";

export async function GET(request, { params }) {
  const userId = (await getSessionUserIdOrNull()) ?? 0;
  const { id } = params;
  const communityId = parseInt(id, 10);

  try {
    // Must be a member to see member list
    const membership = await sql(
      `SELECT role FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, userId],
    );
    if (!membership.length) {
      // Check if community is public first
      const comm = await sql(
        `SELECT community_type FROM communities WHERE id=$1`,
        [communityId],
      );
      if (comm[0]?.community_type === "private") {
        return Response.json(
          { error: "Members list is private" },
          { status: 403 },
        );
      }
    }

    const members = await sql(
      `SELECT
          u.id,
          u.first_name||' '||u.last_name AS name,
          u.profile_photo_url            AS avatar,
          u.location,
          u.home_club_name               AS home_club,
          u.handicap,
          cm.role,
          cm.joined_at,
          (SELECT COUNT(*)::int FROM played_courses WHERE user_id=u.id) AS courses_played,
          c.created_by = u.id AS is_owner
        FROM community_members cm
        JOIN users u ON cm.user_id=u.id
        JOIN communities c ON cm.community_id=c.id
        WHERE cm.community_id=$1
        ORDER BY
          CASE cm.role WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END,
          cm.joined_at ASC`,
      [communityId],
    );

    return Response.json({ members, total: members.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
