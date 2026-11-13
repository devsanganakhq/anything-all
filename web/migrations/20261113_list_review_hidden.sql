-- Additive: a list review is hidden (not deleted) while its list is no longer
-- complete for the reviewer, and shown again when they re-complete it.
-- Apply BEFORE deploying the code that reads hidden_at.
-- Rollback: ALTER TABLE list_reviews DROP COLUMN hidden_at (after old code is live).
BEGIN;
ALTER TABLE list_reviews ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
INSERT INTO app_schema_migrations(version) VALUES('20261113_list_review_hidden') ON CONFLICT DO NOTHING;
COMMIT;
