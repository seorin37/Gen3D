# backend/scripts/load_animations.py

import os
from pymongo import MongoClient
from dotenv import load_dotenv

# .env 로드
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI not found in .env")

client = MongoClient(MONGO_URI)
db = client["text3d"]
animations = db["animations"]

#  프론트엔드 scenarios 폴더 경로 설정
FRONT_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../functional_integration/public/scenarios")
)

print("Scanning folder:", FRONT_PATH)

def insert_animation_files():
    count = 0

    for filename in os.listdir(FRONT_PATH):
        if not filename.endswith(".js"):
            continue

        name_without_ext = filename.replace(".js", "")

        doc = {
            "name": name_without_ext,
            "file": f"/scenarios/{filename}"
        }

        # 중복 방지 (이미 존재하면 skip)
        if animations.find_one({"name": name_without_ext}):
            print(f"Skip (already exists): {name_without_ext}")
            continue

        animations.insert_one(doc)
        print("Inserted:", doc)
        count += 1

    print(f"\n Done! Inserted {count} new animations.")


if __name__ == "__main__":
    insert_animation_files()
