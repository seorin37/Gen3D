from pydantic import BaseModel
from typing import Optional, Dict

class Object3D(BaseModel):
    name: str
    category: str
    obj_path: str
    mtl_path: Optional[str] = None
    texture_path: Optional[str] = None
    scale: Optional[float] = 1.0
    position: Optional[Dict[str, float]] = {"x": 0, "y": 0, "z": 0}
