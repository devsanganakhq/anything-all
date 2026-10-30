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
      {
        review: await activities.create(userId, "review", await request.json()),
      },
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
    const reviews = await sql(
      `SELECT r.*,c.name AS course_name,c.club_name,c.country FROM course_reviews r JOIN courses c ON c.id=r.course_id WHERE r.user_id=$1 AND r.deleted_at IS NULL ORDER BY r.created_at DESC,r.id DESC LIMIT 101 OFFSET $2`,
      [owner, offset],
    );
    return Response.json({
      reviews: reviews.slice(0, 100),
      nextOffset: reviews.length > 100 ? offset + 100 : null,
      currentUserId: viewer,
    });
  } catch (error) {
    return Response.json(
      { error: "Unable to load reviews" },
      { status: error.status || 500 },
    );
  }
}
