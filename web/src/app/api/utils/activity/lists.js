import {
  invalid,
  positiveId,
  scoreReview,
  LIST_CATEGORIES,
  photoUrls,
} from "./validation";
export function listService(sql) {
  async function collections(userId = null) {
    return sql(
      `SELECT l.*,
   (SELECT COUNT(*)::int FROM curated_list_courses WHERE list_id=l.id AND counts_for_completion) AS total,
   (SELECT COUNT(*)::int FROM curated_list_courses lc JOIN played_courses pc ON pc.course_id=lc.course_id AND pc.user_id=$1 WHERE lc.list_id=l.id AND lc.counts_for_completion) AS played,
   (SELECT AVG(rating) FROM list_reviews WHERE list_id=l.id) AS rating,
   (SELECT COUNT(DISTINCT pc.user_id)::int FROM curated_list_courses lc JOIN played_courses pc ON pc.course_id=lc.course_id WHERE lc.list_id=l.id AND lc.counts_for_completion) AS started,
   (SELECT COUNT(*)::int FROM (SELECT pc.user_id FROM curated_list_courses lc JOIN played_courses pc ON pc.course_id=lc.course_id
     WHERE lc.list_id=l.id AND lc.counts_for_completion GROUP BY pc.user_id
     HAVING COUNT(*)=(SELECT COUNT(*) FROM curated_list_courses WHERE list_id=l.id AND counts_for_completion)) complete) AS completed
   FROM curated_lists l WHERE l.is_published ORDER BY l.display_order,l.id`,
      [userId],
    );
  }
  async function detail(userId, id) {
    id = positiveId(id);
    const rows = await sql(
      "SELECT * FROM curated_lists WHERE id=$1 AND is_published",
      [id],
    );
    if (!rows.length) throw invalid("List not found", 404);
    const courses = await sql(
      `SELECT c.*,lc.id AS entry_id,lc.position,lc.entry_key,lc.display_name AS entry_display_name,
   lc.counts_for_completion,lc.source_metadata,p.id IS NOT NULL AS user_played,
   w.id IS NOT NULL AND p.id IS NULL AS user_wishlisted FROM curated_list_courses lc LEFT JOIN courses c ON c.id=lc.course_id
   LEFT JOIN played_courses p ON p.course_id=lc.course_id AND p.user_id=$2
   LEFT JOIN wishlist w ON w.course_id=lc.course_id AND w.user_id=$2 WHERE lc.list_id=$1 ORDER BY lc.position`,
      [id, userId],
    );
    const reviews = await sql(
      `SELECT r.*,COALESCE(NULLIF(TRIM(CONCAT_WS(' ',u.first_name,u.last_name)),''),'Golfer') AS name,
   u.profile_photo_url AS avatar FROM list_reviews r JOIN users u ON u.id=r.user_id WHERE r.list_id=$1 AND NOT COALESCE(u.is_suspended,false)
   AND NOT EXISTS(SELECT 1 FROM friendships WHERE status='blocked' AND ((user_id=$2 AND friend_id=r.user_id) OR (friend_id=$2 AND user_id=r.user_id)))
   ORDER BY r.created_at DESC,r.id DESC LIMIT 100`,
      [id, userId],
    );
    const [aggregate] = await sql(
      "SELECT AVG(rating) AS rating,COUNT(*)::int AS count FROM list_reviews WHERE list_id=$1",
      [id],
    );
    const eligible = courses.filter((c) => c.counts_for_completion),
      completed = eligible.length > 0 && eligible.every((c) => c.user_played);
    const summary = (await collections(userId)).find((l) => l.id === id);
    return {
      list: {
        ...rows[0],
        started: summary.started,
        completed: summary.completed,
      },
      courses,
      reviews,
      rating: aggregate.rating,
      reviewCount: aggregate.count,
      completed,
      total: eligible.length,
      played: eligible.filter((c) => c.user_played).length,
      canReview:
        !!userId &&
        completed &&
        !(
          await sql(
            "SELECT id FROM list_reviews WHERE list_id=$1 AND user_id=$2",
            [id, userId],
          )
        ).length,
    };
  }
  async function save(userId, id, body) {
    const title = typeof body.title === "string" ? body.title.trim() : "",
      description = body.description ?? "";
    if (
      !title ||
      title.length > 160 ||
      typeof description !== "string" ||
      description.length > 20000
    )
      throw invalid("Provide a title and description within the limits");
    if (!Array.isArray(body.courseIds) || body.courseIds.length > 1000)
      throw invalid("Choose up to 1,000 courses");
    const ids = body.courseIds.map(positiveId);
    if (new Set(ids).size !== ids.length)
      throw invalid("Courses must be unique");
    if (
      typeof body.isPublished !== "boolean" ||
      (body.isPublished && !ids.length)
    )
      throw invalid("Published lists must contain courses");
    const order = body.displayOrder ?? 0;
    if (!Number.isInteger(order) || Math.abs(order) > 100000)
      throw invalid("Invalid display order");
    if (id) id = positiveId(id);
    const existing = id
      ? await sql(
          "SELECT * FROM curated_list_courses WHERE list_id=$1 ORDER BY position",
          [id],
        )
      : [];
    const entries = ids.map((courseId, i) => {
      const prior = existing.find((e) => e.course_id === courseId);
      return {
        course_id: courseId,
        position: i + 1,
        entry_key: prior?.entry_key || `course-${courseId}`,
        display_name: prior?.display_name || null,
        counts_for_completion: true,
        source_metadata: prior?.source_metadata || {},
      };
    });
    for (const history of existing.filter((e) => !e.counts_for_completion))
      entries.push({ ...history, position: entries.length + 1 });
    if (!id)
      id = Number(
        (
          await sql(
            "SELECT nextval(pg_get_serial_sequence('curated_lists','id')) AS id",
          )
        )[0].id,
      );
    const results = await sql.transaction([
      sql("SELECT pg_advisory_xact_lock(-2,$1::int)", [id]),
      sql(
        `INSERT INTO curated_lists(id,title,description,is_published,display_order,created_by) VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,is_published=EXCLUDED.is_published,display_order=EXCLUDED.display_order,updated_at=NOW() RETURNING *`,
        [id, title, description, body.isPublished, order, userId],
      ),
      sql("DELETE FROM curated_list_courses WHERE list_id=$1", [id]),
      sql(
        `INSERT INTO curated_list_courses(list_id,course_id,position,entry_key,display_name,counts_for_completion,source_metadata)
    SELECT $1,course_id,position,entry_key,display_name,counts_for_completion,source_metadata FROM jsonb_to_recordset($2::jsonb)
    AS x(course_id int,position int,entry_key text,display_name text,counts_for_completion boolean,source_metadata jsonb)`,
        [id, JSON.stringify(entries)],
      ),
    ]);
    return results[1][0];
  }
  async function review(userId, id, body) {
    id = positiveId(id);
    const rating = scoreReview(body.scores, LIST_CATEGORIES),
      photos = photoUrls(body.photos),
      text = body.reviewText ?? "";
    if (typeof text !== "string" || text.length > 10000)
      throw invalid("Review must be at most 10,000 characters");
    if (photos.length && body.termsAccepted !== true)
      throw invalid("Photo permission confirmation is required");
    const results = await sql.transaction([
      sql("SELECT pg_advisory_xact_lock(-2,$1::int)", [id]),
      sql(
        `INSERT INTO list_reviews(list_id,user_id,scores,rating,review_text,photos)
    SELECT $1,$2,$3::jsonb,$4,$5,$6::jsonb FROM curated_lists l WHERE l.id=$1 AND l.is_published
    AND EXISTS(SELECT 1 FROM curated_list_courses WHERE list_id=l.id AND counts_for_completion)
    AND NOT EXISTS(SELECT 1 FROM curated_list_courses lc WHERE lc.list_id=l.id AND lc.counts_for_completion AND NOT EXISTS
     (SELECT 1 FROM played_courses p WHERE p.user_id=$2 AND p.course_id=lc.course_id))
    ON CONFLICT(user_id,list_id) DO NOTHING RETURNING *`,
        [
          id,
          userId,
          JSON.stringify(body.scores),
          rating,
          text.trim(),
          JSON.stringify(photos),
        ],
      ),
    ]);
    if (results[1].length) return results[1][0];
    const previous = await sql(
      "SELECT * FROM list_reviews WHERE list_id=$1 AND user_id=$2",
      [id, userId],
    );
    if (
      previous.length &&
      LIST_CATEGORIES.every(
        (c) => previous[0].scores[c.key] === body.scores[c.key],
      ) &&
      previous[0].review_text === text.trim() &&
      JSON.stringify(previous[0].photos) === JSON.stringify(photos)
    )
      return previous[0];
    throw invalid(
      previous.length
        ? "You have already reviewed this list"
        : "Complete every course in the published list before reviewing it",
      409,
    );
  }
  return { collections, detail, save, review };
}
