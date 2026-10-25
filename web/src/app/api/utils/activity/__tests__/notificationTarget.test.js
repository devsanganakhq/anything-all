import { test, expect } from 'vitest';
import { notificationTarget } from '../../notificationTarget';
test('bell destinations open the related content',()=> {
  for (const [notification,path] of [
    [{notification_type:'friend_request',from_user_id:2},'/friends'],
    [{notification_type:'follow',from_user_id:2},'/social/2'],
    [{notification_type:'feed_comment',feed_post_id:8},'/feed/8?openComments=1'],
    [{notification_type:'review',feed_post_id:9},'/feed/9'],
    [{notification_type:'activity_like',related_post_id:10},'/feed/10'],
    [{notification_type:'community_message',community_id:3},'/communities/3?tab=CHAT'],
    [{notification_type:'community_post_comment',community_id:3,community_post_id:4},'/communities/3?postId=4&openComments=1'],
    [{notification_type:'achievement',achievement_slug:'first-tee'},'/achievements/first-tee'],
  ]) expect(notificationTarget(notification)).toBe(path);
});
