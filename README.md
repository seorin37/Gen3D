# 📘 Gen3D 프로젝트 README

AI 기반 자연어 → 3D 장면 생성 프로젝트

---

# 1. 프로젝트 개요

Gen3D는 사용자가 입력한 자연어 문장을  
LLM(Gemini → 추후 GPT 지원 예정)이 해석하여  
**Three.js 기반 3D 장면으로 렌더링하는 AI 기반 시각화 플랫폼입니다.**

### 예시 명령어
- “태양계를 보여줘” → 3D Solar System Scene  
- “달을 지구 뒤에 두고 궤도를 보여줘” → 사용자 정의 Scene  
- “지구 탄생 과정을 보여줘” → 애니메이션 기반 Scene  

---

# 2. 폴더 구조

```text
text3d_project/
│
├── backend/                     # FastAPI 서버
│   ├── main.py                  # 서버 엔트리포인트
│   ├── routers/                 # prompt, scene, object API 라우터
│   ├── ai/                      # LLM(Gemini/GPT) 호출 모듈
│   ├── database/                # Mongo 연결 및 데이터 삽입 스크립트
│   ├── static/                  # OBJ / MTL / Texture 제공 경로
│   └── models/                  # SceneGraph 데이터 모델
│
├── frontend/                    # React + Three.js 기반 클라이언트
│   ├── public/                  # 정적 파일
│   │   ├── scenarios/           # 애니메이션 JS 파일들
│   │   └── static/assets/       # OBJ, MTL, 텍스처 이미지
│   ├── src/
│   │   ├── components/          # UI (ThreeCanvas, ChatPanel 등)
│   │   ├── threeEngine.ts       # Three.js 엔진
│   │   ├── AIClient.js          # 서버와 통신
│   │   └── main.tsx, App.tsx    # React 엔트리
│
├── functional_integration/      # 실험용 테스트 코드
│
├── .gitignore                   # 보안 및 Git 관리 설정
└── README.md                    # 이 문서


---
---

# 3. 자연어 처리 → 장면 생성 전체 흐름

Gen3D는 아래와 같은 흐름으로 자연어를 3D 장면으로 변환합니다.

1) 사용자 입력 (ChatPanel)  
↓  
2) 프론트엔드 → FastAPI(`/prompt/scene`) 요청  
↓  
3) LLM이 SceneGraph(JSON) 생성  
↓  
4) FastAPI가 MongoDB에서 오브젝트 정보 매핑  
↓  
5) 최종 SceneGraph(JSON)를 프론트로 반환  
↓  
6) ThreeCanvas가 3D 모델 로드 후 렌더링  
↓  
7) 필요한 경우 `/public/scenarios/*.js` 애니메이션 실행  

---

# 4. SceneGraph 형식 (LLM 출력 예시)

```json
{
  "scenarioType": "solar_system",
  "objects": [
    {
      "name": "Sun",
      "orbit": null,
      "rotation_speed": 0.01
    },
    {
      "name": "Earth",
      "orbit": 20,
      "rotation_speed": 0.02
    }
  ],
  "animations": ["orbit"],
  "camera": {
    "position": [0, 50, 120],
    "lookAt": [0, 0, 0]
  }
}
---
---

# 5. 프론트엔드 구성 설명

Gen3D의 프론트엔드는 React + Three.js 구조로 이루어져 있으며, 주요 컴포넌트는 아래와 같습니다.

---

## 5.1 ThreeCanvas.tsx

ThreeCanvas는 SceneGraph(JSON)를 실제 3D 장면으로 렌더링하는 핵심 엔진입니다.

### 주요 기능
- SceneGraph(JSON)를 Three.js Mesh로 변환
- OBJ / MTL / Texture 자동 로딩
- 카메라/조명 초기 설정
- 애니메이션 시스템(scenarios/*.js) 연동
- FPS 기반 update(dt) 루프 처리

---

## 5.2 ChatPanel.tsx

사용자 입력을 받아 LLM API로 보내는 채팅 UI입니다.

### 역할
- 입력창 + 전송 버튼
- 사용자 및 시스템 메시지 출력
- 대화 기록 유지
- 서버 오류/응답 처리

---

## 5.3 Welcome.tsx

애플리케이션의 첫 화면 역할을 담당합니다.

### 특징
- “시작하기” 버튼 UI
- 메인 화면이 등장하기 전 로딩 또는 안내 역할
- 영상형/게임형 UX 구성에 적합

---

# 6. 애니메이션 개발 가이드 (프론트엔드 팀원용)

Gen3D의 애니메이션은 Three.js의 render loop와 별도로 동작하는 독립 모듈입니다.  
프론트 팀원들은 `/public/scenarios/` 폴더에서 JS 파일만 추가하면 기능이 자동 연결됩니다.

---

## 6.1 기본 템플릿

아래 템플릿을 그대로 복사하여 새로운 애니메이션을 만들 수 있습니다.

```js
export function initYourAnimation(scene, objects) {
    // scene  : Three.js Scene 객체
    // objects: { name: "Earth", mesh: THREE.Mesh } 형태

    const earth = objects["Earth"].mesh;

    function update(dt) {
        // dt = delta time
        earth.rotation.y += dt * 0.5;
    }

    return { update };
}

---

## 6.2 애니메이션 실행 방식

SceneGraph의 `"animations"` 항목에 애니메이션 이름이 포함되면,  
프론트엔드는 자동으로 해당 애니메이션 파일을 `/public/scenarios/` 폴더에서 찾아 로드합니다.

### 예시 SceneGraph 입력
```json
{
  "animations": ["giant_impact"]
}


