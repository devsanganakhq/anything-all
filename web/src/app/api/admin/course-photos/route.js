/**
 * GET  /api/admin/course-photos  — list photos with filters (admin only)
 * Body filters: status, courseId, userId, page, limit
 */
import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET(request) {
  const check = await requireAdmin();
  if (!check.ok) return check.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";
  const courseId = searchParams.get("courseId");
  const userId = searchParams.get("userId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  // Build dynamic WHERE conditions
  const conditions = ["cp.deleted_at IS NULL"];
  const values = [];
  let idx = 1;

  if (status && status !== "all") {
    conditions.push(`cp.moderation_status = $${idx++}`);
    values.push(status);
  }
  if (courseId) {
    conditions.push(`cp.course_id = $${idx++}`);
    values.push(parseInt(courseId));
  }
  if (userId) {
    conditions.push(`cp.user_id = $${idx++}`);
    values.push(parseInt(userId));
  }

  const where = conditions.join(" AND ");

  try {
    const rows = await sql(
      `SELECT cp.id, cp.image_url, cp.thumbnail_url, cp.caption,
              cp.photo_type, cp.moderation_status, cp.is_featured, cp.is_official,
              cp.like_count, cp.report_count, cp.rejection_reason,
              cp.uploaded_at, cp.approved_at, cp.rejected_at,
              cp.course_id, c.name AS course_name,
              cp.user_id,
              u.first_name, u.last_name, u.email,
              cp.review_id,
              (SELECT COUNT(*)::int FROM course_photo_reports r
               WHERE r.photo_id = cp.id AND r.status = 'open') AS open_reports
       FROM   course_photos cp
       JOIN   courses c ON c.id = cp.course_id
       LEFT JOIN users u ON u.id = cp.user_id
       WHERE  ${where}
       ORDER  BY cp.uploaded_at DESC
       LIMIT  $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset],
    );

    const countRows = await sql(
      `SELECT COUNT(*)::int AS total FROM course_photos cp WHERE ${where}`,
      values,
    );

    // Status summary counts
    const summaryRows = await sql`
      SELECT moderation_status, COUNT(*)::int AS count
      FROM   course_photos
      WHERE  deleted_at IS NULL
      GROUP  BY moderation_status
    `;
    const summary = Object.fromEntries(
      summaryRows.map((r) => [r.moderation_status, r.count]),
    );

    return Response.json({
      photos: rows,
      summary: {
        pending: summary.pending ?? 0,
        approved: summary.approved ?? 0,
        rejected: summary.rejected ?? 0,
        removed: summary.removed ?? 0,
      },
      pagination: {
        page,
        limit,
        total: countRows[0]?.total ?? 0,
        hasMore: offset + rows.length < (countRows[0]?.total ?? 0),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/course-photos", err);
    return Response.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}
