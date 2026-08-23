import { useState } from "react";
import useAuth from "@/utils/useAuth";
import PasswordField from "../PasswordField";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { signUpWithCredentials } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signUpWithCredentials({
        email,
        password,
        name,
        callbackUrl: "/api/auth/token",
        redirect: true,
      });
    } catch (err) {
      setError("Something went wrong. Please try again.");
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
          Create Account
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#5a6e61",
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Begin building your personal Golf Passport.
        </p>

        {/* Name */}
        <label style={labelStyle}>Full Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          style={inputStyle}
        />

        {/* Email */}
        <label style={labelStyle}>Email Address</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Password */}
        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          autoComplete="new-password"
          disabled={loading}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />

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
            background: "#1B3828",
            color: "#F5F1EB",
            border: "1.5px solid #C9A84C",
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
          {loading ? "CREATING…" : "CREATE ACCOUNT"}
        </button>

        <p style={{ textAlign: "center", fontSize: 13, color: "#5a6e61" }}>
          Already have an account?{" "}
          <a
            href={`/account/signin${typeof window !== "undefined" ? window.location.search : ""}`}
            style={{
              color: "#1B3828",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Log in
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
