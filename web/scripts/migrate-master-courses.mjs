/**
 * Wipe existing course data and seed from Heathland Links master XLSX workbooks.
 *
 * Usage:
 *   node scripts/migrate-master-courses.mjs --dry-run
 *   node scripts/migrate-master-courses.mjs --wipe-and-load
 *   node scripts/migrate-master-courses.mjs --resume
 *   node scripts/migrate-master-courses.mjs --rankings-only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import XLSX from "xlsx";
import {
  COUNTRY_WORKBOOKS,
  RANKINGS_WORKBOOK,
  courseMatchKeys,
  dedupeByHlCourseId,
  normalizeCourseRow,
  pickSourceSheet,
  rankingMatchKeys,
  countriesForRankingName,
  sheetToObjectsFixed,
  rankingsFromCourseRow,
} from "./lib/masterCourseNormalize.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const appsRoot = resolve(webRoot, "..");
const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 75;
const RESEARCH_BATCH = "master-gbi-rebuilt-2026";

function loadEnv() {
  for (const name of [".env", "env"]) {
    const envPath = resolve(webRoot, name);
    if (!existsSync(envPath)) continue;
    const text = readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function resolveMastersDir() {
  const candidates = [
    resolve(appsRoot, "Heathland_Links_Master_Course_Database_COMPLETE"),
    resolve(appsRoot, "..", "Heathland_Links_Master_Course_Database_COMPLETE"),
  ];
  const found = candidates.find((dir) => existsSync(dir));
  if (!found) {
    throw new Error(
      `Master course folder not found. Looked in:\n${candidates.join("\n")}`,
    );
  }
  return found;
}

function loadWorkbookSheets(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheets = {};
  for (const name of workbook.SheetNames) {
    // Header-offset sheets (Canada) are repaired via sheetToObjectsFixed.
    sheets[name] = sheetToObjectsFixed(workbook.Sheets[name]);
  }
  return sheets;
}

function collectCourses(mastersDir) {
  const perCountry = [];
  const skipped = [];
  const all = [];

  for (const source of COUNTRY_WORKBOOKS) {
    const filePath = resolve(mastersDir, source.file);
    if (!existsSync(filePath)) {
      throw new Error(`Missing workbook: ${filePath}`);
    }
    const sheets = loadWorkbookSheets(filePath);
    const picked = pickSourceSheet(sheets);
    let kept = 0;
    let coords = 0;
    for (const raw of picked.rows) {
      const row = normalizeCourseRow(raw, source.file);
      if (!row) continue;
      if (row.skipped) {
        skipped.push(row);
        continue;
      }
      all.push(row);
      kept += 1;
      if (row.latitude != null && row.longitude != null) coords += 1;
    }
    perCountry.push({
      key: source.key,
      file: source.file,
      sheet: picked.name,
      populated: kept,
      with_coords: coords,
    });
  }

  const { rows, duplicates } = dedupeByHlCourseId(all);
  return { courses: rows, perCountry, skipped, duplicates };
}

function collectRankings(mastersDir, courses) {
  const fromCourses = [];
  for (const course of courses) {
    fromCourses.push(...rankingsFromCourseRow(course));
  }

  // Optional dedicated Ranking_Memberships workbook (older GBI rebuild).
  const candidates = [
    resolve(mastersDir, RANKINGS_WORKBOOK),
    resolve(mastersDir, "..", "Heathland_Links_Master_Course_Database_COMPLETE", RANKINGS_WORKBOOK),
    resolve(appsRoot, "..", "Heathland_Links_Master_Course_Database_COMPLETE", RANKINGS_WORKBOOK),
  ];
  const rankingsPath = candidates.find((p) => existsSync(p));
  const fromWorkbook = [];
  if (rankingsPath) {
    console.log(`Also reading rankings workbook: ${rankingsPath}`);
    const sheets = loadWorkbookSheets(rankingsPath);
    const rows = sheets.Ranking_Memberships || [];
    for (const raw of rows) {
      fromWorkbook.push({
        ranking_source: String(raw.ranking_provider || "").trim() || null,
        ranking_year: raw.ranking_year
          ? Number.parseInt(raw.ranking_year, 10)
          : null,
        ranking_name: String(raw.ranking_list || "").trim(),
        position: raw.ranking_position
          ? Number.parseInt(String(raw.ranking_position).replace(/[^\d]/g, ""), 10)
          : null,
        hl_course_id: String(raw.hl_course_id || "").trim() || null,
        course_display_name: String(raw.course_display_name || "").trim(),
        verification_status:
          String(raw.verification_status || "").trim() || null,
        is_active: ["1", "true", "yes"].includes(
          String(raw.is_active ?? "1").trim().toLowerCase(),
        ),
      });
    }
  } else {
    console.warn(
      "No dedicated Ranking_Memberships workbook found; using ranking columns from country sheets only.",
    );
  }

  // Prefer workbook rows when present; always keep course-sheet rankings too,
  // then dedupe by ranking_name + position + display/hl id.
  const merged = [...fromWorkbook, ...fromCourses].filter(
    (row) => row.ranking_name && (row.course_display_name || row.hl_course_id),
  );
  const seen = new Set();
  const out = [];
  for (const row of merged) {
    const key = [
      row.ranking_name,
      row.position ?? "",
      row.hl_course_id || "",
      row.course_display_name || "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function buildCourseIndex(courses) {
  const byKey = new Map();
  for (const course of courses) {
    for (const key of courseMatchKeys(course)) {
      const list = byKey.get(key) || [];
      list.push(course);
      byKey.set(key, list);
    }
  }
  return byKey;
}

function uniqueCourses(hits) {
  return [...new Map(hits.map((c) => [c.hl_course_id || c.id, c])).values()];
}

function matchRankings(rankingRows, courses) {
  const index = buildCourseIndex(courses);
  const byHlId = new Map(
    courses
      .filter((c) => c.hl_course_id)
      .map((c) => [String(c.hl_course_id).toUpperCase(), c]),
  );
  const matched = [];
  const unmatched = [];
  const ambiguous = [];

  for (const ranking of rankingRows) {
    const allowed = countriesForRankingName(ranking.ranking_name);

    // Fast path: direct hl_course_id (works for enriched sheet rankings).
    if (ranking.hl_course_id) {
      const hit = byHlId.get(String(ranking.hl_course_id).toUpperCase());
      if (hit && (!allowed || allowed.includes(hit.country))) {
        matched.push({ ranking, course: hit });
        continue;
      }
    }

    let unique = [];

    for (const key of rankingMatchKeys(ranking.course_display_name)) {
      let hits = uniqueCourses(index.get(key) || []);
      if (allowed) hits = hits.filter((c) => allowed.includes(c.country));
      if (hits.length === 1) {
        unique = hits;
        break;
      }
      if (hits.length > 1 && unique.length === 0) {
        unique = hits;
      }
    }

    if (unique.length > 1) {
      const exact = unique.filter((c) => {
        const display = (c.display_name || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        const target = ranking.course_display_name.toLowerCase();
        return display === target || name === target;
      });
      if (exact.length === 1) unique = exact;
    }

    if (unique.length === 1) {
      matched.push({ ranking, course: unique[0] });
    } else if (unique.length > 1) {
      ambiguous.push({
        ...ranking,
        candidates: unique.map((c) => ({
          hl_course_id: c.hl_course_id,
          name: c.name,
          club_name: c.club_name,
          country: c.country,
        })),
      });
    } else {
      unmatched.push(ranking);
    }
  }

  return { matched, unmatched, ambiguous };
}

async function ensureSchema(sql) {
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS display_name TEXT`;
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS hl_course_id TEXT`;
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS hl_club_id TEXT`;
  await sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS region TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS courses_hl_course_id_key ON courses (hl_course_id)`;
}

async function trySql(label, fn) {
  try {
    await fn();
  } catch (err) {
    const msg = String(err?.message || err);
    if (/does not exist|undefined_table|undefined_column/i.test(msg)) {
      console.warn(`Skipping ${label}: ${msg}`);
      return;
    }
    throw err;
  }
}

async function wipeCourseData(sql) {
  await trySql("users.home_club_id", () =>
    sql`UPDATE users SET home_club_id = NULL WHERE home_club_id IS NOT NULL`,
  );
  await trySql("user_club_memberships.club_id", () =>
    sql`UPDATE user_club_memberships SET club_id = NULL WHERE club_id IS NOT NULL`,
  );
  await trySql("course_photo_likes", () => sql`DELETE FROM course_photo_likes`);
  await trySql("course_photo_reports", () => sql`DELETE FROM course_photo_reports`);
  await trySql("course_photos", () => sql`DELETE FROM course_photos`);
  await trySql("activity_feed refs", () =>
    sql`UPDATE activity_feed SET photo_id = NULL, review_id = NULL, course_id = NULL`,
  );
  await trySql("member_photos", () => sql`DELETE FROM member_photos`);
  await trySql("follows courses", () =>
    sql`DELETE FROM follows WHERE followee_type = 'course'`,
  );
  await trySql("feed_posts.course_id", () =>
    sql`UPDATE feed_posts SET course_id = NULL WHERE course_id IS NOT NULL`,
  );
  await trySql("community_posts.course_id", () =>
    sql`UPDATE community_posts SET course_id = NULL WHERE course_id IS NOT NULL`,
  );
  await trySql("played_courses", () => sql`DELETE FROM played_courses`);
  await trySql("wishlist", () => sql`DELETE FROM wishlist`);
  await trySql("rankings", () => sql`DELETE FROM rankings`);
  await sql`DELETE FROM courses`;
  await trySql("courses_id_seq", () =>
    sql`ALTER SEQUENCE courses_id_seq RESTART WITH 1`,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err) {
  const msg = String(err?.message || err);
  const cause = String(
    err?.sourceError?.cause?.code || err?.cause?.code || "",
  );
  return /fetch failed|timeout|UND_ERR|ECONNRESET|ETIMEDOUT|503|429|network/i.test(
    `${msg} ${cause}`,
  );
}

async function withRetry(label, fn) {
  const delays = [1000, 2500, 5000, 10000, 20000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || attempt >= delays.length) throw err;
      const wait = delays[attempt];
      console.warn(
        `\n${label} failed (${err.message}). Retry ${attempt + 1}/${delays.length} in ${wait}ms`,
      );
      await sleep(wait);
    }
  }
}

async function insertRows(sql, table, columns, rows, { onConflict } = {}) {
  if (!rows.length) return;
  const colList = columns.join(", ");
  const conflictSql = onConflict ? ` ${onConflict}` : "";
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const placeholders = batch
      .map((_, rowIdx) => {
        const base = rowIdx * columns.length;
        return `(${columns.map((_, colIdx) => `$${base + colIdx + 1}`).join(",")})`;
      })
      .join(",");
    const values = batch.flatMap((row) =>
      columns.map((col) => {
        const value = row[col];
        if (value === undefined) return null;
        if (col === "mvp_missing_fields" && value != null) {
          return JSON.stringify(value);
        }
        return value;
      }),
    );
    await withRetry(`${table} batch ${i / BATCH_SIZE + 1}`, () =>
      sql(
        `INSERT INTO ${table} (${colList}) VALUES ${placeholders}${conflictSql}`,
        values,
      ),
    );
    if (i + BATCH_SIZE < rows.length) await sleep(BATCH_PAUSE_MS);
  }
}

async function insertCourses(sql, courses) {
  const columns = [
    "name",
    "club_name",
    "display_name",
    "hl_course_id",
    "hl_club_id",
    "city",
    "county",
    "region",
    "country",
    "latitude",
    "longitude",
    "course_type",
    "holes",
    "par",
    "website",
    "course_status",
    "mvp_data_status",
    "mvp_missing_fields",
  ];

  const rows = courses.map((row) => ({
    name: row.name,
    club_name: row.club_name,
    display_name: row.display_name,
    hl_course_id: row.hl_course_id,
    hl_club_id: row.hl_club_id,
    city: row.city,
    county: row.county,
    region: row.region,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    course_type: row.course_type,
    holes: row.holes,
    par: row.par,
    website: row.website,
    course_status: row.course_status,
    mvp_data_status: row.mvp_data_status,
    mvp_missing_fields: row.mvp_missing_fields,
  }));

  const existing = await withRetry("load existing hl_course_id", () =>
    sql`SELECT hl_course_id FROM courses WHERE hl_course_id IS NOT NULL`,
  );
  const have = new Set(existing.map((row) => row.hl_course_id));
  const remaining = rows.filter((row) => !have.has(row.hl_course_id));
  console.log(
    `Skipping ${rows.length - remaining.length} already loaded; inserting ${remaining.length}`,
  );

  let inserted = 0;
  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    await insertRows(sql, "courses", columns, batch, {
      onConflict: "ON CONFLICT (hl_course_id) DO NOTHING",
    });
    inserted += batch.length;
    process.stdout.write(
      `\rInserted courses ${inserted}/${remaining.length} (${have.size + inserted} total)`,
    );
  }
  process.stdout.write("\n");
}

async function insertRankings(sql, matched) {
  const columns = [
    "course_id",
    "ranking_name",
    "ranking_source",
    "ranking_year",
    "position",
    "ranking_region",
    "verification_status",
    "source_url",
    "research_batch",
    "is_active",
  ];
  const rows = matched.map(({ ranking, course }) => ({
    course_id: course.id,
    ranking_name: ranking.ranking_name,
    ranking_source: ranking.ranking_source,
    ranking_year: Number.isFinite(ranking.ranking_year)
      ? ranking.ranking_year
      : null,
    position: Number.isFinite(ranking.position) ? ranking.position : null,
    ranking_region: null,
    verification_status: ranking.verification_status,
    source_url: null,
    research_batch: RESEARCH_BATCH,
    is_active: ranking.is_active,
  }));
  await insertRows(sql, "rankings", columns, rows);
  return rows.length;
}

function writeReport(report) {
  const outDir = resolve(__dirname, "output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "migration-report.json"),
    JSON.stringify(report, null, 2),
  );
  const unmatchedLines = [
    "ranking_name,position,course_display_name,hl_course_id,verification_status",
    ...(report.rankings.unmatched || []).map((row) =>
      [
        csv(row.ranking_name),
        row.position ?? "",
        csv(row.course_display_name),
        csv(row.hl_course_id),
        csv(row.verification_status),
      ].join(","),
    ),
  ];
  writeFileSync(
    resolve(outDir, "unmatched-rankings.csv"),
    unmatchedLines.join("\n"),
  );
}

function csv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseFlags(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    wipeAndLoad: argv.includes("--wipe-and-load"),
    resume: argv.includes("--resume"),
    rankingsOnly: argv.includes("--rankings-only"),
  };
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (
    !flags.dryRun &&
    !flags.wipeAndLoad &&
    !flags.resume &&
    !flags.rankingsOnly
  ) {
    console.error(
      "Specify --dry-run, --wipe-and-load, --resume, or --rankings-only",
    );
    process.exit(1);
  }

  loadEnv();
  if (!flags.dryRun && !process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in web/.env");
    process.exit(1);
  }

  const mastersDir = resolveMastersDir();
  console.log(`Reading masters from ${mastersDir}`);

  const collected = collectCourses(mastersDir);
  const rankingRows = collectRankings(mastersDir, collected.courses);
  const rankingPreview = matchRankings(rankingRows, collected.courses);

  const byCountry = {};
  for (const row of collected.courses) {
    byCountry[row.country || "(none)"] =
      (byCountry[row.country || "(none)"] || 0) + 1;
  }

  const report = {
    generated_at: new Date().toISOString(),
    mode: flags.wipeAndLoad
      ? "wipe-and-load"
      : flags.resume
        ? "resume"
        : flags.rankingsOnly
          ? "rankings-only"
          : "dry-run",
    masters_dir: mastersDir,
    per_workbook: collected.perCountry,
    courses: {
      total: collected.courses.length,
      skipped_missing_name: collected.skipped.length,
      duplicate_hl_course_ids: collected.duplicates.length,
      with_coords: collected.courses.filter(
        (c) => c.latitude != null && c.longitude != null,
      ).length,
      by_country: byCountry,
    },
    rankings: {
      source_rows: rankingRows.length,
      matched: rankingPreview.matched.length,
      unmatched: rankingPreview.unmatched,
      ambiguous: rankingPreview.ambiguous,
    },
  };

  console.log(
    `Courses: ${collected.courses.length} | coords: ${report.courses.with_coords} | skipped names: ${collected.skipped.length} | dup IDs: ${collected.duplicates.length}`,
  );
  console.log(
    `Rankings: ${rankingRows.length} source | ${rankingPreview.matched.length} matched | ${rankingPreview.unmatched.length} unmatched | ${rankingPreview.ambiguous.length} ambiguous`,
  );
  console.log("By country:", byCountry);

  if (flags.dryRun) {
    writeReport(report);
    console.log("Dry run complete. Report written to scripts/output/");
    return;
  }

  const sql = neon(process.env.DATABASE_URL, {
    fetchConnectionCache: true,
  });
  await ensureSchema(sql);

  if (flags.wipeAndLoad) {
    console.log("Wiping course-related tables...");
    await wipeCourseData(sql);
  }

  if (flags.wipeAndLoad || flags.resume) {
    console.log("Inserting courses...");
    await insertCourses(sql, collected.courses);
  }

  const dbCourses = await sql`
    SELECT id, name, club_name, display_name, hl_course_id, country
    FROM courses
  `;
  const { matched, unmatched, ambiguous } = matchRankings(
    rankingRows,
    dbCourses,
  );

  if (flags.rankingsOnly || flags.resume || flags.wipeAndLoad) {
    await sql`DELETE FROM rankings WHERE research_batch = ${RESEARCH_BATCH}`;
  }

  console.log("Inserting rankings...");
  const insertedRankings = await insertRankings(sql, matched);

  report.rankings = {
    source_rows: rankingRows.length,
    matched: matched.length,
    inserted: insertedRankings,
    unmatched,
    ambiguous,
  };
  writeReport(report);

  const courseCount = await sql`SELECT COUNT(*)::int AS count FROM courses`;
  const rankingCount = await sql`SELECT COUNT(*)::int AS count FROM rankings`;
  console.log(
    `Done. courses=${courseCount[0].count} rankings=${rankingCount[0].count}`,
  );
  console.log("Report written to scripts/output/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
