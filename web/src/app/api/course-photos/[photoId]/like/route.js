/**
 * POST /api/course-photos/[photoId]/like
 * Toggle like/unlike on an approved community photo.
 * One like per user per photo. like_count is maintained safely.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function POST(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { photoId } = params;

  try {
    // Verify photo exists and is approved
    const photoRows = await sql(
      `SELECT id, like_count, moderation_status FROM course_photos
       WHERE id = $1 AND deleted_at IS NULL`,
      [photoId],
    );
    if (!photoRows.length) {
      return Response.json({ error: "Photo not found" }, { status: 404 });
    }
    if (photoRows[0].moderation_status !== "approved") {
      return Response.json(
        { error: "Can only like approved photos" },
        { status: 403 },
      );
    }

    // Check existing like
    const existing = await sql(
      `SELECT id FROM course_photo_likes WHERE photo_id = $1 AND user_id = $2`,
      [photoId, userId],
    );

    let liked;
    if (existing.length > 0) {
      // Unlike
      await sql(
        `DELETE FROM course_photo_likes WHERE photo_id = $1 AND user_id = $2`,
        [photoId, userId],
      );
      await sql(
        `UPDATE course_photos SET like_count = GREATEST(0, like_count - 1) WHERE id = $1`,
        [photoId],
      );
      liked = false;
    } else {
      // Like
      await sql(
        `INSERT INTO course_photo_likes (photo_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [photoId, userId],
      );
      await sql(
        `UPDATE course_photos SET like_count = like_count + 1 WHERE id = $1`,
        [photoId],
      );
      liked = true;
    }

    const updated = await sql(
      `SELECT like_count FROM course_photos WHERE id = $1`,
      [photoId],
    );

    return Response.json({ liked, likeCount: updated[0]?.like_count ?? 0 });
  } catch (err) {
    console.error("POST /api/course-photos/[photoId]/like", err);
    return Response.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
