import { useEffect, useRef, useState } from "react";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export default function ChatPanel({
  messages,
  onSend,
}: {
  messages: ChatMsg[];
  onSend: (text: string) => void;
}) {
  const [val, setVal] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 새 메시지 오면 스크롤 맨 아래로
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = () => {
    const t = val.trim();
    if (!t) return;
    onSend(t);
    setVal("");
  };

  return (
    <div className="h-full flex flex-col">
    <div className="h-full min-h-0 flex flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto space-y-2 p-2 mt-2 rounded-lg bg-black/20 border border-white/10"
      >
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={m.content} />
        ))}
      </div>

      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          rows={1}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="메시지를 입력하세요…"
          className="flex-1 resize-none px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-cyan-100 outline-none"
        />
        <button
          onClick={send}
          className="px-4 py-3 rounded-xl bg-cyan-500/20 text-cyan-100 border border-cyan-300/30 hover:bg-cyan-500/30 transition"
        >
          전송
        </button>
      </div>

     
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const me = role === "user";
  return (
    <div className={`w-full flex ${me ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-2xl border text-sm leading-relaxed ${
          me
            ? "bg-cyan-500/20 border-cyan-300/30 text-cyan-50"
            : "bg-white/5 border-white/10 text-cyan-100"
        }`}
        style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
      >
        {text}
      </div>
    </div>
  );
}
