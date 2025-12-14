'''
from pydantic import BaseModel, Field
from typing import List, Optional

class SceneModel(BaseModel):
    """
    3D 장면(Scene)을 표현하는 데이터 모델
    - 어떤 오브젝트와 애니메이션이 포함되어 있는지를 정의
    """

    scene_name: str = Field(..., description="장면 이름 (예: solar_system)")
    description: Optional[str] = Field(None, description="장면 설명 (예: 태양, 지구, 달 포함)")
    objects: Optional[List[str]] = Field(default_factory=list, description="이 장면에 포함된 오브젝트 이름 목록")
    animations: Optional[List[str]] = Field(default_factory=list, description="이 장면에 적용할 애니메이션 이름 목록")

    class Config:
        schema_extra = {
            "example": {
                "scene_name": "solar_system",
                "description": "태양, 지구, 달이 포함된 기본 장면",
                "objects": ["Sun", "Earth", "Moon"],
                "animations": ["orbit_motion", "self_rotation"]
            }
        }
'''
from pydantic import BaseModel
from typing import List, Optional, Dict

class SceneObjectRef(BaseModel):
    name: str  # DB에서 object를 찾기 위한 key

class SceneAnimationRef(BaseModel):
    name: str

class CameraConfig(BaseModel):
    target: str
    distance: float = 10

class SceneModel(BaseModel):
    scenarioType: str
    objects: List[SceneObjectRef] = []
    animations: List[SceneAnimationRef] = []
    camera: Optional[CameraConfig] = None
