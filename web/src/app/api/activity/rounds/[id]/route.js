import sql from "@/app/api/utils/sql";
import { activities, authenticated } from "@/app/api/utils/activity/http";
export function GET(request, { params }) {
  return authenticated(request, async (userId) => {
    const { id } = await params;
    const rows = await sql(
      "SELECT * FROM course_rounds WHERE id=$1 AND user_id=$2",
      [Number(id), userId],
    );
    return rows.length
      ? Response.json({ round: rows[0] })
      : Response.json({ error: "Not found" }, { status: 404 });
  });
}
export function PATCH(request, { params }) {
  return authenticated(request, async (userId) => {
    const { id } = await params;
    return Response.json({
      round: await activities.edit(userId, "round", id, await request.json()),
    });
  });
}
