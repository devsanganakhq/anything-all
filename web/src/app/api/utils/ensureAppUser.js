/**
 * Ensures an application `users` row exists for an authenticated auth user.
 * Called from token / expo-web-success so the first profile API call never 404s.
 */
import { createUserOnSignup } from "./getUserId";

export async function ensureAppUserFromJwt(jwt) {
  if (!jwt?.email) return null;
  try {
    const name = typeof jwt.name === "string" ? jwt.name.trim() : "";
    const parts = name.split(/\s+/).filter(Boolean);
    const result = await createUserOnSignup({
      email: jwt.email,
      firstName: parts[0] || null,
      lastName: parts.slice(1).join(" ") || null,
      photoUrl: null,
    });
    return result;
  } catch (err) {
    // Suspended accounts should still return a token; profile APIs will surface the error.
    if (err?.code === "ACCOUNT_SUSPENDED") {
      console.warn("[ensureAppUserFromJwt] suspended account:", jwt.email);
      return null;
    }
    console.error("[ensureAppUserFromJwt]", err?.message || err);
    return null;
  }
}
