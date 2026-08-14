/**
 * /api/user/profile — GET and POST
 *
 * GET  — returns the full profile row + stats + club memberships for the
 *        authenticated user.
 * POST — updates editable profile fields for the authenticated user.
 *
 * Identity is always resolved via getSessionUserId() which maps
 *   session email → users.id
 * The client NEVER sends a user_id — it is always resolved server-side.
 *
 * UPDATE strategy — dynamic SET clause (no boolean SQL parameters):
 *   Fields the client sends are always written to the row (direct assignment).
 *   Fields the client omits are excluded from the SET clause entirely.
 *   first_name is required — COALESCE keeps the existing value if null is sent.
 *   All other optional fields allow null (explicitly clearing bio/location/handicap).
 *   profile_photo_url — only written when explicitly present in the request body.
 *   home_club_id / home_club_name / member_since — only written if present in body.
 */

import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request) {
  let userId;
  try {
    userId = await getSessionUserId(request); // ← pass request: enables mobile Bearer fallback
  } catch (err) {
    const status = err.code === "UNAUTHENTICATED" ? 401 : 500;
    return Response.json(
      { error: err.code ?? "auth_error", message: err.message },
      { status },
    );
  }

  try {
    const userRows = await sql(
      `SELECT
          id, email,
          first_name, last_name,
          TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name,
          profile_photo_url, location, bio,
          home_club_id, home_club_name, member_since,
          handicap, privacy_settings, notification_settings, created_at
        FROM users WHERE id = $1`,
      [userId],
    );

    if (userRows.length === 0) {
      return Response.json(
        { error: "not_found", message: "User not found" },
        { status: 404 },
      );
    }

    const stats = await sql(
      `SELECT
          (SELECT COUNT(*)::int FROM played_courses    WHERE user_id=$1) AS courses_played,
          (SELECT COUNT(*)::int FROM wishlist          WHERE user_id=$1) AS wishlist_count,
          (SELECT COUNT(*)::int FROM friendships       WHERE (user_id=$1 OR friend_id=$1) AND status='accepted') AS friends_count,
          (SELECT COUNT(*)::int FROM community_members WHERE user_id=$1) AS communities_count`,
      [userId],
    );

    const memberships = await sql(
      `SELECT
          ucm.id, ucm.club_id, ucm.club_name, ucm.membership_type,
          ucm.display_order, ucm.visibility, ucm.verified_status, ucm.joined_year,
          c.id AS course_id, c.city AS club_city, c.country AS club_country
        FROM user_club_memberships ucm
        LEFT JOIN courses c ON ucm.club_id = c.id
        WHERE ucm.user_id = $1
        ORDER BY
          CASE ucm.membership_type WHEN 'home' THEN 0 ELSE 1 END,
          ucm.display_order ASC`,
      [userId],
    );

    return Response.json({
      profile: { ...userRows[0], ...stats[0] },
      memberships,
    });
  } catch (error) {
    console.error("[GET /api/user/profile]", { userId, error: error.message });
    return Response.json(
      { error: "server_error", message: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  let userId;
  try {
    userId = await getSessionUserId(request); // ← pass request: enables mobile Bearer fallback
  } catch (err) {
    console.warn("[POST /api/user/profile] auth error:", err.code, err.message);
    if (err.code === "UNAUTHENTICATED" || err.code === "AUTH_ERROR") {
      return Response.json(
        {
          error: "session_expired",
          message: "Your session has expired. Please sign in again.",
        },
        { status: 401 },
      );
    }
    if (err.code === "ACCOUNT_SUSPENDED") {
      return Response.json(
        {
          error: "account_suspended",
          message: "This account is suspended. Please contact support.",
        },
        { status: 403 },
      );
    }
    return Response.json(
      { error: "auth_error", message: "Authentication error." },
      { status: 500 },
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", message: "Invalid request body." },
      { status: 400 },
    );
  }

  const {
    firstName,
    lastName,
    location,
    bio,
    homeClubId,
    homeClubName,
    memberSince,
    handicap,
    profilePhotoUrl,
  } = body;

  // ── Validation ────────────────────────────────────────────────────────────────
  const trimmedFirst =
    typeof firstName === "string" ? firstName.trim() : firstName;
  if (
    trimmedFirst !== undefined &&
    trimmedFirst !== null &&
    trimmedFirst === ""
  ) {
    return Response.json(
      {
        error: "validation",
        field: "first_name",
        message: "First name cannot be empty.",
      },
      { status: 400 },
    );
  }

  const trimmedBio = typeof bio === "string" ? bio.trim() : bio;
  if (trimmedBio && trimmedBio.length > 280) {
    return Response.json(
      {
        error: "validation",
        field: "bio",
        message: "Your bio must be 280 characters or fewer.",
      },
      { status: 400 },
    );
  }

  // Normalise handicap — blank/null → SQL NULL, non-numeric → reject
  let handicapValue = null;
  if (handicap !== undefined && handicap !== null && handicap !== "") {
    handicapValue =
      typeof handicap === "number" ? handicap : parseFloat(handicap);
    if (isNaN(handicapValue)) {
      return Response.json(
        {
          error: "validation",
          field: "handicap",
          message: "Handicap must be a valid number.",
        },
        { status: 400 },
      );
    }
  }

  // ── Build dynamic SET clause ──────────────────────────────────────────────────
  // We never pass boolean values to SQL parameters.
  // Fields not present in the body are omitted from the SET clause entirely —
  // this preserves their existing values without any COALESCE trickery.
  const setClauses = [];
  const params = [];

  const push = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  // first_name: required field — use COALESCE so a null sent in error doesn't wipe it
  if ("firstName" in body) {
    const v = trimmedFirst || null;
    setClauses.push(`first_name = COALESCE(${push(v)}, first_name)`);
  }

  // Optional text fields — direct assignment so the user can clear them
  if ("lastName" in body) {
    const v = typeof lastName === "string" ? lastName.trim() || null : null;
    setClauses.push(`last_name = ${push(v)}`);
  }
  if ("location" in body) {
    const v = typeof location === "string" ? location.trim() || null : null;
    setClauses.push(`location = ${push(v)}`);
  }
  if ("bio" in body) {
    setClauses.push(`bio = ${push(trimmedBio || null)}`);
  }
  if ("handicap" in body) {
    setClauses.push(`handicap = ${push(handicapValue)}`);
  }

  // Club / membership fields (written by other screens but accepted here too)
  if ("homeClubId" in body) {
    setClauses.push(`home_club_id = ${push(homeClubId ?? null)}`);
  }
  if ("homeClubName" in body) {
    const v =
      typeof homeClubName === "string" ? homeClubName.trim() || null : null;
    setClauses.push(`home_club_name = ${push(v)}`);
  }
  if ("memberSince" in body) {
    setClauses.push(`member_since = ${push(memberSince ?? null)}`);
  }

  // Profile photo — only written when the key is explicitly present in the body.
  // This prevents a "save without new photo" from accidentally clearing the existing URL.
  if ("profilePhotoUrl" in body) {
    const photoVal =
      typeof profilePhotoUrl === "string" && profilePhotoUrl.trim()
        ? profilePhotoUrl.trim()
        : null;
    setClauses.push(`profile_photo_url = ${push(photoVal)}`);
  }

  // Nothing to update — return current profile unchanged
  if (setClauses.length === 0) {
    try {
      const current = await sql(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [
        userId,
      ]);
      return Response.json({ profile: current[0] ?? null });
    } catch (err) {
      return Response.json({ profile: null });
    }
  }

  // ── Execute update ────────────────────────────────────────────────────────────
  const userIdRef = push(userId);

  try {
    const updated = await sql(
      `UPDATE users
          SET ${setClauses.join(", ")}
        WHERE id = ${userIdRef}
        RETURNING
          id, email, first_name, last_name,
          profile_photo_url, location, bio,
          home_club_id, home_club_name, member_since,
          handicap, privacy_settings, notification_settings, created_at`,
      params,
    );

    if (!updated.length) {
      console.error("[POST /api/user/profile] UPDATE returned 0 rows", {
        userId,
      });
      return Response.json(
        { error: "not_found", message: "User profile not found." },
        { status: 404 },
      );
    }

    return Response.json({ profile: updated[0] });
  } catch (error) {
    // Log safe diagnostic info — never log passwords, tokens, or PII beyond userId
    console.error("[POST /api/user/profile] SQL error:", {
      userId,
      setClauses,
      paramCount: params.length,
      pgCode: error.code,
      pgMessage: error.message,
    });
    return Response.json(
      {
        error: "server_error",
        message: "Unable to update profile due to a server error.",
      },
      { status: 500 },
    );
  }
}
