/**
 * createNotification — shared helper for in-app notification rows.
 *
 * Skips self-notifications, dedupes unread rows for the same actor+type+target,
 * and never throws so social actions still succeed if notify fails.
 */

import sql from "./sql";

let columnsEnsured = false;

async function ensureNotificationColumns() {
  if (columnsEnsured) return;
  try {
    await sql(
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS feed_post_id INTEGER`,
    );
    await sql(
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS community_post_id INTEGER`,
    );
    columnsEnsured = true;
  } catch (err) {
    console.error("ensureNotificationColumns:", err);
  }
}

/**
 * @param {object} opts
 * @param {number}  opts.userId            – recipient
 * @param {string}  opts.notificationType
 * @param {number}  [opts.fromUserId]      – actor
 * @param {string}  [opts.message]
 * @param {number}  [opts.communityId]
 * @param {number}  [opts.activityId]
 * @param {number}  [opts.feedPostId]
 * @param {number}  [opts.communityPostId]
 * @returns {Promise<{id: number}|null>}
 */
export async function createNotification({
  userId,
  notificationType,
  fromUserId = null,
  message = null,
  communityId = null,
  activityId = null,
  feedPostId = null,
  communityPostId = null,
}) {
  if (!userId || !notificationType) return null;
  if (fromUserId != null && Number(userId) === Number(fromUserId)) return null;

  try {
    await ensureNotificationColumns();

    // Dedup: skip if an unread row already exists for same actor+type+target
    const targetClause = feedPostId
      ? `AND feed_post_id = $4`
      : communityPostId
        ? `AND community_post_id = $4`
        : communityId
          ? `AND community_id = $4`
          : activityId
            ? `AND activity_id = $4`
            : `AND feed_post_id IS NULL AND community_post_id IS NULL AND community_id IS NULL AND activity_id IS NULL`;

    const targetValue = feedPostId ?? communityPostId ?? communityId ?? activityId ?? null;

    const existingParams =
      targetValue != null
        ? [userId, fromUserId, notificationType, targetValue]
        : [userId, fromUserId, notificationType];

    const existing = await sql(
      `SELECT id FROM notifications
        WHERE user_id = $1
          AND from_user_id IS NOT DISTINCT FROM $2
          AND notification_type = $3
          AND read_at IS NULL
          ${targetClause}
        LIMIT 1`,
      existingParams,
    );

    if (existing.length) return { id: existing[0].id };

    const rows = await sql(
      `INSERT INTO notifications
         (user_id, notification_type, from_user_id, message,
          community_id, activity_id, feed_post_id, community_post_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        notificationType,
        fromUserId,
        message,
        communityId,
        activityId,
        feedPostId,
        communityPostId,
      ],
    );

    return { id: rows[0]?.id ?? null };
  } catch (err) {
    console.error("createNotification error:", err);
    return null;
  }
}
