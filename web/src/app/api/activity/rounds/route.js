import sql from "@/app/api/utils/sql";
import { boundedInteger } from "@/app/api/utils/courses/scope";
import {
  activities,
  authenticated,
  passportOwner,
} from "@/app/api/utils/activity/http";
export function POST(request) {
  return authenticated(request, async (userId) =>
    Response.json(
      { round: await activities.create(userId, "round", await request.json()) },
      { status: 201 },
    ),
  );
}
export async function GET(request) {
  try {
    const offset = boundedInteger(
      new URL(request.url).searchParams.get("offset"),
      0,
      100000,
    );
    const { viewer, owner } = await passportOwner(request);
    const rounds = await sql(
      `SELECT r.*,c.name AS course_name,c.club_name,c.country FROM course_rounds r JOIN courses c ON c.id=r.course_id WHERE r.user_id=$1 ORDER BY r.date_played DESC,r.id DESC LIMIT 101 OFFSET $2`,
      [owner, offset],
    );
    return Response.json({
      rounds: rounds.slice(0, 100),
      nextOffset: rounds.length > 100 ? offset + 100 : null,
      currentUserId: viewer,
    });
  } catch (error) {
    return Response.json(
      { error: "Unable to load rounds" },
      { status: error.status || 500 },
    );
  }
}
