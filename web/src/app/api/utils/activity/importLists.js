import { invalid } from "./validation";
// Stable source keys make imports repeat-safe. No plays, rounds or reviews are created.
export async function importLists(
  sql,
  manifest,
  { apply = false, userId = null } = {},
) {
  if (!Array.isArray(manifest) || !manifest.length || manifest.length > 100)
    throw invalid("Invalid list import");
  const keys = new Set(),
    entries = [];
  for (const list of manifest) {
    if (
      !list.sourceKey ||
      keys.has(list.sourceKey) ||
      !list.title ||
      list.title.length > 160 ||
      !Array.isArray(list.entries)
    )
      throw invalid("Invalid or duplicate source list");
    keys.add(list.sourceKey);
    const entryKeys = new Set(),
      sourceIds = new Set();
    for (const e of list.entries) {
      if (
        !e.entryKey ||
        entryKeys.has(e.entryKey) ||
        !Number.isInteger(e.position) ||
        e.position < 1 ||
        typeof e.countsForCompletion !== "boolean"
      )
        throw invalid("Invalid venue entry");
      entryKeys.add(e.entryKey);
      if (e.sourceCourseId) {
        if (sourceIds.has(e.sourceCourseId))
          throw invalid("Duplicate playable course in list");
        sourceIds.add(e.sourceCourseId);
      }
      entries.push({ ...e, listKey: list.sourceKey });
    }
    if (
      list.entries.filter((e) => e.countsForCompletion).length !==
      list.expectedTotal
    )
      throw invalid("Completion target does not match the source");
  }
  const sourceIds = [
    ...new Set(entries.map((e) => e.sourceCourseId).filter(Boolean)),
  ];
  const matched = await sql(
    "SELECT id,hl_course_id,name,club_name,country,region FROM courses WHERE hl_course_id=ANY($1::text[])",
    [sourceIds],
  );
  const errors = [],
    additions = [],
    resolved = new Map();
  for (const sourceId of sourceIds) {
    const found = matched.filter((c) => c.hl_course_id === sourceId);
    if (found.length !== 1)
      errors.push({
        sourceId,
        error: found.length ? "Ambiguous source ID" : "Source ID not found",
      });
    else resolved.set(sourceId, found[0]);
  }
  for (const e of entries.filter(
    (e) => e.countsForCompletion && !e.sourceCourseId,
  )) {
    const m = e.metadata,
      aliases = [
        m.club_name,
        m.display_name,
        ...(e.entryKey === "usopen-grover-cleveland"
          ? ["Grover Cleveland Golf Course"]
          : []),
      ].filter(Boolean);
    const candidates = await sql(
      `SELECT id,hl_course_id,name,club_name,country,city,region FROM courses WHERE LOWER(country) IN ('usa','united states','united states of america')
    AND (LOWER(TRIM(name))=ANY($1::text[]) OR LOWER(TRIM(club_name))=ANY($1::text[]))`,
      [aliases.map((v) => v.trim().toLowerCase())],
    );
    if (candidates.length > 1) {
      errors.push({
        entryKey: e.entryKey,
        error: "Multiple matching course profiles; resolve the exact layout",
      });
      continue;
    }
    if (candidates.length === 1) {
      e.resolvedCourseId = candidates[0].id;
      continue;
    }
    // Only source rows that explicitly identify an active, missing profile may create one.
    if (
      ![
        "missing_from_master",
        "needs_new_profile",
        "active_missing_from_master",
      ].includes(m.profile_link_status) &&
      !String(m.import_action).toLowerCase().includes("add")
    ) {
      errors.push({
        entryKey: e.entryKey,
        error: "No verified course profile",
      });
      continue;
    }
    const sourceId = `HL-LIST-${e.entryKey.toUpperCase()}`;
    e.sourceCourseId = sourceId;
    additions.push({
      sourceId,
      name:
        e.entryKey === "usopen-grover-cleveland"
          ? "Grover Cleveland Golf Course"
          : m.course_name || m.club_name || e.displayName,
      clubName:
        e.entryKey === "usopen-grover-cleveland"
          ? "Grover Cleveland Golf Course"
          : m.club_name || e.displayName,
      displayName: e.displayName,
      country: m.country || "USA",
      region: m.state || m.region || null,
      city: m.city || null,
      website: m.official_website_url || null,
      holes: m.holes || null,
      par: m.par || null,
    });
  }
  // Do not let a matching ID in the wrong country silently link to another venue.
  for (const e of entries) {
    const c = resolved.get(e.sourceCourseId),
      country = e.metadata?.country;
    if (
      c &&
      country &&
      c.country !== country &&
      !(
        ["USA", "United States", "United States of America"].includes(
          c.country,
        ) && country === "USA"
      )
    )
      errors.push({
        entryKey: e.entryKey,
        error: "Source ID country does not match",
      });
  }
  const report = {
    lists: manifest.length,
    entries: entries.length,
    playable: entries.filter((e) => e.countsForCompletion).length,
    matched: matched.length,
    additions,
    errors,
    applied: false,
  };
  if (!apply || errors.length) return report;
  const queries = [sql("SELECT pg_advisory_xact_lock(-3,1)")];
  for (const a of additions)
    queries.push(
      sql(
        `INSERT INTO courses(hl_course_id,name,club_name,display_name,country,region,city,website,holes,par,course_status,mvp_data_status)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active','needs_review') ON CONFLICT(hl_course_id) DO NOTHING`,
        [
          a.sourceId,
          a.name,
          a.clubName,
          a.displayName,
          a.country,
          a.region,
          a.city,
          a.website,
          a.holes,
          a.par,
        ],
      ),
    );
  for (const list of manifest) {
    const listEntries = entries.filter((e) => e.listKey === list.sourceKey);
    queries.push(
      sql(
        `INSERT INTO curated_lists(source_key,title,description,display_order,is_published,created_by,source_metadata)
   VALUES($1,$2,$3,$4,true,$5,$6::jsonb) ON CONFLICT(source_key) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
   display_order=EXCLUDED.display_order,is_published=true,source_metadata=EXCLUDED.source_metadata,updated_at=NOW()`,
        [
          list.sourceKey,
          list.title,
          list.description,
          list.displayOrder,
          userId,
          JSON.stringify(list.metadata),
        ],
      ),
    );
    queries.push(
      sql(
        "DELETE FROM curated_list_courses WHERE list_id=(SELECT id FROM curated_lists WHERE source_key=$1)",
        [list.sourceKey],
      ),
    );
    queries.push(
      sql(
        `INSERT INTO curated_list_courses(list_id,course_id,position,entry_key,display_name,counts_for_completion,source_metadata)
   SELECT l.id,CASE WHEN e.counts THEN COALESCE(e.resolved,(SELECT id FROM courses WHERE hl_course_id=e.source_id)) ELSE NULL END,
    e.position,e.key,e.name,e.counts,e.metadata FROM curated_lists l CROSS JOIN jsonb_to_recordset($2::jsonb)
    AS e(key text,source_id text,resolved int,position int,name text,counts boolean,metadata jsonb) WHERE l.source_key=$1`,
        [
          list.sourceKey,
          JSON.stringify(
            listEntries.map((e) => ({
              key: e.entryKey,
              source_id: e.sourceCourseId,
              resolved: e.resolvedCourseId,
              position: e.position,
              name: e.displayName,
              counts: e.countsForCompletion,
              metadata: e.metadata,
            })),
          ),
        ],
      ),
    );
  }
  await sql.transaction(queries);
  return { ...report, applied: true };
}
