/**
 * POST /api/communities/report
 * Body: { communityId?, postId?, reportedUserId?, reason, details? }
 * reason: spam | inappropriate | misinformation | harassment | other
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function POST(request) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { communityId, postId, reportedUserId, reason, details } =
    await request.json();

  const validReasons = [
    "spam",
    "inappropriate",
    "misinformation",
    "harassment",
    "other",
  ];
  if (!reason || !validReasons.includes(reason)) {
    return Response.json({ error: "Valid reason required" }, { status: 400 });
  }
  if (!communityId && !postId && !reportedUserId) {
    return Response.json(
      { error: "Must provide communityId, postId or reportedUserId" },
      { status: 400 },
    );
  }

  try {
    await sql(
      `INSERT INTO community_reports (reporter_id, community_id, post_id, reported_user_id, reason, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        communityId || null,
        postId || null,
        reportedUserId || null,
        reason,
        details || null,
      ],
    );
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
