/**
 * DELETE /api/admin/users/[id]/content
 *
 * Remove a specific piece of user content for moderation purposes.
 *
 * Body: {
 *   contentType: "feed_post" | "photo" | "community_post" | "review_text" | "profile_bio" | "profile_photo",
 *   contentId?: number,   -- required for feed_post, photo, community_post
 *   reason: string
 * }
 *
 * This SOFT-deletes or nulls content rather than hard-deleting, preserving
 * account integrity and the user's Passport/activity records.
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function DELETE(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const adminUserId = guard.userId;
  const userId = parseInt(params.id);

  if (!userId || isNaN(userId)) {
    return Response.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { contentType, contentId, reason } = body;

  if (!contentType || !reason?.trim()) {
    return Response.json(
      { error: "contentType and reason are required" },
      { status: 400 },
    );
  }

  const VALID_TYPES = [
    "feed_post",
    "photo",
    "community_post",
    "review_text",
    "profile_bio",
    "profile_photo",
  ];
  if (!VALID_TYPES.includes(contentType)) {
    return Response.json(
      { error: `contentType must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  if (
    ["feed_post", "photo", "community_post"].includes(contentType) &&
    !contentId
  ) {
    return Response.json(
      { error: "contentId is required for this content type" },
      { status: 400 },
    );
  }

  try {
    let description = "";

    switch (contentType) {
      case "feed_post": {
        // Verify ownership
        const rows =
          await sql`SELECT id FROM feed_posts WHERE id = ${contentId} AND author_id = ${userId}`;
        if (!rows.length)
          return Response.json(
            { error: "Content not found or not owned by this user" },
            { status: 404 },
          );
        // Soft-delete by clearing caption and marking
        await sql`
          UPDATE feed_posts
          SET caption = '[removed by admin]', updated_at = NOW()
          WHERE id = ${contentId} AND author_id = ${userId}
        `;
        // Also soft-delete associated media captions
        await sql`
          UPDATE feed_post_media SET caption = '[removed]' WHERE post_id = ${contentId}
        `;
        description = `Feed post #${contentId} content removed`;
        break;
      }

      case "community_post": {
        const rows =
          await sql`SELECT id FROM community_posts WHERE id = ${contentId} AND user_id = ${userId}`;
        if (!rows.length)
          return Response.json(
            { error: "Content not found or not owned by this user" },
            { status: 404 },
          );
        await sql`
          UPDATE community_posts
          SET body = '[removed by admin]', is_deleted = true, updated_at = NOW()
          WHERE id = ${contentId} AND user_id = ${userId}
        `;
        description = `Community post #${contentId} removed`;
        break;
      }

      case "photo": {
        const rows =
          await sql`SELECT id, photo_url FROM member_photos WHERE id = ${contentId} AND user_id = ${userId}`;
        if (!rows.length)
          return Response.json(
            { error: "Photo not found or not owned by this user" },
            { status: 404 },
          );
        // Null out the photo URL so it's no longer accessible
        await sql`
          UPDATE member_photos
          SET photo_url = NULL, caption = '[removed by admin]'
          WHERE id = ${contentId} AND user_id = ${userId}
        `;
        description = `Photo #${contentId} removed`;
        break;
      }

      case "review_text": {
        // Remove review text from played_courses entry
        if (!contentId)
          return Response.json(
            { error: "contentId required (played_course id)" },
            { status: 400 },
          );
        const rows =
          await sql`SELECT id FROM played_courses WHERE id = ${contentId} AND user_id = ${userId}`;
        if (!rows.length)
          return Response.json(
            { error: "Review not found or not owned by this user" },
            { status: 404 },
          );
        await sql`
          UPDATE played_courses SET review_text = NULL WHERE id = ${contentId} AND user_id = ${userId}
        `;
        description = `Review text cleared from played_course #${contentId}`;
        break;
      }

      case "profile_bio": {
        await sql`UPDATE users SET bio = NULL WHERE id = ${userId}`;
        description = "Profile bio removed";
        break;
      }

      case "profile_photo": {
        await sql`UPDATE users SET profile_photo_url = NULL WHERE id = ${userId}`;
        description = "Profile photo removed";
        break;
      }
    }

    // Audit log
    await sql`
      INSERT INTO admin_audit_log (admin_user_id, action, target_user_id, target_type, target_id, reason, note)
      VALUES (${adminUserId}, 'content_removed', ${userId}, ${contentType}, ${contentId || null}, ${reason.trim()}, ${description})
    `;

    return Response.json({ success: true, message: description });
  } catch (err) {
    console.error("Content removal error:", err);
    return Response.json(
      { error: "Failed to remove content" },
      { status: 500 },
    );
  }
}
