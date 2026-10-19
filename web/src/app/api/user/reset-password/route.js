import sql from "@/app/api/utils/sql";
import { hash } from "argon2";

const PASSWORD_RULES = {
  minLength: 8,
  hasUpper: /[A-Z]/,
  hasLower: /[a-z]/,
  hasNumber: /[0-9]/,
};

export async function POST(request) {
  let token, password;
  try {
    const body = await request.json();
    token = body?.token;
    password = body?.password;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return Response.json({ error: "Reset token is required" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return Response.json(
      { error: "New password is required" },
      { status: 400 },
    );
  }
  if (password.length < PASSWORD_RULES.minLength) {
    return Response.json(
      {
        error: `Password must be at least ${PASSWORD_RULES.minLength} characters`,
      },
      { status: 400 },
    );
  }
  if (!PASSWORD_RULES.hasUpper.test(password)) {
    return Response.json(
      { error: "Password must contain at least one uppercase letter" },
      { status: 400 },
    );
  }
  if (!PASSWORD_RULES.hasLower.test(password)) {
    return Response.json(
      { error: "Password must contain at least one lowercase letter" },
      { status: 400 },
    );
  }
  if (!PASSWORD_RULES.hasNumber.test(password)) {
    return Response.json(
      { error: "Password must contain at least one number" },
      { status: 400 },
    );
  }

  try {
    // ── Find valid, unused, non-expired token ─────────────────────────────
    const tokenRows = await sql(
      `SELECT id, email
         FROM password_reset_tokens
        WHERE token = $1
          AND used = false
          AND expires_at > NOW()
        LIMIT 1`,
      [token.trim()],
    );

    if (tokenRows.length === 0) {
      return Response.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    const { id: tokenId, email } = tokenRows[0];

    // ── Find the auth_users row for this email ─────────────────────────────
    const authUserRows = await sql(
      `SELECT id FROM auth_users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );

    if (authUserRows.length === 0) {
      // Shouldn't happen but guard it
      return Response.json(
        { error: "Account not found. Please contact support." },
        { status: 404 },
      );
    }

    const authUserId = authUserRows[0].id;

    // ── Find the credentials auth_account ─────────────────────────────────
    const accountRows = await sql(
      `SELECT id FROM auth_accounts
        WHERE "userId" = $1 AND provider = 'credentials'
        LIMIT 1`,
      [authUserId],
    );

    if (accountRows.length === 0) {
      return Response.json(
        { error: "No password account found. Please contact support." },
        { status: 400 },
      );
    }

    const accountId = accountRows[0].id;

    // ── Hash the new password (argon2id, same as the auth system) ─────────
    const newHash = await hash(password);

    // One statement consumes the token and changes the password. Concurrent
    // submissions cannot reuse a consumed token or leave a half-applied reset.
    const changed = await sql(
      `WITH consumed AS (
      UPDATE password_reset_tokens SET used=true
      WHERE id=$1 AND used=false AND expires_at>NOW() RETURNING email
    ), changed AS (
      UPDATE auth_accounts SET password=$2 WHERE id=$3
        AND EXISTS(SELECT 1 FROM consumed) RETURNING id
    ) SELECT id FROM changed`,
      [tokenId, newHash, accountId],
    );
    if (!changed.length)
      return Response.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 },
      );

    return Response.json({ success: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}

// ── Validate token without consuming it (GET) ──────────────────────────────
export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.json({ valid: false, error: "Token missing" });
  }

  try {
    const rows = await sql(
      `SELECT id FROM password_reset_tokens
        WHERE token = $1 AND used = false AND expires_at > NOW()
        LIMIT 1`,
      [token.trim()],
    );
    return Response.json({ valid: rows.length > 0 });
  } catch {
    return Response.json({ valid: false });
  }
}
