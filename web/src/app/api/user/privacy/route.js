import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

const PRIVACY_KEYS = ["profile_visible", "stats_visible", "activity_visible"];
const NOTIFICATION_KEYS = [
  "friend_requests",
  "likes",
  "comments",
  "community_messages",
  "community_posts",
  "push_enabled",
];
function settings(value, keys) {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid settings");
  const entries = Object.entries(value);
  if (
    entries.some(
      ([key, enabled]) => !keys.includes(key) || typeof enabled !== "boolean",
    )
  )
    throw new Error("Invalid settings");
  return JSON.stringify(Object.fromEntries(entries));
}
export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch (error) {
    return Response.json(
      { error: "Authentication required" },
      { status: error.code === "ACCOUNT_SUSPENDED" ? 403 : 401 },
    );
  }
  let privacy, notifications;
  try {
    const body = await request.json();
    privacy = settings(body.privacySettings, PRIVACY_KEYS);
    notifications = settings(body.notificationSettings, NOTIFICATION_KEYS);
  } catch {
    return Response.json(
      { error: "Settings must contain supported boolean values" },
      { status: 400 },
    );
  }
  try {
    const updated = await sql(
      `UPDATE users SET
      privacy_settings = COALESCE(privacy_settings, '{}'::jsonb) || COALESCE($1::jsonb, '{}'::jsonb),
      notification_settings = COALESCE(notification_settings, '{}'::jsonb) || COALESCE($2::jsonb, '{}'::jsonb)
      WHERE id = $3 RETURNING privacy_settings, notification_settings`,
      [privacy, notifications, userId],
    );
    if (!updated.length)
      return Response.json({ error: "Profile not found" }, { status: 404 });
    return Response.json({ settings: updated[0] });
  } catch (error) {
    console.error("Error updating privacy settings", { code: error.code });
    return Response.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
