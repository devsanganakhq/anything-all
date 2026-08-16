const ARTWORK_URI =
  "https://dtvoeevhaseb5.cloudfront.net/user-uploads/e30ce1d7-f3f9-466d-8641-919de79212af.png";

export default function AccountLayout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0e1e15",
        position: "relative",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <img
        src={ARTWORK_URI}
        alt=""
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        {children}
      </div>
    </div>
  );
}
