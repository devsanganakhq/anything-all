import sql from "../sql";
import { getSessionUserId, getSessionUserIdOrNull } from "../getUserId";
import { activityService } from "./service";
export const activities = activityService(sql);
export async function authenticated(request, action) {
  try {
    return await action(await getSessionUserId(request));
  } catch (error) {
    const status =
      error.status ||
      (error.code === "ACCOUNT_SUSPENDED"
        ? 403
        : ["UNAUTHENTICATED", "AUTH_ERROR"].includes(error.code)
          ? 401
          : 500);
    if (status === 500)
      console.error("Activity request failed", { code: error.code });
    return Response.json(
      {
        error:
          status === 500 ? "Unable to complete this request" : error.message,
      },
      { status },
    );
  }
}
export async function passportOwner(request) {
  const viewer = await getSessionUserIdOrNull(request);
  const value = new URL(request.url).searchParams.get("userId");
  const owner = value ? Number(value) : viewer;
  if (
    !owner ||
    !Number.isSafeInteger(owner) ||
    !(await activities.canViewPassport(viewer, owner))
  )
    throw Object.assign(new Error("Passport not available"), { status: 403 });
  return { viewer, owner };
}
