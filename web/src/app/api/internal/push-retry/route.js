import { timingSafeEqual } from "node:crypto";
import { flushPushOutbox } from "@/app/api/utils/pushDelivery";
export async function GET(request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") || "";
  const correct = `Bearer ${expected}`;
  if (
    !expected ||
    provided.length !== correct.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(correct))
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await flushPushOutbox());
}
