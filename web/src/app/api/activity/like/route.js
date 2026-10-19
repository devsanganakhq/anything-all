import { activities } from "@/app/api/utils/activity/http";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import sql from "@/app/api/utils/sql";
import { createNotification } from "@/app/api/utils/createNotification";

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await request.json();
  const { activityId } = body;

  if (!activityId) {
    return Response.json({ error: "Activity ID required" }, { status: 400 });
  }

  try {
    const owner = await sql("SELECT user_id FROM activity_feed WHERE id=$1", [
      activityId,
    ]);
    if (
      !owner.length ||
      !(await activities.canViewPassport(userId, owner[0].user_id))
    )
      return Response.json(
        { error: "Activity not available" },
        { status: 404 },
      );
    // Check if already liked
    const existing = await sql`
      SELECT id FROM activity_likes 
      WHERE activity_id = ${activityId} AND user_id = ${userId}
    `;

    if (existing.length > 0) {
      // Unlike
      await sql`
        DELETE FROM activity_likes 
        WHERE activity_id = ${activityId} AND user_id = ${userId}
      `;
      return Response.json({ liked: false });
    } else {
      // Like
      await sql`
        INSERT INTO activity_likes (activity_id, user_id)
        VALUES (${activityId}, ${userId})
      `;

      // Create notification for activity owner
      const activity = await sql`
        SELECT user_id FROM activity_feed WHERE id = ${activityId}
      `;

      if (activity[0]) {
        await createNotification({
          userId: activity[0].user_id,
          notificationType: "activity_like",
          fromUserId: userId,
          activityId,
          message: "liked your activity",
        });
      }

      return Response.json({ liked: true });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return Response.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
