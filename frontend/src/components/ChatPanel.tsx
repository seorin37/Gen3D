// ChatPanel.tsx
import { useState } from "react";

export default function ChatPanel({ messages, onSubmit }: any) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    onSubmit(text);     // 부모(App)에게 1번만 전달
    setInput("");       // 입력창 초기화
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();  // 폼 중복 제출 방지
      handleSend();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "40%",
        position: "absolute",
        bottom: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        padding: "10px 20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* --- 메시지 리스트 --- */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "10px",
          color: "white",
        }}
      >
        {messages.map((msg: any, i: number) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            <b>{msg.role === "user" ? "🧑 사용자" : "🤖 시스템"}:</b> {msg.text}
          </div>
        ))}
      </div>

      {/* --- 입력창 --- */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #888",
            outline: "none",
          }}
        />

        <button
          onClick={handleSend}
          style={{
            padding: "0 20px",
            borderRadius: "10px",
            background: "#3dd7c4",
            color: "black",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
