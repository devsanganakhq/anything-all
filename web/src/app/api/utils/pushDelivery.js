import sql from "./sql";
import { pushAllowedSQL } from "./notificationPreferences";
export async function flushPushOutbox({ notificationId = null } = {}) {
  await checkPushReceipts();
  // Atomically lease rows; another invocation cannot dispatch the same lease.
  const jobs = await sql(
    `WITH picked AS (
  SELECT o.id FROM push_outbox o WHERE o.sent_at IS NULL AND o.attempts<6 AND o.available_at<=NOW()
    AND ($1::int IS NULL OR o.notification_id=$1) ORDER BY o.id FOR UPDATE SKIP LOCKED LIMIT 100
 ), leased AS (
  UPDATE push_outbox SET attempts=attempts+1, available_at=NOW()+INTERVAL '5 minutes' WHERE id IN(SELECT id FROM picked) RETURNING *
 ) SELECT o.*,n.target_path,n.message,n.community_id FROM leased o JOIN notifications n ON n.id=o.notification_id
 JOIN users u ON u.id=o.user_id WHERE COALESCE(u.is_suspended,false)=false
  AND ${pushAllowedSQL("n.notification_type")}
  AND NOT EXISTS(SELECT 1 FROM friendships WHERE status='blocked' AND ((user_id=o.user_id AND friend_id=n.from_user_id) OR (friend_id=o.user_id AND user_id=n.from_user_id)))
  AND EXISTS(SELECT 1 FROM device_push_tokens WHERE token=o.token AND user_id=o.user_id)
  AND (n.community_id IS NULL OR EXISTS(SELECT 1 FROM community_members WHERE community_id=n.community_id AND user_id=o.user_id AND muted=false))`,
    [notificationId],
  );
  if (!jobs.length) return { sent: 0 };
  try {
    const headers = { "Content-Type": "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN)
      headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify(
        jobs.map((j) => ({
          to: j.token,
          title: "Heathland Links",
          body: j.message || "You have a new notification",
          sound: "default",
          data: { path: j.target_path, notificationId: j.notification_id },
        })),
      ),
    });
    if (!response.ok) throw Error("Push provider unavailable");
    const result = await response.json();
    const tickets = Array.isArray(result.data) ? result.data : [result.data];
    let sent = 0;
    for (let i = 0; i < jobs.length; i++) {
      const ticket = tickets[i];
      const job = jobs[i];
      if (ticket?.status === "ok") {
        await sql(
          "UPDATE push_outbox SET sent_at=NOW(),ticket_id=$2,last_error=NULL WHERE id=$1",
          [job.id, ticket.id],
        );
        sent++;
      } else {
        const code = ticket?.details?.error || "PushRejected";
        await sql("UPDATE push_outbox SET last_error=$2 WHERE id=$1", [
          job.id,
          code,
        ]);
        if (code === "DeviceNotRegistered") {
          await sql(
            "DELETE FROM device_push_tokens WHERE token=$1 AND user_id=$2",
            [job.token, job.user_id],
          );
          await sql("UPDATE push_outbox SET attempts=6 WHERE id=$1", [job.id]);
        }
      }
    }
    return { sent };
  } catch {
    await sql(
      "UPDATE push_outbox SET last_error='ProviderUnavailable' WHERE id=ANY($1::bigint[])",
      [jobs.map((j) => j.id)],
    );
    return { sent: 0 };
  }
}

// Expo tickets acknowledge queue acceptance; receipts confirm the APNs/FCM handoff.
// https://docs.expo.dev/push-notifications/sending-notifications/
export async function checkPushReceipts() {
  const jobs =
    await sql(`SELECT id,ticket_id,token,user_id,sent_at FROM push_outbox WHERE ticket_id IS NOT NULL
  AND receipt_checked_at IS NULL AND sent_at<NOW()-INTERVAL '15 minutes' ORDER BY sent_at LIMIT 100`);
  if (!jobs.length) return;
  try {
    const headers = { "Content-Type": "application/json" };
    if (process.env.EXPO_ACCESS_TOKEN)
      headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    const response = await fetch(
      "https://exp.host/--/api/v2/push/getReceipts",
      {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ ids: jobs.map((j) => j.ticket_id) }),
      },
    );
    if (!response.ok) return;
    const { data } = await response.json();
    for (const job of jobs) {
      const receipt = data?.[job.ticket_id];
      if (!receipt) {
        if (Date.now() - new Date(job.sent_at).getTime() > 24 * 60 * 60 * 1000)
          await sql(
            "UPDATE push_outbox SET receipt_checked_at=NOW(),receipt_status='unknown',last_error='ReceiptUnavailable' WHERE id=$1",
            [job.id],
          );
        continue;
      }
      const code =
        receipt.status === "ok"
          ? null
          : receipt.details?.error || "PushReceiptError";
      await sql(
        "UPDATE push_outbox SET receipt_checked_at=NOW(),receipt_status=$2,last_error=$3 WHERE id=$1",
        [job.id, receipt.status, code],
      );
      if (code === "DeviceNotRegistered")
        await sql(
          "DELETE FROM device_push_tokens WHERE token=$1 AND user_id=$2",
          [job.token, job.user_id],
        );
    }
  } catch {
    /* Keep pending receipts for the next retry; never report delivery without a receipt. */
  }
}
