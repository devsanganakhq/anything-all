import sql from "./sql";
export async function communityAccess(
  communityId,
  userId,
  { memberOnly = false } = {},
) {
  if (!Number.isSafeInteger(Number(communityId)) || Number(communityId) < 1)
    return false;
  const rows = await sql(
    `SELECT (c.community_type='private') AS is_private, EXISTS(SELECT 1 FROM community_members WHERE community_id=c.id AND user_id=$2) AS member
  FROM communities c WHERE c.id=$1`,
    [communityId, userId],
  );
  return (
    !!rows.length && (rows[0].member || (!memberOnly && !rows[0].is_private))
  );
}
