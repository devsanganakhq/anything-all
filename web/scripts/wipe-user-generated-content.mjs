/**
 * Wipe user-generated content (feeds, reviews, photos, social, community posts)
 * while keeping user accounts, courses, rankings, and the communities catalog.
 *
 * Usage:
 *   node scripts/wipe-user-generated-content.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");

function loadEnv() {
  for (const name of [".env", "env"]) {
    const envPath = resolve(webRoot, name);
    if (!existsSync(envPath)) continue;
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function trySql(sql, label, fn) {
  try {
    await fn();
    console.log(`Cleared ${label}`);
  } catch (err) {
    const msg = String(err?.message || err);
    if (/does not exist|undefined_table|undefined_column/i.test(msg)) {
      console.warn(`Skipping ${label}: ${msg}`);
      return;
    }
    throw err;
  }
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in web/.env");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL, { fetchConnectionCache: true });

  const before = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM feed_posts) AS feed_posts,
      (SELECT COUNT(*)::int FROM played_courses) AS reviews,
      (SELECT COUNT(*)::int FROM activity_feed) AS activity,
      (SELECT COUNT(*)::int FROM notifications) AS notifications,
      (SELECT COUNT(*)::int FROM community_posts) AS community_posts,
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM courses) AS courses
  `;
  console.log("Before:", before[0]);

  // Break FKs that block deletes
  await trySql(sql, "notifications null FKs", () =>
    sql`
      UPDATE notifications SET
        activity_id = NULL,
        feed_post_id = NULL,
        community_post_id = NULL
    `,
  );
  await trySql(sql, "activity_feed null FKs", () =>
    sql`
      UPDATE activity_feed SET
        photo_id = NULL,
        review_id = NULL,
        course_id = NULL,
        community_id = NULL,
        achievement_id = NULL
    `,
  );
  await trySql(sql, "feed_comments.parent_comment_id", () =>
    sql`UPDATE feed_comments SET parent_comment_id = NULL`,
  );

  const tables = [
    "feed_post_reports",
    "feed_hidden_posts",
    "feed_reactions",
    "feed_comments",
    "feed_post_media",
    "feed_posts",
    "activity_likes",
    "activity_comments",
    "activity_feed",
    "notifications",
    "course_photo_likes",
    "course_photo_reports",
    "course_photos",
    "member_photos",
    "played_courses",
    "wishlist",
    "user_achievements",
    "user_club_memberships",
    "friendships",
    "follows",
    "community_reports",
    "community_chat_messages",
    "community_reactions",
    "community_post_comments",
    "community_posts",
    "community_invites",
    "community_join_requests",
    "community_members",
    "moderation_notes",
    "admin_audit_log",
    "direct_messages",
    "password_reset_tokens",
  ];

  for (const table of tables) {
    await trySql(sql, table, () => sql(`DELETE FROM ${table}`));
  }

  await trySql(sql, "course counters", () =>
    sql`
      UPDATE courses SET
        played_count = 0,
        wishlist_count = 0,
        community_rating = NULL
    `,
  );
  await trySql(sql, "community counters", () =>
    sql`
      UPDATE communities SET
        member_count = 0,
        post_count = 0
    `,
  );

  const after = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM feed_posts) AS feed_posts,
      (SELECT COUNT(*)::int FROM played_courses) AS reviews,
      (SELECT COUNT(*)::int FROM activity_feed) AS activity,
      (SELECT COUNT(*)::int FROM notifications) AS notifications,
      (SELECT COUNT(*)::int FROM community_posts) AS community_posts,
      (SELECT COUNT(*)::int FROM community_members) AS community_members,
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM courses) AS courses,
      (SELECT COUNT(*)::int FROM rankings) AS rankings
  `;
  console.log("After:", after[0]);
  console.log("Done. User accounts, courses, and rankings were kept.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
