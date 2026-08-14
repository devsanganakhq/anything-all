/**
 * PATCH /api/admin/course-photos/[photoId]
 *
 * Admin moderation actions on a single photo.
 * Body: { action, reason? }
 *
 * Allowed actions:
 *   approve     — set moderation_status = approved
 *   reject      — set moderation_status = rejected (reason required)
 *   remove      — set moderation_status = removed  (soft-delete public display)
 *   feature     — set is_featured = true
 *   unfeature   — set is_featured = false
 *   reorder     — set display_order = { displayOrder }
 *
 * All actions write to admin_audit_log.
 */
import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

const VALID_ACTIONS = [
  "approve",
  "reject",
  "remove",
  "feature",
  "unfeature",
  "reorder",
];

export async function PATCH(request, { params }) {
  const check = await requireAdmin();
  if (!check.ok) return check.response;
  const adminUserId = check.userId;

  const { photoId } = params;
  const { action, reason, displayOrder } = await request
    .json()
    .catch(() => ({}));

  if (!VALID_ACTIONS.includes(action)) {
    return Response.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  if (action === "reject" && !reason?.trim()) {
    return Response.json(
      { error: "A rejection reason is required" },
      { status: 400 },
    );
  }

  try {
    // Fetch current photo state
    const rows = await sql(
      `SELECT cp.id, cp.moderation_status, cp.is_featured,
              cp.course_id, cp.user_id,
              c.name AS course_name
       FROM   course_photos cp
       JOIN   courses c ON c.id = cp.course_id
       WHERE  cp.id = $1`,
      [photoId],
    );

    if (!rows.length) {
      return Response.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = rows[0];
    const prevStatus = photo.moderation_status;

    // ── Apply action ─────────────────────────────────────────────────────────
    let updateSql, auditAction, auditNote;

    switch (action) {
      case "approve":
        await sql(
          `UPDATE course_photos
           SET moderation_status = 'approved', approved_at = NOW(), approved_by = $1,
               rejected_at = NULL, rejected_by = NULL, rejection_reason = NULL, deleted_at = NULL
           WHERE id = $2`,
          [adminUserId, photoId],
        );
        auditAction = "course_photo_approved";
        auditNote = `Photo #${photoId} approved for course "${photo.course_name}"`;
        break;

      case "reject":
        await sql(
          `UPDATE course_photos
           SET moderation_status = 'rejected', rejected_at = NOW(), rejected_by = $1,
               rejection_reason = $2
           WHERE id = $3`,
          [adminUserId, reason, photoId],
        );
        auditAction = "course_photo_rejected";
        auditNote = `Photo #${photoId} rejected: ${reason}`;
        break;

      case "remove":
        await sql(
          `UPDATE course_photos
           SET moderation_status = 'removed', deleted_at = NOW(), rejected_by = $1,
               rejection_reason = $2
           WHERE id = $3`,
          [adminUserId, reason || "Removed by admin", photoId],
        );
        auditAction = "course_photo_removed";
        auditNote = `Photo #${photoId} removed from course "${photo.course_name}"`;
        break;

      case "feature":
        await sql(`UPDATE course_photos SET is_featured = true WHERE id = $1`, [
          photoId,
        ]);
        auditAction = "course_photo_featured";
        auditNote = `Photo #${photoId} marked as featured`;
        break;

      case "unfeature":
        await sql(
          `UPDATE course_photos SET is_featured = false WHERE id = $1`,
          [photoId],
        );
        auditAction = "course_photo_unfeatured";
        auditNote = `Photo #${photoId} removed from featured`;
        break;

      case "reorder":
        if (typeof displayOrder !== "number") {
          return Response.json(
            { error: "displayOrder (number) is required for reorder" },
            { status: 400 },
          );
        }
        await sql(`UPDATE course_photos SET display_order = $1 WHERE id = $2`, [
          displayOrder,
          photoId,
        ]);
        auditAction = "course_photo_reordered";
        auditNote = `Photo #${photoId} display_order set to ${displayOrder}`;
        break;
    }

    // ── Write audit log ───────────────────────────────────────────────────────
    await sql(
      `INSERT INTO admin_audit_log
         (admin_user_id, action, target_type, target_id, target_user_id, note,
          previous_value, new_value, metadata)
       VALUES ($1, $2, 'course_photo', $3, $4, $5, $6, $7, $8)`,
      [
        adminUserId,
        auditAction,
        photoId,
        photo.user_id,
        auditNote,
        prevStatus,
        action === "feature" || action === "unfeature"
          ? String(action === "feature")
          : action,
        JSON.stringify({
          courseId: photo.course_id,
          courseName: photo.course_name,
        }),
      ],
    );

    return Response.json({ success: true, action });
  } catch (err) {
    console.error("PATCH /api/admin/course-photos/[photoId]", err);
    return Response.json(
      { error: "Moderation action failed" },
      { status: 500 },
    );
  }
}
