// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { verify } from "argon2";
import { beforeAll, afterAll, test, expect, vi } from "vitest";
const state = vi.hoisted(() => ({ db: null }));
vi.mock("@/app/api/utils/sql", () => ({
  default: async (text, params = []) => (await state.db.query(text, params)).rows,
}));
import { POST, GET } from "../../../user/reset-password/route";
import { passwordResetUrl } from "../../passwordResetUrl";
beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec(readFileSync("schema.sql", "utf8").replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', ""));
  await state.db.exec(`INSERT INTO auth_users(id,email) VALUES('00000000-0000-4000-8000-000000000001','qa@example.invalid');
    INSERT INTO auth_accounts("userId",type,provider,"providerAccountId",password)
    VALUES('00000000-0000-4000-8000-000000000001','credentials','credentials','qa','original');`);
});
afterAll(async () => { await state.db.close(); vi.unstubAllEnvs(); });
const reset = (token) => POST(new Request("https://preview.example/api/user/reset-password", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ token, password: "TestPassword123!" }),
}));
test("preview reset links stay on the auth origin even with a legacy production URL", () => {
  vi.stubEnv("AUTH_URL", "https://preview.example");
  vi.stubEnv("NEXT_PUBLIC_CREATE_APP_URL", "https://production.example");
  expect(new URL(passwordResetUrl("fixture-token")).origin).toBe("https://preview.example");
});
test("rejects an insecure reset origin", () => {
  vi.stubEnv("AUTH_URL", "http://preview.example");
  expect(() => passwordResetUrl("fixture-token")).toThrow("HTTPS");
});
test("concurrent reset attempts consume the token once and store a usable password hash", async () => {
  await state.db.exec("INSERT INTO password_reset_tokens(token,email,expires_at) VALUES('once','qa@example.invalid',NOW()+INTERVAL '1 hour')");
  const responses = await Promise.all([reset("once"), reset("once")]);
  expect(responses.map(r => r.status).sort()).toEqual([200,400]);
  const [{ password }] = (await state.db.query("SELECT password FROM auth_accounts WHERE provider='credentials'")).rows;
  expect(await verify(password, "TestPassword123!")).toBe(true);
  const validation = await GET(new Request("https://preview.example/api/user/reset-password?token=once"));
  expect((await validation.json()).valid).toBe(false);
});
test("expired tokens cannot change the password", async () => {
  await state.db.exec("INSERT INTO password_reset_tokens(token,email,expires_at) VALUES('expired','qa@example.invalid',NOW()-INTERVAL '1 minute')");
  expect((await reset("expired")).status).toBe(400);
});
