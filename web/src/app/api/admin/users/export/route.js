/**
 * GET /api/admin/users/export
 *
 * Returns a CSV of users containing only safe operational fields.
 * No passwords, tokens, hashes or auth credentials are exported.
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

const esc = (v) => {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
};

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const users = await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at,
        u.is_admin,
        u.is_suspended,
        u.location,
        u.handicap,
        MAX(af.created_at)        AS last_active,
        COUNT(DISTINCT pc.id)     AS courses_played,
        COUNT(DISTINCT w.id)      AS wishlist_count,
        COUNT(DISTINCT pc2.id)    AS reviews_count,
        COUNT(DISTINCT cp.id)     AS community_posts
      FROM users u
      LEFT JOIN activity_feed   af  ON af.user_id  = u.id
      LEFT JOIN played_courses  pc  ON pc.user_id  = u.id
      LEFT JOIN wishlist        w   ON w.user_id   = u.id
      LEFT JOIN played_courses  pc2 ON pc2.user_id = u.id AND pc2.review_text IS NOT NULL
      LEFT JOIN community_posts cp  ON cp.user_id  = u.id AND cp.is_deleted = false
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    const headers = [
      "user_id",
      "first_name",
      "last_name",
      "email",
      "join_date",
      "last_active",
      "status",
      "is_admin",
      "location",
      "handicap",
      "courses_played",
      "wishlist_count",
      "reviews_count",
      "community_posts",
    ];

    const rows = users.map((u) => [
      u.id,
      u.first_name || "",
      u.last_name || "",
      u.email,
      u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "",
      u.last_active ? new Date(u.last_active).toISOString().split("T")[0] : "",
      u.is_suspended ? "suspended" : "active",
      u.is_admin ? "yes" : "no",
      u.location || "",
      u.handicap != null ? u.handicap : "",
      parseInt(u.courses_played || 0),
      parseInt(u.wishlist_count || 0),
      parseInt(u.reviews_count || 0),
      parseInt(u.community_posts || 0),
    ]);

    const csv = [
      headers.map(esc).join(","),
      ...rows.map((r) => r.map(esc).join(",")),
    ].join("\r\n");

    const filename = `heathland-users-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("User export error:", err);
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
