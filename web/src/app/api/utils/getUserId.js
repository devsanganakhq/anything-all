/**
 * getUserId.js — Canonical identity resolver for Heathland Links
 *
 * ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * The platform maintains two separate tables:
 *
 *   auth_users  — managed by the auth provider (platform integer IDs)
 *   users       — the application's business profile table (separate integer IDs)
 *
 * These tables are linked exclusively by the exact, normalised email address.
 * There is a strict one-to-one mapping:
 *
 *   auth session email  →  users.email (exact match, case-insensitive normalisation)
 *                       →  users.id    (used for ALL application data queries)
 *
 * IDENTITY RULES
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. Each email address is an independent, legitimate identity.
 *  2. Account ownership is determined solely by exact email match.
 *  3. Accounts must NEVER be merged, linked, or cross-resolved based on:
 *       - String similarity       - Levenshtein distance
 *       - One-character differences - Matching names
 *       - Matching devices         - Matching IP addresses
 *  4. auth_users.id and users.id are NEVER interchangeable. Always resolve
 *     through email to obtain the correct users.id before any data query.
 *
 * EXPORTS
 * ─────────────────────────────────────────────────────────────────────────────
 *  getSessionUserId()      — resolves session → users.id. Throws if not
 *                            authenticated or no users row exists.
 *  getSessionUserIdOrNull() — same, but returns null instead of throwing.
 *                            Use for optional-auth routes.
 *  getCurrentProfileUser() — returns the full users row for the session.
 *  createUserOnSignup()    — the ONLY place a new users row may be created.
 *                            Called explicitly from the sign-up route only.
 *
 * PROHIBITED
 * ─────────────────────────────────────────────────────────────────────────────
 *  - Hardcoded fallback user IDs in any production path.
 *  - Silent auto-creation of users rows outside of _resolveUser (first-login
 *    path) and createUserOnSignup (explicit sign-up path).
 *  - Any assumption that two similar-looking email addresses share an identity.
 */

import { auth } from "@/auth";
import { getToken } from "@auth/core/jwt";
import sql from "./sql";

// ─── Internal: resolve email from Authorization: Bearer header ────────────────
/**
 * Falls back to validating the JWT from the Authorization: Bearer header
 * when no cookie session is present. Required for mobile clients where iOS
 * may flush the WKWebView shared cookie jar during native image picker
 * interactions (PHPickerViewController runs in a separate process on iOS 16+
 * and can silently clear HTTPCookieStorage on resume).
 *
 * Returns the verified email string, or null if not present / invalid.
 */
async function _getEmailFromBearerToken(request) {
  if (!request) return null;
  try {
    const isSecure =
      process.env.AUTH_URL?.startsWith("https") ??
      request.url?.startsWith("https") ??
      false;
    const jwt = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: isSecure,
    });
    return jwt?.email ?? null;
  } catch {
    return null;
  }
}

// ─── Public exports ───────────────────────────────────────────────────────────

/**
 * Returns users.id for the currently authenticated session.
 *
 * Accepts an optional `request` parameter. When provided, and when the
 * cookie-based session returns no email, the function falls back to
 * validating an Authorization: Bearer token from the request headers.
 * This dual-path is required for mobile (Expo) clients on iOS.
 *
 * Throws a structured error if:
 *   - No session exists (not logged in)  → err.code = "UNAUTHENTICATED"
 *   - The account is suspended           → err.code = "ACCOUNT_SUSPENDED"
 *   - No users row exists for the email  → err.code = "PROFILE_NOT_FOUND"
 *   - An unexpected failure occurs       → err.code = "AUTH_ERROR"
 */
export async function getSessionUserId(request = null) {
  try {
    const session = await auth();
    let email = session?.user?.email;

    // Mobile fallback: if no cookie session, try the Bearer token
    if (!email && request) {
      email = await _getEmailFromBearerToken(request);
    }

    if (!email) {
      const err = new Error("Not authenticated");
      err.code = "UNAUTHENTICATED";
      throw err;
    }

    const user = await _resolveUser(email);

    if (!user) {
      const err = new Error("No profile found for the authenticated account.");
      err.code = "PROFILE_NOT_FOUND";
      throw err;
    }

    return user.id;
  } catch (err) {
    // Re-throw structured errors exactly as-is
    if (err.code) throw err;
    // Unexpected errors are logged and wrapped — never silently swallowed
    console.error("[getSessionUserId] Unexpected error:", err);
    const wrapped = new Error("Authentication error");
    wrapped.code = "AUTH_ERROR";
    throw wrapped;
  }
}

/**
 * Returns users.id for the current session, or null if not authenticated.
 * Accepts an optional `request` for mobile bearer-token fallback.
 */
export async function getSessionUserIdOrNull(request = null) {
  try {
    const session = await auth();
    let email = session?.user?.email;

    if (!email && request) {
      email = await _getEmailFromBearerToken(request);
    }

    if (!email) return null;
    const user = await _resolveUser(email);
    return user?.id ?? null;
  } catch (err) {
    if (err.code === "ACCOUNT_SUSPENDED") throw err;
    return null;
  }
}

/**
 * Returns the complete users row for the current session.
 * Accepts an optional `request` for mobile bearer-token fallback.
 */
export async function getCurrentProfileUser(request = null) {
  const session = await auth().catch(() => null);
  let email = session?.user?.email;

  if (!email && request) {
    email = await _getEmailFromBearerToken(request);
  }

  if (!email) {
    const err = new Error("Not authenticated");
    err.code = "UNAUTHENTICATED";
    throw err;
  }

  const resolved = await _resolveUser(email);

  if (!resolved) {
    const err = new Error("No profile found for the authenticated account.");
    err.code = "PROFILE_NOT_FOUND";
    throw err;
  }

  const rows = await sql(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [
    resolved.id,
  ]);
  return rows[0] ?? null;
}

/**
 * Creates a users profile row for a newly registered account.
 *
 * This is the ONLY place a users row should be created explicitly by a
 * sign-up flow. It must not be called from middleware, API handlers, or
 * any other background path.
 *
 * Returns { id, isNew } where isNew=false means a row already existed
 * (idempotent — safe to call more than once for the same email).
 *
 * Throws err.code = "ACCOUNT_SUSPENDED" if the email belongs to a
 * suspended account that cannot be re-registered.
 */
export async function createUserOnSignup({
  email,
  firstName,
  lastName,
  photoUrl,
}) {
  if (!email) throw new Error("createUserOnSignup: email is required");

  const existing = await sql(
    `SELECT id, is_suspended FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (existing.length > 0) {
    if (existing[0].is_suspended) {
      const err = new Error(
        "This account is currently unavailable. Please contact support.",
      );
      err.code = "ACCOUNT_SUSPENDED";
      throw err;
    }
    // Account already exists — return it (idempotent)
    return { id: existing[0].id, isNew: false };
  }

  const created = await sql(
    `INSERT INTO users (email, password, first_name, last_name, profile_photo_url)
     VALUES ($1, 'auth-managed', $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, firstName || null, lastName || null, photoUrl || null],
  );

  if (!created.length) {
    // A concurrent request inserted the row between our SELECT and INSERT
    const refetch = await sql(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [
      email,
    ]);
    return { id: refetch[0].id, isNew: false };
  }

  return { id: created[0].id, isNew: true };
}

// ─── Internal helper ──────────────────────────────────────────────────────────

/**
 * Resolves an exact email address to a users row.
 *
 * - Matching is exact (case-insensitive via LOWER/LOWER) on the stored email.
 * - If no row exists and the account is new, creates a minimal users row
 *   so the user can complete their profile on first login.
 * - If the matched row is suspended, throws ACCOUNT_SUSPENDED.
 * - Does NOT compare email addresses to other addresses in any way.
 *   Each email is an independent identity.
 */
async function _resolveUser(email) {
  const normalised = email.trim().toLowerCase();

  const anyRow = await sql(
    `SELECT id, is_suspended FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [normalised],
  );

  if (anyRow.length > 0) {
    if (anyRow[0].is_suspended) {
      const err = new Error(
        "This account has been suspended. Please contact support.",
      );
      err.code = "ACCOUNT_SUSPENDED";
      throw err;
    }
    return anyRow[0];
  }

  // No row found — first login for a new account
  const session = await auth().catch(() => null);
  const displayName = session?.user?.name ?? "";
  const parts = displayName.trim().split(/\s+/);
  const first = parts[0] || null;
  const last = parts.slice(1).join(" ") || null;

  const created = await sql(
    `INSERT INTO users (email, password, first_name, last_name)
     VALUES ($1, 'auth-managed', $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, first, last],
  );

  if (created.length > 0) {
    return { id: created[0].id, is_suspended: false };
  }

  const refetch = await sql(
    `SELECT id, is_suspended FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [normalised],
  );
  return refetch.length ? refetch[0] : null;
}
