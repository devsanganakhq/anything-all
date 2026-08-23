/**
 * POST /api/course-photos/upload
 *
 * Upload one or more photos for a course. Mark-as-played and course
 * gallery uploads are published immediately (moderation_status = 'approved').
 * Photos are also attached to the matching feed post so they appear on Home.
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
import {
  createFeedPost,
  buildCaption,
} from "@/app/api/utils/createFeedPost";

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
    const courseRows =
      await sql`SELECT id, name FROM courses WHERE id = ${courseId}`;
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
    const linkedReviewId = reviewId || playedRows[0].id;

    // Insert all photos
    const insertedIds = [];
    const mediaUrls = [];
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
          linkedReviewId || null,
          p.imageUrl,
          thumbnailUrl,
          p.caption || null,
          acceptedAt,
          tv,
        ],
      );
      insertedIds.push(rows[0].id);
      mediaUrls.push(p.imageUrl);
    }

    // Attach photos to the matching feed post (review preferred)
    await attachPhotosToFeedPost({
      userId,
      courseId,
      reviewId: linkedReviewId,
      mediaUrls,
      courseName: courseRows[0].name,
    });

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

async function attachPhotosToFeedPost({
  userId,
  courseId,
  reviewId,
  mediaUrls,
  courseName,
}) {
  if (!mediaUrls?.length) return;

  try {
    let posts = [];
    if (reviewId) {
      posts = await sql(
        `SELECT id, post_type FROM feed_posts
          WHERE author_id = $1 AND course_id = $2
            AND post_type IN ('review', 'played_course', 'photos')
            AND (
              (metadata->>'review_id')::int = $3
              OR metadata->>'review_id' IS NULL
            )
          ORDER BY
            CASE post_type
              WHEN 'review' THEN 0
              WHEN 'photos' THEN 1
              ELSE 2
            END,
            created_at DESC
          LIMIT 1`,
        [userId, courseId, reviewId],
      );
    }
    if (!posts.length) {
      posts = await sql(
        `SELECT id, post_type FROM feed_posts
          WHERE author_id = $1 AND course_id = $2
            AND post_type IN ('review', 'played_course', 'photos')
          ORDER BY
            CASE post_type
              WHEN 'review' THEN 0
              WHEN 'photos' THEN 1
              ELSE 2
            END,
            created_at DESC
          LIMIT 1`,
        [userId, courseId],
      );
    }

    let postId = posts[0]?.id;
    if (!postId) {
      const authorRows = await sql(
        `SELECT first_name FROM users WHERE id = $1`,
        [userId],
      );
      const firstName = authorRows[0]?.first_name || "A golfer";
      await createFeedPost({
        userId,
        postType: "photos",
        courseId,
        caption: buildCaption("photos", {
          firstName,
          courseName,
          count: mediaUrls.length,
        }),
        metadata: {
          review_id: reviewId || null,
          photo_count: mediaUrls.length,
        },
        mediaUrls,
      });
      return;
    }

    const existing = await sql(
      `SELECT COALESCE(MAX(display_order), -1)::int AS max_order
         FROM feed_post_media WHERE post_id = $1`,
      [postId],
    );
    let order = (existing[0]?.max_order ?? -1) + 1;
    for (const url of mediaUrls) {
      await sql(
        `INSERT INTO feed_post_media (post_id, media_url, media_type, display_order)
         VALUES ($1, $2, 'photo', $3)`,
        [postId, url, order++],
      );
    }

    if (reviewId) {
      await sql(
        `UPDATE feed_posts
            SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
          WHERE id = $1`,
        [postId, JSON.stringify({ review_id: reviewId })],
      );
    }
  } catch (err) {
    console.error("attachPhotosToFeedPost:", err);
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
