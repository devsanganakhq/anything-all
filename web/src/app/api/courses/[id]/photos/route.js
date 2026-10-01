/**
 * GET /api/courses/[id]/photos
 *
 * Returns the resolved hero media for a course using the priority logic:
 *   A. Paid official profile with official_hero_image_url → official hero first
 *   B. Approved community photos (featured → likes → date)
 *   C. Empty array → client shows branded placeholder
 *
 * Also returns user_liked array so client can show liked state per photo.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request, { params }) {
  const { id: courseId } = params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  // Try to get current user (optional — guests can view)
  let userId = null;
  try {
    userId = await getSessionUserId(request);
  } catch {}

  try {
    // ── Fetch course media config ───────────────────────────────────────────
    const courseRows = await sql`
      SELECT id, name, county, country,
             official_profile_status,
             official_hero_image_url,
             official_logo_url,
             official_gallery_enabled
      FROM   courses
      WHERE  id = ${courseId}
    `;
    if (!courseRows.length) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }
    const course = courseRows[0];

    // ── Official hero (Priority A) ──────────────────────────────────────────
    const officialHero =
      course.official_profile_status === "paid" &&
      course.official_hero_image_url
        ? {
            id: null,
            image_url: course.official_hero_image_url,
            thumbnail_url: ucThumb(course.official_hero_image_url, 400),
            caption: null,
            photo_type: "official_club",
            moderation_status: "approved",
            is_official: true,
            is_featured: false,
            like_count: 0,
            attribution: "Official club photo",
            user_liked: false,
          }
        : null;

    // ── Approved community photos (Priority B) ──────────────────────────────
    const communityRows = await sql(
      `SELECT cp.id, cp.image_url, cp.thumbnail_url, cp.caption,
              cp.photo_type, cp.moderation_status, cp.is_featured,
              cp.is_official, cp.like_count, cp.uploaded_at,
              u.first_name, u.last_name, u.profile_photo_url
       FROM   course_photos cp
       LEFT JOIN users u ON u.id = cp.user_id
       WHERE  cp.course_id         = $1
         AND  cp.moderation_status = 'approved'
         AND  cp.deleted_at IS NULL
       ORDER BY cp.is_featured DESC,
                cp.like_count   DESC,
                cp.uploaded_at  DESC
       LIMIT  $2 OFFSET $3`,
      [courseId, limit, offset],
    );

    // ── Current user's pending uploads (visible only to them) ───────────────
    let pendingRows = [];
    if (userId && page === 1) {
      pendingRows = await sql(
        `SELECT cp.id, cp.image_url, cp.thumbnail_url, cp.caption,
                cp.photo_type, cp.moderation_status, cp.is_featured,
                cp.is_official, cp.like_count, cp.uploaded_at,
                u.first_name, u.last_name, u.profile_photo_url
         FROM   course_photos cp
         LEFT JOIN users u ON u.id = cp.user_id
         WHERE  cp.course_id         = $1
           AND  cp.user_id           = $2
           AND  cp.moderation_status = 'pending'
           AND  cp.deleted_at IS NULL
         ORDER BY cp.uploaded_at DESC
         LIMIT 20`,
        [courseId, userId],
      );
    }

    // Total count for pagination
    const countRow = await sql(
      `SELECT COUNT(*)::int AS total
       FROM   course_photos
       WHERE  course_id         = $1
         AND  moderation_status = 'approved'
         AND  deleted_at IS NULL`,
      [courseId],
    );
    const total = countRow[0]?.total ?? 0;

    // Which photos has the current user liked?
    let likedSet = new Set();
    const allRowsForLikes = [...communityRows, ...pendingRows];
    if (userId && allRowsForLikes.length) {
      const photoIds = allRowsForLikes.map((r) => Number(r.id));
      const likedRows = await sql(
        `SELECT photo_id FROM course_photo_likes
         WHERE user_id = $1 AND photo_id = ANY($2::int[])`,
        [userId, photoIds],
      );
      likedSet = new Set(likedRows.map((r) => Number(r.photo_id)));
    }

    const shapePhoto = (r) => ({
      id: Number(r.id),
      image_url: r.image_url,
      thumbnail_url: r.thumbnail_url || ucThumb(r.image_url, 400),
      caption: r.caption,
      photo_type: r.photo_type,
      moderation_status: r.moderation_status,
      is_featured: r.is_featured,
      is_official: r.is_official,
      like_count: Number(r.like_count) || 0,
      uploaded_at: r.uploaded_at,
      attribution: r.first_name
        ? `Photo by ${r.first_name} ${r.last_name ?? ""}`.trim()
        : "Photo by member",
      user_liked: likedSet.has(Number(r.id)),
      is_pending: r.moderation_status === "pending",
    });

    // Shape community photos
    const communityPhotos = communityRows.map(shapePhoto);
    const pendingPhotos = pendingRows.map(shapePhoto);

    // ── Merge according to priority ─────────────────────────────────────────
    // Pending uploads from the current user appear first so they see their work
    const allPhotos = [
      ...pendingPhotos,
      ...(officialHero && page === 1 ? [officialHero] : []),
      ...communityPhotos,
    ];

    // Resolve hero image (prefer approved/official over pending)
    const publicPhotos = [
      ...(officialHero && page === 1 ? [officialHero] : []),
      ...communityPhotos,
    ];
    const heroImageUrl =
      publicPhotos.length > 0
        ? publicPhotos[0].image_url
        : pendingPhotos[0]?.image_url || null;

    return Response.json({
      photos: allPhotos,
      pendingCount: pendingPhotos.length,
      heroImageUrl,
      course: {
        id: course.id,
        name: course.name,
        county: course.county,
        country: course.country,
        officialProfileStatus: course.official_profile_status,
        officialLogoUrl: course.official_logo_url,
      },
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + communityPhotos.length < total,
      },
    });
  } catch (err) {
    console.error("GET /api/courses/[id]/photos", err);
    return Response.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}

/** Generate Uploadcare thumbnail URL by appending transform operations */
function ucThumb(url, size = 400) {
  if (!url) return null;
  // Uploadcare CDN format: https://ucarecdn.com/<uuid>/
  if (url.includes("ucarecdn.com")) {
    return url.replace(/\/?$/, `/-/preview/${size}x${size}/-/format/webp/`);
  }
  return url; // non-Uploadcare URLs returned as-is
}
