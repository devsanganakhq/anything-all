import sql from "@/app/api/utils/sql";
import { authenticated } from "@/app/api/utils/activity/http";
function valid(token) {
  return (
    typeof token === "string" &&
    /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token) &&
    token.length < 256
  );
}
export function POST(request) {
  return authenticated(request, async (userId) => {
    const { token } = await request.json();
    if (!valid(token))
      return Response.json({ error: "Invalid push token" }, { status: 400 });
    await sql(
      `INSERT INTO device_push_tokens(token,user_id) VALUES($1,$2) ON CONFLICT(token) DO UPDATE SET user_id=$2,updated_at=NOW()`,
      [token, userId],
    );
    return Response.json({ success: true });
  });
}
export function DELETE(request) {
  return authenticated(request, async (userId) => {
    const { token } = await request.json();
    if (!valid(token))
      return Response.json({ error: "Invalid push token" }, { status: 400 });
    await sql("DELETE FROM device_push_tokens WHERE token=$1 AND user_id=$2", [
      token,
      userId,
    ]);
    return Response.json({ success: true });
  });
}
