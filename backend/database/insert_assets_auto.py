# backend/database/insert_assets_auto.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# ============================================
# 1️⃣ .env 불러오기
# ============================================
BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # backend 경로
env_path = os.path.join(os.path.dirname(BASE_DIR), ".env")
load_dotenv(env_path)

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("❌ MONGO_URI가 .env에 설정되어 있지 않습니다.")

# ============================================
# 2️⃣ MongoDB 연결
# ============================================
client = MongoClient(MONGO_URI)
db = client["text3d"]
collection = db["objects"]

# ============================================
# 3️⃣ assets 폴더 경로
# ============================================
ASSETS_DIR = os.path.join(BASE_DIR, "static", "assets")

# ============================================
# 4️⃣ 기존 데이터 정리
# ============================================
deleted_count = collection.delete_many({}).deleted_count
print(f"🧹 기존 objects 데이터 {deleted_count}개 삭제 완료")

# ============================================
# 5️⃣ assets 내부 폴더 순회
# ============================================
inserted = []
for folder in os.listdir(ASSETS_DIR):
    folder_path = os.path.join(ASSETS_DIR, folder)
    if not os.path.isdir(folder_path):
        continue

    # 파일 경로 탐색
    obj_file = None
    mtl_file = None
    texture_file = None

    for file in os.listdir(folder_path):
        if file.endswith(".obj"):
            obj_file = f"/static/assets/{folder}/{file}"
        elif file.endswith(".mtl"):
            mtl_file = f"/static/assets/{folder}/{file}"
        elif file.endswith(".jpg") or file.endswith(".png"):
            texture_file = f"/static/assets/{folder}/{file}"

    # MongoDB 문서 구조
    doc = {
        "name": folder,
        "category": "planet",
        "obj_path": obj_file,
        "mtl_path": mtl_file,
        "texture_path": texture_file,
        "scale": 1,
        "position": {"x": 0, "y": 0, "z": 0}
    }

    inserted.append(doc)

# ============================================
# 6️⃣ MongoDB에 삽입
# ============================================
if inserted:
    result = collection.insert_many(inserted)
    print(f"✅ {len(result.inserted_ids)}개의 행성 데이터 추가 완료!")
else:
    print("⚠️ 추가할 데이터가 없습니다.")

# ============================================
# 7️⃣ 확인용 출력
# ============================================
for doc in collection.find({}, {"_id": 0, "name": 1, "texture_path": 1}):
    print(f"🌍 {doc['name']} -> {doc['texture_path']}")
