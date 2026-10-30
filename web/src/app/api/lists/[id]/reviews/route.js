import sql from "@/app/api/utils/sql";
import { authenticated } from "@/app/api/utils/activity/http";
import { listService } from "@/app/api/utils/activity/lists";
export async function POST(request, { params }) {
  return authenticated(request, async (userId) =>
    Response.json(
      await listService(sql).review(userId, params.id, await request.json()),
    ),
  );
}
