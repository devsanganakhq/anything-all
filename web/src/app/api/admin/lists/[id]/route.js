import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";
import { listService } from "@/app/api/utils/activity/lists";
export async function PUT(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    return Response.json(
      await listService(sql).save(
        guard.userId,
        params.id,
        await request.json(),
      ),
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
