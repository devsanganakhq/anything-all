const VALID_TYPES = new Set([
  "Links",
  "Heathland",
  "Parkland",
  "Downland",
  "Moorland",
  "Desert",
  "Other",
]);

const VALID_STATUSES = new Set([
  "active",
  "temporarily_closed",
  "permanently_closed",
  "under_construction",
]);

const COUNTRY_ALIASES = {
  usa: "USA",
  us: "USA",
  "united states": "USA",
  "united states of america": "USA",
  australia: "Australia",
  england: "England",
  scotland: "Scotland",
  wales: "Wales",
  ireland: "Ireland",
  "republic of ireland": "Ireland",
  "northern ireland": "Northern Ireland",
  "new zealand": "New Zealand",
  nz: "New Zealand",
  portugal: "Portugal",
  spain: "Spain",
  turkey: "Turkey",
  canada: "Canada",
  netherlands: "Netherlands",
  holland: "Netherlands",
  uae: "UAE",
  "united arab emirates": "UAE",
  hawaii: "Hawaii",
};

const USA_STATES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

export const COUNTRY_WORKBOOKS = [
  { key: "australia", file: "australia enriched database v1.xlsx" },
  { key: "canada", file: "canada enriched database v1.xlsx" },
  { key: "england", file: "england enriched database v1.xlsx" },
  { key: "hawaii", file: "hawaii enriched database v1.xlsx" },
  { key: "ireland", file: "ROI enriched database v1.xlsx" },
  { key: "netherlands", file: "netherlands enriched database v1.xlsx" },
  { key: "new_zealand", file: "NZ enriched database v1.xlsx" },
  { key: "northern_ireland", file: "NI enriched database v1.xlsx" },
  { key: "portugal", file: "portugal enriched database v1.xlsx" },
  { key: "scotland", file: "scotland enriched database v1.xlsx" },
  { key: "spain", file: "spain enriched database v1.xlsx" },
  { key: "turkey", file: "turkey enriched database v1.xlsx" },
  { key: "uae", file: "UAE enriched database v1.xlsx" },
  {
    key: "usa",
    file: "Heathland_Links_USA_Master_Course_Database_FURTHER_ENRICHED_DEDUPED_MAP_READY_QC.xlsx",
  },
  // Filename has a known typo ("enirched")
  { key: "wales", file: "wales enirched database v1.xlsx" },
];

/** Optional dedicated rankings workbook (older GBI rebuild). */
export const RANKINGS_WORKBOOK =
  "Heathland_Links_Great_Britain_Ireland_Master_Course_Database_REBUILT.xlsx";

export const RANKINGS_WORKBOOK_CANDIDATES = [
  RANKINGS_WORKBOOK,
  // Keep looking in the parent archive folder if the enriched pack omits it.
];

function firstNonEmpty(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function parseIntOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number.parseInt(String(value).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number.parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

function normalizeCountry(value) {
  if (!value) return null;
  const alias = COUNTRY_ALIASES[String(value).trim().toLowerCase()];
  return alias || String(value).trim();
}

function normalizeStatus(value) {
  if (!value) return "active";
  const raw = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases = {
    open: "active",
    operating: "active",
    closed: "permanently_closed",
    permanentlyclosed: "permanently_closed",
    temporarilyclosed: "temporarily_closed",
    underconstruction: "under_construction",
  };
  const mapped = aliases[raw] || raw;
  return VALID_STATUSES.has(mapped) ? mapped : "active";
}

function normalizeType(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const titled = text.charAt(0).toUpperCase() + text.slice(1);
  if (VALID_TYPES.has(text)) return text;
  if (VALID_TYPES.has(titled)) return titled;
  return "Other";
}

function countryFromId(hlCourseId) {
  const id = String(hlCourseId || "").toUpperCase();
  if (id.startsWith("ENG-")) return "England";
  if (id.startsWith("SCO-")) return "Scotland";
  if (id.startsWith("WAL-")) return "Wales";
  if (id.startsWith("IRL-")) return "Ireland";
  if (id.startsWith("NIR-")) return "Northern Ireland";
  if (id.startsWith("AUS-")) return "Australia";
  if (id.startsWith("NZ-")) return "New Zealand";
  if (id.startsWith("PT-")) return "Portugal";
  if (id.startsWith("ES-")) return "Spain";
  if (id.startsWith("TR-")) return "Turkey";
  if (id.startsWith("USA-")) return "USA";
  if (id.startsWith("HI-") || id.startsWith("HAW-")) return "Hawaii";
  if (id.startsWith("CA-")) return "Canada";
  if (id.startsWith("NL-")) return "Netherlands";
  if (id.startsWith("AE-") || id.startsWith("UAE-")) return "UAE";
  return null;
}

function usaStateFromId(hlCourseId) {
  const match = String(hlCourseId || "").match(/^USA-([A-Z]{2})-/i);
  if (!match) return null;
  const abbr = match[1].toUpperCase();
  return USA_STATES[abbr] || abbr;
}

export function sheetHasPopulatedIds(rows) {
  return rows.some((row) =>
    firstNonEmpty(row, ["hl_course_id", "hl_courseid"]),
  );
}

/**
 * Some enriched workbooks (notably Canada) put a title row above the real
 * header. Rebuild objects from the row that contains hl_course_id.
 */
export function sheetToObjectsFixed(sheet) {
  if (!sheet) return [];
  const matrix = XLSXLikeHeaderMatrix(sheet);
  const headerIdx = matrix.findIndex((row) =>
    row.some((cell) => String(cell || "").trim().toLowerCase() === "hl_course_id"),
  );
  if (headerIdx === -1) {
    // Fallback: treat first row as headers (normal sheets).
    return sheetToJsonDefault(sheet);
  }
  const headers = matrix[headerIdx].map((h) => String(h || "").trim());
  const out = [];
  for (const row of matrix.slice(headerIdx + 1)) {
    if (!row.some((cell) => String(cell ?? "").trim())) continue;
    const obj = {};
    headers.forEach((header, i) => {
      if (!header) return;
      obj[header] = row[i] ?? "";
    });
    out.push(obj);
  }
  return out;
}

// Lazy require of xlsx helpers without importing at module top in case of cycles.
// Callers pass already-parsed sheets; we only need sheet_to_json behaviour.
function XLSXLikeHeaderMatrix(sheet) {
  // Dynamic import avoided — callers in migrate use xlsx; here we duplicate
  // minimal conversion via the sheet's !ref if available through global? No.
  // Instead migrate will call sheetToObjectsFixed with pre-converted matrix OR
  // we accept sheet objects and use a tiny local converter.
  return sheetToMatrix(sheet);
}

function sheetToMatrix(sheet) {
  // Use the same algorithm as SheetJS sheet_to_json({header:1})
  const ref = sheet["!ref"];
  if (!ref) return [];
  const decoded = decodeRange(ref);
  const rows = [];
  for (let R = decoded.s.r; R <= decoded.e.r; R++) {
    const row = [];
    for (let C = decoded.s.c; C <= decoded.e.c; C++) {
      const addr = encodeCell(R, C);
      const cell = sheet[addr];
      row.push(cell ? (cell.w ?? cell.v ?? "") : "");
    }
    rows.push(row);
  }
  return rows;
}

function sheetToJsonDefault(sheet) {
  const matrix = sheetToMatrix(sheet);
  if (!matrix.length) return [];
  const headers = matrix[0].map((h) => String(h || "").trim());
  return matrix.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      if (!header) return;
      obj[header] = row[i] ?? "";
    });
    return obj;
  });
}

function decodeRange(ref) {
  const [a, b] = String(ref).split(":");
  return { s: decodeCell(a), e: decodeCell(b || a) };
}

function decodeCell(addr) {
  const m = String(addr).match(/^([A-Z]+)(\d+)$/i);
  if (!m) return { c: 0, r: 0 };
  const col = m[1].toUpperCase();
  let c = 0;
  for (let i = 0; i < col.length; i++) c = c * 26 + (col.charCodeAt(i) - 64);
  return { c: c - 1, r: Number(m[2]) - 1 };
}

function encodeCell(r, c) {
  let col = "";
  let n = c + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    n = Math.floor((n - 1) / 26);
  }
  return `${col}${r + 1}`;
}

export function pickSourceSheet(workbookSheets) {
  // Prefer master sheets that already have populated IDs.
  for (const name of ["Master_Courses", "Course_Master", "Developer_Import"]) {
    const rows = workbookSheets[name] || [];
    if (sheetHasPopulatedIds(rows)) return { name, rows };
  }
  return {
    name: "Master_Courses",
    rows: workbookSheets.Master_Courses || workbookSheets.Course_Master || [],
  };
}

export function normalizeCourseRow(raw, sourceFile) {
  const hlCourseId = firstNonEmpty(raw, ["hl_course_id", "hl_courseid"]);
  if (!hlCourseId) return null;

  const clubName = firstNonEmpty(raw, ["club_name"]);
  const displayName = firstNonEmpty(raw, ["display_name"]);
  const courseName = firstNonEmpty(raw, ["course_name", "name"]);
  const name = courseName || displayName || clubName;
  if (!name) return { skipped: true, reason: "missing_name", hl_course_id: hlCourseId };

  const latitude = parseFloatOrNull(firstNonEmpty(raw, ["latitude", "lat"]));
  const longitude = parseFloatOrNull(firstNonEmpty(raw, ["longitude", "lng", "lon", "long"]));
  const missing = [];
  if (latitude == null) missing.push("latitude");
  if (longitude == null) missing.push("longitude");

  return {
    hl_course_id: hlCourseId,
    hl_club_id: firstNonEmpty(raw, ["hl_club_id", "hl_clubid"]),
    name,
    club_name: clubName,
    display_name: displayName || name,
    city: firstNonEmpty(raw, [
      "town_city",
      "city",
      "district_city",
      "municipality",
      "district",
    ]),
    county: firstNonEmpty(raw, [
      "county",
      "province",
      "autonomous_community",
      "district_region",
    ]),
    region:
      firstNonEmpty(raw, [
        "region",
        "autonomous_community",
        "district_region",
        "state",
        "province",
      ]) || usaStateFromId(hlCourseId),
    country:
      normalizeCountry(firstNonEmpty(raw, ["country"])) ||
      countryFromId(hlCourseId),
    latitude,
    longitude,
    holes: parseIntOrNull(raw.holes),
    par: parseIntOrNull(raw.par),
    website: firstNonEmpty(raw, ["official_website_url", "website"]),
    course_status: normalizeStatus(firstNonEmpty(raw, ["course_status", "status"])),
    course_type: normalizeType(firstNonEmpty(raw, ["course_type", "type"])),
    mvp_data_status: latitude != null && longitude != null ? "ready" : "needs_coords",
    mvp_missing_fields: missing,
    source_file: sourceFile,
    // Ranking fields carried for membership extraction
    ranking_provider: firstNonEmpty(raw, ["ranking_provider", "ranking_source"]),
    ranking_list: firstNonEmpty(raw, ["ranking_list", "ranking_name"]),
    ranking_year: parseIntOrNull(firstNonEmpty(raw, ["ranking_year"])),
    ranking_position_raw: firstNonEmpty(raw, ["ranking_position"]),
    verification_status: firstNonEmpty(raw, ["verification_status"]),
  };
}

export function parseRankingPosition(value, listName = "") {
  const text = String(value || "").trim();
  if (!text) return null;
  if (listName) {
    const escaped = listName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const scoped = text.match(new RegExp(`${escaped}\\s*#\\s*(\\d+)`, "i"));
    if (scoped) return Number.parseInt(scoped[1], 10);
  }
  const hash = text.match(/#\s*(\d+)/);
  if (hash) return Number.parseInt(hash[1], 10);
  const bare = text.match(/^(\d+)$/);
  if (bare) return Number.parseInt(bare[1], 10);
  return null;
}

/** Expand course-row ranking columns into one membership per list name. */
export function rankingsFromCourseRow(row) {
  const lists = String(row.ranking_list || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!lists.length) return [];
  const provider = row.ranking_provider || null;
  const year = Number.isFinite(row.ranking_year) ? row.ranking_year : 2026;
  return lists.map((ranking_name) => ({
    ranking_source: provider,
    ranking_year: year,
    ranking_name,
    position: parseRankingPosition(row.ranking_position_raw, ranking_name),
    hl_course_id: row.hl_course_id || null,
    course_display_name: row.display_name || row.name || row.club_name || "",
    verification_status: row.verification_status || null,
    is_active: true,
  }));
}

export function dedupeByHlCourseId(rows) {
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    const existing = seen.get(row.hl_course_id);
    if (existing) {
      duplicates.push({
        hl_course_id: row.hl_course_id,
        kept_source: existing.source_file,
        dropped_source: row.source_file,
      });
      continue;
    }
    seen.set(row.hl_course_id, row);
  }
  return { rows: [...seen.values()], duplicates };
}

export function normalizeMatchKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function strippedClubKey(value) {
  return normalizeMatchKey(value)
    .replace(/\b(golf club|golf links|golf course|golf resort|links|golf)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function courseMatchKeys(course) {
  const keys = new Set();
  const name = course.name || "";
  const club = course.club_name || "";
  const display = course.display_name || "";
  for (const value of [
    display,
    name,
    club,
    club && name && club !== name ? `${club} (${name})` : null,
    club && name && club !== name ? `${club} ${name}` : null,
  ]) {
    const key = normalizeMatchKey(value);
    if (key) keys.add(key);
    const stripped = strippedClubKey(value);
    if (stripped) keys.add(stripped);
  }
  return [...keys];
}

export function rankingMatchKeys(displayName) {
  const key = normalizeMatchKey(displayName);
  const stripped = strippedClubKey(displayName);
  const noParens = normalizeMatchKey(displayName.replace(/\([^)]*\)/g, " "));
  return [...new Set([key, noParens, stripped].filter(Boolean))];
}

export function countriesForRankingName(rankingName) {
  const name = String(rankingName || "").toLowerCase();
  if (name.includes("wales")) return ["Wales"];
  if (name.includes("scotland")) return ["Scotland"];
  if (name.includes("england")) return ["England"];
  if (name.includes("ireland") && !name.includes("britain")) {
    return ["Ireland", "Northern Ireland"];
  }
  if (name.includes("britain") || name.includes("ireland")) {
    return ["England", "Scotland", "Wales", "Ireland", "Northern Ireland"];
  }
  return null;
}
