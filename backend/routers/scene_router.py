from fastapi import APIRouter
from backend.database.mongo_connector import db
from backend.models.scene_model import SceneModel

router = APIRouter(prefix="/scene", tags=["Scene"])
scene_collection = db["scenes"]
object_collection = db["objects"]
animation_collection = db["animations"]

# ------------------------------
#  Scene 생성
# ------------------------------
@router.post("/add")
def add_scene(scene: SceneModel):
    result = scene_collection.insert_one(scene.dict())
    return {"message": "Scene added", "id": str(result.inserted_id)}

# ------------------------------
#  Scene 불러오기 (Objects + Animations 포함)
# ------------------------------
@router.get("/{scene_name}")
def get_scene(scene_name: str):
    scene = scene_collection.find_one({"scene_name": scene_name})
    if not scene:
        return {"error": "Scene not found"}

    # 관련 Object/Animation 정보 함께 반환
    objects = list(object_collection.find({"name": {"$in": scene.get("objects", [])}}))
    animations = list(animation_collection.find({"name": {"$in": scene.get("animations", [])}}))

    for o in objects: o["_id"] = str(o["_id"])
    for a in animations: a["_id"] = str(a["_id"])

    return {
        "scene_name": scene["scene_name"],
        "objects": objects,
        "animations": animations
    }
