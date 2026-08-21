import sql from "@/app/api/utils/sql";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const country = searchParams.get("country") || "";
  const courseType = searchParams.get("type") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  try {
    const params = [];
    const conditions = [];
    let idx = 1;

    if (q.trim().length >= 2) {
      conditions.push(
        `(LOWER(name) LIKE LOWER($${idx}) OR LOWER(COALESCE(club_name,'')) LIKE LOWER($${idx}) OR LOWER(COALESCE(display_name,'')) LIKE LOWER($${idx}) OR LOWER(COALESCE(city,'')) LIKE LOWER($${idx}) OR LOWER(COALESCE(county,'')) LIKE LOWER($${idx}))`,
      );
      params.push(`%${q.trim()}%`);
      idx++;
    }
    if (country) {
      conditions.push(`country = $${idx}`);
      params.push(country);
      idx++;
    }
    if (courseType) {
      conditions.push(`course_type = $${idx}`);
      params.push(courseType);
      idx++;
    }

    params.push(limit);
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT * FROM courses ${whereClause}
      ORDER BY
        EXISTS (
          SELECT 1 FROM rankings r
          WHERE r.course_id = courses.id AND r.is_active = true
        ) DESC,
        (latitude IS NOT NULL AND longitude IS NOT NULL) DESC,
        community_rating DESC NULLS LAST,
        played_count DESC,
        name
      LIMIT $${idx}`;

    const courses = await sql(query, params);
    return Response.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return Response.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
