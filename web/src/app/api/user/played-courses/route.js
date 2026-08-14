import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function GET(request) {
  const userId = await getSessionUserId(request);
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const rows = await sql(
      `SELECT
          pc.id, pc.course_id, pc.date_played, pc.rating, pc.review_text, pc.created_at,
          c.name AS course_name, c.club_name, c.city, c.county, c.country,
          c.course_type, c.community_rating, c.par, c.holes
        FROM played_courses pc
        JOIN courses c ON c.id = pc.course_id
        WHERE pc.user_id = $1
        ORDER BY pc.date_played DESC NULLS LAST, pc.created_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const [countRow] = await sql(
      `SELECT COUNT(*)::int AS total FROM played_courses WHERE user_id = $1`,
      [userId],
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
