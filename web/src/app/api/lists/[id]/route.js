import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";
import { listService } from "@/app/api/utils/activity/lists";
export async function GET(request, { params }) {
  try {
    return Response.json(
      await listService(sql).detail(
        await getSessionUserIdOrNull(request),
        params.id,
      ),
    );
  } catch (e) {
    return Response.json(
      { error: e.status ? e.message : "Unable to load list" },
      { status: e.status || 500 },
    );
  }
}
