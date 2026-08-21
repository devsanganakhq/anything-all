/**
 * GET /api/rankings/collections
 *
 * Single source of truth for all ranking collections.
 * PUBLIC queries are strictly filtered to:
 *   is_active = true AND verification_status IN ('verified','manually_verified')
 *
 * Quarantined (inferred/unverified) rows are NEVER served publicly.
 * An incomplete verified collection is reported honestly — it is never
 * padded with unverified data to reach expected_size.
 */
import sql from "@/app/api/utils/sql";

// ── Central collection configuration ─────────────────────────────────────────
export const COLLECTION_CONFIG = [
  {
    id: "top-100-bi",
    ranking_name: "Top 100 Britain & Ireland",
    display_name: "Top 100 Britain & Ireland",
    ranking_region: "Britain & Ireland",
    ranking_source: "Top100GolfCourses.com",
    ranking_year: 2026,
    expected_size: 100,
    is_active: true,
    is_sample_data: false,
    accentColor: "gold",
    icon: "🏆",
    description:
      "The finest courses across England, Scotland, Wales and Ireland.",
  },
  {
    id: "top-100-england",
    ranking_name: "Top 100 England",
    display_name: "Top 100 England",
    ranking_region: "England",
    ranking_source: "Top100GolfCourses.com",
    ranking_year: 2026,
    expected_size: 100,
    is_active: true,
    is_sample_data: false,
    accentColor: "green",
    icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    description:
      "England's greatest courses, from the sandbelt south to the dunes of the north.",
  },
  {
    id: "top-50-scotland",
    ranking_name: "Top 50 Scotland",
    display_name: "Top 50 Scotland",
    ranking_region: "Scotland",
    ranking_source: "Top100GolfCourses.com",
    ranking_year: 2026,
    expected_size: 50,
    is_active: true,
    is_sample_data: false,
    accentColor: "purple",
    icon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    description:
      "Scotland's crown jewels — from Royal Dornoch to the Highlands.",
  },
  {
    id: "top-50-wales",
    ranking_name: "Top 50 Wales",
    display_name: "Top 50 Wales",
    ranking_region: "Wales",
    ranking_source: "Top100GolfCourses.com",
    ranking_year: 2026,
    expected_size: 50,
    is_active: true,
    is_sample_data: false,
    accentColor: "green",
    icon: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    description:
      "Wales's best courses, from the dunes of Harlech to the valleys of the south.",
  },
  {
    id: "top-25-ireland",
    ranking_name: "Top 25 Island of Ireland",
    display_name: "Top 25 Island of Ireland",
    ranking_region: "Island of Ireland",
    ranking_source: "Top100GolfCourses.com",
    ranking_year: 2026,
    expected_size: 25,
    is_active: true,
    is_sample_data: false,
    accentColor: "gold",
    icon: "🇮🇪",
    description:
      "The best of the island of Ireland — Republic and Northern Ireland combined.",
  },
];

const CANONICAL_NAMES = COLLECTION_CONFIG.map((c) => c.ranking_name);
const VERIFIED_STATUSES = ["verified", "manually_verified"];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("id");
    const preview = Math.min(
      200,
      Math.max(
        1,
        parseInt(searchParams.get("preview") || (collectionId ? "200" : "8"), 10),
      ),
    );

    // ── 1. Named ranking collections — VERIFIED ROWS ONLY ────────────────────
    // Group by ranking_name only so split source/region rows still count as one list.
    // course_count is the unique course total; preview only slices the card payload.
    const courseLimit = collectionId ? 200 : preview;
    const namedRows = await sql(
      `SELECT
          r.ranking_name,
          COUNT(DISTINCT r.id)::int AS verified_count,
          json_agg(
            json_build_object(
              'position',          r.position,
              'id',                c.id,
              'name',              c.name,
              'club_name',         c.club_name,
              'display_name',      c.display_name,
              'is_claimed',        c.is_claimed,
              'city',              c.city,
              'county',            c.county,
              'country',           c.country,
              'latitude',          c.latitude,
              'longitude',         c.longitude,
              'community_rating',  c.community_rating,
              'played_count',      c.played_count,
              'course_type',       c.course_type,
              'holes',             c.holes,
              'par',               c.par,
              'official_logo_url', c.official_logo_url,
              'verification_status', r.verification_status,
              'research_batch',    r.research_batch
            )
            ORDER BY r.position NULLS LAST, c.name
          ) AS all_courses,

          -- Quarantined rows at this collection+year (admin info only)
          (SELECT COUNT(*)::int
           FROM public.rankings rq
           WHERE rq.ranking_name = r.ranking_name
             AND rq.ranking_year = ANY($2)
             AND rq.is_active = false
             AND rq.verification_status = 'unverified'
          ) AS unverified_count

        FROM public.rankings r
        JOIN public.courses  c ON c.id = r.course_id
        WHERE r.ranking_name = ANY($1)
          AND r.ranking_year = ANY($2)
          AND r.is_active = true
          AND r.verification_status = ANY($3)
        GROUP BY r.ranking_name
        ORDER BY ARRAY_POSITION($1, r.ranking_name)`,
      [
        CANONICAL_NAMES,
        COLLECTION_CONFIG.map((c) => c.ranking_year),
        VERIFIED_STATUSES,
      ],
    );

    const dbByName = Object.fromEntries(
      namedRows.map((r) => [r.ranking_name, r]),
    );

    const namedCollections = COLLECTION_CONFIG.map((cfg) => {
      const db = dbByName[cfg.ranking_name];
      const allCourses = Array.isArray(db?.all_courses) ? db.all_courses : [];
      const seenPositions = new Set();
      const seenIds = new Set();
      const uniqueCourses = [];
      for (const course of allCourses) {
        const positionKey =
          course.position == null ? `id:${course.id}` : `pos:${course.position}`;
        const idKey = course.id == null ? null : String(course.id);
        if (seenPositions.has(positionKey)) continue;
        if (idKey && seenIds.has(idKey)) continue;
        seenPositions.add(positionKey);
        if (idKey) seenIds.add(idKey);
        uniqueCourses.push(course);
      }
      const verifiedCount = uniqueCourses.length;
      const unverifiedCount = db ? db.unverified_count : 0;
      const isComplete = verifiedCount >= cfg.expected_size;
      const missingCount = Math.max(0, cfg.expected_size - verifiedCount);
      return {
        id: cfg.id,
        ranking_source: cfg.ranking_source,
        ranking_name: cfg.ranking_name,
        display_name: cfg.display_name,
        ranking_region: cfg.ranking_region,
        ranking_year: cfg.ranking_year,
        is_active: cfg.is_active,
        is_sample_data: false, // quarantined rows are never served
        expected_size: cfg.expected_size,
        verified_count: verifiedCount,
        course_count: verifiedCount,
        unverified_count: unverifiedCount,
        missing_count: missingCount,
        is_complete: isComplete,
        // Shown in admin panel only; public UI ignores this field
        admin_warning:
          !isComplete && cfg.is_active
            ? `INCOMPLETE: ${verifiedCount} verified / ${cfg.expected_size} expected — ${missingCount} positions awaiting verified source data`
            : null,
        accentColor: cfg.accentColor,
        icon: cfg.icon,
        description: cfg.description,
        courses: uniqueCourses.slice(0, courseLimit),
      };
    });

    // ── 2. Community-computed lists ───────────────────────────────────────────
    const topRated = await sql(
      `SELECT
          c.id, c.name, c.club_name, c.display_name, c.is_claimed, c.city, c.county, c.country,
          c.latitude, c.longitude, c.official_logo_url,
          c.community_rating, c.played_count, c.course_type, c.holes, c.par,
          ROW_NUMBER() OVER (ORDER BY c.community_rating DESC NULLS LAST, c.played_count DESC NULLS LAST) AS position
        FROM public.courses c
        ORDER BY c.community_rating DESC NULLS LAST, c.played_count DESC NULLS LAST
        LIMIT $1`,
      [preview],
    );

    const mostPlayed = await sql(
      `SELECT
          c.id, c.name, c.club_name, c.display_name, c.is_claimed, c.city, c.county, c.country,
          c.latitude, c.longitude, c.official_logo_url,
          c.community_rating, c.played_count, c.course_type, c.holes, c.par,
          ROW_NUMBER() OVER (ORDER BY c.played_count DESC NULLS LAST) AS position
        FROM public.courses c
        ORDER BY c.played_count DESC NULLS LAST
        LIMIT $1`,
      [preview],
    );

    const trending = await sql(
      `SELECT
          c.id, c.name, c.club_name, c.display_name, c.is_claimed, c.city, c.county, c.country,
          c.latitude, c.longitude, c.official_logo_url,
          c.community_rating, c.played_count, c.course_type, c.holes, c.par,
          COUNT(pc.id)::int AS recent_plays,
          ROW_NUMBER() OVER (ORDER BY COUNT(pc.id) DESC) AS position
        FROM public.courses c
        INNER JOIN public.played_courses pc
          ON pc.course_id = c.id
         AND COALESCE(pc.date_played, pc.created_at::date)
               >= (CURRENT_DATE - INTERVAL '7 days')
        GROUP BY c.id
        ORDER BY COUNT(pc.id) DESC
        LIMIT $1`,
      [preview],
    );

    const hiddenGems = await sql(
      `SELECT
          c.id, c.name, c.club_name, c.display_name, c.is_claimed, c.city, c.county, c.country,
          c.latitude, c.longitude, c.official_logo_url,
          c.community_rating, c.played_count, c.course_type, c.holes, c.par,
          ROW_NUMBER() OVER (ORDER BY c.community_rating DESC NULLS LAST) AS position
        FROM public.courses c
        WHERE c.played_count < 3 OR c.played_count IS NULL
        ORDER BY c.community_rating DESC NULLS LAST
        LIMIT $1`,
      [preview],
    );

    const destinations = await sql(
      `SELECT
          country,
          COUNT(*)::int                                      AS course_count,
          ROUND(AVG(community_rating)::numeric, 2)           AS avg_rating,
          MIN(latitude)                                       AS lat,
          MIN(longitude)                                      AS lng
        FROM public.courses
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY course_count DESC
        LIMIT 8`,
    );

    // ── 3. Assemble response ─────────────────────────────────────────────────
    const collections = [
      ...namedCollections,
      {
        id: "community-top-rated",
        ranking_source: "HEATHLAND_LINKS_COMMUNITY",
        ranking_name: "Community Top Rated",
        ranking_region: "Britain & Ireland",
        ranking_year: new Date().getFullYear(),
        is_sample_data: false,
        course_count: topRated.length,
        courses: topRated,
      },
      {
        id: "most-played",
        ranking_source: "HEATHLAND_LINKS_COMMUNITY",
        ranking_name: "Most Played",
        ranking_region: "Britain & Ireland",
        ranking_year: new Date().getFullYear(),
        is_sample_data: false,
        course_count: mostPlayed.length,
        courses: mostPlayed,
      },
      {
        id: "trending",
        ranking_source: "HEATHLAND_LINKS_COMMUNITY",
        ranking_name: "Trending",
        ranking_region: "Britain & Ireland",
        ranking_year: new Date().getFullYear(),
        is_sample_data: false,
        course_count: trending.length,
        courses: trending,
      },
      {
        id: "hidden-gems",
        ranking_source: "HEATHLAND_LINKS_COMMUNITY",
        ranking_name: "Hidden Gems",
        ranking_region: "Britain & Ireland",
        ranking_year: new Date().getFullYear(),
        is_sample_data: false,
        course_count: hiddenGems.length,
        courses: hiddenGems,
      },
      {
        id: "golf-destinations",
        ranking_source: "HEATHLAND_LINKS_COMMUNITY",
        ranking_name: "Golf Destinations",
        ranking_region: "Britain & Ireland",
        ranking_year: new Date().getFullYear(),
        is_sample_data: false,
        course_count: destinations.length,
        courses: destinations,
        is_destinations: true,
      },
    ];

    if (collectionId) {
      const match = collections.find((c) => c.id === collectionId);
      return Response.json({ collections: match ? [match] : [] });
    }

    return Response.json({ collections });
  } catch (error) {
    console.error("Rankings collections error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
