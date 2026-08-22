/**
 * POST /api/course-photos/upload
 *
 * Upload one or more photos for a course. Mark-as-played and course
 * gallery uploads are published immediately (moderation_status = 'approved').
 *
 * Body (JSON):
 *   { courseId, photos: [{ imageUrl, thumbnailUrl?, caption? }], reviewId?,
 *     termsAccepted: true, termsVersion }
 *
 * Rules:
 *  - Must be authenticated
 *  - User must have played the course (played_courses record exists)
 *  - Max 10 photos per review / standalone upload batch
 *  - termsAccepted must be true
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

const MAX_PHOTOS_PER_BATCH = 10;
const CURRENT_TERMS_VERSION = "1.0";

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { courseId, photos, reviewId, termsAccepted, termsVersion } = body;

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!courseId) {
    return Response.json({ error: "courseId is required" }, { status: 400 });
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    return Response.json(
      { error: "At least one photo is required" },
      { status: 400 },
    );
  }
  if (photos.length > MAX_PHOTOS_PER_BATCH) {
    return Response.json(
      { error: `Maximum ${MAX_PHOTOS_PER_BATCH} photos per upload batch` },
      { status: 400 },
    );
  }
  if (!termsAccepted) {
    return Response.json(
      { error: "You must accept the photo contribution terms" },
      { status: 400 },
    );
  }

  try {
    // Verify course exists
    const courseRows = await sql`SELECT id FROM courses WHERE id = ${courseId}`;
    if (!courseRows.length) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }

    // Verify user has played the course
    const playedRows = await sql(
      `SELECT id FROM played_courses WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId],
    );
    if (!playedRows.length) {
      return Response.json(
        {
          error:
            "You must have marked this course as played before uploading photos",
        },
        { status: 403 },
      );
    }

    // Validate each photo has an imageUrl
    for (const p of photos) {
      if (!p.imageUrl || typeof p.imageUrl !== "string") {
        return Response.json(
          { error: "Each photo must have a valid imageUrl" },
          { status: 400 },
        );
      }
    }

    const acceptedAt = new Date().toISOString();
    const tv = termsVersion || CURRENT_TERMS_VERSION;

    // Insert all photos in a single transaction
    const insertedIds = [];
    for (const p of photos) {
      const thumbnailUrl = p.thumbnailUrl || ucThumb(p.imageUrl, 400);
      const rows = await sql(
        `INSERT INTO course_photos
           (course_id, user_id, review_id, image_url, thumbnail_url, caption,
            photo_type, moderation_status, is_featured, is_official,
            terms_accepted_at, terms_version, uploaded_at)
         VALUES ($1,$2,$3,$4,$5,$6,'community','approved',false,false,$7,$8,NOW())
         RETURNING id`,
        [
          courseId,
          userId,
          reviewId || null,
          p.imageUrl,
          thumbnailUrl,
          p.caption || null,
          acceptedAt,
          tv,
        ],
      );
      insertedIds.push(rows[0].id);
    }

    return Response.json({
      success: true,
      photoIds: insertedIds,
      count: insertedIds.length,
      message: "Your photos are now live on the course page.",
    });
  } catch (err) {
    console.error("POST /api/course-photos/upload", err);
    return Response.json({ error: "Failed to upload photos" }, { status: 500 });
  }
}

/** Generate Uploadcare thumbnail URL */
function ucThumb(url, size = 400) {
  if (!url) return null;
  if (url.includes("ucarecdn.com")) {
    return url.replace(/\/?$/, `/-/preview/${size}x${size}/-/format/webp/`);
  }
  return url;
}
