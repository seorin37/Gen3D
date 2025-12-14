import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import scene_router, object_router, animation_router, prompt_router, local_prompt_router
from dotenv import load_dotenv

# 1. .env 파일 로드
load_dotenv()

# [선택] API 키가 잘 로드됐는지 확인 (보안을 위해 앞 5자리만 출력)
key = os.getenv("GEMINI_API_KEY")
if key:
    print(f"=== Loaded GEMINI_API_KEY: {key[:5]}... (Length: {len(key)}) ===")
else:
    print("=== GEMINI_API_KEY NOT FOUND ===")

app = FastAPI(title="Text3D Backend")

# =================================================
# [수정된 부분] CORS 설정 (가장 확실한 개발용 설정)
# =================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 모든 주소(프론트엔드) 허용
    allow_credentials=False,  # [핵심] "*"를 쓸 때는 이걸 꺼야 에러가 안 납니다!
    allow_methods=["*"],      # 모든 HTTP 메소드(GET, POST 등) 허용
    allow_headers=["*"],      # 모든 헤더 허용
)
# =================================================

# 3. 정적 파일 경로 (이미지, 3D 모델 등)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 4. 라우터 등록 (기능 연결)
app.include_router(scene_router.router)
app.include_router(object_router.router)
app.include_router(animation_router.router)
app.include_router(prompt_router.router)
app.include_router(local_prompt_router.router)

# 5. 기본 접속 테스트
@app.get("/")
def root():
    return {"message": "Text3D Backend is running"}