import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, test, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
const state = vi.hoisted(() => ({ db: null }));
vi.mock("@/app/api/utils/sql", () => ({
  default: async (text, params = []) =>
    (await state.db.query(text, params)).rows,
}));
let push, fetchMock;
beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec(
    readFileSync("schema.sql", "utf8").replace(
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
      "",
    ),
  );
  await state.db.exec(readFileSync("migrations/20261017_activity.sql", "utf8"));
  await state.db.exec(
    readFileSync("migrations/20261019_push_receipts.sql", "utf8"),
  );
  await state.db.exec(
    "INSERT INTO users(id,email,password) VALUES(1,'push@example.test','x'),(2,'sender@example.test','x'); INSERT INTO device_push_tokens(token,user_id) VALUES('ExponentPushToken[test-device]',1);INSERT INTO notifications(id,user_id,notification_type,from_user_id,message,target_path) VALUES(1,1,'feed_like',2,'Liked your round','/feed/1');INSERT INTO push_outbox(notification_id,user_id,token) VALUES(1,1,'ExponentPushToken[test-device]');",
  );
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  push = await import("@/app/api/utils/pushDelivery");
}, 30000);
afterAll(async () => {
  vi.unstubAllGlobals();
  await state.db?.close();
});
test("accepted push tickets are recorded without claiming receipt delivery", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({ data: [{ status: "ok", id: "ticket-one" }] }),
      { status: 200 },
    ),
  );
  expect(await push.flushPushOutbox()).toEqual({ sent: 1 });
  const row = (
    await state.db.query(
      "SELECT ticket_id,sent_at,receipt_status FROM push_outbox",
    )
  ).rows[0];
  expect(row.ticket_id).toBe("ticket-one");
  expect(row.sent_at).toBeTruthy();
  expect(row.receipt_status).toBeNull();
  expect(await push.flushPushOutbox()).toEqual({ sent: 0 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("receipt errors remove only the corresponding user token and record failure", async () => {
  await state.db.exec(
    "UPDATE push_outbox SET sent_at=NOW()-INTERVAL '16 minutes'",
  );
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        data: {
          "ticket-one": {
            status: "error",
            details: { error: "DeviceNotRegistered" },
          },
        },
      }),
      { status: 200 },
    ),
  );
  await push.checkPushReceipts();
  expect(
    (await state.db.query("SELECT * FROM device_push_tokens")).rows,
  ).toHaveLength(0);
  expect(
    (await state.db.query("SELECT receipt_status,last_error FROM push_outbox"))
      .rows[0],
  ).toMatchObject({
    receipt_status: "error",
    last_error: "DeviceNotRegistered",
  });
});
test("blocked senders do not dispatch a queued notification", async () => {
  await state.db.exec(
    "INSERT INTO device_push_tokens(token,user_id) VALUES('ExponentPushToken[blocked]',1);INSERT INTO push_outbox(notification_id,user_id,token) VALUES(1,1,'ExponentPushToken[blocked]');INSERT INTO friendships(user_id,friend_id,status) VALUES(1,2,'blocked');",
  );
  fetchMock.mockClear();
  expect(await push.flushPushOutbox()).toEqual({ sent: 0 });
  expect(fetchMock).not.toHaveBeenCalled();
});
