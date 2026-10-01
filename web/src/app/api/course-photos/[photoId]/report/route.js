/**
 * POST /api/course-photos/[photoId]/report
 * Report an approved photo. Does not auto-delete — flags for admin review.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

const VALID_REASONS = [
  "inappropriate_content",
  "not_this_course",
  "copyright_concern",
  "personal_information",
  "poor_quality_duplicate",
  "other",
];

export async function POST(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { photoId } = await params;
  const { reason, details } = await request.json().catch(() => ({}));

  if (!VALID_REASONS.includes(reason)) {
    return Response.json({ error: "Invalid report reason" }, { status: 400 });
  }

  try {
    // Verify photo is public (approved)
    const photoRows = await sql(
      `SELECT id, report_count FROM course_photos
       WHERE id = $1 AND moderation_status = 'approved' AND deleted_at IS NULL`,
      [photoId],
    );
    if (!photoRows.length) {
      return Response.json(
        { error: "Photo not found or not reportable" },
        { status: 404 },
      );
    }

    // Prevent duplicate report from same user
    const dup = await sql(
      `SELECT id FROM course_photo_reports
       WHERE photo_id = $1 AND reported_by_user_id = $2`,
      [photoId, userId],
    );
    if (dup.length) {
      return Response.json(
        { error: "You have already reported this photo" },
        { status: 409 },
      );
    }

    await sql(
      `INSERT INTO course_photo_reports
         (photo_id, reported_by_user_id, reason, details, status)
       VALUES ($1, $2, $3, $4, 'open')`,
      [photoId, userId, reason, details || null],
    );

    // Increment report_count on the photo
    await sql(
      `UPDATE course_photos SET report_count = report_count + 1 WHERE id = $1`,
      [photoId],
    );

    return Response.json({
      success: true,
      message: "Report submitted. Thank you — our team will review this photo.",
    });
  } catch (err) {
    console.error("POST /api/course-photos/[photoId]/report", err);
    return Response.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
