/**
 * DELETE /api/course-photos/[photoId]
 * A user can delete their own PENDING photo before it is approved.
 * Approved photos cannot be self-deleted — they must go through admin removal.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function DELETE(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { photoId } = await params;

  try {
    const rows = await sql(
      `SELECT id, user_id, moderation_status FROM course_photos
       WHERE id = $1 AND deleted_at IS NULL`,
      [photoId],
    );

    if (!rows.length) {
      return Response.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = rows[0];

    if (photo.user_id !== userId) {
      return Response.json(
        { error: "You can only delete your own photos" },
        { status: 403 },
      );
    }

    if (photo.moderation_status !== "pending") {
      return Response.json(
        {
          error:
            "Only pending photos can be deleted. Contact support to remove approved photos.",
        },
        { status: 403 },
      );
    }

    // Soft-delete
    await sql(`UPDATE course_photos SET deleted_at = NOW() WHERE id = $1`, [
      photoId,
    ]);

    return Response.json({ success: true, message: "Photo removed." });
  } catch (err) {
    console.error("DELETE /api/course-photos/[photoId]", err);
    return Response.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}
