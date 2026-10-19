import { passportOwner } from "@/app/api/utils/activity/http";
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request) {
  let userId;
  try {
    userId = (await passportOwner(request)).owner;
  } catch (e) {
    return Response.json(
      { error: "Passport not available" },
      { status: e.status || 500 },
    );
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(searchParams.get("limit") || "20") || 20),
  );
  const q = (searchParams.get("q") || "").slice(0, 160);
  const offset = (page - 1) * limit;

  try {
    const rows = await sql(
      `SELECT
          pc.id, pc.course_id, pc.date_played, (SELECT rating FROM course_reviews WHERE user_id=pc.user_id AND course_id=pc.course_id AND deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1) AS rating, pc.review_text, pc.created_at,
          c.name AS course_name, c.club_name, c.city, c.county, c.country,
          c.course_type, c.community_rating, c.par, c.holes
        FROM played_courses pc
        JOIN courses c ON c.id = pc.course_id
        WHERE pc.user_id = $1 AND (c.name ILIKE $4 OR c.club_name ILIKE $4)
        ORDER BY LOWER(COALESCE(NULLIF(TRIM(c.club_name), ''), c.name)) ASC,
                 LOWER(c.name) ASC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset, `%${q}%`],
    );

    const [countRow] = await sql(
      `SELECT COUNT(*)::int AS total FROM played_courses p JOIN courses c ON c.id=p.course_id WHERE p.user_id = $1 AND (c.name ILIKE $2 OR c.club_name ILIKE $2)`,
      [userId, `%${q}%`],
    );

    return Response.json({
      courses: rows,
      total: countRow?.total ?? 0,
      page,
      hasMore: offset + rows.length < (countRow?.total ?? 0),
    });
  } catch (error) {
    console.error("Played courses error:", error);
    return Response.json(
      { error: "Failed to fetch played courses" },
      { status: 500 },
    );
  }
}
