# backend/routers/prompt_router.py
from fastapi import APIRouter
from backend.database.mongo_connector import prompt_collection
from backend.models.prompt_model import PromptLog

router = APIRouter(prefix="/prompt", tags=["Prompt"])

@router.post("/log")
def log_prompt(item: PromptLog):
    prompt_collection.insert_one(item.dict())
    return {"message": "Prompt logged successfully"}

@router.get("/all")
def get_prompts():
    data = list(prompt_collection.find({}, {"_id": 0}))
    return {"count": len(data), "items": data}
