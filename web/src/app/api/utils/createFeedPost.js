/**
 * createFeedPost — shared utility for generating feed_posts entries.
 *
 * Called by activity routes (mark-played, add-wishlist, achievements)
 * so that every significant action automatically surfaces in the social feed.
 *
 * @param {object} opts
 * @param {number}  opts.userId       – author
 * @param {string}  opts.postType     – feed_posts.post_type CHECK constraint value
 * @param {number}  [opts.courseId]
 * @param {number}  [opts.communityId]
 * @param {string}  [opts.clubName]
 * @param {string}  [opts.caption]    – optional human-readable summary
 * @param {object}  [opts.metadata]   – arbitrary JSON payload
 * @param {boolean} [opts.isPrivate]  – default false
 * @param {string[]} [opts.mediaUrls] – optional photo URLs → feed_post_media
 * @returns {Promise<{id: number}>}   – inserted row id
 */

import sql from "./sql";

const VALID_TYPES = new Set([
  "played_course",
  "wishlist",
  "review",
  "photos",
  "achievement",
  "ranking_progress",
  "ranking_complete",
  "passport_complete",
  "milestone",
  "club_update",
  "community_discussion",
  "golf_trip",
  "sponsored",
]);

export async function createFeedPost({
  userId,
  postType,
  courseId = null,
  communityId = null,
  clubName = null,
  caption = null,
  metadata = {},
  isPrivate = false,
  mediaUrls = null,
}) {
  if (!userId) throw new Error("createFeedPost: userId is required");
  if (!VALID_TYPES.has(postType))
    throw new Error(`createFeedPost: invalid postType '${postType}'`);

  const metaJson = JSON.stringify(metadata || {});

  const rows = await sql(
    `INSERT INTO feed_posts
       (author_id, post_type, course_id, community_id, club_name, caption, metadata, is_private)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     RETURNING id`,
    [
      userId,
      postType,
      courseId,
      communityId,
      clubName,
      caption,
      metaJson,
      isPrivate,
    ],
  );

  const postId = rows[0]?.id;
  if (postId && Array.isArray(mediaUrls) && mediaUrls.length) {
    await attachFeedPostMedia(postId, mediaUrls);
  }

  return { id: postId };
}

/**
 * Attach photo URLs to a feed post (feed_post_media).
 * @param {number} postId
 * @param {string[]|{url:string,caption?:string}[]} mediaUrls
 */
export async function attachFeedPostMedia(postId, mediaUrls = []) {
  if (!postId || !mediaUrls?.length) return;

  let order = 0;
  for (const item of mediaUrls) {
    const url = typeof item === "string" ? item : item?.url;
    if (!url) continue;
    const caption = typeof item === "string" ? null : item?.caption || null;
    await sql(
      `INSERT INTO feed_post_media (post_id, media_url, media_type, caption, display_order)
       VALUES ($1, $2, 'photo', $3, $4)`,
      [postId, url, caption, order++],
    );
  }
}

/**
 * Helper: generate the caption string for common activity types.
 */
export function buildCaption(type, opts = {}) {
  const {
    firstName = "A golfer",
    courseName,
    count,
    listName,
    passportName,
    achievementName,
  } = opts;

  switch (type) {
    case "played_course":
      return `${firstName} played ${courseName || "a new course"}.`;
    case "wishlist":
      return `${firstName} added ${courseName || "a course"} to their wish list.`;
    case "review":
      return opts.reviewText ? `"${opts.reviewText.slice(0, 120)}…"` : null;
    case "photos":
      return count > 1
        ? `${firstName} uploaded ${count} photos from ${courseName || "the course"}.`
        : null;
    case "achievement":
      return achievementName
        ? `${firstName} unlocked "${achievementName}".`
        : null;
    case "milestone":
      return `${firstName} has now played ${count} courses.`;
    case "ranking_progress":
      return listName
        ? `${firstName} is making progress through ${listName}.`
        : null;
    case "ranking_complete":
      return listName ? `${firstName} completed ${listName}!` : null;
    case "passport_complete":
      return passportName
        ? `${firstName} completed the ${passportName} Passport!`
        : null;
    default:
      return null;
  }
}
