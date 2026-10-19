-- Additive migration. Rehearse against a restored/isolated database first.
-- Keep played_courses as the unique-course and old-client compatibility table.
BEGIN;
CREATE TABLE IF NOT EXISTS app_schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS course_rounds (
 id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 course_id INTEGER NOT NULL REFERENCES courses(id), date_played DATE NOT NULL,
 comments TEXT NOT NULL DEFAULT '', photos JSONB NOT NULL DEFAULT '[]',
 legacy_played_id INTEGER UNIQUE REFERENCES played_courses(id) ON DELETE SET NULL,
 request_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ,
 CHECK(jsonb_typeof(photos)='array' AND jsonb_array_length(photos)<=3),
 UNIQUE(user_id, request_id)
);
CREATE INDEX IF NOT EXISTS course_rounds_course_date ON course_rounds(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS course_rounds_user_date ON course_rounds(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS course_reviews (
 id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 course_id INTEGER NOT NULL REFERENCES courses(id), date_played DATE NOT NULL,
 review_text TEXT NOT NULL DEFAULT '', rating NUMERIC(3,2) NOT NULL CHECK(rating BETWEEN 0.1 AND 5),
 scores JSONB, fee_band TEXT, photos JSONB NOT NULL DEFAULT '[]',
 legacy_played_id INTEGER UNIQUE REFERENCES played_courses(id) ON DELETE SET NULL,
 request_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ,
 CHECK(jsonb_typeof(photos)='array' AND jsonb_array_length(photos)<=3),
 CHECK(scores IS NULL OR jsonb_typeof(scores)='object'),
 UNIQUE(user_id, request_id)
);
CREATE INDEX IF NOT EXISTS course_reviews_course_date ON course_reviews(course_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS course_reviews_user_course_date ON course_reviews(user_id,course_id,created_at DESC) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS passport_favourites (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 position SMALLINT NOT NULL CHECK(position BETWEEN 1 AND 3), course_id INTEGER NOT NULL REFERENCES courses(id),
 PRIMARY KEY(user_id,position), UNIQUE(user_id,course_id),
 FOREIGN KEY(user_id,course_id) REFERENCES played_courses(user_id,course_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS curated_lists (
 id SERIAL PRIMARY KEY, title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
 description TEXT NOT NULL DEFAULT '', display_order INTEGER NOT NULL DEFAULT 0,
 is_published BOOLEAN NOT NULL DEFAULT false, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS curated_list_courses (
 list_id INTEGER NOT NULL REFERENCES curated_lists(id) ON DELETE CASCADE,
 course_id INTEGER NOT NULL REFERENCES courses(id), position INTEGER NOT NULL CHECK(position>0),
 PRIMARY KEY(list_id,course_id), UNIQUE(list_id,position)
);
CREATE TABLE IF NOT EXISTS list_reviews (
 id SERIAL PRIMARY KEY, list_id INTEGER NOT NULL REFERENCES curated_lists(id),
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 review_text TEXT NOT NULL DEFAULT '', scores JSONB NOT NULL, rating NUMERIC(3,2) NOT NULL CHECK(rating BETWEEN 0.5 AND 5),
 photos JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(jsonb_typeof(photos)='array' AND jsonb_array_length(photos)<=3),
 UNIQUE(user_id,list_id)
);
ALTER TABLE course_photos ADD COLUMN IF NOT EXISTS round_id INTEGER REFERENCES course_rounds(id) ON DELETE SET NULL;
ALTER TABLE course_photos ADD COLUMN IF NOT EXISTS course_review_id INTEGER REFERENCES course_reviews(id) ON DELETE SET NULL;
ALTER TABLE community_chat_messages ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]';
ALTER TABLE community_post_comments ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]';
ALTER TABLE community_members ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_path TEXT;
CREATE TABLE IF NOT EXISTS device_push_tokens (
 token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS device_push_tokens_user ON device_push_tokens(user_id);
CREATE TABLE IF NOT EXISTS push_outbox (
 id BIGSERIAL PRIMARY KEY, notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
 token TEXT NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 sent_at TIMESTAMPTZ, last_error TEXT, ticket_id TEXT,
 UNIQUE(notification_id,token)
);
-- Historical records become one round each. Unique legacy IDs make reruns safe.
INSERT INTO course_rounds(user_id,course_id,date_played,comments,legacy_played_id,created_at)
 SELECT user_id,course_id,COALESCE(date_played,created_at::date),COALESCE(review_text,''),id,created_at FROM played_courses
 WHERE NOT EXISTS(SELECT 1 FROM app_schema_migrations WHERE version='20261017_activity')
 ON CONFLICT(legacy_played_id) DO NOTHING;
INSERT INTO course_reviews(user_id,course_id,date_played,review_text,rating,legacy_played_id,created_at)
 SELECT user_id,course_id,COALESCE(date_played,created_at::date),COALESCE(review_text,''),rating,id,created_at
 FROM played_courses WHERE rating BETWEEN 1 AND 5
 AND NOT EXISTS(SELECT 1 FROM app_schema_migrations WHERE version='20261017_activity') ON CONFLICT(legacy_played_id) DO NOTHING;
-- Preserve photos by linking their records; never copy storage objects.
UPDATE course_photos p SET round_id=r.id FROM course_rounds r
 WHERE p.review_id=r.legacy_played_id AND p.round_id IS NULL;
UPDATE course_photos p SET course_review_id=r.id FROM course_reviews r
 WHERE p.review_id=r.legacy_played_id AND p.course_review_id IS NULL;
-- Snapshot up to three legacy attachments for the new editor; preserve every gallery record.
UPDATE course_reviews r SET photos=COALESCE((SELECT jsonb_agg(p.image_url ORDER BY p.uploaded_at,p.id) FROM
 (SELECT image_url,uploaded_at,id FROM course_photos WHERE course_review_id=r.id AND deleted_at IS NULL ORDER BY uploaded_at,id LIMIT 3) p),'[]')
 WHERE r.legacy_played_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app_schema_migrations WHERE version='20261017_activity');
UPDATE course_rounds r SET photos=COALESCE((SELECT jsonb_agg(p.image_url ORDER BY p.uploaded_at,p.id) FROM
 (SELECT image_url,uploaded_at,id FROM course_photos WHERE round_id=r.id AND deleted_at IS NULL ORDER BY uploaded_at,id LIMIT 3) p),'[]')
 WHERE r.legacy_played_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM app_schema_migrations WHERE version='20261017_activity');
-- Add references without altering existing feed IDs or creating duplicate historical posts.
UPDATE feed_posts fp SET metadata=fp.metadata || jsonb_build_object('course_review_id',r.id)
 FROM course_reviews r WHERE fp.post_type='review' AND fp.author_id=r.user_id
 AND fp.metadata->>'review_id'=r.legacy_played_id::text AND NOT(fp.metadata ? 'course_review_id');
UPDATE feed_posts fp SET metadata=fp.metadata || jsonb_build_object('round_id',r.id)
 FROM course_rounds r WHERE fp.post_type='played_course' AND fp.author_id=r.user_id
 AND fp.metadata->>'review_id'=r.legacy_played_id::text AND NOT(fp.metadata ? 'round_id');
-- Stable event IDs prevent duplicate notifications on action retries.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event ON notifications(user_id,event_key);

-- Recalculate historical aggregates from the new sources of truth.
UPDATE courses c SET played_count=(SELECT COUNT(*) FROM course_rounds WHERE course_id=c.id),
 community_rating=(SELECT AVG(rating) FROM course_reviews WHERE course_id=c.id AND deleted_at IS NULL);
INSERT INTO app_schema_migrations(version) VALUES('20261017_activity') ON CONFLICT DO NOTHING;
COMMIT;
