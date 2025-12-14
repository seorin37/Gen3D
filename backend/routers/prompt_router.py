# prompt_router.py
'''
from fastapi import APIRouter
from pydantic import BaseModel
from ai.gemini_client import parse_prompt_with_gemini
from database.mongo_connector import db, prompt_collection

router = APIRouter(prefix="/prompt", tags=["Prompt"])

class PromptRequest(BaseModel):
    prompt: str


@router.post("/scene")
def generate_scene(req: PromptRequest):

    # 1) Gemini SceneGraph 생성
    ai_result = parse_prompt_with_gemini(req.prompt)

    if ai_result.get("status") != "success":
        return {"error": ai_result.get("message", "LLM Error")}

    scene_graph = ai_result["scene"]

    # Mongo Objects Collection
    objects_col = db["objects"]
    
    expanded_objects = []

    # -----------------------------
    # 2) Object 매핑 (DB 필요)
    # -----------------------------
    for obj in scene_graph.get("objects", []):
        name = obj["name"]

        db_obj = objects_col.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        
        if not db_obj:
            return {"error": f"Object '{name}' not found in DB"}

        db_obj["_id"] = str(db_obj["_id"])
        expanded_objects.append(db_obj)

    # -----------------------------
    # 3) Animation 매핑 제거
    # -----------------------------
    # 애니메이션은 DB에 저장하지 않고 프론트의 JS로 실행한다.
    # 따라서 단순히 이름 목록만 프론트로 넘긴다.

    animation_names = [anim["name"] for anim in scene_graph.get("animations", [])]

    # -----------------------------
    # 4) 최종 SceneGraph 구성
    # -----------------------------
    final_scene = {
        "scenarioType": scene_graph.get("scenarioType"),
        "objects": expanded_objects,      # DB 매핑됨
        "animations": animation_names,    # JS에서 실행됨
        "camera": scene_graph.get("camera")
    }

    return {
        "status": "success",
        "scene": final_scene
    }
'''
'''
from fastapi import APIRouter
from pydantic import BaseModel
from bson import ObjectId
from ai.gemini_client import parse_prompt_with_gemini
from database.mongo_connector import db

router = APIRouter(prefix="/prompt", tags=["Prompt"])

class PromptRequest(BaseModel):
    prompt: str

def convert_objid(data):
    if isinstance(data, ObjectId):
        return str(data)
    if isinstance(data, dict):
        return {k: convert_objid(v) for k, v in data.items()}
    if isinstance(data, list):
        return [convert_objid(i) for i in data]
    return data

@router.post("/scene")
def generate_scene(req: PromptRequest):
    # 1) LLM 호출
    ai_result = parse_prompt_with_gemini(req.prompt)

    if ai_result.get("status") != "success":
        return {"error": ai_result.get("message")}

    scene_graph = ai_result["scene"]

    # 컬렉션 핸들
    objects_col = db["objects"]

    expanded_objects = []

    # 2) LLM 오브젝트를 DB 오브젝트와 매핑
    for obj in scene_graph.get("objects", []):
        name = obj["name"]

        # 대소문자 무시 검색
        db_obj = objects_col.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})

        if not db_obj:
            return {"error": f"Object '{name}' not found in MongoDB"}

        # Three.js가 이해할 수 있도록 OBJ 정보를 포함  
        expanded_objects.append({
            "_id": str(db_obj["_id"]),
            "name": db_obj["name"],
            "category": db_obj.get("category"),
            "obj_path": db_obj.get("obj_path"),
            "mtl_path": db_obj.get("mtl_path"),
            "texture_path": db_obj.get("texture_path"),
            "scale": db_obj.get("scale", 1),
            "orbit": obj.get("orbit"),
            "rotation_speed": obj.get("rotation_speed", 0.01)
        })

    # 3) 최종 Scene 데이터 구성
    final_scene = {
        "scenarioType": scene_graph.get("scenarioType"),
        "objects": expanded_objects,
        "animations": scene_graph.get("animations", []),
        "camera": scene_graph.get("camera", {})
    }

    return {"status": "success", "scene": final_scene}
'''
from fastapi import APIRouter
from pydantic import BaseModel
from bson import ObjectId
from ai.gemini_client import parse_prompt_with_gemini
from database.mongo_connector import db

router = APIRouter(prefix="/prompt", tags=["Prompt"])


class PromptRequest(BaseModel):
    prompt: str


# -------------------------------
# A. 한국어/영어 planet alias 매핑
# -------------------------------
PLANET_ALIASES = {
    "sun": ["sun", "태양"],
    "mercury": ["mercury", "수성"],
    "venus": ["venus", "금성"],
    "earth": ["earth", "지구"],
    "moon": ["moon", "달"],
    "mars": ["mars", "화성"],
    "jupiter": ["jupiter", "목성"],
    "saturn": ["saturn", "토성"],
    "uranus": ["uranus", "천왕성"],
    "neptune": ["neptune", "해왕성"],
}

ALL_PLANETS = list(PLANET_ALIASES.keys())


# -------------------------------
# B. 프리셋 기반 태양계 장면 생성
# -------------------------------
def create_local_scene(prompt: str):

    prompt_lower = prompt.lower()

    # 1) 전체 태양계 요청
    if "태양계" in prompt or "solar" in prompt:
        selected = ALL_PLANETS

    # 2) 특정 행성 요청
    else:
        selected = []
        for eng, aliases in PLANET_ALIASES.items():
            for a in aliases:
                if a in prompt_lower or a in prompt:
                    selected.append(eng)

    if not selected:
        return None  # 프론트에서 "장면 생성 실패" 출력됨

    scene_graph = {
        "scenarioType": "solar_system",
        "objects": [
            {
                "name": name.capitalize(),
                "orbit": {"radius": i * 25, "speed": 0.003 + i * 0.0005},
                "rotation_speed": 0.01
            }
            for i, name in enumerate(selected)
        ],
        "animations": [],
        "camera": {"target": selected[0].capitalize()}
    }
    return scene_graph


# -------------------------------
# C. 실제 라우터
# -------------------------------
@router.post("/scene")
def generate_scene(req: PromptRequest):

    # 1) LLM 호출
    ai_result = parse_prompt_with_gemini(req.prompt)

    if ai_result.get("status") == "success":
        scene_graph = ai_result["scene"]
    else:
        # LLM 실패 → LOCAL PRESET 사용
        scene_graph = create_local_scene(req.prompt)

        if not scene_graph:
            return {"error": "장면을 생성할 수 없습니다."}

    # --------------------------
    # DB 매핑
    # --------------------------
    objects_col = db["objects"]
    expanded_objects = []

    for obj in scene_graph.get("objects", []):
        name = obj["name"]

        # 대소문자 무시 + 부분 매칭
        db_obj = objects_col.find_one({
            "name": {"$regex": name, "$options": "i"}
        })

        if not db_obj:
            return {"error": f"Object '{name}' not found in DB"}

        expanded_objects.append({
            "_id": str(db_obj["_id"]),
            "name": db_obj["name"],
            "category": db_obj.get("category"),
            "obj_path": db_obj.get("obj_path"),
            "mtl_path": db_obj.get("mtl_path"),
            "texture_path": db_obj.get("texture_path"),
            "scale": db_obj.get("scale", 1),
            "orbit": obj.get("orbit", {}),
            "rotation_speed": obj.get("rotation_speed", 0.01),
        })

    final_scene = {
        "scenarioType": scene_graph.get("scenarioType"),
        "objects": expanded_objects,
        "animations": scene_graph.get("animations", []),
        "camera": scene_graph.get("camera", {})
    }

    return {"status": "success", "scene": final_scene}
