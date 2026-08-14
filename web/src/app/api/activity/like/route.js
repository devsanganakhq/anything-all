import sql from "@/app/api/utils/sql";

export async function POST(request) {
  const userId = 1; // Mock user ID
  const body = await request.json();
  const { activityId } = body;

  if (!activityId) {
    return Response.json({ error: "Activity ID required" }, { status: 400 });
  }

  try {
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

      if (activity[0] && activity[0].user_id !== userId) {
        await sql`
          INSERT INTO notifications (user_id, notification_type, from_user_id, activity_id, message)
          VALUES (${activity[0].user_id}, 'activity_like', ${userId}, ${activityId}, 'liked your activity')
        `;
      }

      return Response.json({ liked: true });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return Response.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
