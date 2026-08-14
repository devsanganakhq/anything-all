import sql from "@/app/api/utils/sql";

export async function POST(request) {
  const userId = 1; // Mock user ID
  const body = await request.json();
  const { privacySettings, notificationSettings } = body;

  try {
    const updated = await sql`
      UPDATE users 
      SET 
        privacy_settings = COALESCE(${privacySettings ? JSON.stringify(privacySettings) : null}, privacy_settings),
        notification_settings = COALESCE(${notificationSettings ? JSON.stringify(notificationSettings) : null}, notification_settings)
      WHERE id = ${userId}
      RETURNING privacy_settings, notification_settings
    `;

    return Response.json({ settings: updated[0] });
  } catch (error) {
    console.error("Error updating privacy settings:", error);
    return Response.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
