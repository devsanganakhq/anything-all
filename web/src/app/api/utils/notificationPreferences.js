// Only phone push is filtered by these categories. The bell is independent.
export function pushCategorySQL(type) {
  return `CASE
    WHEN ${type} IN ('friend_request','friend_accepted') THEN 'friend_requests'
    WHEN ${type} IN ('feed_like','activity_like','photo_like','community_post_like') THEN 'likes'
    WHEN ${type} IN ('feed_comment','activity_comment','community_post_comment') THEN 'comments'
    WHEN ${type} IN ('follow','mention') THEN 'follows'
    WHEN ${type} IN ('review','course_review','list_review') THEN 'reviews'
    WHEN ${type} IN ('achievement','achievement_unlocked') THEN 'achievements'
    WHEN ${type} LIKE 'community_%' THEN 'community_notifications'
    ELSE NULL END`;
}
export function pushAllowedSQL(type, user = 'u') {
  return `(${type} <> 'community_message'
    AND ${pushCategorySQL(type)} IS NOT NULL
    AND COALESCE((${user}.notification_settings->>${pushCategorySQL(type)})::boolean, (${user}.notification_settings->>'push_enabled')::boolean, true))`;
}
