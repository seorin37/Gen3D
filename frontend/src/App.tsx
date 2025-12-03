// src/App.tsx
import { useEffect, useState, useRef } from "react";
import "./index.css";
import ChatPanel, { type ChatMsg } from "./components/ChatPanel";
import StarBackdrop from "./components/StarBackdrop";
import HeaderBar from "./components/HeaderBar";
import * as THREE from "three";

type Screen = "welcome" | "main";

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const threeMountRef = useRef<HTMLDivElement | null>(null);

  // 🔹 Welcome에서 입력한 첫 프롬프트
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const autoRunRef = useRef(false); // Welcome → main 첫 진입 때 한 번만 자동 실행

  // 🔹 three.js 쪽에서 등록해 줄 “이 프롬프트로 장면 만들어줘” 함수
  const externalGenerateRef = useRef<((prompt: string) => void) | null>(null);

  // 세션: 탭 닫으면 삭제, 새로고침 시에만 복구
  useEffect(() => {
    const saved = sessionStorage.getItem("astro:chat");
    if (saved) {
      const { messages: m } = JSON.parse(saved);
      setMessages(m || []);
      setScreen("main"); // 세션 있으면 바로 메인
    }
    const handleBeforeUnload = () => sessionStorage.removeItem("astro:chat");
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const saveSession = (msgs: ChatMsg[]) => {
    sessionStorage.setItem("astro:chat", JSON.stringify({ messages: msgs }));
  };

  // 🔹 Welcome에서 "시작" 눌렀을 때: 채팅에 기록 + 프롬프트 저장 + 화면 전환
  const handleStart = (firstText: string) => {
    const first: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: firstText,
      ts: Date.now(),
    };
    const next = [first];
    setMessages(next);
    saveSession(next);

    setInitialPrompt(firstText); // three.js로 넘길 프롬프트
    autoRunRef.current = false; // 새 세션이니 다시 자동 실행 허용
    setScreen("main");
  };

  // 🔹 채팅창에서 보낸 메시지도 three.js 장면 생성 트리거로 사용
  const handleSend = async (text: string) => {
    const user: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      ts: Date.now(),
    };
    const next = [...messages, user];
    setMessages(next);
    saveSession(next);

    // (임시) 봇 응답 – 나중에 진짜 설명으로 바꿀 수 있음
    const bot: ChatMsg = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "이 프롬프트로 장면을 만들어볼게요. (three.js 연동 중) 🚀",
      ts: Date.now(),
    };
    const final = [...next, bot];
    setMessages(final);
    saveSession(final);

    // ✅ three.js 쪽에 “이 텍스트로 장면 만들어줘” 요청
    if (externalGenerateRef.current) {
      externalGenerateRef.current(text);
    }
  };

  // 🔹 three.js + Gemini 초기화
  useEffect(() => {
    if (screen !== "main") return;
    if (!threeMountRef.current) return;

    const container = threeMountRef.current;
    const { width, height } = container.getBoundingClientRect();

    // ── 1) Scene, Camera, Renderer ─────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    camera.position.z = 30;

    // ── 2) 전역 그룹 & 상태 ────────────────────────
    const solarSystem = new THREE.Group();
    scene.add(solarSystem);

    const objectsToAnimate: { orbit: THREE.Object3D; mesh: THREE.Mesh }[] = [];

    // ── 3) 유틸 함수들 ─────────────────────────────
    const toThreeColor = (colorStr: any) => {
      if (typeof colorStr !== "string") return 0xffffff;
      const s = colorStr.trim().toLowerCase();
      if (s.startsWith("#")) return parseInt(s.slice(1), 16);
      if (s.startsWith("0x")) return parseInt(s.slice(2), 16);
      const v = parseInt(s, 16);
      return Number.isFinite(v) ? v : 0xffffff;
    };

    const num = (v: any, f = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : f;
    };

    const fitCameraToObject = (group: THREE.Object3D, padding = 1.6) => {
      const box = new THREE.Box3().setFromObject(group);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(maxDim) || maxDim === 0) return;

      const fov = camera.fov * (Math.PI / 180);
      let distance = (maxDim / 2) / Math.tan(fov / 2);
      distance *= padding;

      camera.position.set(center.x, center.y, center.z + distance);
      camera.near = Math.max(0.1, distance / 1000);
      camera.far = distance * 1000;
      camera.updateProjectionMatrix();
      camera.lookAt(center);
    };

    // ── 4) AI JSON (Gemini 프록시 호출) ──────────────────────
    const API_URL = "http://localhost:3000/api/gemini";

    const getJsonFromAI = async (userInput: string) => {
      const promptTemplate = `
당신은 JSON 전문가입니다.
아래 스키마로만 JSON 응답하세요. (코드블록/설명 금지)

{
  "objects": [
    {
      "name": "영문명",
      "size": 10,
      "color": "0xffff00",
      "rotation_speed": 0.01,
      "orbit": { "target": "Sun", "distance": 30, "speed": 0.01 }
    }
  ]
}

[사용자 입력]
${userInput}
      `.trim();

      console.log("[DEBUG] /api/gemini 요청:", { API_URL, userInput });

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userInput: promptTemplate }),
      });

      console.log("[DEBUG] /api/gemini 응답 상태:", res.status);

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error("[DEBUG] /api/gemini 에러 응답:", errBody);
        throw new Error(`Proxy failed: ${res.status}`);
      }

      const data: any = await res.json();
      console.log("[DEBUG] Gemini raw 응답:", data);

      // 1) 일반적인 Gemini 응답: text 안에 JSON 문자열
      let raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (typeof raw === "string") {
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
          .trim();

        try {
          const parsed = JSON.parse(cleaned);
          console.log("[DEBUG] text JSON 파싱 성공:", parsed);
          return parsed;
        } catch (e) {
          console.warn("[DEBUG] text JSON 파싱 실패, raw =", raw, e);
        }
      }

      // 2) 혹시 서버에서 이미 { objects: [...] }로 줄 때
      if (data && Array.isArray(data.objects)) {
        console.log("[DEBUG] data.objects 직접 사용");
        return data;
      }

      // 3) Google API 에러 포맷
      if (data?.error) {
        console.error("[DEBUG] Gemini API 에러:", data.error);
        throw new Error(data.error.message || "Gemini API error");
      }

      throw new Error("예상치 못한 Gemini 응답 형식");
    };

    // ── 5) 장면 구성 함수들 ────────────────────────
    const createCelestialObject = (objData: any) => {
      const orbit = new THREE.Object3D();

      console.log("[DEBUG] createCelestialObject 원본:", objData);

      const geometry = new THREE.SphereGeometry(num(objData.size, 5), 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: toThreeColor(objData.color),
      });
      const mesh = new THREE.Mesh(geometry, material);

      if (!objData.orbit || !objData.orbit.target) {
        solarSystem.add(mesh);
      } else {
        mesh.position.x = num(objData.orbit.distance, 0);
        orbit.add(mesh);
      }

      (orbit.userData as any).orbitSpeed = objData.orbit
        ? num(objData.orbit.speed, 0)
        : 0;
      (mesh.userData as any).rotationSpeed = num(objData.rotation_speed, 0);

      objectsToAnimate.push({ orbit, mesh });

      console.log("[DEBUG] 생성된 오브젝트:", {
        name: objData.name,
        size: geometry.parameters.radius * 2,
        color: objData.color,
        rotation_speed: (mesh.userData as any).rotationSpeed,
        orbit_speed: (orbit.userData as any).orbitSpeed,
        hasOrbit: !!(objData.orbit && objData.orbit.target),
      });

      return { mesh, orbit };
    };

    const buildSceneFromJSON = (data: any) => {
      console.log("[DEBUG] buildSceneFromJSON 시작:", data);

      const map: Record<string, { mesh: THREE.Mesh; orbit: THREE.Object3D }> =
        {};
      data.objects.forEach((objData: any, idx: number) => {
        const { mesh, orbit } = createCelestialObject(objData);
        map[objData.name] = { mesh, orbit };
        console.log(
          `[DEBUG] [${idx}] 생성 완료 ->`,
          objData.name,
          "| orbit?",
          !!objData.orbit
        );
      });

      data.objects.forEach((objData: any) => {
  if (!(objData.orbit && objData.orbit.target)) return;

  const parent = map[objData.orbit.target];
  const child = map[objData.name];
  if (!child) return;

  // 부모 mesh (없으면 solarSystem을 기본 부모로 사용)
  const parentMesh: THREE.Object3D = parent?.mesh ?? solarSystem;

  if (!parent) {
    console.warn(
      "[DEBUG] 부모/자식 참조 실패:",
      objData.name,
      "→",
      objData.orbit.target,
      "=> 루트(solarSystem)에 연결합니다."
    );
  }

  // 혹시 이미 다른 부모가 있으면 떼어내기
  if (child.orbit.parent) {
    child.orbit.parent.remove(child.orbit);
  }
  parentMesh.add(child.orbit);

  console.log(
    "[DEBUG] 부모-자식 연결:",
    `${objData.name} -> ${objData.orbit.target || "solarSystem"}`
  );
});

      console.log(
        "[DEBUG] buildSceneFromJSON 완료:",
        "solarSystem children =",
        solarSystem.children.length
      );
      fitCameraToObject(solarSystem, 1.6);
    };

    const clearScene = () => {
      for (let i = objectsToAnimate.length - 1; i >= 0; i--) {
        const { mesh, orbit } = objectsToAnimate[i];
        if (mesh.parent) mesh.parent.remove(mesh);
        if (orbit.parent) orbit.parent.remove(orbit);
        if ((mesh as any).geometry) (mesh as any).geometry.dispose();
        const mats: any = (mesh as any).material;
        (Array.isArray(mats) ? mats : [mats]).forEach(
          (m) => m && (m as any).dispose && (m as any).dispose()
        );
      }
      while (solarSystem.children.length > 0) {
        solarSystem.remove(solarSystem.children[0]);
      }
      objectsToAnimate.length = 0;

      console.log(
        "[DEBUG] clearScene 완료:",
        "solarSystem children =",
        solarSystem.children.length,
        "objectsToAnimate =",
        objectsToAnimate.length
      );
    };

    // ── 6) 애니메이션 루프 ─────────────────────────
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      for (const obj of objectsToAnimate) {
        const os = (obj.orbit.userData as any).orbitSpeed;
        const rs = (obj.mesh.userData as any).rotationSpeed;
        if (Number.isFinite(os)) obj.orbit.rotation.y += os;
        if (Number.isFinite(rs)) obj.mesh.rotation.y += rs;
      }
      renderer.render(scene, camera);
    };
    animate();

    // 마우스 드래그 회전
    let isDragging = false;
    const onMouseDown = () => {
      isDragging = true;
    };
    const onMouseUp = () => {
      isDragging = false;
    };
    const onMouseLeave = () => {
      isDragging = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      solarSystem.rotation.y += e.movementX * 0.005;
      solarSystem.rotation.x += e.movementY * 0.005;
    };
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("mouseup", onMouseUp);
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);
    renderer.domElement.addEventListener("mousemove", onMouseMove);

    // ── 7) 리사이즈 대응 ───────────────────────────
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
      console.log("[DEBUG] 리사이즈:", rect.width, rect.height);
    };
    window.addEventListener("resize", handleResize);

    // ── 8) HUD 버튼 이벤트 연결 ─────────────────────
    const promptInput = document.getElementById(
      "prompt-input"
    ) as HTMLInputElement | null;
    const generateButton = document.getElementById(
      "generate-button"
    ) as HTMLButtonElement | null;
    const statusText = document.getElementById(
      "status"
    ) as HTMLSpanElement | null;

    const handleGenerate = async (overridePrompt?: string) => {
      const basePrompt = overridePrompt || promptInput?.value || "";
      const userInput = basePrompt.trim();
      if (!userInput) return;

      if (promptInput && overridePrompt) {
        // 외부(Welcome/Chat)에서 온 프롬프트를 HUD에 반영
        promptInput.value = overridePrompt;
      }

      if (statusText) statusText.textContent = "AI가 생성 중입니다...";
      if (generateButton) generateButton.disabled = true;

      try {
        clearScene();
        const jsonData = await getJsonFromAI(userInput);
        console.log("[DEBUG] AI(JSON)로부터 받은 데이터:", jsonData);
        buildSceneFromJSON(jsonData);
        if (statusText) statusText.textContent = "생성 완료!";
      } catch (err) {
        console.error("[DEBUG] 생성 중 오류:", err);
        if (statusText)
          statusText.textContent = "오류가 발생했습니다. 콘솔을 확인해주세요.";
      } finally {
        if (generateButton) generateButton.disabled = false;
      }
    };

    const onGenerateClick = () => handleGenerate();
    generateButton?.addEventListener("click", onGenerateClick);

    // 🔹 외부(Welcome / Chat)에서 프롬프트로 장면 생성할 수 있게 ref에 등록
    externalGenerateRef.current = (prompt: string) => {
      handleGenerate(prompt);
    };

    // 🔹 Welcome에서 넘어온 initialPrompt가 있으면 한 번 자동 실행
    if (initialPrompt && !autoRunRef.current) {
      autoRunRef.current = true;
      handleGenerate(initialPrompt);
    }

    // ── 9) 클린업 ──────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("mouseup", onMouseUp);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      generateButton?.removeEventListener("click", onGenerateClick);
      externalGenerateRef.current = null;
      renderer.dispose();
      clearScene();
    };
  }, [screen, initialPrompt]);

  // ── WELCOME ───────────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div className="min-h-screen relative tone-darkblue">
        <StarBackdrop />
        <HeaderBar onToggleUnits={() => { /* ... */ }} />

        <div className="fixed inset-0 flex items-center justify-center px-4 pt-20 z-10">
          <div
            className="
              w-full max-w-4xl
              rounded-2xl
              bg-white/95
              border border-slate-300
              shadow-[0_20px_60px_rgba(15,23,42,0.55)]
              px-8 md:px-10 py-8
              flex flex-col gap-6
            "
          >
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">
                어서오세요
              </h1>
              <p className="text-sm md:text-base text-slate-700">
                지구과학 3D 보조교재입니다. 메시지를 입력하면 태양계 장면 생성
                화면으로 이동합니다.
              </p>
            </div>

            <WelcomeInput onStart={handleStart} />
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN ─────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden relative tone-darkblue">
      <StarBackdrop />
      <HeaderBar onToggleUnits={() => { /* ... */ }} />

      <div
        className="relative z-10 w-screen h-full p-4 pt-16 grid gap-4 min-h-0"
        style={{ gridTemplateRows: "minmax(0,2fr) minmax(0,1fr)" }}
      >
        {/* 3D 영역 */}
<div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-3 overflow-hidden">
  <div className="relative w-full h-full rounded-xl border border-white/10 bg-[#0b1220]/80">
    {/* three.js가 붙을 자리 (HUD 입력창 제거) */}
    <div
      id="three-mount"
      ref={threeMountRef}
      className="absolute inset-0 flex items-center justify-center"
    >
      {/* 초기 안내 문구만 남기고 싶으면 유지, 아니면 이 span도 지워도 됨 */}
      <span className="text-cyan-100/70 text-sm">
        장면을 생성하려면 아래 채팅창에 프롬프트를 입력하세요 ✨
      </span>
    </div>
  </div>
</div>


        {/* 채팅 영역 */}
        <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 overflow-hidden min-h-0">
          <h2 className="text-cyan-200 font-medium mb-2">대화</h2>
          <div className="h-[calc(100%-2rem)] min-h-0 overflow-hidden">
            <ChatPanel messages={messages} onSend={handleSend} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTS ─────────────────────────────────────────────
function WelcomeInput({ onStart }: { onStart: (text: string) => void }) {
  const [val, setVal] = useState("");
  const send = () => {
    const t = val.trim();
    if (!t) return;
    onStart(t);
  };
  return (
    <div className="mt-3 w-full">
      <div className="mx-auto flex w-full max-w-4xl gap-3">
        {/* 입력 영역 */}
        <div className="flex-1 flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 shadow-inner">
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
            placeholder="예: 달을 지구 뒤에 두고 궤도를 보여줘"
            className="
              flex-1 min-h-[40px] max-h-28
              resize-none
              bg-transparent
              text-sm md:text-base
              text-slate-900 placeholder:text-slate-400
              outline-none
            "
          />
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={send}
          className="
            h-[44px] px-6
            rounded-xl
            bg-slate-900 text-white
            text-sm font-medium
            shadow
            hover:bg-black
            active:scale-[0.98]
            transition
          "
        >
          시작
        </button>
      </div>
    </div>
  );
}
