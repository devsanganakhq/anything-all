// Canonical database countries are preserved; Hawaii is a destination within USA.
export function courseScope(searchParams, alias = "", start = 1) {
  const col = (name) => `${alias ? `${alias}.` : ""}${name}`;
  const conditions = [],
    params = [];
  const add = (condition, value) => {
    conditions.push(condition.replaceAll("?", `$${start + params.length}`));
    params.push(value);
  };
  let country = (searchParams.get("country") || "").trim();
  let region = (searchParams.get("region") || "").trim();
  if (country.toLowerCase() === "hawaii") {
    country = "USA";
    region = "Hawaii";
  }
  if (
    ["usa", "united states", "united states of america"].includes(
      country.toLowerCase(),
    )
  ) {
    conditions.push(
      `LOWER(TRIM(${col("country")})) IN ('usa','united states','united states of america')`,
    );
  } else if (["uae", "united arab emirates"].includes(country.toLowerCase())) {
    conditions.push(
      `LOWER(TRIM(${col("country")})) IN ('uae','united arab emirates')`,
    );
  } else if (country) add(`LOWER(TRIM(${col("country")})) = LOWER(?)`, country);
  if (region) add(`LOWER(TRIM(${col("region")})) = LOWER(?)`, region);
  const q = (searchParams.get("q") || "").trim();
  if (q)
    add(
      `(${["name", "club_name", "display_name", "city", "county"].map((k) => `COALESCE(${col(k)},'') ILIKE ?`).join(" OR ")})`,
      `%${q.replace(/[\\%_]/g, "\\$&")}%`,
    );
  if (searchParams.get("type"))
    add(`${col("course_type")} = ?`, searchParams.get("type"));
  return { conditions, params };
}
export function boundedInteger(value, fallback, max) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? Math.min(n, max) : fallback;
}
