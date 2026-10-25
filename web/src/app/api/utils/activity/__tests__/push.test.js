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

test("seven preferences filter only push, with community chat always bell-only", async () => {
  await state.db.exec("INSERT INTO users(id,email,password) VALUES(3,'preferences@example.test','x'); INSERT INTO device_push_tokens(token,user_id) VALUES('ExponentPushToken[prefs]',3); SELECT setval('notifications_id_seq',100);");
  const { createNotification } = await import("@/app/api/utils/createNotification");
  for (const [key,type] of [['friend_requests','friend_request'],['likes','feed_like'],['comments','feed_comment'],['follows','follow'],['reviews','review'],['achievements','achievement'],['community_notifications','community_post']]) {
    await state.db.query('UPDATE users SET notification_settings=$1::jsonb WHERE id=3',[JSON.stringify({[key]:false})]);
    const off = await createNotification({userId:3,fromUserId:2,notificationType:type,eventKey:`off:${key}`,deferPush:true});
    expect(off?.id, key).toBeTruthy();
    expect((await state.db.query('SELECT * FROM push_outbox WHERE notification_id=$1',[off.id])).rows, key).toHaveLength(0);
    await state.db.query('UPDATE users SET notification_settings=$1::jsonb WHERE id=3',[JSON.stringify({[key]:true})]);
    const on = await createNotification({userId:3,fromUserId:2,notificationType:type,eventKey:`on:${key}`,deferPush:true});
    expect((await state.db.query('SELECT * FROM push_outbox WHERE notification_id=$1',[on.id])).rows, key).toHaveLength(1);
  }
  for (const enabled of [true,false]) {
    await state.db.query('UPDATE users SET notification_settings=$1::jsonb WHERE id=3',[JSON.stringify({community_notifications:enabled})]);
    const chat = await createNotification({userId:3,fromUserId:2,notificationType:'community_message',eventKey:`chat:${enabled}`,deferPush:true});
    expect(chat?.id).toBeTruthy();
    expect((await state.db.query('SELECT * FROM push_outbox WHERE notification_id=$1',[chat.id])).rows).toHaveLength(0);
  }
  expect((await state.db.query('SELECT * FROM notifications WHERE user_id=3')).rows).toHaveLength(16);
});
test("dispatch rechecks changed preferences and rejects previously queued chat", async () => {
  await state.db.query('UPDATE users SET notification_settings=$1::jsonb WHERE id=3',[JSON.stringify(Object.fromEntries(['friend_requests','likes','comments','follows','reviews','achievements','community_notifications'].map(k=>[k,false])))]);
  const chat = (await state.db.query("SELECT id FROM notifications WHERE user_id=3 AND notification_type='community_message' LIMIT 1")).rows[0];
  await state.db.query("INSERT INTO push_outbox(notification_id,user_id,token) VALUES($1,3,'ExponentPushToken[prefs]')",[chat.id]);
  fetchMock.mockClear();
  expect(await push.flushPushOutbox()).toEqual({sent:0});
  expect(fetchMock).not.toHaveBeenCalled();
});
