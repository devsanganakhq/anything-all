/**
 * Formerly ran CREATE TABLE IF NOT EXISTS community_join_requests on each cold start. The table
 * is part of schema.sql and exists in every environment, and request handlers
 * must not change the schema (migrations do, via scripts/migrate.mjs). Kept as
 * a no-op so existing callers need no change.
 */
export async function ensureCommunityJoinRequestsTable() {}
