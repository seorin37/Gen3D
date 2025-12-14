from fastapi import APIRouter
from database.mongo_connector import db
from models.object_model import Object3D



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

# ✅ 전체 오브젝트 조회 추가
@router.get("/")
def get_all_objects():
    objects = list(db.objects.find({}, {"_id": 0}))
    return objects