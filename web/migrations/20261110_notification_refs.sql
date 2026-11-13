-- Apply once in an isolated database before deployment; no runtime DDL.
BEGIN;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS feed_post_id INTEGER;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS community_post_id INTEGER;
INSERT INTO app_schema_migrations(version) VALUES('20261110_notification_refs') ON CONFLICT DO NOTHING;
COMMIT;
