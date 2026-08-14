/**
 * GET /api/communities/:id  — community detail + membership status + moderators
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";

export async function GET(request, { params }) {
  const userId = (await getSessionUserIdOrNull()) ?? 0;
  const { id } = params;
  const communityId = parseInt(id, 10);

  try {
    const rows = await sql(
      `SELECT
          c.*,
          (SELECT COUNT(*)::int FROM community_members WHERE community_id=c.id) AS member_count,
          (SELECT COUNT(*)::int FROM community_posts WHERE community_id=c.id AND is_deleted=false) AS post_count,
          (SELECT role FROM community_members WHERE community_id=c.id AND user_id=$2 LIMIT 1) AS my_role,
          EXISTS(SELECT 1 FROM community_members WHERE community_id=c.id AND user_id=$2) AS is_member,
          -- owner info
          ou.first_name||' '||ou.last_name AS owner_name,
          ou.profile_photo_url AS owner_photo
        FROM communities c
        JOIN users ou ON c.created_by=ou.id
        WHERE c.id=$1`,
      [communityId, userId],
    );

    if (!rows.length)
      return Response.json({ error: "Not found" }, { status: 404 });

    const community = rows[0];

    // Private community: only members can see full detail
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
        },
        locked: true,
      });
    }

    // Moderators / admins
    const mods = await sql(
      `SELECT
          u.id,
          u.first_name||' '||u.last_name AS name,
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

    return Response.json({ community, moderators: mods, locked: false });
  } catch (error) {
    console.error("Community detail error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
