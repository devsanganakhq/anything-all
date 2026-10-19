// Run before spending build time: the native app must target the matching backend.
const base = process.env.EXPO_PUBLIC_BASE_URL;
if (!base)
  throw Error(
    "EXPO_PUBLIC_BASE_URL must identify the verified release backend",
  );
const url = new URL("/api/health/release", base);
if (url.protocol !== "https:") throw Error("Release backend must use HTTPS");
try {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error(`Backend release check returned HTTP ${r.status}`);
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw Error("Matching release backend is not deployed");
  const body = await r.json();
  if (
    !r.ok ||
    body.release !== "client-six-lists" ||
    !body.ready ||
    body.lists !== 6
  )
    throw Error(body.reason || "Backend and six lists are not ready");
  console.log("Verified release backend and all six client lists.");
} catch (e) {
  console.error(`Release preflight failed: ${e.message}`);
  process.exitCode = 1;
}
