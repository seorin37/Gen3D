# routers/local_prompt_router.py

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/prompt", tags=["Local Prompt (Rule-Based)"])


class PromptRequest(BaseModel):
    prompt: str


# ---------------------------------------
# 1) 우리가 사용할 로컬 행성 "데이터베이스"
# ---------------------------------------
PLANET_DB = {
    "sun": {
        "name": "Sun",
        "obj_path": "/static/assets/Sun/Sun.obj",
        "mtl_path": "/static/assets/Sun/Sun.mtl",
        "texture_path": "/static/assets/Sun/2k_sun.jpg",
        "scale": 18,
        "orbit": None,
        "rotation_speed": 0.3,
    },
    "earth": {
        "name": "Earth",
        "obj_path": "/static/assets/Earth/Earth.obj",
        "mtl_path": "/static/assets/Earth/Earth.mtl",
        "texture_path": "/static/assets/Earth/2k_earth_daymap.jpg",
        "scale": 10,
        "orbit": {"radius": 70, "speed": 0.4},
        "rotation_speed": 1.2,
    },
    "moon": {
        "name": "Moon",
        "obj_path": "/static/assets/Moon/Moon.obj",
        "mtl_path": "/static/assets/Moon/Moon.mtl",
        "texture_path": "/static/assets/Moon/2k_moon.jpg",
        "scale": 3,
        "orbit": {"radius": 15, "speed": 1.5, "around": "earth"},
        "rotation_speed": 0.8,
    },
    # 원하는 경우 Mars, Jupiter 등 더 추가 가능
}


# ---------------------------------------
# 2) 프롬프트 → 행성 선택 파서
# ---------------------------------------
def parse_prompt(prompt: str) -> list:
    """사용자가 말한 문장에서 필요한 행성을 추출"""

    prompt = prompt.lower()

    if "태양계" in prompt:
        return ["sun", "earth", "moon"]

    result = []

    for key in PLANET_DB.keys():
        if key in prompt:
            result.append(key)

    # 아무것도 못 찾으면 기본값: 태양 + 지구
    if not result:
        result = ["sun", "earth"]

    return result


# ---------------------------------------
# 3) 최종 SceneGraph 생성
# ---------------------------------------
def build_scene(planet_keys: list):
    objects = []

    for key in planet_keys:
        if key not in PLANET_DB:
            continue
        obj = PLANET_DB[key]

        # 프론트에서 바로 사용 가능한 형태로 전달
        objects.append(
            {
                "name": obj["name"],
                "obj_path": obj["obj_path"],
                "mtl_path": obj["mtl_path"],
                "texture_path": obj["texture_path"],
                "scale": obj["scale"],
                "orbit": obj.get("orbit"),
                "rotation_speed": obj["rotation_speed"],
            }
        )

    scene = {
        "scenarioType": "solarSystem",
        "objects": objects,
        "camera": {"target": objects[0]["name"]},  # 기본 카메라 타겟 = 첫 번째 오브젝트
        "animations": [],
    }

    return scene


# ---------------------------------------
# 4) API 엔드포인트
# ---------------------------------------
@router.post("/local_scene")
def generate_local_scene(req: PromptRequest):
    planets = parse_prompt(req.prompt)
    scene = build_scene(planets)
    return {"status": "success", "scene": scene}
