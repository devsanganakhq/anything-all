// These exercise the real PostgreSQL schema and mutation SQL, not string assertions.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, test, expect } from "vitest";
import { activityService } from "../service";
import { scoreReview, activityInput, COURSE_CATEGORIES } from "../validation";
let db, service;
const scores = Object.fromEntries(COURSE_CATEGORIES.map((c) => [c.key, 8]));
const input = (id, extra = {}) => ({
  courseId: 1,
  datePlayed: "2026-01-10",
  reviewText: "Good course",
  scores,
  feeBand: "£150–£250",
  requestId: id,
  ...extra,
});
beforeAll(async () => {
  db = new PGlite();
  // gen_random_uuid is built in; no pgcrypto functions are used by this schema.
  await db.exec(
    readFileSync("schema.sql", "utf8").replace(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
      "",
    ),
  );
  await db.exec(
    "INSERT INTO users(id,email,password,first_name) VALUES(1,'one@example.test','x','One'),(2,'two@example.test','x','Two'),(3,'three@example.test','x','Three'); INSERT INTO courses(id,name,country) VALUES(1,'Course One','England'),(2,'Course Two','UAE'); INSERT INTO played_courses(user_id,course_id,date_played,rating,review_text) VALUES(1,2,'2025-01-01',4,'Legacy review');",
  );
  await db.exec(readFileSync("migrations/20261017_activity.sql", "utf8"));
  const sql = (text, params = []) => ({
    text,
    params,
    then(resolve, reject) {
      return db
        .query(text, params)
        .then((r) => r.rows)
        .then(resolve, reject);
    },
  });
  sql.transaction = async (queries) =>
    db.transaction(async (tx) => {
      const results = [];
      for (const q of queries)
        results.push((await tx.query(q.text, q.params)).rows);
      return results;
    });
  service = activityService(sql);
}, 30000);
afterAll(async () => db?.close());
test("migration can run twice without duplicating historical rounds/reviews", async () => {
  await db.exec(readFileSync("migrations/20261017_activity.sql", "utf8"));
  expect(
    (await db.query("SELECT COUNT(*)::int n FROM course_rounds")).rows[0].n,
  ).toBe(1);
  expect(
    (await db.query("SELECT rating,scores FROM course_reviews")).rows[0],
  ).toMatchObject({ rating: "4.00", scores: null });
});
test("category scoring preserves decimals and rejects missing/fractional inputs", () => {
  expect(scoreReview({ ...scores, overall: 10 })).toBe(4.2);
  expect(() => scoreReview({ ...scores, overall: 1.5 })).toThrow();
  expect(() => scoreReview({ clubhouse: 8 })).toThrow();
  expect(() =>
    activityInput(
      input("bad-four-photos", {
        photos: [
          "https://a.test/1",
          "https://a.test/2",
          "https://a.test/3",
          "https://a.test/4",
        ],
      }),
      "review",
    ),
  ).toThrow();
});
test("new review marks unique course once and blocks another within thirty days", async () => {
  const row = await service.create(1, "review", input("review-00000001"));
  expect(Number(row.rating)).toBe(4);
  await expect(
    service.create(1, "review", input("review-00000002")),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    (
      await db.query(
        "SELECT COUNT(*)::int n FROM played_courses WHERE user_id=1 AND course_id=1",
      )
    ).rows[0].n,
  ).toBe(1);
});
test("same request is idempotent including feed and rounds", async () => {
  const a = await service.create(
    1,
    "round",
    input("round-000000001", { scores: undefined }),
  );
  const b = await service.create(
    1,
    "round",
    input("round-000000001", { scores: undefined }),
  );
  expect(b.id).toBe(a.id);
  expect(
    (
      await db.query(
        "SELECT COUNT(*)::int n FROM feed_posts WHERE metadata->>'round_id'=$1",
        [String(a.id)],
      )
    ).rows[0].n,
  ).toBe(1);
  await service.create(
    1,
    "round",
    input("round-000000002", { scores: undefined }),
  );
  expect(
    (
      await db.query(
        "SELECT COUNT(*)::int n FROM played_courses WHERE user_id=1 AND course_id=1",
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (await db.query("SELECT played_count FROM courses WHERE id=1")).rows[0]
      .played_count,
  ).toBe(2);
});
test("edits retain review submission time and deletion recalculates timing/rankings", async () => {
  await db.exec(
    "UPDATE course_reviews SET created_at=NOW()-INTERVAL '40 days' WHERE user_id=1 AND course_id=1",
  );
  const previous = (
    await db.query(
      "SELECT * FROM course_reviews WHERE user_id=1 AND course_id=1",
    )
  ).rows[0];
  const current = await service.create(
    1,
    "review",
    input("review-00000003", { scores: { ...scores, overall: 10 } }),
  );
  const edited = await service.edit(
    1,
    "review",
    current.id,
    input(null, { reviewText: "Corrected spelling" }),
  );
  expect(new Date(edited.created_at).getTime()).toBe(
    new Date(current.created_at).getTime(),
  );
  await service.deleteReview(1, current.id);
  expect(
    Number(
      (await db.query("SELECT community_rating FROM courses WHERE id=1"))
        .rows[0].community_rating,
    ),
  ).toBe(4);
  await expect(
    service.create(1, "review", input("review-00000004")),
  ).resolves.toBeTruthy();
  await expect(
    service.edit(2, "review", previous.id, input(null)),
  ).rejects.toMatchObject({ status: 404 });
});
test("favourites allow partial slots, reject duplicates and enforce played ownership", async () => {
  expect(
    await service.saveFavourites(1, [{ position: 2, courseId: 1 }]),
  ).toMatchObject([{ position: 2, id: 1 }]);
  await expect(
    service.saveFavourites(1, [
      { position: 1, courseId: 1 },
      { position: 2, courseId: 1 },
    ]),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    service.saveFavourites(2, [{ position: 1, courseId: 1 }]),
  ).rejects.toBeTruthy();
  expect(
    (
      await db.query(
        "SELECT COUNT(*)::int n FROM passport_favourites WHERE user_id=1",
      )
    ).rows[0].n,
  ).toBe(1);
});
test("private passports accessible to owner/friends, never strangers or blocked viewers", async () => {
  await db.exec(
    `UPDATE users SET privacy_settings='{"profile_visible":false}' WHERE id=1`,
  );
  expect(await service.canViewPassport(1, 1)).toBe(true);
  expect(await service.canViewPassport(2, 1)).toBe(false);
  await db.exec(
    "INSERT INTO friendships(user_id,friend_id,status) VALUES(1,2,'accepted')",
  );
  expect(await service.canViewPassport(2, 1)).toBe(true);
  await db.exec(
    "INSERT INTO friendships(user_id,friend_id,status) VALUES(1,3,'blocked')",
  );
  expect(await service.canViewPassport(3, 1)).toBe(false);
});

test("migration rerun after new activity never backfills modern courses as extra historical rounds", async () => {
  const before = (await db.query("SELECT COUNT(*)::int n FROM course_rounds"))
    .rows[0].n;
  await db.exec(readFileSync("migrations/20261017_activity.sql", "utf8"));
  expect(
    (await db.query("SELECT COUNT(*)::int n FROM course_rounds")).rows[0].n,
  ).toBe(before);
});

test("new activity still unlocks existing achievements once", async () => {
  await service.create(
    2,
    "round",
    input("achievement-0001", { courseId: 2, scores: undefined }),
  );
  await service.create(
    2,
    "round",
    input("achievement-0002", { courseId: 2, scores: undefined }),
  );
  expect(
    (
      await db.query(
        "SELECT COUNT(*)::int n FROM user_achievements WHERE user_id=2",
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await db.query(
        "SELECT COUNT(*)::int n FROM feed_posts WHERE author_id=2 AND post_type='achievement'",
      )
    ).rows[0].n,
  ).toBe(1);
});
test("reusing a saved request with changed details cannot silently overwrite or report a false success", async () => {
  await expect(
    service.create(
      1,
      "round",
      input("round-000000001", {
        reviewText: "Different comments",
        scores: undefined,
      }),
    ),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    service.create(
      1,
      "round",
      input("round-000000001", { courseId: 2, scores: undefined }),
    ),
  ).rejects.toMatchObject({ status: 409 });
});
