export async function getJsonFromAI(userInput) {
  const promptTemplate = `
  당신은 3D 천체 물리학 시뮬레이션 전문가입니다.
  사용자의 요청을 분석하여 **5가지 시나리오 중 하나**를 선택하고 JSON 장면을 만들어 주세요.

  반드시 아래 형식으로만 순수 JSON을 반환하세요:

  {
    "scenarioType": "...",
    "objects": [
      { "name": "...", "textureKey": "...", "size": 10, "position": {"x":0, "y":0, "z":0}, "velocity": {"x":0, "y":0, "z":0} }
    ]
  }

  사용자 입력: "${userInput}"
  JSON 응답:
  `.trim();

  try {
    console.log("🚀 [Frontend] 백엔드로 요청 보냄...");
    
    // 1. 요청 전송
    const res = await fetch("http://localhost:8000/prompt/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptTemplate })
    });

    if (!res.ok) {
      throw new Error(`백엔드 오류! 상태코드: ${res.status}`);
    }

    // 2. 응답 수신
    const responseData = await res.json();
    console.log("📥 [Frontend] 백엔드 응답 도착:", responseData);

    // 3. 데이터 추출 (안전 장치 추가)
    let text = "";
    
    if (responseData.data) {
        // 백엔드가 { data: "..." } 로 줄 때 (최신 코드)
        text = responseData.data;
    } else if (responseData.scene && responseData.scene.setup) {
        // 백엔드가 { scene: { setup: "..." } } 로 줄 때 (구 버전)
        text = responseData.scene.setup;
    } else if (responseData.candidates) {
        // 구글 API 원본 형식이 그대로 왔을 때 (비상용)
        text = responseData.candidates[0].content.parts[0].text;
    } else {
        console.error("⚠️ 알 수 없는 데이터 형식:", responseData);
        throw new Error("백엔드 응답에서 텍스트를 찾을 수 없습니다.");
    }

    // 4. 마크다운 제거 및 JSON 파싱
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    console.log("🧹 정제된 JSON 문자열:", cleaned);

    // 5. 진짜 자바스크립트 객체로 변환해서 반환
    return JSON.parse(cleaned);

  } catch (err) {
    console.error("❌ [AIClient Error]", err);
    throw err; 
  }
}