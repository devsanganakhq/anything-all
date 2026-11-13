// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";

const state = vi.hoisted(() => ({ db: null, sent: [] }));
vi.mock("@/app/api/utils/sql", () => ({
  default: async (text, params = []) => (await state.db.query(text, params)).rows,
}));
vi.mock("@/app/api/utils/send-email", () => ({
  sendEmail: async (message) => {
    state.sent.push(message);
  },
}));

import { POST } from "../../../user/forgot-password/route";

const NEUTRAL =
  "If an account exists for this email, password-reset instructions have been sent.";

const request = (email) =>
  POST(
    new Request("https://preview.example/api/user/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  );

beforeAll(async () => {
  vi.stubEnv("AUTH_URL", "https://preview.example");
  state.db = new PGlite();
  await state.db.exec(
    readFileSync("schema.sql", "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', ""),
  );
  // legacy row stored with mixed case and stray whitespace
  await state.db.exec(
    "INSERT INTO auth_users(id,email) VALUES('00000000-0000-4000-8000-000000000002',' Golfer@Example.Invalid ')",
  );
});
afterAll(async () => {
  await state.db.close();
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  state.sent = [];
  await state.db.exec("DELETE FROM password_reset_tokens");
});

test("matches the account regardless of case and surrounding whitespace", async () => {
  const res = await request("  GOLFER@example.invalid ");
  expect(res.status).toBe(200);
  expect((await res.json()).message).toBe(NEUTRAL);
  expect(state.sent).toHaveLength(1);
  expect(state.sent[0].to).toBe("golfer@example.invalid");
  const link = state.sent[0].text.match(/https:\/\/\S+/)[0];
  const url = new URL(link);
  expect(url.origin).toBe("https://preview.example");
  expect(url.pathname).toBe("/account/reset-password");
  expect(url.searchParams.get("token")).toMatch(/^[0-9a-f]{64}$/);
});

test("unknown emails get the same neutral response and no email", async () => {
  const res = await request("nobody@example.invalid");
  expect(res.status).toBe(200);
  expect((await res.json()).message).toBe(NEUTRAL);
  expect(state.sent).toHaveLength(0);
});

test("a new request invalidates the previous unused link", async () => {
  await request("golfer@example.invalid");
  await request("golfer@example.invalid");
  const rows = (
    await state.db.query(
      "SELECT used FROM password_reset_tokens ORDER BY created_at, id",
    )
  ).rows;
  expect(rows.map((r) => r.used)).toEqual([true, false]);
});

test("rate limiting stays silent instead of revealing the account", async () => {
  for (let i = 0; i < 4; i += 1) await request("golfer@example.invalid");
  expect(state.sent).toHaveLength(3);
});

test("rejects malformed input", async () => {
  expect((await request("not-an-email")).status).toBe(400);
  expect((await request(42)).status).toBe(400);
});
