-- Historical venues are visible entries, but never playable completion targets.
BEGIN;
ALTER TABLE curated_lists ADD COLUMN IF NOT EXISTS source_key TEXT UNIQUE;
ALTER TABLE curated_lists ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE curated_list_courses ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE curated_list_courses ADD COLUMN IF NOT EXISTS entry_key TEXT;
ALTER TABLE curated_list_courses ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE curated_list_courses ADD COLUMN IF NOT EXISTS counts_for_completion BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE curated_list_courses ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE curated_list_courses DROP CONSTRAINT IF EXISTS curated_list_courses_pkey;
ALTER TABLE curated_list_courses ALTER COLUMN course_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS curated_list_entry_id ON curated_list_courses(id);
CREATE UNIQUE INDEX IF NOT EXISTS curated_list_course_unique ON curated_list_courses(list_id,course_id);
CREATE UNIQUE INDEX IF NOT EXISTS curated_list_source_entry ON curated_list_courses(list_id,entry_key);
-- A playable row must resolve to a real profile; unresolved imports cannot silently reduce the target.
DO $$ BEGIN
 ALTER TABLE curated_list_courses ADD CONSTRAINT curated_list_playable_profile
 CHECK(NOT counts_for_completion OR course_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
INSERT INTO app_schema_migrations(version) VALUES('20261019_list_sources') ON CONFLICT DO NOTHING;
COMMIT;
