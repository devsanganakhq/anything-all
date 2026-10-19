// Compatibility endpoint for installed versions. New builds use separate review/round APIs.
import { createHash } from "node:crypto";
import { activities, authenticated } from "@/app/api/utils/activity/http";
export function POST(request) {
  return authenticated(request, async (userId) => {
    const body = await request.json();
    const requestId =
      body.requestId ||
      createHash("sha256")
        .update(
          JSON.stringify([
            userId,
            body.courseId,
            body.datePlayed,
            body.rating,
            body.reviewText,
          ]),
        )
        .digest("hex");
    const kind = Number(body.rating) > 0 ? "review" : "round";
    const activity = await activities.create(
      userId,
      kind,
      {
        ...body,
        rating: Number(body.rating),
        datePlayed: body.datePlayed || new Date().toISOString().slice(0, 10),
        requestId,
      },
      { legacy: true },
    );
    return Response.json({
      success: true,
      activityId: activity.id,
      reviewId: activity.legacy_played_id || null,
    });
  });
}
