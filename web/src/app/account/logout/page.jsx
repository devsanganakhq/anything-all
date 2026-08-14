import useAuth from "@/utils/useAuth";

export default function LogoutPage() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/", redirect: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1B3828",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "#F5F1EB",
          borderRadius: 8,
          padding: "40px 32px",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#1B3828",
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          HEATHLAND LINKS
        </p>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 300,
            fontStyle: "italic",
            color: "#1B3828",
            marginBottom: 24,
          }}
        >
          Sign Out
        </h1>
        <button
          onClick={handleSignOut}
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
            cursor: "pointer",
          }}
        >
          SIGN OUT
        </button>
      </div>
    </div>
  );
}
