export async function sendEmail({ to, from, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !(from || process.env.EMAIL_FROM)) {
    throw new Error("Password-reset email delivery is not configured");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from || process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to send email");
  }
  return { id: data.id };
}
