/**
 * GET  /api/communities/:id/chat?limit=30&before=<id>  — paginated chat (newest first)
 * POST /api/communities/:id/chat                       — send message
 * Body: { text, imageUrl? }
 *
 * DELETE /api/communities/:id/chat  — delete a message (own or mod)
 * Body: { messageId }
 */
import sql from "@/app/api/utils/sql";
import {
  getSessionUserId,
  getSessionUserIdOrNull,
} from "@/app/api/utils/getUserId";

export async function GET(request, { params }) {
  const userId = (await getSessionUserIdOrNull()) ?? 0;
  const { id } = params;
  const communityId = parseInt(id, 10);
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "30", 10));
  const before = searchParams.get("before"); // load older messages before this id
  const since = searchParams.get("since"); // poll: load newer messages after this id

  try {
    let messages;

    if (since) {
      messages = await sql(
        `SELECT
            m.id, m.community_id, m.user_id, m.message_text, m.image_url, m.is_deleted, m.created_at,
            u.first_name||' '||u.last_name AS sender_name,
            u.profile_photo_url AS sender_avatar,
            u.home_club_name    AS sender_club
          FROM community_chat_messages m
          JOIN users u ON m.user_id=u.id
          WHERE m.community_id=$1 AND m.id > $2 AND m.is_deleted=false
          ORDER BY m.created_at ASC
          LIMIT $3`,
        [communityId, parseInt(since, 10), limit],
      );
    } else if (before) {
      messages = await sql(
        `SELECT
            m.id, m.community_id, m.user_id, m.message_text, m.image_url, m.is_deleted, m.created_at,
            u.first_name||' '||u.last_name AS sender_name,
            u.profile_photo_url AS sender_avatar,
            u.home_club_name    AS sender_club
          FROM community_chat_messages m
          JOIN users u ON m.user_id=u.id
          WHERE m.community_id=$1 AND m.id < $2 AND m.is_deleted=false
          ORDER BY m.created_at DESC
          LIMIT $3`,
        [communityId, parseInt(before, 10), limit],
      );
    } else {
      messages = await sql(
        `SELECT
            m.id, m.community_id, m.user_id, m.message_text, m.image_url, m.is_deleted, m.created_at,
            u.first_name||' '||u.last_name AS sender_name,
            u.profile_photo_url AS sender_avatar,
            u.home_club_name    AS sender_club
          FROM community_chat_messages m
          JOIN users u ON m.user_id=u.id
          WHERE m.community_id=$1 AND m.is_deleted=false
          ORDER BY m.created_at DESC
          LIMIT $2`,
        [communityId, limit],
      );
    }

    // Return in ascending order for rendering (oldest → newest)
    const sorted = since ? messages : [...messages].reverse();

    return Response.json({ messages: sorted, currentUserId: userId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = params;
  const communityId = parseInt(id, 10);
  const { text, imageUrl } = await request.json();

  if (!text?.trim() && !imageUrl)
    return Response.json(
      { error: "text or imageUrl required" },
      { status: 400 },
    );

  try {
    const member = await sql(
      `SELECT id FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, userId],
    );
    if (!member.length)
      return Response.json(
        { error: "Must be a member to chat" },
        { status: 403 },
      );

    const result = await sql(
      `INSERT INTO community_chat_messages (community_id, user_id, message_text, image_url)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [communityId, userId, text?.trim() || null, imageUrl || null],
    );

    const author = await sql(
      `SELECT first_name||' '||last_name AS sender_name, profile_photo_url AS sender_avatar, home_club_name AS sender_club FROM users WHERE id=$1`,
      [userId],
    );

    return Response.json({
      success: true,
      message: {
        ...result[0],
        user_id: userId,
        message_text: text,
        ...author[0],
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  let userId;
  try {
    userId = await getSessionUserId();
  } catch {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = params;
  const communityId = parseInt(id, 10);
  const { messageId } = await request.json();

  if (!messageId)
    return Response.json({ error: "messageId required" }, { status: 400 });

  try {
    // Check if own message or moderator
    const myRole = await sql(
      `SELECT role FROM community_members WHERE community_id=$1 AND user_id=$2`,
      [communityId, userId],
    );
    const isMod =
      myRole.length && ["admin", "moderator"].includes(myRole[0].role);

    const msg = await sql(
      `SELECT user_id FROM community_chat_messages WHERE id=$1`,
      [messageId],
    );
    if (!msg.length)
      return Response.json({ error: "Message not found" }, { status: 404 });
    if (!isMod && msg[0].user_id !== userId)
      return Response.json({ error: "Forbidden" }, { status: 403 });

    await sql(
      `UPDATE community_chat_messages SET is_deleted=true, deleted_by=$1 WHERE id=$2`,
      [userId, messageId],
    );

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
