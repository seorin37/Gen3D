from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 라우터 불러오기
from backend.routers import scene_router, object_router, animation_router

app = FastAPI(title="Text3D Backend")

# -------------------------------------------------
#  CORS 설정 (React, Three.js 등에서 접근 가능하게)
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 배포 시 React 도메인으로 교체
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
#  정적 파일 (obj, mtl, texture, js) 접근 가능하게
# -------------------------------------------------
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

# -------------------------------------------------
#  라우터 등록
# -------------------------------------------------
app.include_router(scene_router.router)
app.include_router(object_router.router)
app.include_router(animation_router.router)

# -------------------------------------------------
#  기본 테스트 엔드포인트
# -------------------------------------------------
@app.get("/")
def root():
    return {"message": "Text3D Backend is running"}
