/**
 * GET    /api/user/memberships          — own memberships (all visibility levels)
 * POST   /api/user/memberships          — add a membership
 * PUT    /api/user/memberships          — update (visibility, joined_year, reorder)
 * DELETE /api/user/memberships          — remove a membership
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request) {
  const userId = await getSessionUserId(request);

  try {
    const memberships = await sql(
      `SELECT
          ucm.id,
          ucm.user_id,
          ucm.club_id,
          ucm.club_name,
          ucm.membership_type,
          ucm.display_order,
          ucm.visibility,
          ucm.verified_status,
          ucm.joined_year,
          ucm.created_at,
          c.id        AS course_id,
          c.city      AS club_city,
          c.county    AS club_county,
          c.country   AS club_country,
          c.course_type
        FROM user_club_memberships ucm
        LEFT JOIN courses c ON ucm.club_id = c.id
        WHERE ucm.user_id = $1
        ORDER BY
          CASE ucm.membership_type WHEN 'home' THEN 0 ELSE 1 END,
          ucm.display_order ASC`,
      [userId],
    );

    return Response.json({ memberships });
  } catch (error) {
    console.error("Memberships GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const userId = await getSessionUserId(request);
  const {
    clubId,
    clubName,
    membershipType = "additional",
    visibility = "private",
    joinedYear,
  } = await request.json();

  if (!clubName?.trim())
    return Response.json({ error: "clubName required" }, { status: 400 });
  if (!["home", "additional"].includes(membershipType))
    return Response.json({ error: "Invalid membershipType" }, { status: 400 });
  if (!["public", "friends", "private"].includes(visibility))
    return Response.json({ error: "Invalid visibility" }, { status: 400 });

  try {
    // Home club uniqueness: only one home club per user
    if (membershipType === "home") {
      const existing = await sql(
        `SELECT id FROM user_club_memberships WHERE user_id=$1 AND membership_type='home'`,
        [userId],
      );
      if (existing.length) {
        return Response.json(
          {
            error:
              "You already have a home club. Remove it first or update it.",
          },
          { status: 409 },
        );
      }
    }

    // Duplicate club check
    const dup = await sql(
      `SELECT id FROM user_club_memberships WHERE user_id=$1 AND LOWER(club_name)=LOWER($2)`,
      [userId, clubName.trim()],
    );
    if (dup.length)
      return Response.json(
        { error: "That club is already in your memberships." },
        { status: 409 },
      );

    // Next display_order for additional clubs
    const orderRow = await sql(
      `SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM user_club_memberships WHERE user_id=$1 AND membership_type='additional'`,
      [userId],
    );
    const nextOrder =
      membershipType === "home" ? 0 : (orderRow[0]?.next_order ?? 0);

    const result = await sql(
      `INSERT INTO user_club_memberships (user_id, club_id, club_name, membership_type, display_order, visibility, joined_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        clubId || null,
        clubName.trim(),
        membershipType,
        nextOrder,
        visibility,
        joinedYear || null,
      ],
    );

    // Mirror home club to users table for backward compat
    if (membershipType === "home") {
      await sql(`UPDATE users SET home_club_name=$1 WHERE id=$2`, [
        clubName.trim(),
        userId,
      ]);
    }

    return Response.json({ success: true, membership: result[0] });
  } catch (error) {
    console.error("Memberships POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────
// Body: { membershipId, visibility?, joinedYear?, displayOrder?, reorder? }
// reorder: array of { id, display_order } for bulk reorder
export async function PUT(request) {
  const userId = await getSessionUserId(request);
  const body = await request.json();

  try {
    // Bulk reorder
    if (body.reorder && Array.isArray(body.reorder)) {
      for (const { id, display_order } of body.reorder) {
        await sql(
          `UPDATE user_club_memberships SET display_order=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3`,
          [display_order, id, userId],
        );
      }
      return Response.json({ success: true });
    }

    // Single update
    const { membershipId, visibility, joinedYear } = body;
    if (!membershipId)
      return Response.json({ error: "membershipId required" }, { status: 400 });

    // Verify ownership
    const owned = await sql(
      `SELECT id, membership_type, club_name FROM user_club_memberships WHERE id=$1 AND user_id=$2`,
      [membershipId, userId],
    );
    if (!owned.length)
      return Response.json({ error: "Membership not found" }, { status: 404 });

    const setClauses = [];
    const vals = [];
    let i = 1;
    if (visibility !== undefined) {
      setClauses.push(`visibility=$${i++}`);
      vals.push(visibility);
    }
    if (joinedYear !== undefined) {
      setClauses.push(`joined_year=$${i++}`);
      vals.push(joinedYear);
    }
    if (!setClauses.length)
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    setClauses.push(`updated_at=NOW()`);
    vals.push(membershipId, userId);

    await sql(
      `UPDATE user_club_memberships SET ${setClauses.join(",")} WHERE id=$${i++} AND user_id=$${i}`,
      vals,
    );

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(request) {
  const userId = await getSessionUserId(request);
  const { membershipId } = await request.json();
  if (!membershipId)
    return Response.json({ error: "membershipId required" }, { status: 400 });

  try {
    const owned = await sql(
      `SELECT id, membership_type, club_name FROM user_club_memberships WHERE id=$1 AND user_id=$2`,
      [membershipId, userId],
    );
    if (!owned.length)
      return Response.json({ error: "Membership not found" }, { status: 404 });

    await sql(`DELETE FROM user_club_memberships WHERE id=$1 AND user_id=$2`, [
      membershipId,
      userId,
    ]);

    // If home club removed, clear from users table too
    if (owned[0].membership_type === "home") {
      await sql(
        `UPDATE users SET home_club_name=NULL, home_club_id=NULL WHERE id=$1`,
        [userId],
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
