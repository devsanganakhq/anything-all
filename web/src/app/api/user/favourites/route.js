import {
  activities,
  authenticated,
  passportOwner,
} from "@/app/api/utils/activity/http";
export async function GET(request) {
  try {
    const { viewer, owner } = await passportOwner(request);
    return Response.json({
      favourites: await activities.favourites(viewer, owner),
    });
  } catch (error) {
    return Response.json(
      { error: "Passport not available" },
      { status: error.status || 500 },
    );
  }
}
export function PUT(request) {
  return authenticated(request, async (userId) =>
    Response.json({
      favourites: await activities.saveFavourites(
        userId,
        (await request.json()).favourites,
      ),
    }),
  );
}
