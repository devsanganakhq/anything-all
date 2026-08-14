import { randomBytes } from "crypto";
import sql from "@/app/api/utils/sql";
import { sendEmail } from "@/app/api/utils/send-email";

// Rate-limit: maximum 3 reset requests per email per 30 minutes
const RATE_LIMIT_WINDOW_MINUTES = 30;
const RATE_LIMIT_MAX_REQUESTS = 3;
const TOKEN_EXPIRY_MINUTES = 60;

export async function POST(request) {
  let email;
  try {
    const body = await request.json();
    email = body?.email;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── Validate email format ─────────────────────────────────────────────────
  if (!email || typeof email !== "string") {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const emailTrimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailTrimmed)) {
    return Response.json({ error: "Invalid email format" }, { status: 400 });
  }

  // ── Always return a neutral response — don't reveal account existence ──────
  const neutralResponse = Response.json({
    message:
      "If an account exists for this email, password-reset instructions have been sent.",
  });

  try {
    // ── Rate limit check ───────────────────────────────────────────────────
    const recentRequests = await sql(
      `SELECT COUNT(*)::int AS cnt
         FROM password_reset_tokens
        WHERE email = $1
          AND created_at > NOW() - INTERVAL '${RATE_LIMIT_WINDOW_MINUTES} minutes'`,
      [emailTrimmed],
    );
    if (recentRequests[0]?.cnt >= RATE_LIMIT_MAX_REQUESTS) {
      // Silently return neutral — don't tell the caller they are rate-limited
      return neutralResponse;
    }

    // ── Check the user exists in auth_users ────────────────────────────────
    const authUser = await sql(
      `SELECT id FROM auth_users WHERE LOWER(email) = $1 LIMIT 1`,
      [emailTrimmed],
    );
    if (authUser.length === 0) {
      // No account — return neutral (don't reveal absence)
      return neutralResponse;
    }

    // ── Invalidate any existing unused tokens for this email ───────────────
    await sql(
      `UPDATE password_reset_tokens SET used = true
        WHERE email = $1 AND used = false`,
      [emailTrimmed],
    );

    // ── Generate cryptographically secure token ────────────────────────────
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await sql(
      `INSERT INTO password_reset_tokens (token, email, used, expires_at)
       VALUES ($1, $2, false, $3)`,
      [token, emailTrimmed, expiresAt.toISOString()],
    );

    // ── Build reset URL ────────────────────────────────────────────────────
    const baseUrl =
      process.env.NEXT_PUBLIC_CREATE_APP_URL ||
      process.env.AUTH_URL ||
      "https://heathlandlinks.com";
    const resetUrl = `${baseUrl}/account/reset-password?token=${token}`;

    // ── Send email via Resend ──────────────────────────────────────────────
    await sendEmail({
      to: emailTrimmed,
      subject: "Heathland Links — Reset Your Password",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#1B3828;font-family:system-ui,-apple-system,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B3828;padding:40px 16px;">
            <tr><td align="center">
              <table width="100%" style="max-width:480px;background:#F5F1EB;border-radius:8px;overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="background:#1B3828;padding:32px 40px;text-align:center;">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#F5F1EB;text-transform:uppercase;">HEATHLAND LINKS</p>
                    <p style="margin:8px 0 0;font-size:22px;font-weight:300;font-style:italic;color:#F5F1EB;">Reset Your Password</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 16px;font-size:14px;color:#3a4f40;line-height:1.7;">
                      We received a request to reset the password for your Heathland Links account.
                      Click the button below to choose a new password.
                    </p>
                    <p style="margin:0 0 28px;font-size:13px;color:#7a8570;line-height:1.7;">
                      This link expires in <strong>60 minutes</strong> and can only be used once.
                      If you didn't request a reset, you can safely ignore this email.
                    </p>
                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr><td align="center">
                        <a href="${resetUrl}"
                           style="display:inline-block;background:#1B3828;color:#F5F1EB;text-decoration:none;
                                  font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
                                  padding:16px 36px;border-radius:50px;">
                          RESET PASSWORD
                        </a>
                      </td></tr>
                    </table>
                    <!-- Fallback URL -->
                    <p style="margin:28px 0 0;font-size:12px;color:#7a8570;word-break:break-all;">
                      If the button doesn't work, copy and paste this link into your browser:<br/>
                      <a href="${resetUrl}" style="color:#1B3828;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
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
      text: `Heathland Links — Reset Your Password\n\nClick the link below to reset your password. It expires in 60 minutes.\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`,
    });

    return neutralResponse;
  } catch (err) {
    console.error("forgot-password error:", err);
    // Still return neutral — never reveal internal errors to client
    return neutralResponse;
  }
}
