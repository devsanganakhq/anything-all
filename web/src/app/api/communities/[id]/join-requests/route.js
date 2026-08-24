/**
 * GET  /api/communities/:id/join-requests — list pending requests (admin only)
 * POST /api/communities/:id/join-requests — accept or decline a request (admin only)
 *   body: { requestId, action: "accept" | "decline" }
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createNotification } from "@/app/api/utils/createNotification";
import { addCommunityMember } from "@/app/api/utils/addCommunityMember";
import { ensureCommunityJoinRequestsTable } from "@/app/api/utils/ensureCommunityJoinRequestsTable";

async function requireAdmin(communityId, userId) {
  const rows = await sql(
    `SELECT role FROM community_members WHERE community_id=$1 AND user_id=$2`,
    [communityId, userId],
  );
  if (!rows.length || rows[0].role !== "admin") {
    return null;
  }
  return rows[0];
}

export async function GET(request, { params }) {
  const userId = await getSessionUserId();
  const communityId = parseInt(params.id, 10);

  try {
    await ensureCommunityJoinRequestsTable();

    if (!(await requireAdmin(communityId, userId))) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const requests = await sql(
      `SELECT
          cjr.id,
          cjr.user_id,
          cjr.created_at AS requested_at,
          u.first_name || ' ' || u.last_name AS name,
          u.profile_photo_url AS avatar,
          u.home_club_name AS home_club,
          u.location
        FROM community_join_requests cjr
        JOIN users u ON cjr.user_id = u.id
        WHERE cjr.community_id = $1 AND cjr.status = 'pending'
        ORDER BY cjr.created_at ASC`,
      [communityId],
    );

    return Response.json({ requests, pending_count: requests.length });
  } catch (error) {
    console.error("Join requests list error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const userId = await getSessionUserId();
  const communityId = parseInt(params.id, 10);
  const { requestId, action } = await request.json();

  if (!requestId || !["accept", "decline"].includes(action)) {
    return Response.json(
      { error: "requestId and action (accept|decline) required" },
      { status: 400 },
    );
  }

  try {
    await ensureCommunityJoinRequestsTable();

    if (!(await requireAdmin(communityId, userId))) {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const reqRows = await sql(
      `SELECT cjr.*, c.name AS community_name
       FROM community_join_requests cjr
       JOIN communities c ON c.id = cjr.community_id
       WHERE cjr.id = $1 AND cjr.community_id = $2 AND cjr.status = 'pending'`,
      [requestId, communityId],
    );
    if (!reqRows.length) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }

    const joinRequest = reqRows[0];

    if (action === "decline") {
      await sql(
        `UPDATE community_join_requests
         SET status='declined', reviewed_at=NOW(), reviewed_by=$1
         WHERE id=$2`,
        [userId, requestId],
      );

      await createNotification({
        userId: joinRequest.user_id,
        notificationType: "community_join_declined",
        fromUserId: userId,
        communityId,
        message: `declined your request to join ${joinRequest.community_name}`,
      });

      return Response.json({ success: true, action: "declined" });
    }

    const alreadyMember = await sql(
      `SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, joinRequest.user_id],
    );
    if (!alreadyMember.length) {
      await addCommunityMember({
        communityId,
        userId: joinRequest.user_id,
        communityName: joinRequest.community_name,
      });
    }

    await sql(
      `UPDATE community_join_requests
       SET status='accepted', reviewed_at=NOW(), reviewed_by=$1
       WHERE id=$2`,
      [userId, requestId],
    );

    await createNotification({
      userId: joinRequest.user_id,
      notificationType: "community_join_accepted",
      fromUserId: userId,
      communityId,
      message: `accepted your request to join ${joinRequest.community_name}`,
    });

    return Response.json({ success: true, action: "accepted" });
  } catch (error) {
    console.error("Join request respond error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
