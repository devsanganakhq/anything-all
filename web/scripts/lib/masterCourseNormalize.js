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
  "northern ireland": "Northern Ireland",
  "new zealand": "New Zealand",
  nz: "New Zealand",
  portugal: "Portugal",
  spain: "Spain",
  turkey: "Turkey",
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
  {
    key: "australia",
    file: "Heathland_Links_Australia_Master_Course_Database_NAMED_RECONCILIATION.xlsx",
  },
  {
    key: "england",
    file: "Heathland_Links_England_Master_Course_Database_FINAL_320_COMPLETED.xlsx",
  },
  {
    key: "ireland",
    file: "Heathland_Links_Ireland_Master_Course_Database_EXPANDED.xlsx",
  },
  {
    key: "new_zealand",
    file: "Heathland_Links_New_Zealand_Master_Course_Database_COMPLETED.xlsx",
  },
  {
    key: "northern_ireland",
    file: "Heathland_Links_Northern_Ireland_Master_Course_Database.xlsx",
  },
  {
    key: "portugal",
    file: "Heathland_Links_Portugal_Master_Course_Database_POPULATED.xlsx",
  },
  {
    key: "scotland",
    file: "Heathland_Links_Scotland_Master_Course_Database_COMPLETE.xlsx",
  },
  {
    key: "spain",
    file: "Heathland_Links_Spain_Master_Course_Database_POPULATED.xlsx",
  },
  {
    key: "turkey",
    file: "Heathland_Links_Turkey_Master_Course_Database_POPULATED.xlsx",
  },
  {
    key: "usa_part1",
    file: "Heathland_Links_USA_Master_Course_Database_THROUGH_NEBRASKA(1).xlsx",
  },
  {
    key: "usa_part2",
    file: "Heathland_Links_USA_Master_Part_2_NEVADA_THROUGH_WYOMING_FINAL.xlsx",
  },
  {
    key: "wales",
    file: "Heathland_Links_Wales_Master_Course_Database_COMPLETE.xlsx",
  },
];

export const RANKINGS_WORKBOOK =
  "Heathland_Links_Great_Britain_Ireland_Master_Course_Database_REBUILT.xlsx";

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
  return null;
}

function usaStateFromId(hlCourseId) {
  const match = String(hlCourseId || "").match(/^USA-([A-Z]{2})-/i);
  if (!match) return null;
  const abbr = match[1].toUpperCase();
  return USA_STATES[abbr] || abbr;
}

export function sheetHasPopulatedIds(rows) {
  return rows.some((row) => firstNonEmpty(row, ["hl_course_id", "hl_courseid"]));
}

export function pickSourceSheet(workbookSheets) {
  const developer = workbookSheets.Developer_Import || [];
  if (sheetHasPopulatedIds(developer)) return { name: "Developer_Import", rows: developer };
  return {
    name: "Master_Courses",
    rows: workbookSheets.Master_Courses || [],
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

  const region =
    firstNonEmpty(raw, [
      "region",
      "autonomous_community",
      "district_region",
      "state",
    ]) || usaStateFromId(hlCourseId);

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
    county: firstNonEmpty(raw, ["county", "province"]),
    region,
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
  };
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
