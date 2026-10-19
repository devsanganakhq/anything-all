import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";
import manifest from "@/data/client-lists-2026.json";
import { importLists } from "@/app/api/utils/activity/importLists";
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    return Response.json(await importLists(sql, manifest));
  } catch (e) {
    console.error("List import preflight", e);
    return Response.json(
      { error: e.status ? e.message : "Unable to validate list import" },
      { status: e.status || 500 },
    );
  }
}
export async function POST(request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const body = await request.json();
    if (body.apply !== true)
      return Response.json(
        { error: "Explicit import action is required" },
        { status: 400 },
      );
    const report = await importLists(sql, manifest, {
      apply: true,
      userId: guard.userId,
    });
    return Response.json(report, { status: report.errors.length ? 409 : 200 });
  } catch (e) {
    console.error("List import", e);
    return Response.json(
      {
        error: e.status
          ? e.message
          : "List import failed; no partial batch was applied",
      },
      { status: e.status || 500 },
    );
  }
}
