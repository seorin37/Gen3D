# backend/models/prompt_model.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PromptLog(BaseModel):
    prompt_text: str
    user_id: Optional[str] = None
    generated_scene: Optional[str] = None
    timestamp: datetime = datetime.utcnow()
