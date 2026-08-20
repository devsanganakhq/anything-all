/**
 * GET /api/courses/map
 *
 * Returns courses with valid coordinates for map rendering.
 * Auth is optional — guests see all courses, authenticated users
 * also receive user_played / user_wishlisted status.
 *
 * Media priority per course (spec §5):
 *   1. paid official hero image → media_display_type: 'official_image'
 *   2. highest-priority approved community photo (thumbnail) → 'community_photo'
 *   3. official club logo → 'club_logo'
 *   4. no image → 'placeholder'  (client renders CourseImagePlaceholder)
 *
 * Filters:
 *   ?filter=ALL | MINE | PLAYED | WISHLIST
 *     MINE — courses the signed-in user has played or saved (their golf map)
 *   ?country=Scotland
 *   ?ranking=Top 100 Britain & Ireland
 *   ?mvpOnly=true  — only courses with mvp_data_status = 'ready'
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

// Generate Uploadcare thumbnail URL
function ucThumb(url, size = 400) {
  if (!url) return null;
  if (url.includes("ucarecdn.com")) {
    return url.replace(/\/?$/, `/-/preview/${size}x${size}/-/format/webp/`);
  }
  return url;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "ALL";
  const country = searchParams.get("country") || "";
  const ranking = searchParams.get("ranking") || "";
  const mvpOnly = searchParams.get("mvpOnly") === "true";

  // Auth optional — guests get no user status
  let userId = null;
  try {
    userId = await getSessionUserId(request);
  } catch {}

  // A guest has no played/saved courses, so any personal filter is empty
  // rather than "every course".
  if (!userId && filter !== "ALL") {
    return Response.json({ courses: [], total: 0 });
  }

  try {
    // ── Build WHERE conditions ─────────────────────────────────────────────
    const conditions = [
      "c.latitude  IS NOT NULL",
      "c.longitude IS NOT NULL",
      "NOT (c.latitude = 0 AND c.longitude = 0)",
      "c.course_status <> 'permanently_closed'",
    ];
    // Cast as int so Neon can type a null guest userId ($1::int IS NOT NULL)
    const params = [userId]; // $1 = userId (null for guests)
    let idx = 2;

    if (country) {
      conditions.push(`c.country = $${idx++}`);
      params.push(country);
    }
    if (ranking) {
      conditions.push(`EXISTS (
        SELECT 1 FROM rankings r2
        WHERE r2.course_id = c.id
          AND r2.ranking_name = $${idx++}
          AND r2.is_active = true
      )`);
      params.push(ranking);
    }
    if (mvpOnly) {
      conditions.push(`c.mvp_data_status = 'ready'`);
    }

    // ── Filter joins (authenticated only) ─────────────────────────────────
    let joinClause = "";
    if (userId && filter === "PLAYED") {
      joinClause = `JOIN played_courses pf ON pf.course_id = c.id AND pf.user_id = $1::int`;
    } else if (userId && filter === "WISHLIST") {
      joinClause = `
        JOIN wishlist wf ON wf.course_id = c.id AND wf.user_id = $1::int
        LEFT JOIN played_courses pf2 ON pf2.course_id = c.id AND pf2.user_id = $1::int`;
      conditions.push("pf2.id IS NULL");
    } else if (userId && filter === "MINE") {
      // EXISTS rather than joins so a course that is both played and saved
      // is still returned once.
      conditions.push(`(
        EXISTS (SELECT 1 FROM played_courses pm
                WHERE pm.course_id = c.id AND pm.user_id = $1::int)
        OR EXISTS (SELECT 1 FROM wishlist wm
                   WHERE wm.course_id = c.id AND wm.user_id = $1::int)
      )`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const rows = await sql(
      `SELECT
          -- identity
          c.id,
          c.name,
          c.club_name,
          c.city,
          c.county,
          c.country,

          -- map coords
          c.latitude,
          c.longitude,

          -- course facts
          c.par,
          c.holes,
          c.course_type,
          c.course_status,

          -- ratings
          c.community_rating,
          c.played_count,
          c.wishlist_count,

          -- mvp
          c.mvp_data_status,
          c.mvp_missing_fields,

          -- official profile
          c.official_profile_status,
          c.official_hero_image_url,
          c.official_logo_url,
          c.official_gallery_enabled,

          -- best approved community photo thumbnail (Priority B)
          (SELECT cp.thumbnail_url
           FROM   course_photos cp
           WHERE  cp.course_id         = c.id
             AND  cp.moderation_status = 'approved'
             AND  cp.deleted_at        IS NULL
           ORDER BY cp.is_featured DESC, cp.like_count DESC, cp.uploaded_at DESC
           LIMIT 1)                                       AS community_thumbnail_url,

          -- user status (safe for null userId; cast so Neon can type $1)
          (CASE WHEN $1::int IS NOT NULL THEN
            (SELECT COUNT(*) > 0 FROM played_courses pc
             WHERE pc.user_id = $1::int AND pc.course_id = c.id)
          ELSE false END)                                  AS user_played,

          (CASE WHEN $1::int IS NOT NULL THEN
            (SELECT COUNT(*) > 0 FROM wishlist wl
             WHERE wl.user_id = $1::int AND wl.course_id = c.id)
          ELSE false END)                                  AS user_wishlisted,

          -- active rankings for this course
          (SELECT json_agg(
             json_build_object(
               'ranking_name', r.ranking_name,
               'position',     r.position
             ) ORDER BY r.position
           )
           FROM rankings r
           WHERE r.course_id = c.id AND r.is_active = true) AS rankings

        FROM   courses c
        ${joinClause}
        ${where}
        ORDER BY
          (SELECT MIN(r.position) FROM rankings r
            WHERE r.course_id = c.id AND r.is_active = true) NULLS LAST,
          c.community_rating DESC NULLS LAST,
          c.played_count     DESC NULLS LAST
        LIMIT  2000`,
      params,
    );

    // ── Resolve media priority client-side fields ──────────────────────────
    const courses = rows.map((c) => {
      let resolved_thumbnail_url = null;
      let media_display_type = "placeholder";

      // Priority A — paid official hero
      if (c.official_profile_status === "paid" && c.official_hero_image_url) {
        resolved_thumbnail_url = ucThumb(c.official_hero_image_url, 400);
        media_display_type = "official_image";

        // Priority B — approved community photo
      } else if (c.community_thumbnail_url) {
        resolved_thumbnail_url = ucThumb(c.community_thumbnail_url, 400);
        media_display_type = "community_photo";

        // Priority C — official club logo
      } else if (c.official_logo_url) {
        resolved_thumbnail_url = c.official_logo_url;
        media_display_type = "club_logo";
      }

      return {
        id: c.id,
        name: c.name,
        club_name: c.club_name,
        city: c.city,
        county: c.county,
        country: c.country,
        latitude: c.latitude,
        longitude: c.longitude,
        par: c.par,
        holes: c.holes,
        course_type: c.course_type,
        course_status: c.course_status,
        community_rating: c.community_rating,
        played_count: c.played_count,
        wishlist_count: c.wishlist_count,
        mvp_data_status: c.mvp_data_status,
        mvp_missing_fields: c.mvp_missing_fields,
        official_profile_status: c.official_profile_status,
        official_logo_url: c.official_logo_url,
        resolved_thumbnail_url,
        media_display_type,
        user_played: c.user_played,
        user_wishlisted: c.user_wishlisted,
        rankings: c.rankings ?? [],
      };
    });

    return Response.json({ courses, total: courses.length });
  } catch (error) {
    console.error("Courses map error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
