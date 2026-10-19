/**
 * GET /api/user/passport-stats
 *
 * Returns a comprehensive lifetime stats payload for the Golf Passport.
 * Includes:
 *   - Headline stats (courses played, wish list, Top 100 B&I, countries, counties, reviews, achievements)
 *   - By-country breakdown
 *   - Ranking progress for each Top 100 list (played / wish list / total, no double-counting)
 *   - Achievements with unlock status
 *   - Club memberships summary
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

const VERIFIED_STATUSES = ["verified", "manually_verified"];

// Keep in sync with COLLECTION_CONFIG in rankings/collections/route.js
const TOP_RANKINGS = [
  {
    id: "top-100-bi",
    name: "Top 100 Britain & Ireland",
    ranking_year: 2026,
  },
  { id: "top-100-england", name: "Top 100 England", ranking_year: 2026 },
  { id: "top-50-scotland", name: "Top 50 Scotland", ranking_year: 2026 },
  { id: "top-50-wales", name: "Top 50 Wales", ranking_year: 2026 },
  {
    id: "top-25-ireland",
    name: "Top 25 Island of Ireland",
    ranking_year: 2026,
  },
];

export async function GET(request) {
  const USER_ID = await getSessionUserId(request);
  try {
    // ── 1. Core headline stats ──────────────────────────────────────────────
    const [headline] = await sql(
      `SELECT
          (SELECT COUNT(*)::int  FROM played_courses              WHERE user_id = $1)                       AS played_count,
          (SELECT COUNT(*)::int  FROM wishlist                    WHERE user_id = $1)                       AS wishlist_count,
          (SELECT COUNT(*)::int  FROM played_courses pc
            JOIN rankings r ON r.course_id = pc.course_id
            WHERE pc.user_id = $1
              AND r.ranking_name = 'Top 100 Britain & Ireland'
              AND r.is_active = true
              AND r.verification_status = ANY($2))                                                         AS top100_bi_completed,
          (SELECT COUNT(DISTINCT CASE WHEN c.country IN ('USA','United States','United States of America') THEN 'USA' ELSE c.country END)::int
            FROM played_courses pc JOIN courses c ON c.id = pc.course_id
            WHERE pc.user_id = $1 AND c.country IS NOT NULL)                                               AS countries_played,
          (SELECT COUNT(DISTINCT c.county)::int
            FROM played_courses pc JOIN courses c ON c.id = pc.course_id
            WHERE pc.user_id = $1 AND c.county IS NOT NULL)                                                AS counties_played,
          (SELECT COUNT(*)::int FROM course_reviews WHERE user_id=$1 AND deleted_at IS NULL) AS reviews_count,
          (SELECT COUNT(*)::int FROM course_rounds WHERE user_id=$1) AS rounds_count,
          (SELECT COUNT(*)::int FROM curated_lists l WHERE is_published AND EXISTS(SELECT 1 FROM curated_list_courses WHERE list_id=l.id AND counts_for_completion)
           AND NOT EXISTS(SELECT 1 FROM curated_list_courses lc WHERE lc.list_id=l.id AND lc.counts_for_completion AND NOT EXISTS(SELECT 1 FROM played_courses p WHERE p.user_id=$1 AND p.course_id=lc.course_id))) AS lists_completed,
          (SELECT COUNT(*)::int  FROM user_achievements           WHERE user_id = $1)                       AS achievements_unlocked`,
      [USER_ID, VERIFIED_STATUSES],
    );

    // ── 2. By-country breakdown ─────────────────────────────────────────────
    const byCountry = await sql(
      `SELECT
          c.country,
          COUNT(*)::int AS count
        FROM played_courses pc
        JOIN courses c ON c.id = pc.course_id
        WHERE pc.user_id = $1 AND c.country IS NOT NULL
        GROUP BY c.country
        ORDER BY count DESC`,
      [USER_ID],
    );

    // ── 3. Ranking progress — canonical named collections (verified only) ───
    const rankingProgress = await Promise.all(
      TOP_RANKINGS.map(async ({ id, name, ranking_year }) => {
        const [row] = await sql(
          `SELECT
              COUNT(*)::int                                   AS total_count,
              COUNT(pc.id)::int                               AS played_count,
              COUNT(CASE WHEN wl.id IS NOT NULL AND pc.id IS NULL THEN 1 END)::int AS wishlist_count
            FROM rankings r
            LEFT JOIN played_courses pc
              ON pc.course_id = r.course_id AND pc.user_id = $1
            LEFT JOIN wishlist wl
              ON wl.course_id = r.course_id AND wl.user_id = $1
            WHERE r.ranking_name = $2
              AND r.ranking_year = $3
              AND r.is_active = true
              AND r.verification_status = ANY($4)`,
          [USER_ID, name, ranking_year, VERIFIED_STATUSES],
        );
        const total = row?.total_count ?? 0;
        const played = row?.played_count ?? 0;
        const wishlist = row?.wishlist_count ?? 0;
        const pct = total > 0 ? Math.round((played / total) * 100) : 0;
        return {
          id,
          name,
          ranking_year,
          total,
          played,
          wishlist,
          unplayed: Math.max(0, total - played - wishlist),
          pct,
        };
      }),
    );

    // ── 4. Achievements ─────────────────────────────────────────────────────
    const achievements = await sql(
      `SELECT
          a.id, a.slug, a.name, a.description, a.icon_name,
          ua.unlocked_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
        ORDER BY ua.unlocked_at DESC NULLS LAST, a.id ASC`,
      [USER_ID],
    );

    // ── 5. Club memberships summary ─────────────────────────────────────────
    const memberships = await sql(
      `SELECT ucm.club_name, ucm.membership_type, ucm.visibility, ucm.verified_status, ucm.joined_year
        FROM user_club_memberships ucm
        WHERE ucm.user_id = $1
          AND ucm.visibility IN ('public', 'friends')
        ORDER BY CASE ucm.membership_type WHEN 'home' THEN 0 ELSE 1 END, ucm.display_order`,
      [USER_ID],
    );

    // ── 6. Friends count ────────────────────────────────────────────────────
    const [friendRow] = await sql(
      `SELECT COUNT(*)::int AS friends_count
        FROM friendships
        WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'`,
      [USER_ID],
    );

    return Response.json({
      stats: {
        ...headline,
        friends_count: friendRow?.friends_count ?? 0,
      },
      byCountry,
      rankingProgress,
      achievements,
      memberships,
    });
  } catch (error) {
    console.error("Passport stats error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
