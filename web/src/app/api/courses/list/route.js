import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";
import { courseScope, boundedInteger } from "@/app/api/utils/courses/scope";
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, boundedInteger(searchParams.get("limit"), 50, 200));
  const offset = boundedInteger(searchParams.get("offset"), 0, 100000);
  const paginated = searchParams.get("paginated") === "true";
  try {
    const userId = await getSessionUserIdOrNull(request);
    const { conditions, params } = courseScope(searchParams, "c");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const idx = params.length;
    const sortByName =
      searchParams.get("sort") === "name" || !!searchParams.get("country");
    const order = sortByName
      ? `LOWER(COALESCE(NULLIF(TRIM(c.club_name),''),c.name,'')),c.name,c.id`
      : `EXISTS(SELECT 1 FROM rankings r WHERE r.course_id=c.id AND r.is_active) DESC,c.community_rating DESC NULLS LAST,c.played_count DESC,c.name,c.id`;
    const courses = await sql(
      `SELECT c.*,
   EXISTS(SELECT 1 FROM played_courses p WHERE p.course_id=c.id AND p.user_id=$${idx + 3}::int) AS user_played,
   EXISTS(SELECT 1 FROM wishlist w WHERE w.course_id=c.id AND w.user_id=$${idx + 3}::int) AS user_wishlisted
   FROM courses c ${where} ORDER BY ${order} LIMIT $${idx + 1} OFFSET $${idx + 2}`,
      [...params, limit, offset, userId],
    );
    if (!paginated) return Response.json(courses);
    const [{ total }] = await sql(
      `SELECT COUNT(*)::int AS total FROM courses c ${where}`,
      params,
    );
    const nextOffset = offset + courses.length;
    return Response.json({
      courses,
      total,
      nextOffset: nextOffset < total ? nextOffset : null,
      hasMore: nextOffset < total,
    });
  } catch (e) {
    console.error("Error fetching courses", e);
    return Response.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
