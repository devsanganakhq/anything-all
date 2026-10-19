import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";
import { authenticated } from "@/app/api/utils/activity/http";
import { listService } from "@/app/api/utils/activity/lists";
export async function GET(request) {
  try {
    const requested = new URL(request.url).searchParams.get("userId");
    let userId = await getSessionUserIdOrNull(request);
    if (requested) {
      const { passportOwner } = await import("@/app/api/utils/activity/http");
      userId = (await passportOwner(request)).owner;
    }
    return Response.json({ lists: await listService(sql).collections(userId) });
  } catch (e) {
    return Response.json(
      { error: "Unable to load lists" },
      { status: e.status || 500 },
    );
  }
}
