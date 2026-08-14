/**
 * POST /api/admin/users/[id]/suspend
 *
 * Suspend or unsuspend a user account.
 *
 * Body: { action: "suspend" | "unsuspend", reason?: string }
 *
 * Suspension:
 *   - Sets is_suspended = true on the users row
 *   - Records who suspended and when
 *   - Deletes all active auth_sessions for the user (forces re-auth)
 *   - Logs the action in admin_audit_log
 *
 * Unsuspension:
 *   - Clears suspension fields
 *   - Logs the action
 *
 * Safeguards:
 *   - Admin cannot suspend themselves
 *   - Cannot suspend another admin without noting reason
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

  // Admin cannot suspend themselves
  if (targetId === adminUserId) {
    return Response.json(
      { error: "You cannot suspend your own account." },
      { status: 400 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { action, reason } = body;

  if (!["suspend", "unsuspend"].includes(action)) {
    return Response.json(
      { error: "action must be 'suspend' or 'unsuspend'" },
      { status: 400 },
    );
  }
  if (action === "suspend" && !reason?.trim()) {
    return Response.json(
      { error: "A reason is required when suspending an account." },
      { status: 400 },
    );
  }

  try {
    // Fetch target user
    const targetRows =
      await sql`SELECT id, email, is_admin, is_suspended FROM users WHERE id = ${targetId} LIMIT 1`;
    if (!targetRows.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const target = targetRows[0];

    if (action === "suspend" && target.is_suspended) {
      return Response.json(
        { error: "User is already suspended." },
        { status: 409 },
      );
    }
    if (action === "unsuspend" && !target.is_suspended) {
      return Response.json(
        { error: "User is not currently suspended." },
        { status: 409 },
      );
    }

    if (action === "suspend") {
      // 1. Mark suspended
      await sql`
        UPDATE users
        SET
          is_suspended      = true,
          suspended_at      = NOW(),
          suspended_by      = ${adminUserId},
          suspension_reason = ${reason.trim()}
        WHERE id = ${targetId}
      `;

      // 2. Kill active auth sessions — join auth_users by email
      await sql`
        DELETE FROM auth_sessions
        WHERE "userId" IN (
          SELECT id FROM auth_users WHERE email = ${target.email}
        )
      `;

      // 3. Audit log
      await sql`
        INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, reason, previous_value, new_value)
        VALUES (${adminUserId}, 'account_suspended', ${targetId}, ${reason.trim()}, 'active', 'suspended')
      `;

      return Response.json({
        success: true,
        message: "Account suspended and all sessions invalidated.",
      });
    } else {
      // Unsuspend
      await sql`
        UPDATE users
        SET
          is_suspended      = false,
          suspended_at      = NULL,
          suspended_by      = NULL,
          suspension_reason = NULL
        WHERE id = ${targetId}
      `;

      await sql`
        INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, reason, previous_value, new_value)
        VALUES (${adminUserId}, 'account_unsuspended', ${targetId}, ${reason?.trim() || null}, 'suspended', 'active')
      `;

      return Response.json({
        success: true,
        message: "Account unsuspended. User can now log in again.",
      });
    }
  } catch (err) {
    console.error("Suspend action error:", err);
    return Response.json({ error: "Action failed" }, { status: 500 });
  }
}
