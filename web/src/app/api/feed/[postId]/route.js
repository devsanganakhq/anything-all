/**
 * GET    /api/feed/:postId  — fetch a single feed post (same shape as list items)
 * DELETE /api/feed/:postId  — delete the current user's own feed post
 */
import sql from "@/app/api/utils/sql";
import { getSessionUserId } from "@/app/api/utils/getUserId";

function mapFeedPost(p) {
  let meta = p.metadata || {};
  if (typeof meta === "string") {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  let photoUrls = [];
  if (p.photo_urls) {
    try {
      photoUrls =
        typeof p.photo_urls === "string" ? JSON.parse(p.photo_urls) : p.photo_urls;
    } catch {}
  }

  return {
    ...p,
    metadata: meta,
    photo_urls: photoUrls.filter(Boolean),
    rating: p.rating
      ? parseInt(p.rating)
      : meta.rating
        ? parseInt(meta.rating)
        : null,
    review_text: p.review_text || meta.review_text || null,
    top_ranking_position: p.top_ranking_position
      ? parseInt(p.top_ranking_position)
      : null,
    author_first_name: p.author_first_name || null,
    author_home_club: p.author_home_club || null,
  };
}

export async function GET(request, { params }) {
  const userId = await getSessionUserId(request);
  const postId = parseInt(params.postId, 10);

  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    const rows = await sql(
      `SELECT
          fp.id, fp.author_id, fp.post_type, fp.course_id, fp.community_id,
          fp.club_name, fp.caption, fp.metadata, fp.is_private, fp.created_at,

          u.first_name || ' ' || u.last_name  AS author_name,
          u.first_name                         AS author_first_name,
          u.profile_photo_url                  AS author_avatar,
          u.location                           AS author_location,
          CASE WHEN COALESCE((u.privacy_settings->>'profile_visible')::boolean,true)
               THEN u.home_club_name ELSE NULL END AS author_home_club,

          c.name             AS course_name,
          c.city             AS course_city,
          c.county           AS course_county,
          c.country          AS course_country,
          c.course_image_url AS course_image_url,
          c.par              AS course_par,
          c.holes            AS course_holes,

          (SELECT r2.ranking_name FROM rankings r2 WHERE r2.course_id = fp.course_id ORDER BY r2.position ASC LIMIT 1) AS top_ranking_name,
          (SELECT r3.position    FROM rankings r3 WHERE r3.course_id = fp.course_id ORDER BY r3.position ASC LIMIT 1) AS top_ranking_position,

          cm.name AS community_name,

          pc.rating, pc.review_text, pc.date_played,

          (SELECT COUNT(*)::int FROM feed_reactions WHERE post_id = fp.id)                             AS reaction_count,
          (SELECT COUNT(*)::int FROM feed_reactions WHERE post_id = fp.id AND reaction_type='like')    AS like_count,
          (SELECT COUNT(*)::int FROM feed_reactions WHERE post_id = fp.id AND reaction_type='love')    AS love_count,
          (SELECT COUNT(*)::int FROM feed_reactions WHERE post_id = fp.id AND reaction_type='celebrate') AS celebrate_count,
          (SELECT reaction_type FROM feed_reactions WHERE post_id = fp.id AND user_id = $1 LIMIT 1)    AS user_reaction,

          (SELECT COUNT(*)::int FROM feed_comments WHERE post_id = fp.id) AS comment_count,

          COALESCE(
            (SELECT media_url FROM feed_post_media WHERE post_id = fp.id AND media_type='photo' ORDER BY display_order LIMIT 1),
            (SELECT COALESCE(cp.image_url, cp.thumbnail_url)
               FROM course_photos cp
              WHERE cp.user_id = fp.author_id
                AND cp.course_id = fp.course_id
                AND cp.moderation_status = 'approved'
                AND fp.post_type IN ('review', 'played_course', 'photos')
                AND (
                  ((fp.metadata->>'review_id') IS NOT NULL
                    AND cp.review_id = (fp.metadata->>'review_id')::int)
                  OR (fp.metadata->>'review_id') IS NULL
                )
              ORDER BY cp.uploaded_at DESC
              LIMIT 1)
          ) AS primary_photo,
          COALESCE(
            NULLIF((SELECT COUNT(*)::int FROM feed_post_media WHERE post_id = fp.id AND media_type='photo'), 0),
            (SELECT COUNT(*)::int FROM course_photos cp
              WHERE cp.user_id = fp.author_id
                AND cp.course_id = fp.course_id
                AND cp.moderation_status = 'approved'
                AND fp.post_type IN ('review', 'played_course', 'photos')
                AND (
                  ((fp.metadata->>'review_id') IS NOT NULL
                    AND cp.review_id = (fp.metadata->>'review_id')::int)
                  OR (fp.metadata->>'review_id') IS NULL
                )),
            0
          ) AS photo_count,

          COALESCE(
            (SELECT json_agg(x.media_url ORDER BY x.display_order)
             FROM (SELECT media_url, display_order FROM feed_post_media
                   WHERE post_id = fp.id AND media_type = 'photo'
                   ORDER BY display_order LIMIT 5) x),
            (SELECT json_agg(x.image_url ORDER BY x.uploaded_at DESC)
             FROM (SELECT COALESCE(cp.image_url, cp.thumbnail_url) AS image_url, cp.uploaded_at
                     FROM course_photos cp
                    WHERE cp.user_id = fp.author_id
                      AND cp.course_id = fp.course_id
                      AND cp.moderation_status = 'approved'
                      AND fp.post_type IN ('review', 'played_course', 'photos')
                      AND (
                        ((fp.metadata->>'review_id') IS NOT NULL
                          AND cp.review_id = (fp.metadata->>'review_id')::int)
                        OR (fp.metadata->>'review_id') IS NULL
                      )
                    ORDER BY cp.uploaded_at DESC
                    LIMIT 5) x)
          ) AS photo_urls,

          CASE
            WHEN fp.created_at > NOW() - INTERVAL '1 minute'  THEN 'just now'
            WHEN fp.created_at > NOW() - INTERVAL '1 hour'    THEN EXTRACT(EPOCH FROM NOW()-fp.created_at)::int/60  || 'm ago'
            WHEN fp.created_at > NOW() - INTERVAL '24 hours'  THEN EXTRACT(EPOCH FROM NOW()-fp.created_at)::int/3600 || 'h ago'
            WHEN fp.created_at > NOW() - INTERVAL '7 days'    THEN EXTRACT(EPOCH FROM NOW()-fp.created_at)::int/86400 || 'd ago'
            ELSE TO_CHAR(fp.created_at, 'DD Mon')
          END AS time_ago

        FROM feed_posts fp
        JOIN users u ON fp.author_id = u.id
        LEFT JOIN courses      c  ON fp.course_id    = c.id
        LEFT JOIN communities  cm ON fp.community_id = cm.id
        LEFT JOIN LATERAL (
          SELECT rating, review_text, date_played
          FROM played_courses
          WHERE user_id = fp.author_id AND course_id = fp.course_id
          ORDER BY date_played DESC NULLS LAST, created_at DESC
          LIMIT 1
        ) pc ON true

        WHERE fp.id = $2
          AND (fp.is_private = false OR fp.author_id = $1)
          AND fp.is_sponsored = false
          AND fp.id NOT IN (SELECT post_id FROM feed_hidden_posts WHERE user_id = $1)`,
      [userId, postId],
    );

    if (!rows.length)
      return Response.json({ error: "Post not found" }, { status: 404 });

    return Response.json({ post: mapFeedPost(rows[0]) });
  } catch (error) {
    console.error("Feed post GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const userId = await getSessionUserId(request);
  const postId = parseInt(params.postId, 10);

  if (!postId)
    return Response.json({ error: "postId required" }, { status: 400 });

  try {
    const post = await sql(
      `SELECT id, author_id FROM feed_posts WHERE id = $1`,
      [postId],
    );
    if (!post.length)
      return Response.json({ error: "Post not found" }, { status: 404 });
    if (post[0].author_id !== userId)
      return Response.json({ error: "Not authorised" }, { status: 403 });

    await sql(`DELETE FROM feed_posts WHERE id = $1`, [postId]);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
