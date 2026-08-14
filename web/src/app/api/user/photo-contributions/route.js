/**
 * GET /api/user/photo-contributions
 * Returns the current user's uploaded photos across all courses,
 * grouped by moderation_status, with stats summary.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
  const status = searchParams.get("status"); // pending | approved | rejected | all
  const offset = (page - 1) * limit;

  try {
    // ── Stats summary ────────────────────────────────────────────────────────
    const statsRows = await sql(
      `SELECT
         COUNT(*)                                             AS total_contributed,
         COUNT(*) FILTER (WHERE moderation_status='approved' AND deleted_at IS NULL) AS approved_count,
         COUNT(*) FILTER (WHERE moderation_status='pending'  AND deleted_at IS NULL) AS pending_count,
         COUNT(*) FILTER (WHERE moderation_status='rejected' AND deleted_at IS NULL) AS rejected_count,
         COUNT(*) FILTER (WHERE is_featured = true            AND deleted_at IS NULL) AS featured_count,
         COALESCE(SUM(like_count) FILTER (WHERE moderation_status='approved'), 0)    AS total_likes
       FROM course_photos
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    const stats = statsRows[0];

    // ── Photo list ────────────────────────────────────────────────────────────
    const statusFilter =
      !status || status === "all"
        ? ""
        : `AND cp.moderation_status = '${status.replace(/[^a-z_]/g, "")}'`;

    const rows = await sql(
      `SELECT cp.id, cp.image_url, cp.thumbnail_url, cp.caption,
              cp.photo_type, cp.moderation_status, cp.is_featured,
              cp.like_count, cp.report_count,
              cp.rejection_reason, cp.uploaded_at, cp.approved_at, cp.rejected_at,
              c.id AS course_id, c.name AS course_name, c.county, c.country
       FROM   course_photos cp
       JOIN   courses c ON c.id = cp.course_id
       WHERE  cp.user_id = $1
         AND  cp.deleted_at IS NULL
         ${statusFilter}
       ORDER  BY cp.uploaded_at DESC
       LIMIT  $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const countRows = await sql(
      `SELECT COUNT(*)::int AS total
       FROM   course_photos
       WHERE  user_id = $1 AND deleted_at IS NULL
       ${statusFilter}`,
      [userId],
    );

    return Response.json({
      stats: {
        totalContributed: parseInt(stats.total_contributed),
        approvedCount: parseInt(stats.approved_count),
        pendingCount: parseInt(stats.pending_count),
        rejectedCount: parseInt(stats.rejected_count),
        featuredCount: parseInt(stats.featured_count),
        totalLikes: parseInt(stats.total_likes),
      },
      photos: rows,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total ?? 0,
        hasMore: offset + rows.length < (countRows[0]?.total ?? 0),
      },
    });
  } catch (err) {
    console.error("GET /api/user/photo-contributions", err);
    return Response.json(
      { error: "Failed to fetch contributions" },
      { status: 500 },
    );
  }
}
