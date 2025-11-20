
from pydantic import BaseModel
from typing import Optional, Dict

class AnimationModel(BaseModel):
    name: str
    description: Optional[str] = None
    script_path: str  # JS 파일 경로
    target_type: Optional[str] = None  # 적용 대상 예: planet, moon
    parameters: Optional[Dict] = None  # {speed: 0.01, radius: 10}
