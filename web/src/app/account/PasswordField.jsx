"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Password input with show/hide toggle for account sign-in / sign-up.
 */
export default function PasswordField({
  label = "Password",
  value,
  onChange,
  placeholder = "Your password",
  autoComplete = "current-password",
  disabled = false,
  required = true,
  inputStyle,
  labelStyle,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative", marginBottom: 18 }}>
        <input
          required={required}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            marginBottom: 0,
            paddingRight: 44,
          }}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            padding: 0,
            border: "none",
            background: "transparent",
            color: "#5a6e61",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {visible ? (
            <EyeOff size={18} strokeWidth={1.8} />
          ) : (
            <Eye size={18} strokeWidth={1.8} />
          )}
        </button>
      </div>
    </>
  );
}
