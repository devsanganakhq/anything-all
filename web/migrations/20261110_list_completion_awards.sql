-- Additive list-completion state. Rehearse on an isolated restored database.
-- Rollback: drop this table only after archiving its award history and removing
-- dependent list-completion feed entries. Do not roll back in production blindly.
BEGIN;
CREATE TABLE IF NOT EXISTS list_completion_awards (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id INTEGER NOT NULL REFERENCES curated_lists(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  feed_post_id INTEGER REFERENCES feed_posts(id) ON DELETE SET NULL,
  PRIMARY KEY(user_id,list_id)
);
CREATE INDEX IF NOT EXISTS list_completion_awards_active_user
  ON list_completion_awards(user_id) WHERE active;
-- Backfill existing qualifying completions without creating artificial past feed posts.
INSERT INTO list_completion_awards(user_id,list_id)
SELECT p.user_id,l.id FROM curated_lists l
JOIN (SELECT DISTINCT user_id FROM played_courses) p ON true
WHERE l.is_published
  AND EXISTS(SELECT 1 FROM curated_list_courses lc WHERE lc.list_id=l.id AND lc.counts_for_completion)
  AND NOT EXISTS(SELECT 1 FROM curated_list_courses lc WHERE lc.list_id=l.id AND lc.counts_for_completion
    AND NOT EXISTS(SELECT 1 FROM played_courses pc WHERE pc.user_id=p.user_id AND pc.course_id=lc.course_id))
ON CONFLICT(user_id,list_id) DO NOTHING;
INSERT INTO app_schema_migrations(version) VALUES('20261110_list_completion_awards') ON CONFLICT DO NOTHING;
COMMIT;
