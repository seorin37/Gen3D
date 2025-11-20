# backend/routers/embedding_router.py
from fastapi import APIRouter
from backend.database.mongo_connector import embedding_collection
from backend.models.embedding_model import Embedding

router = APIRouter(prefix="/embedding", tags=["Embedding"])

@router.post("/add")
def add_embedding(item: Embedding):
    embedding_collection.insert_one(item.dict())
    return {"message": "Embedding saved successfully"}

@router.get("/all")
def get_all_embeddings():
    data = list(embedding_collection.find({}, {"_id": 0}))
    return {"count": len(data), "items": data}
