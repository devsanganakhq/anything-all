import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/user/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      // Always show neutral confirmation regardless of response
      // This prevents account enumeration
      if (r.ok || r.status === 429) {
        setSubmitted(true);
      } else {
        // Only show an error on unexpected server failure
        setError("Something went wrong. Please try again shortly.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Brand */}
        <p style={brandLabel}>HEATHLAND LINKS</p>
        <h1 style={heading}>Reset Password</h1>

        {submitted ? (
          /* ── Confirmation state ── */
          <div style={{ textAlign: "center" }}>
            {/* Envelope icon */}
            <div style={iconRing}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1B3828"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <p
              style={{
                fontSize: 14,
                color: "#3a4f40",
                lineHeight: 1.7,
                marginBottom: 8,
              }}
            >
              <strong>Check your email.</strong>
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#5a6e61",
                lineHeight: 1.7,
                marginBottom: 32,
              }}
            >
              If an account exists for{" "}
              <strong>{email.trim().toLowerCase()}</strong>, password-reset
              instructions have been sent. The link expires in 60 minutes.
            </p>
            <p style={{ fontSize: 12, color: "#7a8570", marginBottom: 20 }}>
              Didn't receive it? Check your spam folder or{" "}
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1B3828",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                try again
              </button>
              .
            </p>
            <a href="/account/signin" style={backLink}>
              ← Return to Login
            </a>
          </div>
        ) : (
          /* ── Request form ── */
          <form noValidate onSubmit={onSubmit}>
            <p
              style={{
                fontSize: 13,
                color: "#5a6e61",
                marginBottom: 28,
                lineHeight: 1.7,
              }}
            >
              Enter the email address associated with your account and we'll
              send you a secure reset link.
            </p>

            <label style={labelStyle}>Email Address</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              style={inputStyle}
              autoCapitalize="none"
              autoComplete="email"
              disabled={loading}
            />

            {error && <p style={errorStyle}>{error}</p>}

            <button type="submit" disabled={loading} style={submitBtn(loading)}>
              {loading ? "SENDING…" : "SEND RESET LINK"}
            </button>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <a href="/account/signin" style={backLink}>
                ← Return to Login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const pageStyle = {
  minHeight: "100vh",
  background: "#1B3828",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const cardStyle = {
  width: "100%",
  maxWidth: 400,
  background: "#F5F1EB",
  borderRadius: 8,
  padding: "40px 32px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
};

const brandLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 3,
  color: "#1B3828",
  textAlign: "center",
  marginBottom: 4,
  textTransform: "uppercase",
};

const heading = {
  fontSize: 24,
  fontWeight: 300,
  fontStyle: "italic",
  color: "#1B3828",
  textAlign: "center",
  marginBottom: 28,
};

const iconRing = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "rgba(27,56,40,0.07)",
  border: "1.5px solid rgba(27,56,40,0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 20px",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  color: "#3a4f40",
  marginBottom: 6,
  textTransform: "uppercase",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  marginBottom: 18,
  fontSize: 15,
  color: "#1B3828",
  background: "#fff",
  border: "1px solid #c8d5cb",
  borderRadius: 6,
  outline: "none",
};

const errorStyle = {
  fontSize: 13,
  color: "#c0392b",
  background: "#fdecea",
  borderRadius: 4,
  padding: "10px 12px",
  marginBottom: 16,
};

const submitBtn = (loading) => ({
  width: "100%",
  background: "transparent",
  color: "#1B3828",
  border: "1.5px solid #1B3828",
  borderRadius: 6,
  padding: "15px 0",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 2.4,
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.7 : 1,
  marginTop: 4,
});

const backLink = {
  fontSize: 13,
  color: "#1B3828",
  fontWeight: 600,
  textDecoration: "none",
};
