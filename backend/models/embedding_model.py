# backend/models/embedding_model.py
from pydantic import BaseModel
from typing import List, Literal

class Embedding(BaseModel):
    id: str
    type: Literal["object", "animation"]  # obj인지 anim인지 구분
    text: str                             # 원문 텍스트
    embedding: List[float]                # 벡터값 (OpenAI나 sentence-transformer 결과)
