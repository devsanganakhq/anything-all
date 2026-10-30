export function notificationTarget(n) {
  const type = n.notification_type;
  if (type === 'friend_request') return '/friends';
  if (n.community_id) {
    if (type === 'community_message') return `/communities/${n.community_id}?tab=CHAT`;
    if (n.community_post_id) return `/communities/${n.community_id}?postId=${n.community_post_id}${type.endsWith('comment') ? '&openComments=1' : ''}`;
    return `/communities/${n.community_id}${type === 'community_invite' ? '?tab=REQUESTS' : ''}`;
  }
  const postId = n.feed_post_id || n.related_post_id;
  if (postId) return `/feed/${postId}${type.endsWith('comment') ? '?openComments=1' : ''}`;
  if (n.achievement_slug) return `/achievements/${n.achievement_slug}`;
  if (n.activity_course_id) return `/course/${n.activity_course_id}`;
  if (n.target_path && n.target_path !== '/notifications') return n.target_path;
  return n.from_user_id ? `/social/${n.from_user_id}` : '/(tabs)/passport';
}
