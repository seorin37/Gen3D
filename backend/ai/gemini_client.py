import google.generativeai as genai
import os, json, re
from dotenv import load_dotenv

# 1. .env 강제 로드
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, "..", ".env")
load_dotenv(dotenv_path=env_path)

# 2. API KEY 로드
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("\n[ERROR] GEMINI_API_KEY를 .env에서 읽지 못했습니다!\n")

genai.configure(api_key=api_key)


# -------------------------------
#  JSON ONLY 출력 템플릿
# -------------------------------
SCENE_PROMPT_TEMPLATE = """
You are an AI that generates scene graphs for a 3D science visualization engine.

Your output MUST be ONLY a valid JSON object.
Do not include explanations.

JSON Format Example:
{
  "scenarioType": "solar_system",
  "objects": [
    {"name": "sun"},
    {"name": "earth"}
  ],
  "animations": [
    {"name": "earth_orbit"}
  ],
  "camera": {
    "x": 0,
    "y": 20,
    "z": 40,
    "target": "sun"
  }
}

Rules:
- Output ONLY JSON.
- Do NOT wrap inside code fences.
- Object names must match the known object names in database.
- camera.target MUST be one of the object names.

User request:
{user_prompt}
"""


# -------------------------------
#  JSON 복구 함수
# -------------------------------
def extract_json(text: str) -> str:
    """LLM이 말 앞뒤로 텍스트를 넣었을 때 {} 내부 JSON만 추출"""
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("JSON 블록을 찾지 못했습니다.")
    return match.group(0)


# -------------------------------
#  Gemini 호출 함수
# -------------------------------
def parse_prompt_with_gemini(user_prompt: str):

    # 템플릿 대입
    final_prompt = SCENE_PROMPT_TEMPLATE.replace("{user_prompt}", user_prompt)

    model = genai.GenerativeModel("gemini-2.5-flash")

    try:
        response = model.generate_content(final_prompt)
        text_output = response.text.strip()

        # 1차 JSON 파싱
        try:
            scene_data = json.loads(text_output)
        except:
            # 복구 시도
            cleaned = extract_json(text_output)
            scene_data = json.loads(cleaned)

        return {
            "status": "success",
            "scene": scene_data,
            "raw": text_output  # debugging 용
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
