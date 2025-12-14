import { useState } from "react";
import ThreeCanvas from "./components/ThreeCanvas";
import ChatPanel from "./components/ChatPanel";
import Welcome from "./components/Welcome";

export default function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [sceneData, setSceneData] = useState<any>(null);

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;

    // 채팅 로그 저장
    setMessages((prev) => [...prev, { role: "user", text }]);

    // LLM or 서버 요청
    const res = await fetch("http://localhost:8000/prompt/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });

    const data = await res.json();

    // 서버 실패 → 기본 메시지 출력
    if (!data.scene) {
      setMessages((prev) => [
        ...prev,
        { role: "system", text: "장면을 생성할 수 없습니다." },
      ]);
      return;
    }

    // 성공
    setSceneData(data.scene);
    setMessages((prev) => [
      ...prev,
      { role: "system", text: "장면을 생성했습니다!" },
    ]);
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {!started && <Welcome onStart={() => setStarted(true)} />}

      {started && <ThreeCanvas sceneData={sceneData} />}

      {started && (
        <ChatPanel
          messages={messages}
          onSubmit={handleUserMessage}
        />
      )}
    </div>
  );
}
