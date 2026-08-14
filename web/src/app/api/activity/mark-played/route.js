import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import { createFeedPost, buildCaption } from "@/app/api/utils/createFeedPost";

export async function POST(request) {
  const userId = await getSessionUserId(request);
  const { courseId, datePlayed, rating, reviewText, photos } =
    await request.json();

  if (!courseId)
    return Response.json({ error: "Course ID is required" }, { status: 400 });

  try {
    // ── Record played course ───────────────────────────────────────────────
    const playedCourse = await sql`
      INSERT INTO played_courses (user_id, course_id, date_played, rating, review_text)
      VALUES (${userId}, ${courseId}, ${datePlayed || null}, ${rating || null}, ${reviewText || null})
      ON CONFLICT (user_id, course_id) DO UPDATE SET
        date_played = EXCLUDED.date_played,
        rating = EXCLUDED.rating,
        review_text = EXCLUDED.review_text
      RETURNING *, (xmax = 0) AS is_new_insert
    `;

    const isFirstPlay = playedCourse[0]?.is_new_insert ?? true;

    // Fetch author name for captions
    const authorRows =
      await sql`SELECT first_name FROM users WHERE id = ${userId}`;
    const firstName = authorRows[0]?.first_name || "A golfer";

    // Fetch course name
    const courseRows =
      await sql`SELECT name, country FROM courses WHERE id = ${courseId}`;
    const courseName = courseRows[0]?.name;

    if (isFirstPlay) {
      await sql`UPDATE courses SET played_count = played_count + 1 WHERE id = ${courseId}`;

      // Auto-remove from wishlist
      const removed = await sql(
        `DELETE FROM wishlist WHERE user_id = $1 AND course_id = $2 RETURNING id`,
        [userId, courseId],
      );
      if (removed.length > 0) {
        await sql`UPDATE courses SET wishlist_count = GREATEST(0, wishlist_count - 1) WHERE id = ${courseId}`;
      }

      // Activity feed entry
      await sql`
        INSERT INTO activity_feed (user_id, activity_type, course_id, review_id, metadata)
        VALUES (${userId}, 'played_course', ${courseId}, ${playedCourse[0].id}, ${JSON.stringify({ rating })})
      `;

      // ── Feed post: played course ─────────────────────────────────────────
      await createFeedPost({
        userId,
        postType: "played_course",
        courseId,
        caption: buildCaption("played_course", { firstName, courseName }),
        metadata: { rating, date_played: datePlayed },
      });
    }

    // Review post
    if (reviewText) {
      await sql`
        INSERT INTO activity_feed (user_id, activity_type, course_id, review_id, metadata)
        VALUES (${userId}, 'review_posted', ${courseId}, ${playedCourse[0].id}, ${JSON.stringify({ rating })})
      `;

      // Only create a separate feed post for reviews with substantial text
      if (reviewText.length > 20) {
        await createFeedPost({
          userId,
          postType: "review",
          courseId,
          caption: `"${reviewText.slice(0, 200)}"`,
          metadata: { rating, review_text: reviewText },
        });
      }
    }

    // ── Milestone posts ──────────────────────────────────────────────────
    if (isFirstPlay) {
      const totalPlayed = parseInt(
        (
          await sql`SELECT COUNT(*) AS n FROM played_courses WHERE user_id = ${userId}`
        )[0]?.n || 0,
      );
      const MILESTONES = [10, 25, 50, 100, 150, 200, 250];
      if (MILESTONES.includes(totalPlayed)) {
        await createFeedPost({
          userId,
          postType: "milestone",
          caption: buildCaption("milestone", { firstName, count: totalPlayed }),
          metadata: {
            milestone_count: totalPlayed,
            count: totalPlayed,
            headline: "courses played",
            type: "courses_played",
          },
        });
      }
    }

    // ── Achievements ─────────────────────────────────────────────────────
    const stats = await sql`
      SELECT 
        COUNT(*) as total_played,
        COUNT(CASE WHEN c.course_type = 'Links' THEN 1 END) as links_count,
        COUNT(CASE WHEN c.course_type = 'Heathland' THEN 1 END) as heathland_count,
        COUNT(CASE WHEN c.country = 'Scotland' THEN 1 END) as scotland_count,
        COUNT(CASE WHEN c.country = 'Ireland' THEN 1 END) as ireland_count
      FROM played_courses pc
      JOIN courses c ON pc.course_id = c.id
      WHERE pc.user_id = ${userId}
    `;

    const {
      total_played,
      links_count,
      heathland_count,
      scotland_count,
      ireland_count,
    } = stats[0];

    const achievementChecks = [
      { slug: "first-tee", condition: total_played >= 1 },
      { slug: "course-collector", condition: total_played >= 10 },
      { slug: "fifty-club", condition: total_played >= 50 },
      { slug: "century-club", condition: total_played >= 100 },
      { slug: "links-explorer", condition: links_count >= 10 },
      { slug: "heathland-hunter", condition: heathland_count >= 10 },
      { slug: "scottish-explorer", condition: scotland_count >= 25 },
      { slug: "irish-explorer", condition: ireland_count >= 15 },
    ];

    for (const check of achievementChecks) {
      if (check.condition) {
        const achievement =
          await sql`SELECT id, name, description FROM achievements WHERE slug = ${check.slug}`;
        if (achievement.length > 0) {
          const alreadyUnlocked = await sql`
            SELECT id FROM user_achievements WHERE user_id = ${userId} AND achievement_id = ${achievement[0].id}
          `;

          if (alreadyUnlocked.length === 0) {
            await sql`INSERT INTO user_achievements (user_id, achievement_id) VALUES (${userId}, ${achievement[0].id})`;
            await sql`
              INSERT INTO activity_feed (user_id, activity_type, achievement_id)
              VALUES (${userId}, 'achievement_unlocked', ${achievement[0].id})
            `;

            // ── Feed post: achievement ────────────────────────────────────
            await createFeedPost({
              userId,
              postType: "achievement",
              caption: buildCaption("achievement", {
                firstName,
                achievementName: achievement[0].name,
              }),
              metadata: {
                achievement_name: achievement[0].name,
                achievement_desc: achievement[0].description,
                achievement_slug: check.slug,
              },
            });
          }
        }
      }
    }

    return Response.json({ success: true, reviewId: playedCourse[0].id });
  } catch (error) {
    console.error("Error marking as played:", error);
    return Response.json(
      { error: "Failed to record activity" },
      { status: 500 },
    );
  }
}
