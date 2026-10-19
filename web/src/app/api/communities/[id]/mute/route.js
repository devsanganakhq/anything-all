import sql from "@/app/api/utils/sql";
import { authenticated } from "@/app/api/utils/activity/http";
export function PUT(request, { params }) {
  return authenticated(request, async (userId) => {
    const { muted } = await request.json();
    if (typeof muted !== "boolean")
      return Response.json({ error: "muted must be boolean" }, { status: 400 });
    const rows = await sql(
      "UPDATE community_members SET muted=$3 WHERE community_id=$1 AND user_id=$2 RETURNING muted",
      [Number((await params).id), userId, muted],
    );
    return rows.length
      ? Response.json(rows[0])
      : Response.json({ error: "Membership required" }, { status: 403 });
  });
}
