/**
 * GET  /api/admin/users/[id]/moderation  – list moderation notes
 * POST /api/admin/users/[id]/moderation  – add a moderation note
 * DELETE /api/admin/users/[id]/moderation?noteId=N – remove a note
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET(_request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const userId = parseInt(params.id);
  if (!userId || isNaN(userId)) {
    return Response.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const notes = await sql`
      SELECT mn.id, mn.note_text, mn.created_at,
             a.id AS admin_id,
             CONCAT(a.first_name, ' ', a.last_name) AS admin_name
      FROM moderation_notes mn
      JOIN users a ON a.id = mn.admin_user_id
      WHERE mn.target_user_id = ${userId}
      ORDER BY mn.created_at DESC
    `;
    return Response.json({ notes });
  } catch (err) {
    console.error("Get moderation notes error:", err);
    return Response.json({ error: "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const adminUserId = guard.userId;
  const userId = parseInt(params.id);

  if (!userId || isNaN(userId)) {
    return Response.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const note = body.note?.trim();
  if (!note) {
    return Response.json({ error: "Note text is required" }, { status: 400 });
  }

  try {
    const [newNote] = await sql`
      INSERT INTO moderation_notes (target_user_id, admin_user_id, note_text)
      VALUES (${userId}, ${adminUserId}, ${note})
      RETURNING id, note_text, created_at
    `;

    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, note)
      VALUES (${adminUserId}, 'moderation_note_added', ${userId}, ${note})
    `;

    return Response.json({ success: true, note: newNote });
  } catch (err) {
    console.error("Add moderation note error:", err);
    return Response.json({ error: "Failed to add note" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const adminUserId = guard.userId;
  const userId = parseInt(params.id);
  const { searchParams } = new URL(request.url);
  const noteId = parseInt(searchParams.get("noteId") || "0");

  if (!userId || isNaN(userId) || !noteId) {
    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    await sql`
      DELETE FROM moderation_notes WHERE id = ${noteId} AND target_user_id = ${userId}
    `;
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, note)
      VALUES (${adminUserId}, 'moderation_note_deleted', ${userId}, ${`Note ID ${noteId} deleted`})
    `;
    return Response.json({ success: true });
  } catch (err) {
    console.error("Delete moderation note error:", err);
    return Response.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
