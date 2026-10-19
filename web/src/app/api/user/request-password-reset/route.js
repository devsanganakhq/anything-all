/**
 * POST /api/user/request-password-reset
 *
 * Sends a password-reset email to the currently authenticated user's
 * registered email address — no email input required from the client.
 *
 * Used by the in-app "Change Password" screen on mobile.
 * Internally delegates to the same forgot-password logic.
 */
import { randomBytes } from "crypto";
import { getSessionUserId } from "@/app/api/utils/getUserId";
import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/app/api/utils/send-email";

const RATE_LIMIT_WINDOW_MINUTES = 30;
const RATE_LIMIT_MAX_REQUESTS = 3;
const TOKEN_EXPIRY_MINUTES = 60;

export async function POST(request) {
  let email;
  try {
    const userId = await getSessionUserId(request);
    const rows = await sql("SELECT email FROM users WHERE id=$1", [userId]);
    email = rows[0]?.email;
  } catch {}

  if (!email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const emailLower = email.toLowerCase();

  try {
    // ── Rate limit ────────────────────────────────────────────────────────
    const recent = await sql(
      `SELECT COUNT(*)::int AS cnt
         FROM password_reset_tokens
        WHERE email = $1
          AND created_at > NOW() - INTERVAL '${RATE_LIMIT_WINDOW_MINUTES} minutes'`,
      [emailLower],
    );
    if (recent[0]?.cnt >= RATE_LIMIT_MAX_REQUESTS) {
      return Response.json(
        {
          error:
            "Too many requests. Please wait a few minutes before trying again.",
        },
        { status: 429 },
      );
    }

    // ── Invalidate any existing unused tokens ─────────────────────────────
    await sql(
      `UPDATE password_reset_tokens SET used = true
        WHERE email = $1 AND used = false`,
      [emailLower],
    );

    // ── Generate token ────────────────────────────────────────────────────
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await sql(
      `INSERT INTO password_reset_tokens (token, email, used, expires_at)
       VALUES ($1, $2, false, $3)`,
      [token, emailLower, expiresAt.toISOString()],
    );

    // ── Build reset URL ───────────────────────────────────────────────────
    const baseUrl =
      process.env.NEXT_PUBLIC_CREATE_APP_URL ||
      process.env.AUTH_URL ||
      "https://heathlandlinks.com";
    const resetUrl = `${baseUrl}/account/reset-password?token=${token}`;

    // ── Send email ────────────────────────────────────────────────────────
    await sendEmail({
      to: emailLower,
      subject: "Heathland Links — Change Your Password",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#1B3828;font-family:system-ui,-apple-system,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B3828;padding:40px 16px;">
            <tr><td align="center">
              <table width="100%" style="max-width:480px;background:#F5F1EB;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="background:#1B3828;padding:32px 40px;text-align:center;">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#F5F1EB;text-transform:uppercase;">HEATHLAND LINKS</p>
                    <p style="margin:8px 0 0;font-size:22px;font-weight:300;font-style:italic;color:#F5F1EB;">Change Your Password</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 16px;font-size:14px;color:#3a4f40;line-height:1.7;">
                      You requested a password change from within the Heathland Links app.
                      Click the button below to set your new password.
                    </p>
                    <p style="margin:0 0 28px;font-size:13px;color:#7a8570;line-height:1.7;">
                      This link expires in <strong>60 minutes</strong> and can only be used once.
                      If you didn't request this, your account is safe — just ignore this email.
                    </p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr><td align="center">
                        <a href="${resetUrl}"
                           style="display:inline-block;background:#1B3828;color:#F5F1EB;text-decoration:none;
                                  font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
                                  padding:16px 36px;border-radius:50px;">
                          SET NEW PASSWORD
                        </a>
                      </td></tr>
                    </table>
                    <p style="margin:28px 0 0;font-size:12px;color:#7a8570;word-break:break-all;">
                      If the button doesn't work, paste this link into your browser:<br/>
                      <a href="${resetUrl}" style="color:#1B3828;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#EDE8DF;padding:20px 40px;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#a89f93;">
                      © ${new Date().getFullYear()} Heathland Links. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
      text: `Heathland Links — Change Your Password\n\nClick the link below to set your new password. It expires in 60 minutes.\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("request-password-reset error:", err);
    return Response.json(
      { error: "Failed to send reset email. Please try again." },
      { status: 500 },
    );
  }
}
