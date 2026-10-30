import { getSessionUserId } from "@/app/api/utils/getUserId";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  let userId;
  try {
    userId = await getSessionUserId(request);
  } catch {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "friends";

  try {
    let activities = [];

    if (type === "friends") {
      // Get activities from friends only
      activities = await sql`
        SELECT 
          af.*,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') as user_name,
          u.profile_photo_url as user_photo,
          c.name as course_name,
          a.name as achievement_name,
          pc.review_text,
          pc.rating,
          mp.photo_url,
          (SELECT COUNT(*) FROM activity_likes WHERE activity_id = af.id) as like_count,
          (SELECT COUNT(*) FROM activity_comments WHERE activity_id = af.id) as comment_count,
          EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = af.id AND user_id = ${userId}) as user_has_liked,
          CASE 
            WHEN af.created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(EPOCH FROM (NOW() - af.created_at))/60 || 'm ago'
            WHEN af.created_at > NOW() - INTERVAL '24 hours' THEN EXTRACT(EPOCH FROM (NOW() - af.created_at))/3600 || 'h ago'
            ELSE EXTRACT(EPOCH FROM (NOW() - af.created_at))/86400 || 'd ago'
          END as time_ago
        FROM activity_feed af
        JOIN users u ON af.user_id = u.id
        LEFT JOIN courses c ON af.course_id = c.id
        LEFT JOIN achievements a ON af.achievement_id = a.id
        LEFT JOIN played_courses pc ON af.review_id = pc.id
        LEFT JOIN member_photos mp ON af.photo_id = mp.id
        WHERE COALESCE(u.is_suspended,false)=false AND
 NOT EXISTS(SELECT 1 FROM friendships b WHERE b.status='blocked' AND ((b.user_id=${userId} AND b.friend_id=u.id) OR (b.friend_id=${userId} AND b.user_id=u.id))) AND
 (u.id=${userId} OR COALESCE((u.privacy_settings->>'profile_visible')::boolean,true) OR EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.user_id=${userId} AND f.friend_id=u.id) OR (f.friend_id=${userId} AND f.user_id=u.id)))) AND af.user_id IN (
          SELECT friend_id FROM friendships WHERE user_id = ${userId} AND status = 'accepted'
          UNION
          SELECT user_id FROM friendships WHERE friend_id = ${userId} AND status = 'accepted'
        )
        ORDER BY af.created_at DESC
        LIMIT 50
      `;
    } else if (type === "everyone") {
      // Get all public activities
      activities = await sql`
        SELECT 
          af.*,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') as user_name,
          u.profile_photo_url as user_photo,
          c.name as course_name,
          a.name as achievement_name,
          pc.review_text,
          pc.rating,
          mp.photo_url,
          (SELECT COUNT(*) FROM activity_likes WHERE activity_id = af.id) as like_count,
          (SELECT COUNT(*) FROM activity_comments WHERE activity_id = af.id) as comment_count,
          EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = af.id AND user_id = ${userId}) as user_has_liked,
          CASE 
            WHEN af.created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(EPOCH FROM (NOW() - af.created_at))/60 || 'm ago'
            WHEN af.created_at > NOW() - INTERVAL '24 hours' THEN EXTRACT(EPOCH FROM (NOW() - af.created_at))/3600 || 'h ago'
            ELSE EXTRACT(EPOCH FROM (NOW() - af.created_at))/86400 || 'd ago'
          END as time_ago
        FROM activity_feed af
        JOIN users u ON af.user_id = u.id
        LEFT JOIN courses c ON af.course_id = c.id
        LEFT JOIN achievements a ON af.achievement_id = a.id
        LEFT JOIN played_courses pc ON af.review_id = pc.id
        LEFT JOIN member_photos mp ON af.photo_id = mp.id
        WHERE COALESCE(u.is_suspended,false)=false AND
 NOT EXISTS(SELECT 1 FROM friendships b WHERE b.status='blocked' AND ((b.user_id=${userId} AND b.friend_id=u.id) OR (b.friend_id=${userId} AND b.user_id=u.id))) AND
 (u.id=${userId} OR COALESCE((u.privacy_settings->>'profile_visible')::boolean,true) OR EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.user_id=${userId} AND f.friend_id=u.id) OR (f.friend_id=${userId} AND f.user_id=u.id))))
        ORDER BY af.created_at DESC
        LIMIT 50
      `;
    } else if (type === "nearby") {
      // Get activities from nearby golfers (simplified - would use location in production)
      activities = await sql`
        SELECT 
          af.*,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), 'Golfer') as user_name,
          u.profile_photo_url as user_photo,
          c.name as course_name,
          a.name as achievement_name,
          pc.review_text,
          pc.rating,
          mp.photo_url,
          (SELECT COUNT(*) FROM activity_likes WHERE activity_id = af.id) as like_count,
          (SELECT COUNT(*) FROM activity_comments WHERE activity_id = af.id) as comment_count,
          EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = af.id AND user_id = ${userId}) as user_has_liked,
          CASE 
            WHEN af.created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(EPOCH FROM (NOW() - af.created_at))/60 || 'm ago'
            WHEN af.created_at > NOW() - INTERVAL '24 hours' THEN EXTRACT(EPOCH FROM (NOW() - af.created_at))/3600 || 'h ago'
            ELSE EXTRACT(EPOCH FROM (NOW() - af.created_at))/86400 || 'd ago'
          END as time_ago
        FROM activity_feed af
        JOIN users u ON af.user_id = u.id
        LEFT JOIN courses c ON af.course_id = c.id
        LEFT JOIN achievements a ON af.achievement_id = a.id
        LEFT JOIN played_courses pc ON af.review_id = pc.id
        LEFT JOIN member_photos mp ON af.photo_id = mp.id
        WHERE COALESCE(u.is_suspended,false)=false AND
 NOT EXISTS(SELECT 1 FROM friendships b WHERE b.status='blocked' AND ((b.user_id=${userId} AND b.friend_id=u.id) OR (b.friend_id=${userId} AND b.user_id=u.id))) AND
 (u.id=${userId} OR COALESCE((u.privacy_settings->>'profile_visible')::boolean,true) OR EXISTS(SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.user_id=${userId} AND f.friend_id=u.id) OR (f.friend_id=${userId} AND f.user_id=u.id))))
        ORDER BY af.created_at DESC
        LIMIT 50
      `;
    }

    return Response.json({ activities });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    return Response.json(
      { error: "Failed to fetch activity feed" },
      { status: 500 },
    );
  }
}
