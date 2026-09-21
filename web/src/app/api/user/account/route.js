/**
 * DELETE /api/user/account
 *
 * Permanently deletes the authenticated user's account and associated data.
 * Required for App Store Guideline 5.1.1(v) — account deletion in the app.
 *
 * Flow:
 *   1. Resolve session → users.id + email
 *   2. Null optional FKs that point at this user from other rows
 *   3. Delete the user's app data (posts, memberships, social, etc.)
 *   4. Delete communities they created (cascades community content)
 *   5. Delete the users row
 *   6. Delete auth_users / sessions / accounts / verification tokens
 *   7. Delete password_reset_tokens for the email
 *
 * The client should call signOut() after a successful response.
 */

import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

export async function DELETE(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch (err) {
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
    if (err.code === "PROFILE_NOT_FOUND") {
      return Response.json(
        { error: "not_found", message: "User profile not found." },
        { status: 404 },
      );
    }
    return Response.json(
      { error: "auth_error", message: "Authentication error." },
      { status: 500 },
    );
  }

  try {
    const userRows = await sql(
      `SELECT id, email FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );

    if (!userRows.length) {
      return Response.json(
        { error: "not_found", message: "User profile not found." },
        { status: 404 },
      );
    }

    const email = userRows[0].email;

    // Resolve auth UUID (if any) before deleting app data
    const authRows = await sql(
      `SELECT id FROM auth_users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    const authUserId = authRows[0]?.id ?? null;

    // ── Null out optional FKs pointing at this user ─────────────────────────
    await sql(
      `UPDATE users SET suspended_by = NULL WHERE suspended_by = $1`,
      [userId],
    );
    await sql(
      `UPDATE notifications SET from_user_id = NULL WHERE from_user_id = $1`,
      [userId],
    );
    await sql(
      `UPDATE community_join_requests SET reviewed_by = NULL WHERE reviewed_by = $1`,
      [userId],
    );
    await sql(
      `UPDATE community_chat_messages SET deleted_by = NULL WHERE deleted_by = $1`,
      [userId],
    );
    await sql(
      `UPDATE community_reports SET reported_user_id = NULL WHERE reported_user_id = $1`,
      [userId],
    );
    await sql(
      `UPDATE course_photos SET approved_by = NULL WHERE approved_by = $1`,
      [userId],
    );
    await sql(
      `UPDATE course_photos SET rejected_by = NULL WHERE rejected_by = $1`,
      [userId],
    );
    await sql(
      `UPDATE admin_audit_log SET target_user_id = NULL WHERE target_user_id = $1`,
      [userId],
    );
    // Admin audit rows authored by this user cannot keep a NOT NULL admin_user_id
    await sql(`DELETE FROM admin_audit_log WHERE admin_user_id = $1`, [userId]);
    await sql(
      `DELETE FROM moderation_notes WHERE target_user_id = $1 OR admin_user_id = $1`,
      [userId],
    );

    // ── Notifications & social ──────────────────────────────────────────────
    await sql(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
    await sql(`DELETE FROM friendships WHERE user_id = $1 OR friend_id = $1`, [
      userId,
    ]);
    await sql(
      `DELETE FROM follows
       WHERE follower_id = $1
          OR (followee_type = 'user' AND followee_id = $1)`,
      [userId],
    );

    // ── Activity (likes/comments first, then own activity rows) ─────────────
    await sql(`DELETE FROM activity_likes WHERE user_id = $1`, [userId]);
    await sql(`DELETE FROM activity_comments WHERE user_id = $1`, [userId]);
    // Clear activity FKs that block deleting photos / played courses
    await sql(
      `UPDATE activity_feed SET photo_id = NULL WHERE user_id = $1`,
      [userId],
    );
    await sql(
      `UPDATE activity_feed SET review_id = NULL WHERE user_id = $1`,
      [userId],
    );
    await sql(
      `DELETE FROM notifications WHERE activity_id IN (SELECT id FROM activity_feed WHERE user_id = $1)`,
      [userId],
    );
    await sql(`DELETE FROM activity_feed WHERE user_id = $1`, [userId]);

    // ── Feed ────────────────────────────────────────────────────────────────
    await sql(`DELETE FROM feed_reactions WHERE user_id = $1`, [userId]);
    await sql(`DELETE FROM feed_comments WHERE user_id = $1`, [userId]);
    await sql(`DELETE FROM feed_hidden_posts WHERE user_id = $1`, [userId]);
    await sql(`DELETE FROM feed_post_reports WHERE reporter_id = $1`, [userId]);
    // Deleting feed_posts cascades media / reactions / comments / reports / hidden
    await sql(`DELETE FROM feed_posts WHERE author_id = $1`, [userId]);

    // ── Communities (owned communities deleted last among community data) ───
    await sql(`DELETE FROM community_reports WHERE reporter_id = $1`, [userId]);
    await sql(`DELETE FROM community_reactions WHERE user_id = $1`, [userId]);
    await sql(
      `DELETE FROM community_post_comments WHERE user_id = $1`,
      [userId],
    );
    await sql(`DELETE FROM community_chat_messages WHERE user_id = $1`, [
      userId,
    ]);
    await sql(`DELETE FROM community_posts WHERE user_id = $1`, [userId]);
    await sql(
      `DELETE FROM community_invites WHERE inviter_id = $1 OR invitee_id = $1`,
      [userId],
    );
    await sql(`DELETE FROM community_join_requests WHERE user_id = $1`, [
      userId,
    ]);
    await sql(`DELETE FROM community_members WHERE user_id = $1`, [userId]);
    // Communities they created — CASCADE removes members/posts/etc.
    await sql(`DELETE FROM communities WHERE created_by = $1`, [userId]);

    // ── Photos ──────────────────────────────────────────────────────────────
    await sql(`DELETE FROM course_photo_likes WHERE user_id = $1`, [userId]);
    await sql(
      `DELETE FROM course_photo_reports WHERE reported_by_user_id = $1`,
      [userId],
    );
    // Null activity refs to this user's member photos
    await sql(
      `UPDATE activity_feed SET photo_id = NULL
       WHERE photo_id IN (SELECT id FROM member_photos WHERE user_id = $1)`,
      [userId],
    );
    await sql(
      `UPDATE course_photos SET review_id = NULL WHERE user_id = $1`,
      [userId],
    );
    await sql(`DELETE FROM course_photos WHERE user_id = $1`, [userId]);
    await sql(`DELETE FROM member_photos WHERE user_id = $1`, [userId]);

    // ── Passport / profile data ─────────────────────────────────────────────
    await sql(`DELETE FROM user_achievements WHERE user_id = $1`, [userId]);
    await sql(`DELETE FROM user_club_memberships WHERE user_id = $1`, [
      userId,
    ]);
    await sql(`DELETE FROM wishlist WHERE user_id = $1`, [userId]);
    await sql(
      `UPDATE activity_feed SET review_id = NULL
       WHERE review_id IN (SELECT id FROM played_courses WHERE user_id = $1)`,
      [userId],
    );
    await sql(`DELETE FROM played_courses WHERE user_id = $1`, [userId]);

    // ── App user row ────────────────────────────────────────────────────────
    await sql(`DELETE FROM users WHERE id = $1`, [userId]);

    // ── Auth + password reset ───────────────────────────────────────────────
    await sql(`DELETE FROM password_reset_tokens WHERE LOWER(email) = LOWER($1)`, [
      email,
    ]);
    await sql(
      `DELETE FROM auth_verification_token WHERE LOWER(identifier) = LOWER($1)`,
      [email],
    );

    if (authUserId) {
      // Order: sessions/accounts first (adapter does users first; ON DELETE CASCADE also works)
      await sql(`DELETE FROM auth_sessions WHERE "userId" = $1`, [authUserId]);
      await sql(`DELETE FROM auth_accounts WHERE "userId" = $1`, [authUserId]);
      await sql(`DELETE FROM auth_users WHERE id = $1`, [authUserId]);
    }

    return Response.json({
      success: true,
      message: "Your account has been permanently deleted.",
    });
  } catch (error) {
    console.error("[DELETE /api/user/account]", {
      userId,
      pgCode: error.code,
      message: error.message,
    });
    return Response.json(
      {
        error: "server_error",
        message:
          "Unable to delete your account due to a server error. Please try again or contact support.",
      },
      { status: 500 },
    );
  }
}
