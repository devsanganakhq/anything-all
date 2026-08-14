import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { hash, verify } from "argon2";

export async function POST(request) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    // ── Basic input validation ──────────────────────────────────────────────
    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: "Both current and new passwords are required" },
        { status: 400 },
      );
    }

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return Response.json(
        { error: "New password must contain at least one uppercase letter" },
        { status: 400 },
      );
    }

    if (!/[a-z]/.test(newPassword)) {
      return Response.json(
        { error: "New password must contain at least one lowercase letter" },
        { status: 400 },
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return Response.json(
        { error: "New password must contain at least one number" },
        { status: 400 },
      );
    }

    // ── Look up auth_users row ───────────────────────────────────────────────
    const authUser = await sql(
      `SELECT id FROM auth_users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (authUser.length === 0) {
      return Response.json(
        { error: "User account not found" },
        { status: 404 },
      );
    }

    const authUserId = authUser[0].id;

    // ── Find credentials account ─────────────────────────────────────────────
    const account = await sql(
      `SELECT id, password FROM auth_accounts
       WHERE "userId" = $1 AND provider = 'credentials'
       LIMIT 1`,
      [authUserId],
    );

    if (account.length === 0 || !account[0].password) {
      return Response.json(
        {
          error:
            "No password set for this account. If you signed up via a social provider, password change is not available.",
        },
        { status: 400 },
      );
    }

    const storedHash = account[0].password;
    const accountId = account[0].id;

    // ── Verify current password ───────────────────────────────────────────────
    let isValid = false;
    try {
      isValid = await verify(storedHash, currentPassword);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return Response.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // ── Hash and store new password ───────────────────────────────────────────
    const newHash = await hash(newPassword);

    await sql(`UPDATE auth_accounts SET password = $1 WHERE id = $2`, [
      newHash,
      accountId,
    ]);

    return Response.json({ success: true });
  } catch (err) {
    console.error("change-password error:", err);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
