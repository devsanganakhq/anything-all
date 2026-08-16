import { useState, useEffect } from "react";
import useAuth from "@/utils/useAuth";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { signInWithCredentials } = useAuth();

  // ── Read any ?error= param the auth system may have put in the URL ─────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) {
      const messages = {
        CredentialsSignin: "Incorrect email or password. Please try again.",
        Configuration:
          "Sign-in failed — please try again or reset your password.",
        Default: "Sign-in failed. Please try again.",
      };
      setError(messages[code] ?? messages.Default);
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);

    // Timeout safety — never hang forever
    const timer = setTimeout(() => {
      setLoading(false);
      setError(
        "Request timed out. Please check your connection and try again.",
      );
    }, 15000);

    try {
      await signInWithCredentials({
        email,
        password,
        callbackUrl: "/api/auth/token",
        redirect: true,
      });
      // On success the browser navigates away — clear timer just in case
      clearTimeout(timer);
    } catch (err) {
      clearTimeout(timer);
      const msg = err?.message ?? "";
      if (
        msg === "CredentialsSignin" ||
        msg.toLowerCase().includes("credentials")
      ) {
        setError("Incorrect email or password. Please try again.");
      } else if (
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("network")
      ) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <form
        noValidate
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#F5F1EB",
          borderRadius: 8,
          padding: "40px 32px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
        }}
      >
        {/* Brand */}
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#1B3828",
            textAlign: "center",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          HEATHLAND LINKS
        </p>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 300,
            fontStyle: "italic",
            color: "#1B3828",
            textAlign: "center",
            marginBottom: 6,
          }}
        >
          Welcome Back
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#5a6e61",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Sign in to your Golf Passport.
        </p>

        {/* Email */}
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

        {/* Password */}
        <label style={labelStyle}>Password</label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          placeholder="Your password"
          style={inputStyle}
          autoComplete="current-password"
          disabled={loading}
        />

        {/* Forgot Password link — sits directly below the password field */}
        <div style={{ marginTop: -10, marginBottom: 20, textAlign: "right" }}>
          <a
            href="/account/forgot-password"
            style={{
              fontSize: 12,
              color: "#1B3828",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Forgot password?
          </a>
        </div>

        {/* Error banner */}
        {error && (
          <p
            style={{
              fontSize: 13,
              color: "#c0392b",
              background: "#fdecea",
              borderRadius: 4,
              padding: "10px 12px",
              marginBottom: 16,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
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
            marginBottom: 20,
          }}
        >
          {loading ? "SIGNING IN…" : "LOG IN"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "#5a6e61" }}>
          New here?{" "}
          <a
            href={`/account/signup${typeof window !== "undefined" ? window.location.search : ""}`}
            style={{
              color: "#1B3828",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Create account
          </a>
        </p>
      </form>
    </div>
  );
}

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
