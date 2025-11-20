from fastapi import APIRouter
from backend.database.mongo_connector import db
from backend.models.animation_model import AnimationModel

router = APIRouter(prefix="/animation", tags=["Animation"])
animation_collection = db["animations"]

# ------------------------------
#  애니메이션 등록
# ------------------------------
@router.post("/add")
def add_animation(animation: AnimationModel):
    result = animation_collection.insert_one(animation.dict())
    return {"message": "Animation added", "id": str(result.inserted_id)}

# ------------------------------
#  전체 조회
# ------------------------------
@router.get("/")
def get_all_animations():
    animations = list(animation_collection.find())
    for a in animations:
        a["_id"] = str(a["_id"])
    return animations
