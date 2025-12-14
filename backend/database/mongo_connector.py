from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pymongo.errors import ConnectionFailure, ConfigurationError

# ============================================
#  .env 파일 로드 (backend 폴더 기준)
# ============================================
# 1. 현재 파일(mongo_connector.py)의 폴더 경로 구하기
current_file_path = os.path.abspath(__file__)
database_dir = os.path.dirname(current_file_path) # .../backend/database
backend_dir = os.path.dirname(database_dir)       # .../backend

# 2. backend 폴더 안에 있는 .env 파일 지정
env_path = os.path.join(backend_dir, ".env")
load_dotenv(env_path)

# ============================================
#  환경 변수에서 MongoDB URI 불러오기
# ============================================
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    # 디버깅을 위해 어디서 찾았는지 에러 메시지에 표시
    raise ValueError(f" MONGO_URI를 찾을 수 없습니다.\n검색한 .env 위치: {env_path}\n파일이 실제로 존재하는지 확인해주세요.")

# ============================================
# MongoDB 연결 설정
# ============================================
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")  # 연결 테스트
    print("MongoDB 연결 성공")
except (ConnectionFailure, ConfigurationError) as e:
    print(f" MongoDB 연결 실패: {e}")
    raise e

# ============================================
#  사용할 데이터베이스 지정
# ============================================
db = client["text3d"]

# ============================================
#  주요 컬렉션 등록
# ============================================
scene_collection = db["scenes"]
object_collection = db["objects"]
animation_collection = db["animations"]
embedding_collection = db["embeddings"]
prompt_collection = db["prompt_logs"]

# ============================================
#  연결 확인용 출력
# ============================================
# print(" 연결된 DB 이름:", db.name) 
# (너무 시끄러우면 위 줄은 주석 처리 하셔도 됩니다)

__all__ = [
    "db",
    "scene_collection",
    "object_collection",
    "animation_collection",
    "embedding_collection",
    "prompt_collection",
]