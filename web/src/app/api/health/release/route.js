import sql from "@/app/api/utils/sql";
import manifest from "@/data/client-lists-2026.json";
const required = [
  "20261017_activity",
  "20261019_list_sources",
  "20261019_push_receipts",
];
export async function GET() {
  try {
    const tables = await sql(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='app_schema_migrations'",
    );
    if (!tables.length)
      return Response.json(
        {
          release: "client-six-lists",
          ready: false,
          reason: "Database migration is pending",
        },
        { status: 503 },
      );
    const versions = await sql(
      "SELECT version FROM app_schema_migrations WHERE version=ANY($1::text[])",
      [required],
    );
    const migrated = required.every((v) =>
      versions.some((r) => r.version === v),
    );
    if (!migrated)
      return Response.json(
        {
          release: "client-six-lists",
          ready: false,
          reason: "Database migration is pending",
        },
        { status: 503 },
      );
    const [{ count }] = await sql(
      "SELECT COUNT(*)::int AS count FROM curated_lists WHERE is_published AND source_key=ANY($1::text[])",
      [manifest.map((l) => l.sourceKey)],
    );
    const ready = count === manifest.length;
    return Response.json(
      {
        release: "client-six-lists",
        ready,
        lists: count,
        reason: ready ? null : "Client list import is pending",
      },
      { status: ready ? 200 : 503 },
    );
  } catch {
    return Response.json(
      {
        release: "client-six-lists",
        ready: false,
        reason: "Release backend unavailable",
      },
      { status: 503 },
    );
  }
}
