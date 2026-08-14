import { useState, useEffect } from "react";

function checkRequirements(pw) {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
  };
}

function strengthFromReq(req) {
  const met = Object.values(req).filter(Boolean).length;
  if (met === 0) return null;
  if (met === 1) return { label: "Weak", color: "#c0392b", bars: 1 };
  if (met === 2) return { label: "Fair", color: "#c9922a", bars: 2 };
  if (met === 3) return { label: "Good", color: "#2c6e49", bars: 3 };
  return { label: "Strong", color: "#1B3828", bars: 4 };
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState(null);
  const [tokenValid, setTokenValid] = useState(null); // null=loading, true, false
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ── Extract & validate token from URL ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setTokenValid(false);
      return;
    }
    setToken(t);

    // Validate without consuming
    fetch(`/api/user/reset-password?token=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => setTokenValid(d.valid === true))
      .catch(() => setTokenValid(false));
  }, []);

  const req = checkRequirements(password);
  const strength = strengthFromReq(req);
  const allMet = Object.values(req).every(Boolean);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!allMet) {
      setError("Password does not meet all requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Failed to reset password. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Loading token validation ── */
  if (tokenValid === null) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={brandLabel}>HEATHLAND LINKS</p>
          <p
            style={{
              textAlign: "center",
              color: "#5a6e61",
              fontSize: 14,
              marginTop: 16,
            }}
          >
            Validating your reset link…
          </p>
        </div>
      </div>
    );
  }

  /* ── Invalid / expired token ── */
  if (!tokenValid) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={brandLabel}>HEATHLAND LINKS</p>
          <h1 style={heading}>Link Expired</h1>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                ...iconRing,
                borderColor: "#c0392b",
                background: "rgba(192,57,43,0.07)",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c0392b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6" />
                <path d="m9 9 6 6" />
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
              This reset link is invalid or has expired.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#5a6e61",
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              Reset links are single-use and expire after 60 minutes. Please
              request a new one.
            </p>
            <a href="/account/forgot-password" style={greenBtn}>
              REQUEST NEW LINK
            </a>
            <div style={{ marginTop: 20 }}>
              <a href="/account/signin" style={backLink}>
                ← Return to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={brandLabel}>HEATHLAND LINKS</p>
          <h1 style={heading}>Password Reset</h1>
          <div style={{ textAlign: "center" }}>
            <div style={iconRing}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1B3828"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
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
              <strong>Your password has been updated.</strong>
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#5a6e61",
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              You can now sign in with your new password. All your profile,
              Passport, and course data remains intact.
            </p>
            <a href="/account/signin" style={greenBtn}>
              GO TO LOGIN
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ── New password form ── */
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <p style={brandLabel}>HEATHLAND LINKS</p>
        <h1 style={heading}>Choose New Password</h1>
        <p
          style={{
            fontSize: 13,
            color: "#5a6e61",
            marginBottom: 28,
            lineHeight: 1.7,
          }}
        >
          Enter a strong password for your Heathland Links account.
        </p>

        <form noValidate onSubmit={onSubmit}>
          {/* New password */}
          <label style={labelStyle}>New Password</label>
          <div style={inputRow(false)}>
            <input
              required
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="New password"
              style={innerInput}
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={eyeBtn}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {/* Strength bar */}
          {password.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background:
                        strength && i <= strength.bars
                          ? strength.color
                          : "#E3DED5",
                    }}
                  />
                ))}
              </div>
              {strength && (
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: strength.color,
                    margin: 0,
                  }}
                >
                  {strength.label}
                </p>
              )}
            </div>
          )}

          {/* Requirements */}
          {password.length > 0 && (
            <div style={reqBox}>
              <p style={reqTitle}>REQUIREMENTS</p>
              {[
                { met: req.minLength, text: "Minimum 8 characters" },
                { met: req.hasUpper, text: "At least one uppercase letter" },
                { met: req.hasLower, text: "At least one lowercase letter" },
                { met: req.hasNumber, text: "At least one number" },
              ].map(({ met, text }) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{ fontSize: 13, color: met ? "#2c6e49" : "#a89f93" }}
                  >
                    {met ? "✓" : "○"}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: met ? "#1B2E22" : "#a89f93",
                      fontWeight: met ? 500 : 400,
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Confirm password */}
          <label style={{ ...labelStyle, marginTop: 4 }}>
            Confirm New Password
          </label>
          <div style={inputRow(confirm.length > 0 && confirm !== password)}>
            <input
              required
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="Re-enter new password"
              style={innerInput}
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              style={eyeBtn}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>

          {/* Match indicator */}
          {confirm.length > 0 && password.length > 0 && (
            <p
              style={{
                fontSize: 12,
                marginBottom: 16,
                marginTop: -10,
                fontWeight: 500,
                color: confirm === password ? "#2c6e49" : "#c0392b",
              }}
            >
              {confirm === password
                ? "✓ Passwords match"
                : "✗ Passwords do not match"}
            </p>
          )}

          {/* Error */}
          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" disabled={loading} style={submitBtn(loading)}>
            {loading ? "RESETTING…" : "RESET PASSWORD"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/account/signin" style={backLink}>
            ← Return to Login
          </a>
        </div>
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
  maxWidth: 420,
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
  marginBottom: 8,
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

const inputRow = (isError) => ({
  display: "flex",
  alignItems: "center",
  background: "#fff",
  border: `1px solid ${isError ? "#c0392b" : "#c8d5cb"}`,
  borderRadius: 6,
  marginBottom: 14,
  overflow: "hidden",
});

const innerInput = {
  flex: 1,
  padding: "12px 14px",
  fontSize: 15,
  color: "#1B3828",
  background: "transparent",
  border: "none",
  outline: "none",
};

const eyeBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  color: "#5a6e61",
  padding: "0 14px",
  letterSpacing: 0.5,
};

const reqBox = {
  background: "#fff",
  borderRadius: 6,
  border: "1px solid #E3DED5",
  padding: "14px 16px",
  marginBottom: 18,
};

const reqTitle = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: "#7a8570",
  marginBottom: 10,
  marginTop: 0,
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
});

const greenBtn = {
  display: "inline-block",
  background: "#1B3828",
  color: "#F5F1EB",
  padding: "14px 32px",
  borderRadius: 50,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 2,
  textDecoration: "none",
};

const backLink = {
  fontSize: 13,
  color: "#1B3828",
  fontWeight: 600,
  textDecoration: "none",
};
