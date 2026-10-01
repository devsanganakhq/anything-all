/**
 * POST /api/course-photos/[photoId]/like
 *
 * Set or toggle like on an approved community photo.
 * Body (optional): { liked: boolean } — when provided, sets that state
 * instead of toggling (avoids double-request races that like then unlike).
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function POST(request, { params }) {
  let userId;
  try {
    // Pass request so mobile Bearer JWT auth works (cookies alone often missing on iOS)
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const resolved = await params;
  const photoId = Number(resolved?.photoId);
  if (!Number.isFinite(photoId) || photoId <= 0) {
    return Response.json({ error: "Invalid photo id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const wantLiked =
    typeof body?.liked === "boolean" ? body.liked : null;

  try {
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

    const existing = await sql(
      `SELECT photo_id FROM course_photo_likes WHERE photo_id = $1 AND user_id = $2`,
      [photoId, userId],
    );
    const currentlyLiked = existing.length > 0;
    const nextLiked = wantLiked === null ? !currentlyLiked : wantLiked;

    if (nextLiked && !currentlyLiked) {
      await sql(
        `INSERT INTO course_photo_likes (photo_id, user_id) VALUES ($1, $2)
         ON CONFLICT (photo_id, user_id) DO NOTHING`,
        [photoId, userId],
      );
      await sql(
        `UPDATE course_photos SET like_count = COALESCE(like_count, 0) + 1 WHERE id = $1`,
        [photoId],
      );
    } else if (!nextLiked && currentlyLiked) {
      await sql(
        `DELETE FROM course_photo_likes WHERE photo_id = $1 AND user_id = $2`,
        [photoId, userId],
      );
      await sql(
        `UPDATE course_photos SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) WHERE id = $1`,
        [photoId],
      );
    }

    const updated = await sql(
      `SELECT like_count FROM course_photos WHERE id = $1`,
      [photoId],
    );

    return Response.json({
      liked: nextLiked,
      likeCount: Number(updated[0]?.like_count) || 0,
    });
  } catch (err) {
    console.error("POST /api/course-photos/[photoId]/like", {
      message: err?.message,
      code: err?.code,
    });
    return Response.json(
      { error: "Failed to update like", detail: err?.message },
      { status: 500 },
    );
  }
}
