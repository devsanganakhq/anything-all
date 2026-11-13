// Shared by scripts/migrate.mjs and the migration test.
export const NO_TRANSACTION = "-- migrate:no-transaction";

/** Splits a no-transaction migration into statements (no $$ bodies allowed). */
export function splitStatements(sqlText) {
  return sqlText
    .split("\n").filter((line) => !line.trim().startsWith("--")).join("\n")
    .split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
}
