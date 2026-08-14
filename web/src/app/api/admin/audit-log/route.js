/**
 * GET /api/admin/audit-log
 *
 * Paginated audit log of all admin moderation actions.
 *
 * Query params:
 *   action      – filter by action slug
 *   adminId     – filter by which admin performed the action
 *   targetId    – filter by target user
 *   page, limit
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "";
  const adminId = parseInt(searchParams.get("adminId") || "0");
  const targetId = parseInt(searchParams.get("targetId") || "0");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "25"));
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const vals = [];
    let idx = 1;

    if (action) {
      conditions.push(`al.action = $${idx++}`);
      vals.push(action);
    }
    if (adminId) {
      conditions.push(`al.admin_user_id = $${idx++}`);
      vals.push(adminId);
    }
    if (targetId) {
      conditions.push(`al.target_user_id = $${idx++}`);
      vals.push(targetId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const logsQuery = `
      SELECT
        al.id, al.action, al.reason, al.note, al.previous_value, al.new_value,
        al.target_type, al.target_id, al.created_at, al.metadata,
        -- Admin who performed the action
        adm.id    AS admin_id,
        CONCAT(adm.first_name, ' ', adm.last_name) AS admin_name,
        adm.email AS admin_email,
        -- Target user (may be null for non-user actions)
        tgt.id    AS target_user_id,
        CONCAT(tgt.first_name, ' ', tgt.last_name) AS target_name,
        tgt.email AS target_email
      FROM admin_audit_log al
      JOIN users  adm ON adm.id = al.admin_user_id
      LEFT JOIN users tgt ON tgt.id = al.target_user_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM admin_audit_log al
      ${where}
    `;

    vals.push(limit, offset);

    const [logs, countResult] = await Promise.all([
      sql(logsQuery, vals),
      sql(countQuery, vals.slice(0, -2)),
    ]);

    const total = parseInt(countResult[0]?.total || 0);

    // Friendly label map
    const LABELS = {
      account_suspended: "Account Suspended",
      account_unsuspended: "Account Unsuspended",
      admin_granted: "Admin Access Granted",
      admin_revoked: "Admin Access Revoked",
      content_removed: "Content Removed",
      moderation_note_added: "Moderation Note Added",
      moderation_note_deleted: "Moderation Note Deleted",
    };

    const formatted = logs.map((r) => ({
      id: r.id,
      action: r.action,
      actionLabel: LABELS[r.action] || r.action,
      reason: r.reason,
      note: r.note,
      previousValue: r.previous_value,
      newValue: r.new_value,
      targetType: r.target_type,
      targetId: r.target_id,
      createdAt: r.created_at,
      admin: {
        id: r.admin_id,
        name: r.admin_name?.trim() || r.admin_email,
        email: r.admin_email,
      },
      targetUser: r.target_user_id
        ? {
            id: r.target_user_id,
            name: r.target_name?.trim() || r.target_email,
            email: r.target_email,
          }
        : null,
    }));

    // Unique actions for filter dropdown
    let actionTypes = [];
    try {
      const actRows =
        await sql`SELECT DISTINCT action FROM admin_audit_log ORDER BY action`;
      actionTypes = actRows.map((r) => ({
        value: r.action,
        label: LABELS[r.action] || r.action,
      }));
    } catch {
      /* ignore */
    }

    return Response.json({
      logs: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      actionTypes,
    });
  } catch (err) {
    console.error("Audit log error:", err);
    return Response.json(
      { error: "Failed to load audit log" },
      { status: 500 },
    );
  }
}
