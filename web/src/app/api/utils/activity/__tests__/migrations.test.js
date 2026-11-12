// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, test } from "vitest";
import { NO_TRANSACTION, splitStatements } from "../../../../../../scripts/migrationSql.mjs";

// 20261025_missing_courses is a data migration: it aborts by design unless the
// real course records it corrects exist, so an empty schema cannot run it.
const DATA_ONLY = new Set(["20261025_missing_courses.sql"]);
const files = readdirSync("migrations")
  .filter((f) => f.endsWith(".sql") && !DATA_ONLY.has(f))
  .sort();
let db;

async function applyAll() {
  for (const file of files) {
    const text = readFileSync(`migrations/${file}`, "utf8");
    if (text.startsWith(NO_TRANSACTION)) {
      for (const statement of splitStatements(text)) await db.query(statement);
    } else {
      await db.exec(text);
    }
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync("schema.sql", "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', ""));
});
afterAll(async () => db.close());

test("every migration applies to the base schema and records itself", async () => {
  await applyAll();
  const { rows } = await db.query("SELECT version FROM app_schema_migrations ORDER BY version");
  expect(rows.map((r) => r.version)).toEqual(expect.arrayContaining(files
    .filter((f) => readFileSync(`migrations/${f}`, "utf8").includes("app_schema_migrations"))
    .map((f) => f.replace(/\.sql$/, ""))));
}, 60000);

test("migrations are safe to rerun", async () => {
  await expect(applyAll()).resolves.toBeUndefined();
}, 60000);

test("performance indexes exist and serve the normalized sign-in lookup", async () => {
  const { rows } = await db.query("SELECT indexname FROM pg_indexes WHERE schemaname='public'");
  const names = new Set(rows.map((r) => r.indexname));
  for (const name of ["friendships_friend_status", "feed_posts_author_created", "notifications_user_created",
    "activity_feed_course_created", "course_photos_course_approved", "auth_users_email_normalized"])
    expect(names.has(name), name).toBe(true);
  await db.exec("SET enable_seqscan = off");
  const plan = (await db.query("EXPLAIN SELECT id FROM auth_users WHERE lower(trim(email)) = lower(trim('a@b.c'))"))
    .rows.map((r) => Object.values(r)[0]).join("\n");
  expect(plan).toContain("auth_users_email_normalized");
});

test("splitStatements ignores comments and keeps multi-line statements whole", () => {
  expect(splitStatements(`${NO_TRANSACTION}\n-- note; with semicolon\nCREATE INDEX a ON t(x)\n  WHERE y;\nSELECT 1;`))
    .toEqual(["CREATE INDEX a ON t(x)\n  WHERE y", "SELECT 1"]);
});
