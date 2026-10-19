import sql from "@/app/api/utils/sql";
import { activities, authenticated } from "@/app/api/utils/activity/http";
export function GET(request, { params }) {
  return authenticated(request, async (userId) => {
    const { id } = await params;
    const rows = await sql(
      "SELECT * FROM course_reviews WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
      [Number(id), userId],
    );
    return rows.length
      ? Response.json({ review: rows[0] })
      : Response.json({ error: "Not found" }, { status: 404 });
  });
}
export function PATCH(request, { params }) {
  return authenticated(request, async (userId) => {
    const { id } = await params;
    return Response.json({
      review: await activities.edit(userId, "review", id, await request.json()),
    });
  });
}

export function DELETE(request, { params }) {
  return authenticated(request, async (userId) => {
    await activities.deleteReview(userId, (await params).id);
    return Response.json({ success: true });
  });
}
