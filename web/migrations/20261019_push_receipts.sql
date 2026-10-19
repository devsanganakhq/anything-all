BEGIN;
ALTER TABLE push_outbox ADD COLUMN IF NOT EXISTS receipt_checked_at TIMESTAMPTZ;
ALTER TABLE push_outbox ADD COLUMN IF NOT EXISTS receipt_status TEXT;
CREATE INDEX IF NOT EXISTS push_outbox_receipts_pending ON push_outbox(sent_at) WHERE ticket_id IS NOT NULL AND receipt_checked_at IS NULL;
INSERT INTO app_schema_migrations(version) VALUES('20261019_push_receipts') ON CONFLICT DO NOTHING;
COMMIT;
