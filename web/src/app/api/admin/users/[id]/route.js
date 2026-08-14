/**
 * GET /api/admin/users/[id]
 *
 * Full user detail for admin review. Returns:
 *   - Profile (public + friends-only + private metadata — clearly labelled)
 *   - Stats (courses played, wishlist, reviews, photos, posts)
 *   - Club memberships
 *   - Feed posts
 *   - Community memberships
 *   - Moderation notes
 *   - Reports received (as reporter)
 *
 * NEVER returns: passwords, argon2 hashes, session tokens, reset tokens.
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET(_request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const userId = parseInt(params.id);
  if (!userId || isNaN(userId)) {
    return Response.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const [
      userRow,
      memberships,
      coursesPlayed,
      wishlistItems,
      feedPosts,
      communityMemberships,
      photos,
      moderationNotes,
      reportsReceived,
      recentActivity,
    ] = await Promise.all([
      // Core profile — NO password or token fields
      sql`
        SELECT
          u.id, u.first_name, u.last_name, u.email, u.profile_photo_url,
          u.location, u.bio, u.handicap, u.home_club_id, u.home_club_name,
          u.member_since, u.created_at, u.is_admin, u.is_suspended,
          u.suspended_at, u.suspension_reason, u.privacy_settings, u.notification_settings,
          u.preferences,
          CONCAT(su.first_name, ' ', su.last_name) AS suspended_by_name,
          su.id AS suspended_by_id
        FROM users u
        LEFT JOIN users su ON su.id = u.suspended_by
        WHERE u.id = ${userId}
        LIMIT 1
      `,

      // Club memberships
      sql`
        SELECT ucm.id, ucm.club_name, ucm.membership_type, ucm.visibility,
               ucm.verified_status, ucm.joined_year, ucm.display_order
        FROM user_club_memberships ucm
        WHERE ucm.user_id = ${userId}
        ORDER BY ucm.display_order ASC
      `,

      // Courses played (most recent 20)
      sql`
        SELECT pc.id, pc.date_played, pc.rating, pc.review_text, pc.created_at,
               c.name AS course_name, c.city, c.county, c.country, c.id AS course_id
        FROM played_courses pc
        JOIN courses c ON c.id = pc.course_id
        WHERE pc.user_id = ${userId}
        ORDER BY pc.created_at DESC
        LIMIT 20
      `,

      // Wishlist (most recent 20)
      sql`
        SELECT w.id, w.created_at,
               c.name AS course_name, c.city, c.county, c.country, c.id AS course_id
        FROM wishlist w
        JOIN courses c ON c.id = w.course_id
        WHERE w.user_id = ${userId}
        ORDER BY w.created_at DESC
        LIMIT 20
      `,

      // Feed posts (most recent 20)
      sql`
        SELECT fp.id, fp.post_type, fp.caption, fp.created_at, fp.is_private, fp.is_sponsored,
               c.name AS course_name
        FROM feed_posts fp
        LEFT JOIN courses c ON c.id = fp.course_id
        WHERE fp.author_id = ${userId}
        ORDER BY fp.created_at DESC
        LIMIT 20
      `,

      // Community memberships
      sql`
        SELECT cm.id, cm.role, cm.joined_at,
               co.name AS community_name, co.id AS community_id, co.community_type
        FROM community_members cm
        JOIN communities co ON co.id = cm.community_id
        WHERE cm.user_id = ${userId}
        ORDER BY cm.joined_at DESC
      `,

      // Photos
      sql`
        SELECT mp.id, mp.photo_url, mp.caption, mp.is_official, mp.created_at,
               c.name AS course_name, c.id AS course_id
        FROM member_photos mp
        LEFT JOIN courses c ON c.id = mp.course_id
        WHERE mp.user_id = ${userId}
        ORDER BY mp.created_at DESC
        LIMIT 20
      `,

      // Moderation notes (admin-only)
      sql`
        SELECT mn.id, mn.note_text, mn.created_at,
               CONCAT(a.first_name, ' ', a.last_name) AS admin_name, a.id AS admin_id
        FROM moderation_notes mn
        JOIN users a ON a.id = mn.admin_user_id
        WHERE mn.target_user_id = ${userId}
        ORDER BY mn.created_at DESC
      `,

      // Reports this user has received (posts/content reported)
      sql`
        SELECT fpr.id, fpr.reason, fpr.details, fpr.created_at,
               fp.post_type, fp.caption, fp.id AS post_id
        FROM feed_post_reports fpr
        JOIN feed_posts fp ON fp.id = fpr.post_id
        WHERE fp.author_id = ${userId}
        ORDER BY fpr.created_at DESC
        LIMIT 20
      `,

      // Recent activity (last 10 events)
      sql`
        SELECT af.id, af.activity_type, af.created_at,
               c.name AS course_name
        FROM activity_feed af
        LEFT JOIN courses c ON c.id = af.course_id
        WHERE af.user_id = ${userId}
        ORDER BY af.created_at DESC
        LIMIT 10
      `,
    ]);

    if (!userRow.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const u = userRow[0];

    // Build safe profile — never expose auth credentials
    const profile = {
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      displayName:
        [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed",
      email: u.email, // moderation context — admin only
      profilePhotoUrl: u.profile_photo_url,
      location: u.location,
      bio: u.bio,
      handicap: u.handicap,
      homeClubId: u.home_club_id,
      homeClubName: u.home_club_name,
      memberSince: u.member_since,
      createdAt: u.created_at,
      isAdmin: u.is_admin,
      isSuspended: u.is_suspended,
      suspendedAt: u.suspended_at,
      suspensionReason: u.suspension_reason,
      suspendedByName: u.suspended_by_name,
      suspendedById: u.suspended_by_id,
      privacySettings: u.privacy_settings, // visibility config — useful for moderation context
      preferences: u.preferences,
      // dataClassification labels
      _dataLabels: {
        email: "moderation-only",
        privacySettings: "private",
        preferences: "private",
        bio: "public",
        location: "public",
      },
    };

    return Response.json({
      profile,
      memberships,
      coursesPlayed,
      wishlistItems,
      feedPosts,
      communityMemberships,
      photos,
      moderationNotes,
      reportsReceived,
      recentActivity,
      stats: {
        totalCoursesPlayed: coursesPlayed.length, // capped at 20; accurate count below
        totalWishlist: wishlistItems.length,
        totalFeedPosts: feedPosts.length,
        totalPhotos: photos.length,
        totalCommunities: communityMemberships.length,
        moderationNoteCount: moderationNotes.length,
        reportCount: reportsReceived.length,
      },
    });
  } catch (err) {
    console.error("Admin user detail error:", err);
    return Response.json({ error: "Failed to load user" }, { status: 500 });
  }
}
