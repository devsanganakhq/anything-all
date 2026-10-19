/**
 * GET /api/communities/list
 * Params: filter (my|discover|all), q (search), category
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";
import { ensureCommunityJoinRequestsTable } from "@/app/api/utils/ensureCommunityJoinRequestsTable";

export async function GET(request) {
  const userId = (await getSessionUserIdOrNull(request)) ?? 0;
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  const q = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "").trim();

  const searchClause = q
    ? `AND (LOWER(c.name) LIKE LOWER('%${q.replace(/'/g, "''")}%') OR LOWER(COALESCE(c.description,'')) LIKE LOWER('%${q.replace(/'/g, "''")}%'))`
    : "";
  const categoryClause = category
    ? `AND c.category = '${category.replace(/'/g, "''")}'`
    : "";

  const pendingClause =
    userId > 0
      ? `EXISTS(SELECT 1 FROM community_join_requests WHERE community_id=c.id AND user_id=${userId} AND status='pending') AS join_request_pending`
      : `false AS join_request_pending`;

  try {
    await ensureCommunityJoinRequestsTable();

    let communities;

    if (filter === "my") {
      communities = await sql(
        `SELECT * FROM (
            SELECT
              c.*,
              cm.role,
              cm.joined_at,
              (SELECT COUNT(*)::int FROM community_members WHERE community_id=c.id) AS member_count,
              (SELECT COUNT(*)::int FROM community_posts  WHERE community_id=c.id AND created_at > NOW()-INTERVAL'7 days' AND is_deleted=false) AS recent_posts,
              (SELECT MAX(created_at) FROM community_posts  WHERE community_id=c.id AND is_deleted=false) AS last_post_at,
              (SELECT MAX(created_at) FROM community_chat_messages WHERE community_id=c.id AND is_deleted=false) AS last_chat_at,
              ${pendingClause}
            FROM communities c
            JOIN community_members cm ON c.id=cm.community_id
            WHERE cm.user_id=$1 ${searchClause} ${categoryClause}
          ) ranked
          ORDER BY GREATEST(COALESCE(last_post_at, created_at), COALESCE(last_chat_at, created_at)) DESC`,
        [userId],
      );
    } else if (filter === "discover") {
      communities = await sql(
        `SELECT
            c.*,
            (SELECT COUNT(*)::int FROM community_members WHERE community_id=c.id) AS member_count,
            (SELECT COUNT(*)::int FROM community_posts  WHERE community_id=c.id AND created_at > NOW()-INTERVAL'7 days' AND is_deleted=false) AS recent_posts,
            false AS is_member,
            NULL  AS role,
            ${pendingClause}
          FROM communities c
          WHERE NOT EXISTS(SELECT 1 FROM community_members WHERE community_id=c.id AND user_id=$1)
            ${searchClause} ${categoryClause}
          ORDER BY (SELECT COUNT(*)::int FROM community_members WHERE community_id=c.id) DESC
          LIMIT 30`,
        [userId],
      );
    } else {
      communities = await sql(
        `SELECT
            c.*,
            (SELECT COUNT(*)::int FROM community_members WHERE community_id=c.id) AS member_count,
            (SELECT COUNT(*)::int FROM community_posts  WHERE community_id=c.id AND created_at > NOW()-INTERVAL'7 days' AND is_deleted=false) AS recent_posts,
            EXISTS(SELECT 1 FROM community_members WHERE community_id=c.id AND user_id=$1) AS is_member,
            (SELECT role FROM community_members WHERE community_id=c.id AND user_id=$1 LIMIT 1) AS role,
            ${pendingClause}
          FROM communities c
          WHERE 1=1 ${searchClause} ${categoryClause}
          ORDER BY (SELECT COUNT(*)::int FROM community_members WHERE community_id=c.id) DESC
          LIMIT 50`,
        [userId],
      );
    }

    return Response.json({ communities });
  } catch (error) {
    console.error("Communities list error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
