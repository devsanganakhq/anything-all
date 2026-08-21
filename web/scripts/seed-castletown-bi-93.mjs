/**
 * Add Castletown Golf Links as Top 100 Britain & Ireland 2026 #93.
 *
 * The published list includes one Isle of Man course. It was never in the
 * country workbooks, so the collection showed 99 courses with a gap at 93.
 *
 * Usage: node scripts/seed-castletown-bi-93.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");

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

loadEnv();
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in web/.env");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const RANKING_NAME = "Top 100 Britain & Ireland";
const RANKING_YEAR = 2026;
const POSITION = 93;

const [existingCourse] = await sql`
  SELECT id, name, club_name, country
  FROM courses
  WHERE hl_course_id = 'iom-castletown-links'
     OR (
       (LOWER(COALESCE(club_name, '')) LIKE '%castletown%'
        OR LOWER(name) LIKE '%castletown%')
       AND LOWER(COALESCE(country, '')) LIKE '%isle of man%'
     )
  ORDER BY id
  LIMIT 1
`;

let courseId = existingCourse?.id;
if (!courseId) {
  const [inserted] = await sql`
    INSERT INTO courses (
      name, club_name, display_name, hl_course_id,
      city, county, country, latitude, longitude,
      course_type, holes, par, description, website,
      course_status, is_claimed
    ) VALUES (
      'Castletown Golf Links',
      'Castletown Golf Links',
      'Castletown Golf Links',
      'iom-castletown-links',
      'Derbyhaven',
      'Isle of Man',
      'Isle of Man',
      54.07042,
      -4.61912,
      'Links',
      18,
      72,
      'Championship links on the Langness Peninsula, surrounded by the Irish Sea. Old Tom Morris laid out the original course in 1892.',
      'https://castletowngolflinks.com',
      'active',
      false
    )
    RETURNING id
  `;
  courseId = inserted.id;
  console.log(`Inserted course ${courseId}`);
} else {
  console.log(`Using existing course ${courseId} (${existingCourse.club_name || existingCourse.name})`);
}

const [existingRank] = await sql`
  SELECT id, course_id, position, is_active, verification_status
  FROM rankings
  WHERE ranking_name = ${RANKING_NAME}
    AND ranking_year = ${RANKING_YEAR}
    AND (position = ${POSITION} OR course_id = ${courseId})
  ORDER BY CASE WHEN position = ${POSITION} THEN 0 ELSE 1 END, id
  LIMIT 1
`;

if (!existingRank) {
  await sql`
    INSERT INTO rankings (
      course_id, ranking_name, ranking_source, ranking_year,
      position, ranking_region, verification_status, source_url,
      research_batch, is_active
    ) VALUES (
      ${courseId},
      ${RANKING_NAME},
      'Top100GolfCourses.com',
      ${RANKING_YEAR},
      ${POSITION},
      'Britain & Ireland',
      'verified',
      'https://www.top100golfcourses.com/golf-course/castletown',
      'gbi-2026-castletown-93',
      true
    )
  `;
  console.log(`Inserted ${RANKING_NAME} #${POSITION}`);
} else {
  await sql`
    UPDATE rankings
    SET course_id = ${courseId},
        position = ${POSITION},
        ranking_source = 'Top100GolfCourses.com',
        ranking_region = 'Britain & Ireland',
        verification_status = 'verified',
        is_active = true,
        source_url = COALESCE(source_url, 'https://www.top100golfcourses.com/golf-course/castletown'),
        research_batch = COALESCE(research_batch, 'gbi-2026-castletown-93')
    WHERE id = ${existingRank.id}
  `;
  console.log(`Updated ranking ${existingRank.id} to #${POSITION} on course ${courseId}`);
}

const [count] = await sql`
  SELECT COUNT(*)::int AS n
  FROM rankings r
  JOIN courses c ON c.id = r.course_id
  WHERE r.ranking_name = ${RANKING_NAME}
    AND r.ranking_year = ${RANKING_YEAR}
    AND r.is_active = true
    AND r.verification_status IN ('verified', 'manually_verified')
`;
console.log(`Verified ${RANKING_NAME} ${RANKING_YEAR} courses: ${count.n}`);
