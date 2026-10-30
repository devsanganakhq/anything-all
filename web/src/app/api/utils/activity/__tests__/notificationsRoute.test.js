import { beforeEach, expect, test, vi } from "vitest";
const state = vi.hoisted(() => ({ error: null, sql: vi.fn(async () => []) }));
vi.mock("@/app/api/utils/getUserId", () => ({ getSessionUserId: async () => {
  if (state.error) throw state.error;
  return 7;
} }));
vi.mock("@/app/api/utils/sql", () => ({ default: state.sql }));
vi.mock("@/app/api/utils/ensureCommunityJoinRequestsTable", () => ({ ensureCommunityJoinRequestsTable: async () => {} }));
vi.mock("@/app/api/utils/ensureCommunityInvitesTable", () => ({ ensureCommunityInvitesTable: async () => {} }));
import { GET, POST } from "../../../user/notifications/route";
beforeEach(() => { state.error = null; state.sql.mockClear(); });
test("signed-out reads and writes return JSON 401 without database access", async () => {
  state.error = Object.assign(new Error("Sign in"), { code: "UNAUTHENTICATED" });
  for (const handler of [GET, POST]) {
    const response = await handler(new Request("https://example.test/api/user/notifications"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in" });
  }
  expect(state.sql).not.toHaveBeenCalled();
});
test("malformed mark-read requests cannot accidentally mark all notifications read", async () => {
  for (const body of ["{", "null", "[]", '{"notificationId":-1}', '{"notificationId":"1"}']) {
    const response = await POST(new Request("https://example.test/api/user/notifications", { method: "POST", body }));
    expect(response.status).toBe(400);
  }
  expect(state.sql).not.toHaveBeenCalled();
});
test("mark-read mutations are restricted to the signed-in user", async () => {
  const response = await POST(new Request("https://example.test/api/user/notifications", { method: "POST", body: '{"notificationId":12}' }));
  expect(response.status).toBe(200);
  expect(state.sql.mock.calls[0][1]).toEqual([12, 7]);
  expect(state.sql.mock.calls[0][0]).toContain("user_id=$2");
});
