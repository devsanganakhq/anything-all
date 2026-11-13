// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ raw: null, decoded: null }));
vi.mock("@auth/core/jwt", () => ({
  getToken: async ({ raw }) => (raw ? state.raw : state.decoded),
}));
vi.mock("@/app/api/utils/ensureAppUser", () => ({
  ensureAppUserFromJwt: async () => {},
}));

import { GET as successPage } from "../../../auth/expo-web-success/route";
import { GET as tokenRoute } from "../../../auth/token/route";

const req = (path) => new Request(`https://preview.example${path}`);

beforeEach(() => {
  state.raw = "raw.jwt.value";
  state.decoded = { sub: "user-1", email: "golfer@example.invalid", name: "Golfer" };
});

test("success page posts AUTH_SUCCESS to the native bridge and is never cached", async () => {
  const res = await successPage(req("/api/auth/expo-web-success"));
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  const html = await res.text();
  expect(html).toContain('"type":"AUTH_SUCCESS"');
  expect(html).toContain("ReactNativeWebView.postMessage");
  // the fallback must still be reachable after the retries
  expect(html).toContain("/api/auth/token");
});

test("a user-controlled name cannot break out of the inline script", async () => {
  state.decoded.name = "</script><script>alert(document.cookie)</script>";
  const html = await (await successPage(req("/api/auth/expo-web-success"))).text();
  expect(html).not.toContain("</script><script>alert");
  expect(html).toContain("\\u003c/script>");
  // exactly one script element: the one the route emits
  expect(html.match(/<script>/g)).toHaveLength(1);
});

test("without a session the success page reports AUTH_ERROR with 401", async () => {
  state.raw = null;
  state.decoded = null;
  const res = await successPage(req("/api/auth/expo-web-success"));
  expect(res.status).toBe(401);
  expect(res.headers.get("cache-control")).toBe("no-store");
  const html = await res.text();
  expect(html).toContain("AUTH_ERROR");
  expect(html).not.toContain("AUTH_SUCCESS");
});

test("token fallback returns the session as JSON, uncached", async () => {
  const res = await tokenRoute(req("/api/auth/token"));
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(await res.json()).toEqual({
    jwt: "raw.jwt.value",
    user: { id: "user-1", email: "golfer@example.invalid", name: "Golfer" },
  });
});

test("token fallback rejects a missing session", async () => {
  state.raw = null;
  state.decoded = null;
  const res = await tokenRoute(req("/api/auth/token"));
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: "Unauthorized" });
});
