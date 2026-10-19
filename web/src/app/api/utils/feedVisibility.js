import sql from "./sql";
export const feedVisibility = `COALESCE(u.is_suspended,false)=false
 AND NOT EXISTS(SELECT 1 FROM friendships b WHERE b.status='blocked' AND ((b.user_id=$1 AND b.friend_id=fp.author_id) OR (b.friend_id=$1 AND b.user_id=fp.author_id)))
 AND (fp.author_id=$1 OR EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.user_id=$1 AND f.friend_id=fp.author_id) OR (f.friend_id=$1 AND f.user_id=fp.author_id))) OR (fp.is_private=false AND COALESCE((u.privacy_settings->>'profile_visible')::boolean,true)))
 AND (fp.community_id IS NULL OR EXISTS(SELECT 1 FROM communities c WHERE c.id=fp.community_id AND (c.community_type<>'private' OR EXISTS(SELECT 1 FROM community_members m WHERE m.community_id=c.id AND m.user_id=$1))))`;
export async function visibleFeedPost(userId, postId) {
  return (
    (
      await sql(
        `SELECT fp.id,fp.author_id FROM feed_posts fp JOIN users u ON u.id=fp.author_id WHERE fp.id=$2 AND ${feedVisibility}`,
        [userId, postId],
      )
    )[0] || null
  );
}
