import sql from "@/app/api/utils/sql";

let ensured = false;

/** Ensures community_invites exists on older DBs. Safe to call repeatedly. */
export async function ensureCommunityInvitesTable() {
  if (ensured) return;
  await sql(`
    CREATE TABLE IF NOT EXISTS community_invites (
      id SERIAL PRIMARY KEY,
      community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
      inviter_id INTEGER NOT NULL REFERENCES users(id),
      invitee_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      UNIQUE (community_id, invitee_id)
    )
  `);
  ensured = true;
}
