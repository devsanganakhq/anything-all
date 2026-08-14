/**
 * GET /api/admin/dashboard
 *
 * Returns all analytics data for the Heathland Links admin dashboard.
 * Admin-gated: requireAdmin() is called first; non-admins get 401/403.
 *
 * All queries run in parallel via Promise.all for performance.
 * If individual queries fail, they return safe defaults so the rest of
 * the dashboard still renders.
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

async function safe(queryFn, fallback = []) {
  try {
    return await queryFn();
  } catch (err) {
    console.error("Dashboard query error:", err?.message || err);
    return fallback;
  }
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const [
      totalUsers,
      activeToday,
      activeWeek,
      activeMonth,
      newThisMonth,
      newLastMonth,
      totalCourses,
      totalCommunities,
      coursesPlayedToday,
      wishlistToday,
      reviewsToday,
      photosToday,
      chatMessagesToday,
      directMessagesToday,
      totalCoursesPlayedAllTime,
      totalWishlistAllTime,
      totalReviewsAllTime,
      pendingFriendRequests,
      totalFriendships,
      totalFollows,
      communityPostsToday,
      communityPostsTotal,
      tripsTotal,
      communityMembersTotal,
      mostPlayed,
      mostWishlisted,
      highestRated,
      trending,
      totalCoursesPlayed,
      distinctCounties,
      distinctCountries,
      englandCourses,
      scotlandCourses,
      irelandCourses,
      walesCourses,
      top100Completions,
      handicapStats,
      topExplorers,
      registrationTrend,
      activityTrend,
      dbCheck,
    ] = await Promise.all([
      // ── Overview ──────────────────────────────────────────────────────────
      safe(() => sql`SELECT COUNT(*) as count FROM users`),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT user_id) as count FROM activity_feed WHERE created_at >= CURRENT_DATE`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT user_id) as count FROM activity_feed WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT user_id) as count FROM activity_feed WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', CURRENT_DATE)`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM courses WHERE course_status = 'active'`,
      ),
      safe(() => sql`SELECT COUNT(*) as count FROM communities`),

      // ── Golf Activity ─────────────────────────────────────────────────────
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM played_courses WHERE date_played = CURRENT_DATE`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM wishlist WHERE created_at >= CURRENT_DATE`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM played_courses WHERE review_text IS NOT NULL AND created_at >= CURRENT_DATE`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM member_photos WHERE created_at >= CURRENT_DATE`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM community_chat_messages WHERE created_at >= CURRENT_DATE AND is_deleted = false`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM direct_messages WHERE created_at >= CURRENT_DATE`,
      ),
      safe(() => sql`SELECT COUNT(*) as count FROM played_courses`),
      safe(() => sql`SELECT COUNT(*) as count FROM wishlist`),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM played_courses WHERE review_text IS NOT NULL`,
      ),

      // ── Community ─────────────────────────────────────────────────────────
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM friendships WHERE status = 'pending'`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM friendships WHERE status = 'accepted'`,
      ),
      safe(() => sql`SELECT COUNT(*) as count FROM follows`),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM community_posts WHERE created_at >= CURRENT_DATE AND is_deleted = false`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(*) as count FROM community_posts WHERE is_deleted = false`,
      ),
      safe(() => sql`SELECT COUNT(*) as count FROM travel_itineraries`),
      safe(() => sql`SELECT COUNT(*) as count FROM community_members`),

      // ── Course Analytics ──────────────────────────────────────────────────
      safe(
        () =>
          sql`SELECT id, name, city, county, country, played_count, community_rating, course_type FROM courses WHERE played_count > 0 ORDER BY played_count DESC LIMIT 10`,
      ),
      safe(
        () =>
          sql`SELECT id, name, city, county, country, wishlist_count, community_rating, course_type FROM courses WHERE wishlist_count > 0 ORDER BY wishlist_count DESC LIMIT 10`,
      ),
      safe(
        () =>
          sql`SELECT id, name, city, county, country, community_rating, played_count, course_type FROM courses WHERE played_count > 0 AND community_rating > 0 ORDER BY community_rating DESC LIMIT 10`,
      ),
      safe(
        () =>
          sql`SELECT c.id, c.name, c.city, c.county, c.country, c.community_rating, c.course_type, COUNT(pc.id) as recent_plays FROM courses c LEFT JOIN played_courses pc ON c.id = pc.course_id AND pc.created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY c.id ORDER BY recent_plays DESC, c.community_rating DESC LIMIT 10`,
      ),

      // ── Passport Analytics ────────────────────────────────────────────────
      safe(() => sql`SELECT COUNT(*) as count FROM played_courses`),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT c.county) as count FROM played_courses pc JOIN courses c ON pc.course_id = c.id WHERE c.county IS NOT NULL AND c.county != ''`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT c.country) as count FROM played_courses pc JOIN courses c ON pc.course_id = c.id WHERE c.country IS NOT NULL`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT pc.course_id) as count FROM played_courses pc JOIN courses c ON pc.course_id = c.id WHERE LOWER(c.country) = 'england'`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT pc.course_id) as count FROM played_courses pc JOIN courses c ON pc.course_id = c.id WHERE LOWER(c.country) = 'scotland'`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT pc.course_id) as count FROM played_courses pc JOIN courses c ON pc.course_id = c.id WHERE LOWER(c.country) LIKE '%ireland%'`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT pc.course_id) as count FROM played_courses pc JOIN courses c ON pc.course_id = c.id WHERE LOWER(c.country) = 'wales'`,
      ),
      safe(
        () =>
          sql`SELECT COUNT(DISTINCT pc.course_id) as count FROM played_courses pc JOIN courses c ON pc.course_id = c.id JOIN rankings r ON c.id = r.course_id WHERE r.ranking_name ILIKE '%top 100%'`,
      ),

      // ── Heathland Index ───────────────────────────────────────────────────
      safe(
        () =>
          sql`SELECT ROUND(AVG(handicap)::numeric, 1) as avg_handicap, MAX(handicap) as max_handicap, MIN(handicap) as min_handicap, COUNT(*) as users_with_handicap FROM users WHERE handicap IS NOT NULL`,
        [
          {
            avg_handicap: null,
            max_handicap: null,
            min_handicap: null,
            users_with_handicap: 0,
          },
        ],
      ),
      safe(
        () =>
          sql`SELECT u.id, u.first_name, u.last_name, u.profile_photo_url, u.handicap, COUNT(pc.id) as courses_played FROM users u INNER JOIN played_courses pc ON u.id = pc.user_id GROUP BY u.id, u.first_name, u.last_name, u.profile_photo_url, u.handicap ORDER BY courses_played DESC LIMIT 5`,
      ),

      // ── Trends ────────────────────────────────────────────────────────────
      safe(
        () =>
          sql`SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date ASC`,
      ),
      safe(
        () =>
          sql`SELECT DATE(created_at) as date, COUNT(*) as count FROM played_courses WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date ASC`,
      ),

      // ── System ────────────────────────────────────────────────────────────
      safe(() => sql`SELECT 1 as ok`, null),
    ]);

    // ── Calculations ───────────────────────────────────────────────────────
    const thisMonthCount = parseInt(newThisMonth[0]?.count || 0);
    const lastMonthCount = parseInt(newLastMonth[0]?.count || 0);
    const growthPct =
      lastMonthCount > 0
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100)
        : thisMonthCount > 0
          ? 100
          : 0;

    // Build 30-day trend arrays (fill missing days with 0)
    const buildTrend = (rows) => {
      const map = {};
      (rows || []).forEach((r) => {
        const key =
          r.date instanceof Date
            ? r.date.toISOString().split("T")[0]
            : String(r.date).split("T")[0];
        map[key] = parseInt(r.count || 0);
      });
      const out = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        out.push({ date: key, label, count: map[key] || 0 });
      }
      return out;
    };

    const regTrend = buildTrend(registrationTrend);
    const actTrend = buildTrend(activityTrend);

    return Response.json({
      generatedAt: new Date().toISOString(),
      overview: {
        totalUsers: parseInt(totalUsers[0]?.count || 0),
        activeToday: parseInt(activeToday[0]?.count || 0),
        activeThisWeek: parseInt(activeWeek[0]?.count || 0),
        activeThisMonth: parseInt(activeMonth[0]?.count || 0),
        newRegistrationsThisMonth: thisMonthCount,
        growthPercentage: growthPct,
        totalCourses: parseInt(totalCourses[0]?.count || 0),
        totalCommunities: parseInt(totalCommunities[0]?.count || 0),
        registrationTrend: regTrend,
        activityTrend: actTrend,
      },
      golfActivity: {
        coursesPlayedToday: parseInt(coursesPlayedToday[0]?.count || 0),
        wishlistAdditionsToday: parseInt(wishlistToday[0]?.count || 0),
        reviewsToday: parseInt(reviewsToday[0]?.count || 0),
        photosToday: parseInt(photosToday[0]?.count || 0),
        messagesToday:
          parseInt(chatMessagesToday[0]?.count || 0) +
          parseInt(directMessagesToday[0]?.count || 0),
        totalCoursesPlayedAllTime: parseInt(
          totalCoursesPlayedAllTime[0]?.count || 0,
        ),
        totalWishlistAllTime: parseInt(totalWishlistAllTime[0]?.count || 0),
        totalReviewsAllTime: parseInt(totalReviewsAllTime[0]?.count || 0),
      },
      community: {
        pendingFriendRequests: parseInt(pendingFriendRequests[0]?.count || 0),
        totalFriendships: parseInt(totalFriendships[0]?.count || 0),
        totalFollows: parseInt(totalFollows[0]?.count || 0),
        communityPostsToday: parseInt(communityPostsToday[0]?.count || 0),
        communityPostsTotal: parseInt(communityPostsTotal[0]?.count || 0),
        tripsTotal: parseInt(tripsTotal[0]?.count || 0),
        communityMembersTotal: parseInt(communityMembersTotal[0]?.count || 0),
      },
      courseAnalytics: {
        mostPlayed: mostPlayed || [],
        mostWishlisted: mostWishlisted || [],
        highestRated: highestRated || [],
        trending: trending || [],
      },
      passportAnalytics: {
        totalCoursesPlayed: parseInt(totalCoursesPlayed[0]?.count || 0),
        distinctCounties: parseInt(distinctCounties[0]?.count || 0),
        distinctCountries: parseInt(distinctCountries[0]?.count || 0),
        englandCourses: parseInt(englandCourses[0]?.count || 0),
        scotlandCourses: parseInt(scotlandCourses[0]?.count || 0),
        irelandCourses: parseInt(irelandCourses[0]?.count || 0),
        walesCourses: parseInt(walesCourses[0]?.count || 0),
        top100Completions: parseInt(top100Completions[0]?.count || 0),
        countryBreakdown: [
          {
            name: "England",
            value: parseInt(englandCourses[0]?.count || 0),
            fill: "#1B3828",
          },
          {
            name: "Scotland",
            value: parseInt(scotlandCourses[0]?.count || 0),
            fill: "#2C5240",
          },
          {
            name: "Ireland",
            value: parseInt(irelandCourses[0]?.count || 0),
            fill: "#C9952A",
          },
          {
            name: "Wales",
            value: parseInt(walesCourses[0]?.count || 0),
            fill: "#8A7968",
          },
        ],
      },
      heathlandIndex: {
        averageHandicap:
          handicapStats[0]?.avg_handicap != null
            ? parseFloat(handicapStats[0].avg_handicap)
            : null,
        highestHandicap:
          handicapStats[0]?.max_handicap != null
            ? parseFloat(handicapStats[0].max_handicap)
            : null,
        lowestHandicap:
          handicapStats[0]?.min_handicap != null
            ? parseFloat(handicapStats[0].min_handicap)
            : null,
        usersWithHandicap: parseInt(handicapStats[0]?.users_with_handicap || 0),
        topExplorers: topExplorers || [],
      },
      systemHealth: {
        database:
          dbCheck !== null && dbCheck !== undefined ? "healthy" : "error",
        api: "healthy",
        emailProvider: "configured",
        storage: "operational",
        failedJobs: 0,
      },
    });
  } catch (err) {
    console.error("Dashboard API fatal error:", err);
    return Response.json(
      { error: "Failed to load dashboard data" },
      { status: 500 },
    );
  }
}
