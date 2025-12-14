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
│   ├── routers/                 # prompt, scene, object API
│   ├── ai/                      # Gemini LLM 호출 모듈
│   ├── database/                # Mongo 연결 및 데이터 삽입 스크립트
│   └── static/                  # OBJ / MTL / textures 제공 경로
│
├── frontend/                    # React + Three.js 클라이언트
│   ├── public/
│   │   ├── scenarios/           # 애니메이션 JS 파일들
│   │   └── static/assets/       # 행성 OBJ, MTL, 텍스처
│   ├── src/
│   │   ├── components/          # ThreeCanvas, ChatPanel 등
│   │   ├── AIClient.js          # 서버와 통신 역할
│   │   ├── threeEngine.ts       # 애니메이션 엔진
│   │   └── main.tsx, index.html
│   └── ...
│
├── functional_integration/      # 실험용 테스트 코드
│
├── .gitignore                   # 보안 및 Git 관리 파일
└── README.md                    # (이 문서)
'''

---
# 3. 자연어 처리 → 장면 생성 전체 흐름

```text
1) 사용자 입력 (ChatPanel)
↓
2) 프론트엔드 → FastAPI(/prompt/scene) 요청
↓
3) LLM이 SceneGraph JSON 생성
↓
4) FastAPI가 MongoDB에서 오브젝트 정보 매핑
↓
5) 최종 SceneGraph(JSON) 프론트로 반환
↓
6) ThreeCanvas가 3D 모델 로드 후 렌더링
↓
7) 필요 시 애니메이션(scenarios/*.js) 실행

---
# 4. SceneGraph 형식 (LLM 출력 예시)

```text
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
# 5. 프론트엔드 구성 설명
## 5.1 ThreeCanvas.tsx

SceneData(JSON)를 받아 Three.js 객체로 변환

OBJ/MTL 로더 사용

애니메이션 엔진 실행 (scenarios/*.js)

카메라 처리 / 조명 처리 포함

##5.2 ChatPanel.tsx

사용자 입력 UI

채팅 로그 유지

서버 요청 후 system 메시지 삽입

##5.3 Welcome.tsx

초기 화면 (시작하기 버튼)

게임형 UI 구조

---
#6. 애니메이션 개발 가이드 (프론트 팀원용)
각 애니메이션은 다음 규칙을 따라 /public/scenarios/ 폴더에 JS 파일로 생성됨.

##6.1 기본 템플릿

```text
export function initYourAnimation(scene, objects) {
    // scene  : Three.js Scene 객체
    // objects: { name: "Earth", mesh: THREE.Mesh } 형태

    const earth = objects["Earth"].mesh;

    function update(dt) {
        earth.rotation.y += dt * 0.5;
    }

    return { update };
}

## 6.2 연결 방식
SceneGraph.animations 에 이름이 들어오면 자동 실행됨.

예:


```text
"animations": ["giant_impact"]


→ /public/scenarios/SceneGiantImpact.js 실행



