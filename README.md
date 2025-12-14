📘 Gen3D 프로젝트 README

AI 기반 자연어 → 3D 장면 생성 프로젝트

#️⃣ 1. 프로젝트 개요

Gen3D는 사용자가 입력한 자연어 문장을 LLM(Gemini → GPT 지원 예정)이 해석하여
Three.js 기반 3D 장면으로 렌더링하는 AI 기반 시각화 플랫폼입니다.

예시:

“태양계를 보여줘” → 3D Solar System Scene

“달을 지구 뒤에 두고 공전하게 해줘” → 사용자 정의 Scene

“지구 탄생 과정을 보여줘” → 애니메이션 기반 Scene

#️⃣ 2. 폴더 구조
text3d_project/
│
├── backend/                        # FastAPI 서버
│   ├── main.py                     # 서버 엔트리 포인트
│   ├── routers/                    # prompt, scene, object API
│   ├── ai/                         # LLM(Gemini) 호출 모듈
│   ├── database/                   # Mongo 연결 및 데이터 삽입 스크립트
│   └── static/                     # OBJ / MTL / textures 제공 경로
│
├── frontend/                       # React + Three.js 클라이언트
│   ├── public/
│   │   ├── scenarios/              # 애니메이션 JS 파일들
│   │   └── static/assets/          # 행성 OBJ, MTL, 텍스처
│   ├── src/
│   │   ├── components/             # 화면 UI (ThreeCanvas / ChatPanel 등)
│   │   ├── threeEngine.ts          # 애니메이션 엔진
│   │   └── AIClient.js             # 서버와 통신 역할
│   └── index.html, main.tsx ...
│
├── functional_integration/         # 실험용 테스트 코드
│
├── .gitignore                      # 보안 및 Git 관리 파일
└── README.md                       # 문서 (지금 이 문서!)

#️⃣ 3. 데이터 흐름
사용자 입력  
→ 프론트(AIClient.js)  
→ FastAPI(/prompt/scene)  
→ LLM이 SceneGraph 생성  
→ MongoDB에서 오브젝트 정보 매핑  
→ SceneGraph JSON 반환  
→ ThreeCanvas 렌더링  
→ 애니메이션 JS 실행

#️⃣ 4. Backend 인수인계 포인트
✔ 서버 실행
cd backend
uvicorn main:app --reload --port 8000

✔ .env (GitHub 업로드 금지)
GEMINI_API_KEY=xxxx
MONGO_URL=mongodb+srv://xxxx

✔ 주요 라우터
파일	설명
prompt_router.py	LLM 호출 후 SceneGraph 생성
local_prompt_router.py	LLM 없이 로컬 프리셋 제공
object_router.py	DB 오브젝트 조회
scene_router.py	프리셋 Scene 처리
✔ MongoDB assets 구조

DB에는 행성 정보, OBJ 경로, 텍스처 파일 위치 등이 저장됨.

#️⃣ 5. Frontend 인수인계 포인트
✔ 실행 방법
cd frontend
npm install
npm run dev

✔ 핵심 컴포넌트
파일	기능
ThreeCanvas.tsx	객체 로딩 + 애니메이션 처리 + 렌더링
ChatPanel.tsx	메시지 입력 + 채팅 UI
Welcome.tsx	초기 화면
threeEngine.ts	행성 자전/공전 등 애니메이션 처리
#️⃣ 6. LLM & Local 프리셋 모드

현재 시스템은 두 가지 모드로 동작 가능함.

⭐ 1) LLM 기반 SceneGraph 생성 모드

정식 모드. Gemini API를 통해 장면을 자동 생성.

⭐ 2) Local 프리셋 모드

Gemini API 제한 시 개발자 테스트용.

예: scene_router.py, /public/scenarios/SceneSolarSystem.js

필요 시 언제든 두 모드를 전환 가능함.

#️⃣ 7. 애니메이션 개발 가이드 (프론트 팀원용)

모든 애니메이션은 다음 경로에 저장됨:

frontend/public/scenarios/

✔ 기본 애니메이션 템플릿
export function initMyAnimation(scene, camera, objects) {
    let frame = 0;

    function animate() {
        frame++;

        // 예시: 지구 자전
        if (objects["Earth"]) {
            objects["Earth"].rotation.y += 0.01;
        }

        // 예시: 달 공전
        if (objects["Moon"] && objects["Earth"]) {
            const r = 30;
            objects["Moon"].position.x = objects["Earth"].position.x + Math.cos(frame * 0.01) * r;
            objects["Moon"].position.z = objects["Earth"].position.z + Math.sin(frame * 0.01) * r;
        }

        requestAnimationFrame(animate);
    }

    animate();
}

✔ 네이밍 규칙

파일명은 SceneXXXX.js

export 함수명은 initXXXX

모든 애니메이션은 내부에서 requestAnimationFrame() 사용

전역 변수 지양

#️⃣ 8. 협업 가이드 (Git Branch 전략)

추천 브랜치 구조:

main                         # 실제 운영/배포
new_uni                      # UI/기능 리뉴얼 개발
feature/animation-xxx        # 애니메이션 개발
feature/ui-xxx               # UI 기능 추가
feature/backend-xxx          # 서버 기능 확장

PR 방식

feature 브랜치 생성

개발

PR 생성

코드리뷰 후 merge

#️⃣ 9. GitHub 업로드 시 보안 주의사항

아래 파일/폴더는 절대 GitHub에 올리면 안 됨:

.env
*.pem
*.key
*.cert
.DS_Store
__pycache__/
backend/database/*.pyc
frontend/node_modules/


이미 .gitignore에 반영되어 있음.

#️⃣ 10. 향후 확장 가능성

GPT, Claude 멀티 모델 지원

애니메이션 에디터 UI 제공

Three.js에서 WebGPU로 업그레이드

교육용 패키지로 확장 가능

비주얼 시뮬레이션 강화(중력/충돌 물리)
