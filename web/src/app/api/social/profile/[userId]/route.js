/**
 * GET /api/social/profile/:userId
 * Public golfer profile. Respects privacy. Never exposes email.
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserIdOrNull } from "@/app/api/utils/getUserId";

export async function GET(request, { params }) {
  const targetId = parseInt(params.userId, 10);
  const viewerId = await getSessionUserIdOrNull();
  if (!targetId || isNaN(targetId))
    return Response.json({ error: "Invalid userId" }, { status: 400 });

  try {
    const blocked = await sql(
      `SELECT 1 FROM friendships WHERE status='blocked'
        AND ((user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1))`,
      [viewerId, targetId],
    );
    if (blocked.length)
      return Response.json({ error: "Profile not available" }, { status: 403 });

    const rows = await sql(
      `SELECT
          u.id,
          u.first_name || ' ' || u.last_name  AS name,
          u.profile_photo_url                  AS avatar,
          u.location,
          u.home_club_name                     AS home_club,
          u.member_since,
          u.bio,
          u.privacy_settings,

          CASE WHEN (u.privacy_settings->>'stats_visible')::boolean
            THEN u.handicap ELSE NULL END AS handicap,

          CASE WHEN (u.privacy_settings->>'stats_visible')::boolean
            THEN (SELECT COUNT(*)::int FROM played_courses WHERE user_id=u.id)
            ELSE NULL END AS courses_played,

          CASE WHEN (u.privacy_settings->>'stats_visible')::boolean
            THEN (SELECT COUNT(DISTINCT c.country)::int
                  FROM played_courses pc JOIN courses c ON pc.course_id=c.id WHERE pc.user_id=u.id)
            ELSE NULL END AS countries_played,

          (SELECT COUNT(*)::int FROM follows WHERE followee_type='user' AND followee_id=u.id) AS follower_count,
          (SELECT COUNT(*)::int FROM follows WHERE follower_id=u.id AND followee_type='user') AS following_count,
          (SELECT COUNT(*)::int FROM friendships WHERE (user_id=u.id OR friend_id=u.id) AND status='accepted') AS friend_count,

          (SELECT status FROM friendships
            WHERE (user_id=$1 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$1) LIMIT 1) AS friendship_status,

          (SELECT user_id FROM friendships
            WHERE ((user_id=$1 AND friend_id=u.id) OR (user_id=u.id AND friend_id=$1))
              AND status='pending' LIMIT 1) AS request_initiator_id,

          EXISTS(SELECT 1 FROM follows WHERE follower_id=$1 AND followee_type='user' AND followee_id=u.id) AS is_following,

          (SELECT COUNT(*)::int FROM (
            SELECT friend_id AS mid FROM friendships WHERE user_id=$1 AND status='accepted'
            UNION SELECT user_id AS mid FROM friendships WHERE friend_id=$1 AND status='accepted'
          ) mf WHERE mid IN (
            SELECT friend_id FROM friendships WHERE user_id=u.id AND status='accepted'
            UNION SELECT user_id FROM friendships WHERE friend_id=u.id AND status='accepted'
          )) AS mutual_friends_count

        FROM users u WHERE u.id=$2`,
      [viewerId, targetId],
    );

    if (!rows.length)
      return Response.json({ error: "User not found" }, { status: 404 });

    const user = rows[0];
    const isFriend = user.friendship_status === "accepted";
    const isSelf = targetId === viewerId;
    const isVisible = user.privacy_settings?.profile_visible ?? true;

    if (!isVisible && !isFriend && !isSelf) {
      return Response.json({
        profile: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          private: true,
          is_following: user.is_following,
          friendship_status: user.friendship_status,
        },
      });
    }

    const achievements = await sql(
      `SELECT a.id, a.slug, a.name, a.description, a.icon_name, ua.unlocked_at
        FROM user_achievements ua JOIN achievements a ON ua.achievement_id=a.id
        WHERE ua.user_id=$1 ORDER BY ua.unlocked_at DESC`,
      [targetId],
    );

    const canSeeActivity =
      (user.privacy_settings?.activity_visible ?? true) || isFriend || isSelf;
    const recentCourses = canSeeActivity
      ? await sql(
          `SELECT c.id, c.name, c.city, c.country, c.course_type, pc.rating, pc.date_played
            FROM played_courses pc JOIN courses c ON pc.course_id=c.id
            WHERE pc.user_id=$1 ORDER BY pc.created_at DESC LIMIT 5`,
          [targetId],
        )
      : [];

    const mutualFriends = isSelf
      ? []
      : await sql(
          `SELECT u2.id, u2.first_name||' '||u2.last_name AS name, u2.profile_photo_url AS avatar
        FROM (
          SELECT friend_id AS mid FROM friendships WHERE user_id=$1 AND status='accepted'
          UNION SELECT user_id AS mid FROM friendships WHERE friend_id=$1 AND status='accepted'
        ) mf
        JOIN users u2 ON u2.id=mf.mid
        WHERE mf.mid IN (
          SELECT friend_id FROM friendships WHERE user_id=$2 AND status='accepted'
          UNION SELECT user_id FROM friendships WHERE friend_id=$2 AND status='accepted'
        ) LIMIT 5`,
          [viewerId, targetId],
        );

    // ── Club memberships (privacy-aware) ────────────────────────────────────
    // public → always shown
    // friends → shown if viewer is a friend or self
    // private → only shown if self
    const canSeeFriends = isSelf || isFriend;
    const clubMemberships = await sql(
      `SELECT
          ucm.id, ucm.club_id, ucm.club_name, ucm.membership_type,
          ucm.display_order, ucm.visibility, ucm.verified_status, ucm.joined_year,
          c.id AS course_id, c.city AS club_city, c.country AS club_country
        FROM user_club_memberships ucm
        LEFT JOIN courses c ON ucm.club_id = c.id
        WHERE ucm.user_id = $1
          AND (
            ucm.visibility = 'public'
            OR (ucm.visibility = 'friends' AND $2 = true)
            OR (ucm.visibility = 'private' AND $3 = true)
          )
        ORDER BY
          CASE ucm.membership_type WHEN 'home' THEN 0 ELSE 1 END,
          ucm.display_order ASC`,
      [targetId, canSeeFriends, isSelf],
    );

    const { privacy_settings, ...publicUser } = user;
    return Response.json({
      profile: { ...publicUser, private: false },
      achievements,
      recentCourses,
      mutualFriends,
      clubMemberships,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
