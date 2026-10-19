import { activityInput, invalid, positiveId } from "./validation";

// sql is injected for tests. Neon HTTP transactions execute sequential statements;
// the first advisory-lock statement serializes writes for one course.
export function activityService(sql) {
  const query = (s, p = []) => sql(s, p);
  async function canViewPassport(viewer, owner) {
    const rows = await query(
      `SELECT u.id, COALESCE((u.privacy_settings->>'profile_visible')::boolean,true) AS public,
   EXISTS(SELECT 1 FROM friendships WHERE status='accepted' AND ((user_id=$1 AND friend_id=u.id) OR (friend_id=$1 AND user_id=u.id))) AS friend,
   EXISTS(SELECT 1 FROM friendships WHERE status='blocked' AND ((user_id=$1 AND friend_id=u.id) OR (friend_id=$1 AND user_id=u.id))) AS blocked
   FROM users u WHERE u.id=$2 AND COALESCE(u.is_suspended,false)=false`,
      [viewer, owner],
    );
    return (
      !!rows.length &&
      !rows[0].blocked &&
      (viewer === owner || rows[0].public || rows[0].friend)
    );
  }
  function sync(courseId, userId) {
    return [
      sql(
        `UPDATE courses SET community_rating=(SELECT AVG(rating) FROM course_reviews WHERE course_id=$1 AND deleted_at IS NULL),
    played_count=(SELECT COUNT(*) FROM course_rounds WHERE course_id=$1) WHERE id=$1`,
        [courseId],
      ),
      sql(
        `UPDATE played_courses p SET rating=(SELECT ROUND(rating)::int FROM course_reviews WHERE user_id=$1 AND course_id=$2 AND deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1),
    review_text=(SELECT review_text FROM course_reviews WHERE user_id=$1 AND course_id=$2 AND deleted_at IS NULL ORDER BY created_at DESC,id DESC LIMIT 1)
    WHERE p.user_id=$1 AND p.course_id=$2`,
        [userId, courseId],
      ),
    ];
  }
  function sameRequest(row, input, kind) {
    return (
      !row.deleted_at &&
      row.course_id === input.courseId &&
      (row.date_played instanceof Date
        ? row.date_played.toISOString()
        : String(row.date_played)
      ).slice(0, 10) === input.date &&
      (row.review_text ?? row.comments ?? "") === input.text &&
      JSON.stringify(row.photos) === JSON.stringify(input.photos) &&
      (kind !== "review" ||
        (Number(row.rating) === input.rating &&
          (row.fee_band ?? null) === (input.feeBand ?? null) &&
          (input.scores
            ? Object.keys(input.scores).every(
                (k) => row.scores?.[k] === input.scores[k],
              )
            : row.scores == null)))
    );
  }
  async function create(userId, kind, body, options = {}) {
    const input = activityInput(body, kind, options);
    const { courseId, date, text, photos, rating, scores, feeBand, requestId } =
      input;
    const table = kind === "review" ? "course_reviews" : "course_rounds";
    // Stable ID lookup lets a client safely retry after an interrupted response.
    const previous = await query(
      `SELECT * FROM ${table} WHERE user_id=$1 AND request_id=$2`,
      [userId, requestId],
    );
    if (previous.length) {
      if (!sameRequest(previous[0], input, kind))
        throw invalid(
          "Request ID already used for a different or deleted activity",
          409,
        );
      return { ...previous[0], replayed: true };
    }
    const source =
      kind === "review"
        ? sql(
            `INSERT INTO course_reviews(user_id,course_id,date_played,review_text,rating,scores,fee_band,photos,request_id)
      SELECT $1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9 WHERE NOT EXISTS
       (SELECT 1 FROM course_reviews WHERE user_id=$1 AND course_id=$2 AND deleted_at IS NULL AND created_at > NOW()-INTERVAL '30 days')
      ON CONFLICT(user_id,request_id) DO NOTHING RETURNING *`,
            [
              userId,
              courseId,
              date,
              text,
              rating,
              JSON.stringify(scores),
              feeBand,
              JSON.stringify(photos),
              requestId,
            ],
          )
        : sql(
            `INSERT INTO course_rounds(user_id,course_id,date_played,comments,photos,request_id)
      VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(user_id,request_id) DO NOTHING RETURNING *`,
            [userId, courseId, date, text, JSON.stringify(photos), requestId],
          );
    const metadataKey = kind === "review" ? "course_review_id" : "round_id";
    const textField = kind === "review" ? "review_text" : "comments";
    let results;
    try {
      results = await sql.transaction([
        sql(
          "WITH u AS MATERIALIZED (SELECT pg_advisory_xact_lock($1::int,0)) SELECT pg_advisory_xact_lock(-1,$2::int) FROM u",
          [userId, courseId],
        ),
        source,
        sql(
          `SELECT 1 / (EXISTS(SELECT 1 FROM ${table} WHERE user_id=$1 AND request_id=$2 AND course_id=$3 AND date_played=$4::date
     AND ${textField}=$5 AND photos=$6::jsonb ${kind === "review" ? "AND rating=$7 AND scores IS NOT DISTINCT FROM $8::jsonb AND fee_band IS NOT DISTINCT FROM $9 AND deleted_at IS NULL" : ""}))::int`,
          kind === "review"
            ? [
                userId,
                requestId,
                courseId,
                date,
                text,
                JSON.stringify(photos),
                rating,
                JSON.stringify(scores),
                feeBand,
              ]
            : [userId, requestId, courseId, date, text, JSON.stringify(photos)],
        ),
        sql(
          `INSERT INTO played_courses(user_id,course_id,date_played)
    SELECT user_id,course_id,date_played FROM ${table} WHERE user_id=$1 AND request_id=$2
    ON CONFLICT(user_id,course_id) DO NOTHING`,
          [userId, requestId],
        ),
        sql(
          `DELETE FROM wishlist WHERE user_id=$1 AND course_id=$2 AND EXISTS(SELECT 1 FROM ${table} WHERE user_id=$1 AND request_id=$3)`,
          [userId, courseId, requestId],
        ),
        sql(
          `INSERT INTO feed_posts(author_id,post_type,course_id,caption,metadata)
    SELECT user_id,$3,course_id,${textField},jsonb_build_object($4::text,id,'rating',${kind === "review" ? "rating" : "NULL::numeric"},'date_played',date_played)
    FROM ${table} a WHERE user_id=$1 AND request_id=$2 AND NOT EXISTS
     (SELECT 1 FROM feed_posts f WHERE f.author_id=$1 AND f.metadata->>$4=a.id::text)
    RETURNING id`,
          [
            userId,
            requestId,
            kind === "review" ? "review" : "played_course",
            metadataKey,
          ],
        ),
        // Media is attached to this activity, never to the latest activity at the course.
        sql(
          `INSERT INTO feed_post_media(post_id,media_url,display_order)
     SELECT f.id,p.url,p.ordinality::int-1 FROM ${table} a
     JOIN feed_posts f ON f.author_id=a.user_id AND f.metadata->>$3=a.id::text
     CROSS JOIN LATERAL jsonb_array_elements_text(a.photos) WITH ORDINALITY AS p(url,ordinality)
     WHERE a.user_id=$1 AND a.request_id=$2 AND NOT EXISTS(SELECT 1 FROM feed_post_media m WHERE m.post_id=f.id AND m.display_order=p.ordinality::int-1)`,
          [userId, requestId, metadataKey],
        ),
        sql(
          `INSERT INTO course_photos(course_id,user_id,image_url,photo_type,moderation_status,terms_accepted_at,terms_version,${metadataKey})
    SELECT a.course_id,a.user_id,p.url,'community','approved',NOW(),'1.0',a.id FROM ${table} a
    CROSS JOIN LATERAL jsonb_array_elements_text(a.photos) AS p(url)
    WHERE a.user_id=$1 AND a.request_id=$2 AND NOT EXISTS(SELECT 1 FROM course_photos cp WHERE cp.${metadataKey}=a.id AND cp.image_url=p.url)`,
          [userId, requestId],
        ),
        ...sync(courseId, userId),
        sql(
          `WITH stats AS (
      SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE c.course_type='Links')::int AS links,
       COUNT(*) FILTER(WHERE c.course_type='Heathland')::int AS heathland,
       COUNT(*) FILTER(WHERE c.country='Scotland')::int AS scotland,
       COUNT(*) FILTER(WHERE c.country='Ireland')::int AS ireland
      FROM played_courses p JOIN courses c ON c.id=p.course_id WHERE p.user_id=$1
    ), unlocked AS (
      INSERT INTO user_achievements(user_id,achievement_id)
      SELECT $1,a.id FROM achievements a CROSS JOIN stats s WHERE
       (a.slug='first-tee' AND s.total>=1) OR (a.slug='course-collector' AND s.total>=10) OR
       (a.slug='fifty-club' AND s.total>=50) OR (a.slug='century-club' AND s.total>=100) OR
       (a.slug='links-explorer' AND s.links>=10) OR (a.slug='heathland-hunter' AND s.heathland>=10) OR
       (a.slug='scottish-explorer' AND s.scotland>=25) OR (a.slug='irish-explorer' AND s.ireland>=15)
      ON CONFLICT(user_id,achievement_id) DO NOTHING RETURNING achievement_id
    ) INSERT INTO feed_posts(author_id,post_type,caption,metadata)
      SELECT $1,'achievement',a.name,jsonb_build_object('achievement_name',a.name,'achievement_desc',a.description,'achievement_slug',a.slug)
      FROM unlocked x JOIN achievements a ON a.id=x.achievement_id`,
          [userId],
        ),
        sql(
          `INSERT INTO feed_posts(author_id,post_type,caption,metadata)
    SELECT $1,'milestone',n::text || ' courses played',jsonb_build_object('milestone_count',n,'count',n,'type','courses_played')
    FROM (SELECT COUNT(*)::int AS n FROM played_courses WHERE user_id=$1) s WHERE n IN(10,25,50,100,150,200,250)
    AND NOT EXISTS(SELECT 1 FROM feed_posts f WHERE f.author_id=$1 AND f.post_type='milestone' AND COALESCE(f.metadata->>'milestone_count',f.metadata->>'count')=n::text)`,
          [userId],
        ),
        sql(
          `UPDATE courses SET wishlist_count=(SELECT COUNT(*) FROM wishlist WHERE course_id=$1) WHERE id=$1`,
          [courseId],
        ),
      ]);
    } catch (error) {
      if (error.code === "22012")
        throw invalid(
          "This request was already saved with different details, or the 30-day review limit applies",
          409,
        );
      throw error;
    }
    const saved =
      results[1][0] ??
      (
        await query(
          `SELECT * FROM ${table} WHERE user_id=$1 AND request_id=$2`,
          [userId, requestId],
        )
      )[0];
    if (saved && saved.course_id !== courseId)
      throw invalid("Request ID already used for another course", 409);
    if (!saved)
      throw invalid(
        "You can review this course again 30 days after your latest remaining review",
        409,
      );
    return saved;
  }
  async function edit(userId, kind, id, body) {
    id = positiveId(id);
    const table = kind === "review" ? "course_reviews" : "course_rounds";
    const previous = (
      await query(
        `SELECT * FROM ${table} WHERE id=$1 AND user_id=$2 ${kind === "review" ? "AND deleted_at IS NULL" : ""}`,
        [id, userId],
      )
    )[0];
    if (!previous) throw invalid("Activity not found", 404);
    const input = activityInput(
      {
        datePlayed: (previous.date_played instanceof Date
          ? previous.date_played.toISOString()
          : String(previous.date_played)
        ).slice(0, 10),
        reviewText: previous.review_text ?? previous.comments,
        photos: previous.photos,
        scores: previous.scores,
        rating: Number(previous.rating),
        feeBand: previous.fee_band,
        ...body,
        courseId: previous.course_id,
      },
      kind,
      { edit: true, legacy: previous.scores == null },
    );
    const { courseId, date, text, rating, scores, feeBand } = input;
    // Photo replacement during editing is pending clarification: permit retaining/removing only.
    const photos = input.photos;
    const existingUrls = [
      ...previous.photos,
      ...(
        await query(
          `SELECT image_url FROM course_photos WHERE ${kind === "review" ? "course_review_id" : "round_id"}=$1 AND deleted_at IS NULL`,
          [id],
        )
      ).map((p) => p.image_url),
    ];
    if (photos.some((url) => !existingUrls.includes(url)))
      throw invalid(
        "You can remove photos from saved activities. Add new photos when recording a new activity.",
      );
    const key = kind === "review" ? "course_review_id" : "round_id";
    const results = await sql.transaction([
      sql("SELECT pg_advisory_xact_lock(-1,$1::int)", [courseId]),
      kind === "review"
        ? sql(
            `UPDATE course_reviews SET date_played=$3,review_text=$4,rating=$5,scores=$6::jsonb,fee_band=$7,photos=$8::jsonb,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL RETURNING *`,
            [
              id,
              userId,
              date,
              text,
              rating,
              JSON.stringify(scores),
              feeBand,
              JSON.stringify(photos),
            ],
          )
        : sql(
            `UPDATE course_rounds SET date_played=$3,comments=$4,photos=$5::jsonb,updated_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *`,
            [id, userId, date, text, JSON.stringify(photos)],
          ),
      // Legacy review/round photos can share a gallery record. Detach this activity
      // without removing the other activity's contribution or older extra attachments.
      sql(
        `UPDATE course_photos SET ${key}=NULL WHERE ${key}=$1 AND user_id=$2
    AND ${kind === "review" ? "round_id" : "course_review_id"} IS NOT NULL
    AND image_url=ANY($4::text[]) AND NOT(image_url=ANY($3::text[]))`,
        [id, userId, photos, previous.photos],
      ),
      sql(
        `UPDATE course_photos SET deleted_at=NOW() WHERE ${key}=$1 AND user_id=$2
    AND image_url=ANY($4::text[]) AND NOT(image_url=ANY($3::text[]))`,
        [id, userId, photos, previous.photos],
      ),
      sql(
        `UPDATE feed_posts SET caption=$3,metadata=metadata || jsonb_build_object('rating',$4::numeric,'date_played',$5::text),updated_at=NOW()
    WHERE author_id=$1 AND metadata->>$6=$2::text`,
        [userId, id, text, rating, date, key],
      ),
      sql(
        `DELETE FROM feed_post_media WHERE post_id IN(SELECT id FROM feed_posts WHERE author_id=$1 AND metadata->>$3=$2::text)`,
        [userId, id, key],
      ),
      sql(
        `INSERT INTO feed_post_media(post_id,media_url,display_order) SELECT f.id,p.url,p.ordinality::int-1
    FROM feed_posts f CROSS JOIN jsonb_array_elements_text($4::jsonb) WITH ORDINALITY AS p(url,ordinality)
    WHERE f.author_id=$1 AND f.metadata->>$3=$2::text`,
        [userId, id, key, JSON.stringify(photos)],
      ),
      ...sync(courseId, userId),
    ]);
    return results[1][0];
  }
  async function deleteReview(userId, id) {
    id = positiveId(id);
    const row = (
      await query(
        "SELECT course_id FROM course_reviews WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL",
        [id, userId],
      )
    )[0];
    if (!row) throw invalid("Review not found", 404);
    await sql.transaction([
      sql("SELECT pg_advisory_xact_lock(-1,$1::int)", [row.course_id]),
      sql(
        "UPDATE course_reviews SET deleted_at=NOW() WHERE id=$1 AND user_id=$2",
        [id, userId],
      ),
      sql(
        "DELETE FROM feed_posts WHERE author_id=$1 AND metadata->>'course_review_id'=$2::text",
        [userId, id],
      ),
      sql(
        "UPDATE course_photos SET deleted_at=NOW() WHERE course_review_id=$1 AND user_id=$2 AND round_id IS NULL",
        [id, userId],
      ),
      ...sync(row.course_id, userId),
    ]);
  }
  async function favourites(viewer, owner) {
    if (!(await canViewPassport(viewer, owner)))
      throw invalid("Passport is private", 403);
    return query(
      `SELECT f.position,c.id,c.name,c.club_name,c.country FROM passport_favourites f JOIN courses c ON c.id=f.course_id WHERE f.user_id=$1 ORDER BY f.position`,
      [owner],
    );
  }
  async function saveFavourites(userId, items) {
    if (!Array.isArray(items) || items.length > 3)
      throw invalid("Choose up to three favourites");
    const clean = items.map((i) => ({
      position: positiveId(i.position),
      course_id: positiveId(i.courseId),
    }));
    if (
      clean.some((i) => i.position > 3) ||
      new Set(clean.map((i) => i.position)).size !== clean.length ||
      new Set(clean.map((i) => i.course_id)).size !== clean.length
    )
      throw invalid("Each position and course must be unique");
    await sql.transaction([
      sql("SELECT pg_advisory_xact_lock($1::int,0)", [userId]),
      sql("DELETE FROM passport_favourites WHERE user_id=$1", [userId]),
      sql(
        `INSERT INTO passport_favourites(user_id,position,course_id) SELECT $1,i.position,i.course_id FROM jsonb_to_recordset($2::jsonb) AS i(position smallint,course_id int)`,
        [userId, JSON.stringify(clean)],
      ),
    ]);
    return favourites(userId, userId);
  }
  return {
    create,
    edit,
    deleteReview,
    canViewPassport,
    favourites,
    saveFavourites,
  };
}
