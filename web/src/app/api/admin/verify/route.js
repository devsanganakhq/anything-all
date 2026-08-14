/**
 * GET /api/admin/verify
 *
 * Lightweight admin status endpoint used by the frontend layout.
 *
 * Returns:
 *   200 { admin: true,  userId, email }   — caller is an authenticated admin
 *   401 { error: "..." }                   — not signed in
 *   403 { error: "..." }                   — signed in but not an admin
 *
 * The frontend uses this to decide whether to render the admin UI or an
 * access-denied screen. The actual admin API routes (e.g. /api/admin/courses/import)
 * independently enforce the same check server-side, so hiding the UI is
 * defence-in-depth only — the API cannot be abused even if the frontend
 * check is bypassed.
 */

import { requireAdmin } from "@/app/api/utils/requireAdmin";
import { auth } from "@/auth";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  // Also return the email so the UI can display who is logged in
  const session = await auth();

  return Response.json({
    admin: true,
    userId: guard.userId,
    email: session?.user?.email ?? null,
    name: session?.user?.name ?? null,
  });
}
