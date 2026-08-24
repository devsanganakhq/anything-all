import sql from "@/app/api/utils/sql";

let ensured = false;

/** Ensures community_join_requests exists on older DBs. Safe to call repeatedly. */
export async function ensureCommunityJoinRequestsTable() {
  if (ensured) return;
  await sql(`
    CREATE TABLE IF NOT EXISTS community_join_requests (
      id SERIAL PRIMARY KEY,
      community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by INTEGER REFERENCES users(id),
      UNIQUE (community_id, user_id)
    )
  `);
  ensured = true;
}
