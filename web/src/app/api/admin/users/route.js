/**
 * GET /api/admin/users
 *
 * Searchable, filterable, paginated user list for admins.
 * Returns operational data only — never passwords, tokens or credentials.
 *
 * Query params:
 *   q          – text search (name, email)
 *   filter     – active | inactive | suspended | admin | new_week | new_month
 *   sort       – newest | recently_active | most_played | most_reviews | engagement
 *   page       – default 1
 *   limit      – default 25, max 100
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const filter = searchParams.get("filter") || "all";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "25")),
  );
  const offset = (page - 1) * limit;

  try {
    // ── Build WHERE clauses ────────────────────────────────────────────────
    const conditions = [];
    const values = [];
    let idx = 1;

    // Text search
    if (q) {
      conditions.push(
        `(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx} OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $${idx})`,
      );
      values.push(`%${q}%`);
      idx++;
    }

    // Status filters
    if (filter === "suspended") {
      conditions.push(`u.is_suspended = true`);
    }
    if (filter === "active") {
      conditions.push(`u.is_suspended = false`);
    }
    if (filter === "inactive") {
      conditions.push(`u.is_suspended = false`);
    }
    if (filter === "admin") {
      conditions.push(`u.is_admin = true`);
    }
    if (filter === "new_week") {
      conditions.push(`u.created_at >= CURRENT_DATE - INTERVAL '7 days'`);
    }
    if (filter === "new_month") {
      conditions.push(`u.created_at >= DATE_TRUNC('month', CURRENT_DATE)`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // ── ORDER BY ───────────────────────────────────────────────────────────
    const orderMap = {
      newest: `u.created_at DESC`,
      recently_active: `last_active DESC NULLS LAST`,
      most_played: `courses_played DESC, u.created_at DESC`,
      most_reviews: `reviews_count DESC, u.created_at DESC`,
      engagement: `(courses_played + wishlist_count + reviews_count + community_posts) DESC`,
    };
    const orderBy = orderMap[sort] || `u.created_at DESC`;

    // ── Main query ─────────────────────────────────────────────────────────
    const usersQuery = `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_photo_url,
        u.location,
        u.handicap,
        u.home_club_name,
        u.created_at,
        u.is_admin,
        u.is_suspended,
        u.suspended_at,
        u.suspension_reason,
        -- Last activity from activity_feed
        MAX(af.created_at)                        AS last_active,
        -- Aggregate stats (safe even with no rows)
        COUNT(DISTINCT pc.id)                     AS courses_played,
        COUNT(DISTINCT w.id)                      AS wishlist_count,
        COUNT(DISTINCT pc2.id)                    AS reviews_count,
        COUNT(DISTINCT cp.id)                     AS community_posts,
        -- Suspending admin display name
        CONCAT(su.first_name, ' ', su.last_name)  AS suspended_by_name
      FROM users u
      LEFT JOIN activity_feed     af  ON af.user_id  = u.id
      LEFT JOIN played_courses    pc  ON pc.user_id  = u.id
      LEFT JOIN wishlist          w   ON w.user_id   = u.id
      LEFT JOIN played_courses    pc2 ON pc2.user_id = u.id AND pc2.review_text IS NOT NULL
      LEFT JOIN community_posts   cp  ON cp.user_id  = u.id AND cp.is_deleted = false
      LEFT JOIN users             su  ON su.id = u.suspended_by
      ${whereClause}
      GROUP BY
        u.id, u.first_name, u.last_name, u.email, u.profile_photo_url,
        u.location, u.handicap, u.home_club_name, u.created_at,
        u.is_admin, u.is_suspended, u.suspended_at, u.suspension_reason,
        su.first_name, su.last_name
      ORDER BY ${orderBy}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      ${whereClause}
    `;

    values.push(limit, offset);

    const [users, countResult] = await Promise.all([
      sql(usersQuery, values),
      sql(countQuery, values.slice(0, -2)), // exclude limit/offset from count
    ]);

    const total = parseInt(countResult[0]?.total || 0);

    // Strip any accidental credential fields
    const safeUsers = users.map((u) => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      displayName:
        [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed",
      email: u.email,
      profilePhotoUrl: u.profile_photo_url,
      location: u.location,
      handicap: u.handicap,
      homeClub: u.home_club_name,
      createdAt: u.created_at,
      isAdmin: u.is_admin,
      isSuspended: u.is_suspended,
      suspendedAt: u.suspended_at,
      suspensionReason: u.suspension_reason,
      suspendedByName: u.suspended_by_name,
      lastActive: u.last_active,
      coursesPlayed: parseInt(u.courses_played || 0),
      wishlistCount: parseInt(u.wishlist_count || 0),
      reviewsCount: parseInt(u.reviews_count || 0),
      communityPosts: parseInt(u.community_posts || 0),
      status: u.is_suspended ? "suspended" : "active",
    }));

    return Response.json({
      users: safeUsers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Admin users list error:", err);
    return Response.json({ error: "Failed to load users" }, { status: 500 });
  }
}
