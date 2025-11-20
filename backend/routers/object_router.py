from fastapi import APIRouter
from backend.database.mongo_connector import db
from backend.models.object_model import Object3D

router = APIRouter(prefix="/object", tags=["Object"])

@router.post("/add")
def add_object(obj: Object3D):
    result = db.objects.insert_one(obj.dict())
    return {"message": "Object saved", "id": str(result.inserted_id)}

@router.get("/{name}")
def get_object(name: str):
    obj = db.objects.find_one({"name": name})
    if not obj:
        return {"error": "Object not found"}
    obj["_id"] = str(obj["_id"])
    return obj
