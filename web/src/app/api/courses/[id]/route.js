import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { COLLECTION_CONFIG } from "@/app/api/rankings/collections/route";

const VERIFIED_STATUSES = ["verified", "manually_verified"];
const CANONICAL_NAMES = COLLECTION_CONFIG.map((c) => c.ranking_name);
const RANKING_YEARS = [
  ...new Set(COLLECTION_CONFIG.map((c) => c.ranking_year)),
];

export async function GET(request, { params }) {
  const { id } = params;

  // Guard against static paths (list/map) accidentally matching :id
  if (!id || !/^\d+$/.test(String(id))) {
    return Response.json({ error: "Course not found" }, { status: 404 });
  }

  // Authentication is optional — guests may view course pages
  let userId = null;
  try {
    userId = await getSessionUserId(request);
  } catch {}

  try {
    const course = await sql`
      SELECT * FROM courses WHERE id = ${id}
    `;

    if (course.length === 0) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }

    // One verified row per public collection — duplicate imports of the
    // same list (year/source/region splits) must not appear twice.
    const rankings = await sql(
      `SELECT id, ranking_name, ranking_source, ranking_year, position,
              ranking_region, verification_status, source_url
       FROM (
         SELECT DISTINCT ON (ranking_name)
                id, ranking_name, ranking_source, ranking_year, position,
                ranking_region, verification_status, source_url
         FROM   rankings
         WHERE  course_id = $1
           AND  is_active = true
           AND  verification_status = ANY($2)
           AND  ranking_name = ANY($3)
           AND  ranking_year = ANY($4)
         ORDER BY ranking_name, ranking_year DESC, id ASC
       ) unique_rankings
       ORDER BY ranking_year DESC, position ASC`,
      [id, VERIFIED_STATUSES, CANONICAL_NAMES, RANKING_YEARS],
    );

    const photos = await sql`
      SELECT mp.*, u.first_name, u.last_name
      FROM   member_photos mp
      LEFT JOIN users u ON u.id = mp.user_id
      WHERE  mp.course_id = ${id}
      ORDER BY mp.created_at DESC
      LIMIT 18
    `;

    const reviews = await sql`
      SELECT r.*, u.first_name, u.last_name, u.profile_photo_url,
             COALESCE((
               SELECT json_agg(
                 json_build_object(
                   'id', cp.id,
                   'image_url', cp.image_url,
                   'thumbnail_url', COALESCE(cp.thumbnail_url, cp.image_url),
                   'caption', cp.caption
                 )
                 ORDER BY cp.uploaded_at
               )
               FROM course_photos cp
               WHERE cp.deleted_at IS NULL
                 AND cp.moderation_status = 'approved'
                 AND (
                   cp.review_id = r.id
                   OR (
                     cp.review_id IS NULL
                     AND cp.course_id = r.course_id
                     AND cp.user_id = r.user_id
                   )
                 )
             ), '[]'::json) AS photos
      FROM   played_courses r
      JOIN   users u ON r.user_id = u.id
      WHERE  r.course_id = ${id}
        AND  (
          (r.review_text IS NOT NULL AND TRIM(r.review_text) <> '')
          OR EXISTS (
            SELECT 1 FROM course_photos cp
            WHERE cp.deleted_at IS NULL
              AND cp.moderation_status = 'approved'
              AND (
                cp.review_id = r.id
                OR (
                  cp.review_id IS NULL
                  AND cp.course_id = r.course_id
                  AND cp.user_id = r.user_id
                )
              )
          )
        )
      ORDER  BY r.created_at DESC
      LIMIT  20
    `;

    // Recent activity feed entries for this course
    const recentActivity = await sql`
      SELECT af.id, af.activity_type, af.created_at,
             u.first_name, u.last_name, u.profile_photo_url
      FROM   activity_feed af
      JOIN   users u ON u.id = af.user_id
      WHERE  af.course_id = ${id}
      ORDER  BY af.created_at DESC
      LIMIT  10
    `;

    // Follower count for this course
    const followerCountRow = await sql`
      SELECT COUNT(*)::int AS count
      FROM   follows
      WHERE  followee_type = 'course' AND followee_id = ${id}
    `;

    // Per-user status — safe defaults for guests
    let userStatus = { wishlisted: false, played: false, following: false };
    if (userId) {
      const [row] = await sql(
        `SELECT
           (SELECT COUNT(*) > 0 FROM wishlist       WHERE user_id=$1 AND course_id=$2) AS wishlisted,
           (SELECT COUNT(*) > 0 FROM played_courses WHERE user_id=$1 AND course_id=$2) AS played,
           (SELECT COUNT(*) > 0 FROM follows        WHERE follower_id=$1 AND followee_type='course' AND followee_id=$2) AS following`,
        [userId, id],
      );
      if (row) {
        userStatus = {
          wishlisted: row.wishlisted ?? false,
          played: row.played ?? false,
          following: row.following ?? false,
        };
      }
    }

    return Response.json({
      course: course[0],
      rankings,
      photos,
      reviews,
      recentActivity,
      followerCount: followerCountRow[0]?.count ?? 0,
      userStatus,
    });
  } catch (error) {
    console.error("Error fetching course details:", error);
    return Response.json(
      { error: "Failed to fetch course details" },
      { status: 500 },
    );
  }
}
