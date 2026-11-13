-- migrate:no-transaction
-- Performance indexes for the hottest read paths. Additive only: no table,
-- column or row is changed. CONCURRENTLY keeps every table readable and
-- writable while each index builds, which is why this file cannot run inside a
-- transaction; IF NOT EXISTS makes a rerun after an interruption safe.
-- Rollback: DROP INDEX CONCURRENTLY IF EXISTS <name>; for any index below.

-- Privacy checks on every feed/profile query look up friendships by either side.
CREATE INDEX CONCURRENTLY IF NOT EXISTS friendships_friend_status ON friendships(friend_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS friendships_user_status ON friendships(user_id, status);

-- Home feed (chronological and per author), community feeds, metadata links.
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_posts_created ON feed_posts(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_posts_author_created ON feed_posts(author_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_posts_community ON feed_posts(community_id) WHERE community_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_posts_round_ref ON feed_posts((metadata->>'round_id')) WHERE metadata ? 'round_id';
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_posts_review_ref ON feed_posts((metadata->>'review_id')) WHERE metadata ? 'review_id';
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_posts_list_ref ON feed_posts((metadata->>'list_id')) WHERE post_type = 'list_complete';
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_comments_post ON feed_comments(post_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS feed_post_media_post ON feed_post_media(post_id);

-- Activity tab and course activity.
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_feed_user_created ON activity_feed(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_feed_course_created ON activity_feed(course_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_comments_activity ON activity_comments(activity_id);

-- Notification screen.
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_created ON notifications(user_id, created_at DESC);

-- Course page: photos, member photos, rankings; reverse lookups by course.
CREATE INDEX CONCURRENTLY IF NOT EXISTS course_photos_course_approved ON course_photos(course_id, uploaded_at DESC)
  WHERE deleted_at IS NULL AND moderation_status = 'approved';
CREATE INDEX CONCURRENTLY IF NOT EXISTS course_photos_user ON course_photos(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS member_photos_course_created ON member_photos(course_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS rankings_course ON rankings(course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS played_courses_course ON played_courses(course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS wishlist_course ON wishlist(course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS curated_list_courses_course ON curated_list_courses(course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS follows_followee ON follows(followee_type, followee_id);

-- Communities.
CREATE INDEX CONCURRENTLY IF NOT EXISTS community_posts_community_created ON community_posts(community_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS community_chat_community_created ON community_chat_messages(community_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS community_members_user ON community_members(user_id);

-- Sign-in looks up lower(trim(email)); the plain UNIQUE(email) index cannot serve it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS auth_users_email_normalized ON auth_users((lower(trim(email))));
CREATE INDEX CONCURRENTLY IF NOT EXISTS password_reset_tokens_email_created ON password_reset_tokens(email, created_at DESC);

INSERT INTO app_schema_migrations(version) VALUES('20261113_performance_indexes') ON CONFLICT DO NOTHING;
