import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

function courseId(params) {
  const id = Number(params.id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const id = courseId(await params);
  if (!id) return Response.json({ error: "Invalid course" }, { status: 400 });
  const rows = await sql("SELECT id,name,club_name,country,description FROM courses WHERE id=$1", [id]);
  return rows.length ? Response.json({ course: rows[0] }) : Response.json({ error: "Course not found" }, { status: 404 });
}

export async function PATCH(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const id = courseId(await params);
  if (!id) return Response.json({ error: "Invalid course" }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const description = body?.description;
  if (typeof description !== "string" || description.length > 5000 || description.trim().length < 20)
    return Response.json({ error: "Enter a factual description of 20–5,000 characters" }, { status: 400 });
  try {
    const results = await sql.transaction([
      sql("SELECT pg_advisory_xact_lock(-1,$1::int)", [id]),
      sql(`WITH previous AS MATERIALIZED (SELECT description FROM courses WHERE id=$2),
        changed AS (UPDATE courses SET description=$3 WHERE id=$2 RETURNING id)
        INSERT INTO admin_audit_log(admin_user_id,action,target_type,target_id,previous_value,new_value)
        SELECT $1,'course_description_updated','course',changed.id,previous.description,$3
        FROM previous CROSS JOIN changed RETURNING id`, [guard.userId,id,description.trim()]),
    ]);
    if (!results[1].length) return Response.json({ error: "Course not found" }, { status: 404 });
    const [course] = await sql("SELECT id,name,club_name,country,description FROM courses WHERE id=$1", [id]);
    return Response.json({ course });
  } catch (error) {
    console.error("Unable to update course description", error);
    return Response.json({ error: "Unable to save description" }, { status: 500 });
  }
}
