export function passwordResetUrl(token) {
  // AUTH_URL is scoped to the release branch; the legacy public app URL may
  // still refer to production and must not receive a preview reset token.
  const origin = process.env.AUTH_URL || process.env.NEXT_PUBLIC_CREATE_APP_URL;
  if (!origin) throw new Error("Password-reset origin is not configured");
  const url = new URL("/account/reset-password", origin);
  if (url.protocol !== "https:") throw new Error("Password-reset origin must use HTTPS");
  url.searchParams.set("token", token);
  return url.toString();
}
