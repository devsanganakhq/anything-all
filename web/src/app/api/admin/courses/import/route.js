/**
 * POST /api/admin/courses/import
 *
 * Two-phase course bulk-import endpoint.
 * ACCESS CONTROL: Authenticated administrators only.
 *   • No session           → 401 Authentication required
 *   • Session, not admin   → 403 Access denied
 *   • Session + is_admin   → proceeds
 * The admin check is enforced server-side on every request, independent
 * of anything the frontend does.
 *
 * Phase 1 — Dry Run (dryRun: true, default):
 *   Parse, validate and duplicate-check every row. Return a full preview
 *   with per-row status WITHOUT writing to the database.
 *
 * Phase 2 — Confirm (dryRun: false):
 *   Import only "ready" rows (no dups, no validation errors).
 *   Flagged rows (proximity warnings) are SKIPPED unless the caller
 *   explicitly passes their row numbers in `overrideRows`.
 *
 * Request body:
 *   {
 *     csv:          string  — raw CSV text (including header row)
 *     dryRun:       boolean — default true
 *     overrideRows: number[] — row numbers to force-import despite proximity warning
 *   }
 *
 * Safety guarantees:
 *   • Never overwrites an existing course row.
 *   • Exact-name-plus-country duplicates are always skipped.
 *   • Proximity duplicates (within 2 km) are flagged and skipped unless overridden.
 *   • All existing played_courses, wishlist, and rankings rows reference
 *     courses by ID; new inserts get new IDs and cannot affect existing refs.
 */

import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

// ─── CSV Parser ───────────────────────────────────────────────────────────────
// Handles: quoted fields, embedded commas, doubled-quote escapes, CRLF/LF.

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        row.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim());
    result.push(row);
  }
  return result;
}

// ─── Header normalisation ─────────────────────────────────────────────────────

const HEADER_ALIASES = {
  course_name: "name",
  name: "name",
  club_name: "club_name",
  club: "club_name",
  city: "city",
  town: "city",
  town_city: "city",
  district_city: "city",
  municipality: "city",
  county: "county",
  country: "country",
  region: "region",
  display_name: "display_name",
  hl_course_id: "hl_course_id",
  hl_club_id: "hl_club_id",
  latitude: "latitude",
  lat: "latitude",
  longitude: "longitude",
  lng: "longitude",
  lon: "longitude",
  long: "longitude",
  course_type: "course_type",
  type: "course_type",
  holes: "holes",
  par: "par",
  description: "description",
  website: "website",
  course_image_url: "course_image_url",
  image_url: "course_image_url",
  image: "course_image_url",
  // New fields
  course_status: "course_status",
  status: "course_status",
  is_claimed: "is_claimed",
  claimed: "is_claimed",
};

// ─── Validation constants ─────────────────────────────────────────────────────

const VALID_TYPES = [
  "Links",
  "Heathland",
  "Parkland",
  "Downland",
  "Moorland",
  "Desert",
  "Other",
];
const VALID_COUNTRIES = [
  "England",
  "Scotland",
  "Wales",
  "Ireland",
  "Northern Ireland",
  "Australia",
  "New Zealand",
  "Portugal",
  "Spain",
  "Turkey",
  "USA",
];
const VALID_STATUSES = [
  "active",
  "temporarily_closed",
  "permanently_closed",
  "under_construction",
];

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Per-row validation ───────────────────────────────────────────────────────

function validateAndCoerce(raw) {
  const errors = [];
  const warnings = [];
  const row = { ...raw };

  // name — required
  if (!row.name || !String(row.name).trim()) {
    errors.push("Course name is required");
    row.name = null;
  } else {
    row.name = String(row.name).trim();
  }

  // latitude — required, numeric, in range
  const lat = parseFloat(row.latitude);
  if (!row.latitude || isNaN(lat) || lat < -90 || lat > 90) {
    errors.push(
      `Invalid latitude: "${row.latitude}". Must be a number between -90 and 90.`,
    );
    row.latitude = null;
  } else {
    row.latitude = lat;
  }

  // longitude — required, numeric, in range
  const lng = parseFloat(row.longitude);
  if (!row.longitude || isNaN(lng) || lng < -180 || lng > 180) {
    errors.push(
      `Invalid longitude: "${row.longitude}". Must be a number between -180 and 180.`,
    );
    row.longitude = null;
  } else {
    row.longitude = lng;
  }

  // holes — optional, integer 1-36, default 18
  if (row.holes) {
    const h = parseInt(row.holes, 10);
    if (isNaN(h) || h < 1 || h > 36) {
      warnings.push(`Unusual holes value "${row.holes}" — defaulting to 18`);
      row.holes = 18;
    } else {
      row.holes = h;
    }
  } else {
    row.holes = 18;
  }

  // par — optional, integer 54-90
  if (row.par) {
    const p = parseInt(row.par, 10);
    if (isNaN(p) || p < 54 || p > 90) {
      warnings.push(`Unusual par value "${row.par}" — stored as NULL`);
      row.par = null;
    } else {
      row.par = p;
    }
  } else {
    row.par = null;
  }

  // course_type — warn if unrecognised
  if (row.course_type && !VALID_TYPES.includes(row.course_type)) {
    warnings.push(
      `Unrecognised course type "${row.course_type}". Valid values: ${VALID_TYPES.join(", ")}`,
    );
  }

  // country — warn if unrecognised
  if (row.country) {
    const countryAliases = {
      usa: "USA",
      us: "USA",
      "united states": "USA",
      "united states of america": "USA",
    };
    const aliased = countryAliases[String(row.country).trim().toLowerCase()];
    if (aliased) row.country = aliased;
  }
  if (row.country && !VALID_COUNTRIES.includes(row.country)) {
    warnings.push(
      `Unrecognised country "${row.country}". Expected: ${VALID_COUNTRIES.join(", ")}`,
    );
  }

  // course_status — optional, default 'active', validate against allowed list
  if (row.course_status && String(row.course_status).trim()) {
    const s = String(row.course_status).trim().toLowerCase();
    if (!VALID_STATUSES.includes(s)) {
      warnings.push(
        `Unrecognised course_status "${row.course_status}" — defaulting to "active". ` +
          `Valid values: ${VALID_STATUSES.join(", ")}`,
      );
      row.course_status = "active";
    } else {
      row.course_status = s;
    }
  } else {
    row.course_status = "active";
  }

  // is_claimed — always forced to false on import.
  // Claimed status must be set through the official club-claim workflow,
  // not via bulk CSV import. This also satisfies requirement 6:
  // "Do not allow imported data to overwrite an existing course's is_claimed status."
  // (Existing courses are never updated by import; new courses start unclaimed.)
  if (
    row.is_claimed &&
    String(row.is_claimed).trim().toLowerCase() === "true"
  ) {
    warnings.push(
      `is_claimed cannot be set to true via CSV import — defaulting to false. ` +
        `Use the club claim workflow to mark a course as claimed.`,
    );
  }
  row.is_claimed = false;

  // Sanitise optional text fields
  const textFields = [
    "club_name",
    "display_name",
    "hl_course_id",
    "hl_club_id",
    "city",
    "county",
    "region",
    "country",
    "course_type",
    "description",
    "website",
    "course_image_url",
  ];
  for (const f of textFields) {
    row[f] = row[f] ? String(row[f]).trim() || null : null;
  }

  return { row, errors, warnings };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  // ── Admin guard — verified server-side before any other work ──────────────
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { csv, dryRun = true, overrideRows = [] } = body;

    if (!csv || typeof csv !== "string" || !csv.trim()) {
      return Response.json({ error: "csv field is required" }, { status: 400 });
    }

    // 1. Parse CSV
    const parsed = parseCSV(csv);
    if (parsed.length < 2) {
      return Response.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 },
      );
    }

    // 2. Map headers
    const rawHeaders = parsed[0].map((h) =>
      h.toLowerCase().trim().replace(/\s+/g, "_"),
    );
    const canonicalHeaders = rawHeaders.map((h) => HEADER_ALIASES[h] || h);

    if (!canonicalHeaders.includes("name")) {
      return Response.json(
        {
          error:
            'CSV must include a "course_name" or "name" column. Download the template for the correct format.',
        },
        { status: 400 },
      );
    }

    if (
      !canonicalHeaders.includes("latitude") ||
      !canonicalHeaders.includes("longitude")
    ) {
      return Response.json(
        {
          error: "CSV must include latitude and longitude columns.",
        },
        { status: 400 },
      );
    }

    // 3. Build data row objects
    const dataRows = parsed.slice(1).map((cols, i) => {
      const obj = { _rowNum: i + 2 }; // row number in CSV (1-indexed, +1 for header)
      canonicalHeaders.forEach((header, j) => {
        obj[header] = cols[j] !== undefined ? cols[j] : null;
      });
      return obj;
    });

    // 4. Fetch all existing courses for duplicate detection (once, not per row)
    const existingCourses = await sql(
      `SELECT id, name, club_name, city, county, country, latitude, longitude FROM courses`,
    );

    // 5. Process each row
    const results = [];
    const toInsert = []; // only populated when dryRun = false

    for (const raw of dataRows) {
      const rowNum = raw._rowNum;
      const { row, errors, warnings } = validateAndCoerce(raw);

      // Validation failures — skip immediately
      if (errors.length > 0) {
        results.push({
          row: rowNum,
          status: "error",
          name: row.name || raw.name || "(no name)",
          errors,
          warnings,
        });
        continue;
      }

      // Duplicate detection
      let exactDuplicate = null;
      let proximityDuplicate = null;

      for (const existing of existingCourses) {
        // Exact name + country match
        if (
          existing.name?.toLowerCase().trim() ===
            row.name.toLowerCase().trim() &&
          existing.country?.toLowerCase() === (row.country || "").toLowerCase()
        ) {
          exactDuplicate = {
            id: existing.id,
            name: existing.name,
            city: existing.city,
            country: existing.country,
            reason: "Exact name + country match",
          };
          break;
        }

        // Proximity check: within 2 km
        if (
          row.latitude !== null &&
          row.longitude !== null &&
          existing.latitude != null &&
          existing.longitude != null
        ) {
          const dist = haversineKm(
            row.latitude,
            row.longitude,
            parseFloat(existing.latitude),
            parseFloat(existing.longitude),
          );
          if (dist < 2 && !proximityDuplicate) {
            proximityDuplicate = {
              id: existing.id,
              name: existing.name,
              city: existing.city,
              country: existing.country,
              distance_km: parseFloat(dist.toFixed(3)),
              reason: `Another course exists ${dist.toFixed(2)} km away: ID ${existing.id} — "${existing.name}"`,
            };
          }
        }
      }

      // Hard skip — exact duplicate
      if (exactDuplicate) {
        results.push({
          row: rowNum,
          status: "duplicate",
          name: row.name,
          duplicate: exactDuplicate,
          warnings,
        });
        continue;
      }

      // Soft skip — proximity warning, unless the caller has explicitly overridden this row
      if (proximityDuplicate && !overrideRows.includes(rowNum)) {
        results.push({
          row: rowNum,
          status: "flagged",
          name: row.name,
          nearDuplicate: proximityDuplicate,
          warnings,
          data: row,
        });
        continue;
      }

      // Ready to import
      results.push({
        row: rowNum,
        status: dryRun ? "ready" : "imported",
        name: row.name,
        city: row.city,
        country: row.country,
        warnings,
      });

      if (!dryRun) {
        toInsert.push(row);
      }
    }

    // 6. Execute inserts (non-dry-run only)
    const insertedIds = [];
    if (!dryRun && toInsert.length > 0) {
      for (const row of toInsert) {
        try {
          const inserted = await sql(
            `INSERT INTO courses
               (name, club_name, display_name, hl_course_id, hl_club_id,
                city, county, region, country, latitude, longitude,
                course_type, holes, par, description, website, course_image_url,
                course_status, is_claimed)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
             RETURNING id`,
            [
              row.name,
              row.club_name,
              row.display_name || null,
              row.hl_course_id || null,
              row.hl_club_id || null,
              row.city,
              row.county,
              row.region || null,
              row.country,
              row.latitude,
              row.longitude,
              row.course_type,
              row.holes,
              row.par,
              row.description,
              row.website,
              row.course_image_url,
              row.course_status,
              row.is_claimed,
            ],
          );
          insertedIds.push(inserted[0].id);
        } catch (insertErr) {
          // Find and update the corresponding result entry to show DB error
          const match = results.find(
            (r) => r.name === row.name && r.status === "imported",
          );
          if (match) {
            match.status = "error";
            match.errors = [`Database error: ${insertErr.message}`];
          }
        }
      }
    }

    // 7. Build summary
    const summary = {
      total: dataRows.length,
      ready: results.filter(
        (r) => r.status === "ready" || r.status === "imported",
      ).length,
      imported: results.filter((r) => r.status === "imported").length,
      duplicates: results.filter((r) => r.status === "duplicate").length,
      flagged: results.filter((r) => r.status === "flagged").length,
      errors: results.filter((r) => r.status === "error").length,
      warnings_total: results.reduce(
        (n, r) => n + (r.warnings?.length || 0),
        0,
      ),
    };

    return Response.json({ dryRun, summary, results, insertedIds });
  } catch (error) {
    console.error("Course import error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
