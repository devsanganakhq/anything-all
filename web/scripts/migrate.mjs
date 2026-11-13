#!/usr/bin/env node
// Applies web/migrations/*.sql in filename order, once each, recording them in
// app_schema_migrations. Replaces hand-run SQL and request-time schema changes.
//
//   DATABASE_URL=... node scripts/migrate.mjs            # dry run: list pending
//   DATABASE_URL=... node scripts/migrate.mjs --apply    # apply pending
//
// Safety: prints the target host (never credentials); refuses a host listed in
// PRODUCTION_DB_HOSTS unless --production is also passed. Take a Neon backup
// branch before applying to production.
//
// Files run as written: transactional migrations carry their own BEGIN/COMMIT.
// A file whose first line is "-- migrate:no-transaction" (e.g. CREATE INDEX
// CONCURRENTLY) runs statement by statement outside a transaction.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { NO_TRANSACTION, splitStatements } from "./migrationSql.mjs";

neonConfig.webSocketConstructor = ws;
const args = new Set(process.argv.slice(2));
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const host = new URL(url).hostname;
const protectedHosts = (process.env.PRODUCTION_DB_HOSTS || "")
  .split(",").map((h) => h.trim()).filter(Boolean);
console.log(`target database host: ${host}`);
if (protectedHosts.some((h) => host.includes(h)) && !args.has("--production"))
  throw new Error("Target is a production host; pass --production to confirm");

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query(
    "CREATE TABLE IF NOT EXISTS app_schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  const done = new Set((await client.query("SELECT version FROM app_schema_migrations")).rows.map((r) => r.version));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const pending = files.filter((f) => !done.has(f.replace(/\.sql$/, "")));
  console.log(pending.length ? `pending: ${pending.join(", ")}` : "database is up to date");
  if (!args.has("--apply")) {
    if (pending.length) console.log("dry run only; pass --apply to run them");
  } else {
    for (const file of pending) {
      const text = readFileSync(join(dir, file), "utf8");
      const version = file.replace(/\.sql$/, "");
      const started = Date.now();
      if (text.startsWith(NO_TRANSACTION)) {
        for (const statement of splitStatements(text)) await client.query(statement);
      } else {
        await client.query(text);
      }
      await client.query(
        "INSERT INTO app_schema_migrations(version) VALUES($1) ON CONFLICT DO NOTHING", [version]);
      console.log(`applied ${file} in ${Date.now() - started} ms`);
    }
  }
} finally {
  client.release();
  await pool.end();
}
