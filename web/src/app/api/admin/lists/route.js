import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";
import { listService } from "@/app/api/utils/activity/lists";
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const lists = await sql(
    `SELECT l.*,COALESCE((SELECT json_agg(course_id ORDER BY position) FROM curated_list_courses WHERE list_id=l.id AND counts_for_completion),'[]') AS course_ids FROM curated_lists l ORDER BY l.display_order,l.id`,
  );
  return Response.json({ lists });
}
export async function POST(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    return Response.json(
      await listService(sql).save(guard.userId, null, await request.json()),
    );
  } catch (e) {
    return Response.json(
      {
        error: e.status
          ? e.message
          : e.code === "23503"
            ? "One or more courses do not exist"
            : "Unable to save list",
      },
      { status: e.status || (e.code === "23503" ? 400 : 500) },
    );
  }
}
