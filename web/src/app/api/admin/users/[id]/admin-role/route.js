/**
 * POST /api/admin/users/[id]/admin-role
 *
 * Grant or revoke administrator access.
 *
 * Body: { action: "grant" | "revoke", reason?: string }
 *
 * Safeguards (all server-side):
 *   1. Admin cannot revoke their own access.
 *   2. The last remaining administrator cannot be demoted.
 *   3. All changes are logged in admin_audit_log.
 *   4. Only existing admins can call this endpoint (requireAdmin).
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function POST(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const adminUserId = guard.userId;
  const targetId = parseInt(params.id);

  if (!targetId || isNaN(targetId)) {
    return Response.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { action, reason } = body;

  if (!["grant", "revoke"].includes(action)) {
    return Response.json(
      { error: "action must be 'grant' or 'revoke'" },
      { status: 400 },
    );
  }

  try {
    const targetRows =
      await sql`SELECT id, is_admin, first_name, last_name, email FROM users WHERE id = ${targetId} LIMIT 1`;
    if (!targetRows.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const target = targetRows[0];

    if (action === "grant" && target.is_admin) {
      return Response.json(
        { error: "User is already an administrator." },
        { status: 409 },
      );
    }
    if (action === "revoke" && !target.is_admin) {
      return Response.json(
        { error: "User is not currently an administrator." },
        { status: 409 },
      );
    }

    // Safeguard 1: Cannot revoke own access
    if (action === "revoke" && targetId === adminUserId) {
      return Response.json(
        { error: "You cannot revoke your own administrator access." },
        { status: 400 },
      );
    }

    // Safeguard 2: Cannot remove last admin
    if (action === "revoke") {
      const adminCountRows =
        await sql`SELECT COUNT(*) AS total FROM users WHERE is_admin = true`;
      const adminCount = parseInt(adminCountRows[0]?.total || 0);
      if (adminCount <= 1) {
        return Response.json(
          {
            error:
              "Cannot remove the last administrator. Grant access to another user first.",
          },
          { status: 400 },
        );
      }
    }

    if (action === "grant") {
      await sql`UPDATE users SET is_admin = true WHERE id = ${targetId}`;
      await sql`
        INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, reason, previous_value, new_value)
        VALUES (${adminUserId}, 'admin_granted', ${targetId}, ${reason?.trim() || null}, 'false', 'true')
      `;
      return Response.json({
        success: true,
        message: `Admin access granted to ${target.first_name || target.email}.`,
      });
    } else {
      await sql`UPDATE users SET is_admin = false WHERE id = ${targetId}`;
      await sql`
        INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, reason, previous_value, new_value)
        VALUES (${adminUserId}, 'admin_revoked', ${targetId}, ${reason?.trim() || null}, 'true', 'false')
      `;
      return Response.json({
        success: true,
        message: `Admin access revoked from ${target.first_name || target.email}.`,
      });
    }
  } catch (err) {
    console.error("Admin role change error:", err);
    return Response.json({ error: "Action failed" }, { status: 500 });
  }
}
