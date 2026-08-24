import sql from "@/app/api/utils/sql";
import { createFeedPost } from "@/app/api/utils/createFeedPost";

/** Adds a user as a community member and runs join side-effects. */
export async function addCommunityMember({ communityId, userId, communityName }) {
  await sql(
    `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'member')`,
    [communityId, userId],
  );
  await sql(
    `UPDATE communities SET member_count=member_count+1 WHERE id=$1`,
    [communityId],
  );

  try {
    await sql(
      `INSERT INTO activity_feed (user_id, activity_type, community_id) VALUES ($1,'joined_community',$2)`,
      [userId, communityId],
    );
  } catch (_) {}

  try {
    const authorRows = await sql(
      `SELECT first_name FROM users WHERE id = $1`,
      [userId],
    );
    const firstName = authorRows[0]?.first_name || "A golfer";
    await createFeedPost({
      userId,
      postType: "community_discussion",
      communityId: parseInt(communityId, 10),
      caption: `${firstName} joined community ${communityName}.`,
      metadata: { community_name: communityName, event: "joined" },
    });
  } catch (_) {}
}
