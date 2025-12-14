export default function Welcome({ onStart }: any) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundImage: "url('/static/assets/space.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.4)",
          padding: "40px 60px",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "white", marginBottom: "20px" }}>AI Solar System</h1>
        <button
          onClick={onStart}
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            background: "#1e90ff",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
