import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createFeedPost, buildCaption } from "@/app/api/utils/createFeedPost";

export async function POST(request) {
  const userId = await getSessionUserId(request);
  const { courseId } = await request.json();

  if (!courseId)
    return Response.json({ error: "Course ID is required" }, { status: 400 });

  try {
    const existing = await sql(
      `SELECT id FROM wishlist WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId],
    );

    if (existing.length > 0) {
      await sql(`DELETE FROM wishlist WHERE user_id = $1 AND course_id = $2`, [
        userId,
        courseId,
      ]);
      await sql(
        `UPDATE courses SET wishlist_count = GREATEST(0, wishlist_count - 1) WHERE id = $1`,
        [courseId],
      );
      return Response.json({ success: true, wishlisted: false });
    }

    // Add to wishlist
    await sql(
      `INSERT INTO wishlist (user_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, courseId],
    );
    await sql(
      `UPDATE courses SET wishlist_count = wishlist_count + 1 WHERE id = $1`,
      [courseId],
    );

    // Activity log — only once per user+course (avoid spam on re-save)
    const priorActivity = await sql(
      `SELECT id FROM activity_feed
        WHERE user_id = $1 AND course_id = $2 AND activity_type = 'added_wishlist'
        LIMIT 1`,
      [userId, courseId],
    );
    if (priorActivity.length === 0) {
      await sql(
        `INSERT INTO activity_feed (user_id, activity_type, course_id) VALUES ($1, 'added_wishlist', $2)`,
        [userId, courseId],
      );
    }

    // Fetch names for caption
    const [authorRows, courseRows] = await Promise.all([
      sql(`SELECT first_name FROM users WHERE id = $1`, [userId]),
      sql(`SELECT name FROM courses WHERE id = $1`, [courseId]),
    ]);
    const firstName = authorRows[0]?.first_name || "A golfer";
    const courseName = courseRows[0]?.name;
    const caption = buildCaption("wishlist", { firstName, courseName });

    // One wishlist feed post per user+course — re-save updates it, never duplicates
    const existingPosts = await sql(
      `SELECT id FROM feed_posts
        WHERE author_id = $1 AND course_id = $2 AND post_type = 'wishlist'
        ORDER BY created_at DESC`,
      [userId, courseId],
    );

    if (existingPosts.length > 0) {
      const [keep, ...dupes] = existingPosts;
      await sql(
        `UPDATE feed_posts
            SET caption = $2, created_at = NOW()
          WHERE id = $1`,
        [keep.id, caption],
      );
      if (dupes.length > 0) {
        await sql(
          `DELETE FROM feed_posts WHERE id = ANY($1::int[])`,
          [dupes.map((d) => d.id)],
        );
      }
    } else {
      await createFeedPost({
        userId,
        postType: "wishlist",
        courseId,
        caption,
        metadata: {},
      });
    }

    return Response.json({ success: true, wishlisted: true });
  } catch (error) {
    console.error("Error updating wishlist:", error);
    return Response.json(
      { error: "Failed to update wishlist" },
      { status: 500 },
    );
  }
}
