-- Heathland Links — local Neon bootstrap schema
-- Auth tables required by __create/adapter.ts + core app tables used by API routes.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Auth.js / NeonAdapter ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT
);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  password TEXT,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_verification_token (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ── App identity ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT 'auth-managed',
  first_name TEXT,
  last_name TEXT,
  profile_photo_url TEXT,
  location TEXT,
  bio TEXT,
  handicap NUMERIC,
  home_club_id INTEGER,
  home_club_name TEXT,
  member_since TEXT,
  privacy_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences JSONB,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_at TIMESTAMPTZ,
  suspended_by INTEGER REFERENCES users(id),
  suspension_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Courses & rankings ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  club_name TEXT,
  display_name TEXT,
  hl_course_id TEXT UNIQUE,
  hl_club_id TEXT,
  city TEXT,
  county TEXT,
  region TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  course_type TEXT,
  holes INTEGER,
  par INTEGER,
  description TEXT,
  website TEXT,
  course_image_url TEXT,
  course_status TEXT NOT NULL DEFAULT 'active',
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  community_rating NUMERIC,
  played_count INTEGER NOT NULL DEFAULT 0,
  wishlist_count INTEGER NOT NULL DEFAULT 0,
  mvp_data_status TEXT,
  mvp_missing_fields JSONB,
  official_profile_status TEXT,
  official_hero_image_url TEXT,
  official_logo_url TEXT,
  official_gallery_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_home_club_id_fkey
    FOREIGN KEY (home_club_id) REFERENCES courses(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS rankings (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  ranking_name TEXT NOT NULL,
  ranking_source TEXT,
  ranking_year INTEGER,
  position INTEGER,
  ranking_region TEXT,
  verification_status TEXT,
  source_url TEXT,
  research_batch TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ── Passport / activity ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS played_courses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  date_played DATE,
  rating INTEGER,
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS user_club_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  club_id INTEGER REFERENCES courses(id),
  club_name TEXT NOT NULL,
  membership_type TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'public',
  verified_status BOOLEAN DEFAULT false,
  joined_year INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  community_type TEXT NOT NULL DEFAULT 'public',
  created_by INTEGER NOT NULL REFERENCES users(id),
  category TEXT,
  rules JSONB DEFAULT '[]'::jsonb,
  cover_photo_url TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_photos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER REFERENCES courses(id),
  photo_url TEXT,
  caption TEXT,
  is_official BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_feed (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL,
  course_id INTEGER REFERENCES courses(id),
  review_id INTEGER REFERENCES played_courses(id),
  achievement_id INTEGER REFERENCES achievements(id),
  community_id INTEGER REFERENCES communities(id),
  photo_id INTEGER REFERENCES member_photos(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_likes (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE (activity_id, user_id)
);

CREATE TABLE IF NOT EXISTS activity_comments (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  comment_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Social ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  friend_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id),
  followee_type TEXT NOT NULL,
  followee_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, followee_type, followee_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_type TEXT NOT NULL,
  from_user_id INTEGER REFERENCES users(id),
  activity_id INTEGER REFERENCES activity_feed(id),
  community_id INTEGER REFERENCES communities(id),
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Feed ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feed_posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id),
  post_type TEXT NOT NULL,
  course_id INTEGER REFERENCES courses(id),
  community_id INTEGER REFERENCES communities(id),
  club_name TEXT,
  caption TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feed_post_media (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'photo',
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS feed_reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reaction_type TEXT NOT NULL,
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS feed_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment_text TEXT NOT NULL,
  parent_comment_id INTEGER REFERENCES feed_comments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feed_hidden_posts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS feed_post_reports (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, reporter_id)
);

-- ── Communities ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_members (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT,
  body TEXT,
  post_type TEXT DEFAULT 'discussion',
  photo_urls TEXT[],
  course_id INTEGER REFERENCES courses(id),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS community_post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  reaction_type TEXT NOT NULL,
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_chat_messages (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message_text TEXT,
  image_url TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  community_id INTEGER REFERENCES communities(id),
  post_id INTEGER REFERENCES community_posts(id),
  reported_user_id INTEGER REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Course photos ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_photos (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  review_id INTEGER REFERENCES played_courses(id),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  photo_type TEXT NOT NULL DEFAULT 'community',
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_official BOOLEAN NOT NULL DEFAULT false,
  like_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by INTEGER REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS course_photo_likes (
  photo_id INTEGER NOT NULL REFERENCES course_photos(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (photo_id, user_id)
);

CREATE TABLE IF NOT EXISTS course_photo_reports (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES course_photos(id) ON DELETE CASCADE,
  reported_by_user_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (photo_id, reported_by_user_id)
);

-- ── Admin ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moderation_notes (
  id SERIAL PRIMARY KEY,
  target_user_id INTEGER NOT NULL REFERENCES users(id),
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_user_id INTEGER REFERENCES users(id),
  target_type TEXT,
  target_id INTEGER,
  reason TEXT,
  note TEXT,
  previous_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed achievements used by activity routes ───────────────────────────────

INSERT INTO achievements (slug, name, description, icon_name) VALUES
  ('first-tee', 'First Tee', 'Played your first course', 'flag'),
  ('course-collector', 'Course Collector', 'Played 10 courses', 'map'),
  ('fifty-club', 'Fifty Club', 'Played 50 courses', 'trophy'),
  ('century-club', 'Century Club', 'Played 100 courses', 'crown'),
  ('links-explorer', 'Links Explorer', 'Played a links course', 'waves'),
  ('heathland-hunter', 'Heathland Hunter', 'Played a heathland course', 'trees'),
  ('scottish-explorer', 'Scottish Explorer', 'Played a course in Scotland', 'mountain'),
  ('irish-explorer', 'Irish Explorer', 'Played a course in Ireland', 'clover')
ON CONFLICT (slug) DO NOTHING;
