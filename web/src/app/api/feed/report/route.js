/**
 * POST /api/feed/report — report a post. Body: { postId, reason, details? }
 * reason: "spam"|"inappropriate"|"misinformation"|"harassment"|"other"
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

const VALID_REASONS = [
  "spam",
  "inappropriate",
  "misinformation",
  "harassment",
  "other",
];

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { postId, reason, details } = await request.json();
  if (!postId || !reason)
    return Response.json(
      { error: "postId and reason required" },
      { status: 400 },
    );
  if (!VALID_REASONS.includes(reason))
    return Response.json({ error: "Invalid reason" }, { status: 400 });
  try {
    await sql(
      `INSERT INTO feed_post_reports (post_id, reporter_id, reason, details)
       VALUES ($1,$2,$3,$4) ON CONFLICT (post_id,reporter_id) DO UPDATE SET reason=$3, details=$4`,
      [postId, userId, reason, details || null],
    );
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
