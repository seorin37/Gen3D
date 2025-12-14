'''
from fastapi import APIRouter
from database.mongo_connector import db
from models.scene_model import SceneModel


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
'''
from fastapi import APIRouter
from bson import ObjectId, Regex
from database.mongo_connector import db
from models.scene_model import SceneModel

router = APIRouter(prefix="/scene", tags=["Scene"])

scene_collection = db["scenes"]
object_collection = db["objects"]
animation_collection = db["animations"]


# =======================================================
#  Helper: Object 이름 목록을 풀(full document)로 확장
#  — 대소문자 무시 검색(불일치 해결 핵심)
# =======================================================
def resolve_objects(object_refs):
    resolved = []

    for ref in object_refs:
        name = ref.name.strip()

        # 대소문자 무시 검색
        obj = object_collection.find_one({"name": Regex(f"^{name}$", "i")})

        if not obj:
            print(f"[WARN] Object '{name}' not found in DB")
            continue

        obj["_id"] = str(obj["_id"])
        resolved.append(obj)

    return resolved


# =======================================================
#  Helper: Animation 이름 목록 확장
# =======================================================
def resolve_animations(anim_refs):
    resolved = []

    for ref in anim_refs:
        name = ref.name.strip()

        anim = animation_collection.find_one({"name": Regex(f"^{name}$", "i")})

        if not anim:
            print(f"[WARN] Animation '{name}' not found in DB")
            continue

        anim["_id"] = str(anim["_id"])
        resolved.append(anim)

    return resolved



# =======================================================
#  Scene 저장
# =======================================================
@router.post("/save")
def save_scene(scene: SceneModel):

    expanded_objects = resolve_objects(scene.objects)
    expanded_animations = resolve_animations(scene.animations)

    doc = {
        "scenarioType": scene.scenarioType,
        "objects": expanded_objects,
        "animations": expanded_animations,
        "camera": scene.camera.dict() if scene.camera else None
    }

    result = scene_collection.insert_one(doc)

    return {
        "message": "Scene saved",
        "id": str(result.inserted_id)
    }



# =======================================================
#  Scene 조회
# =======================================================
@router.get("/{scene_id}")
def get_scene(scene_id: str):
    scene = scene_collection.find_one({"_id": ObjectId(scene_id)})
    if not scene:
        return {"error": "Scene not found"}

    scene["_id"] = str(scene["_id"])
    return scene



# =======================================================
#  Scene 전체 목록 조회
# =======================================================
@router.get("/")
def list_scenes():
    scenes = list(scene_collection.find({}, {"objects": 0, "animations": 0}))

    for s in scenes:
        s["_id"] = str(s["_id"])

    return scenes