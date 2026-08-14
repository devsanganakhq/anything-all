/**
 * requireAdmin()
 *
 * Server-side admin guard. Call this at the top of any admin API route handler.
 *
 * Checks THREE things independently, in order:
 *   1. Is there a valid authenticated session?          → 401 if not
 *   2. Does a matching row exist in the users table?   → 403 if not
 *   3. Does that user have is_admin = true?            → 403 if not
 *
 * Returns either:
 *   { ok: true,  userId: number }   — caller may proceed
 *   { ok: false, response: Response } — caller must return this Response immediately
 *
 * Security properties:
 *   - No frontend involvement: this runs exclusively on the server.
 *   - No fallback to demo user: missing session → hard 401.
 *   - No trust in request headers or body: only the signed session cookie is used.
 *   - Admin status is read fresh from the database on every request.
 *   - The is_admin column defaults to false; it can only be set via direct DB access.
 *
 * Usage in a route handler:
 *
 *   import { requireAdmin } from "@/app/api/utils/requireAdmin";
 *
 *   export async function POST(request) {
 *     const guard = await requireAdmin();
 *     if (!guard.ok) return guard.response;
 *     const { userId } = guard;
 *     // ... admin logic ...
 *   }
 */

import { auth } from "@/auth";
import sql from "./sql";

export async function requireAdmin() {
  // ── 1. Session check ──────────────────────────────────────────────────────
  let session;
  try {
    session = await auth();
  } catch (err) {
    console.error("requireAdmin: auth() threw", err);
    return {
      ok: false,
      response: Response.json(
        { error: "Authentication error. Please sign in again." },
        { status: 401 },
      ),
    };
  }

  if (!session?.user?.email) {
    return {
      ok: false,
      response: Response.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 },
      ),
    };
  }

  const email = session.user.email;

  // ── 2 + 3. User existence + admin flag check ──────────────────────────────
  let rows;
  try {
    rows = await sql(
      `SELECT id, is_admin FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
  } catch (err) {
    console.error("requireAdmin: DB query failed", err);
    return {
      ok: false,
      response: Response.json(
        { error: "Server error checking permissions." },
        { status: 500 },
      ),
    };
  }

  // No matching user row at all → forbidden (not a registered app user)
  if (!rows || rows.length === 0) {
    return {
      ok: false,
      response: Response.json(
        { error: "Access denied. No user profile found." },
        { status: 403 },
      ),
    };
  }

  const user = rows[0];

  // User exists but is not an admin
  if (!user.is_admin) {
    return {
      ok: false,
      response: Response.json(
        {
          error:
            "Access denied. Administrator permissions required. " +
            "Contact the platform operator to request admin access.",
        },
        { status: 403 },
      ),
    };
  }

  // All checks passed
  return { ok: true, userId: user.id };
}
