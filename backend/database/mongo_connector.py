from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pymongo.errors import ConnectionFailure, ConfigurationError

# ============================================
#  .env 파일 로드 (절대경로 기반)
# ============================================
# backend/database/mongo_connector.py 기준 → 최상위 프로젝트 폴더로 이동
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(env_path)

# ============================================
#  환경 변수에서 MongoDB URI 불러오기
# ============================================
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError(" MONGO_URI 환경 변수가 설정되어 있지 않습니다. .env 파일을 확인하세요.")

# ============================================
# MongoDB 연결 설정
# ============================================
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")  # 연결 테스트
    print(" MongoDB 연결 성공")
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

#  새로 추가된 컬렉션들 (RAG + 프롬프트용)
embedding_collection = db["embeddings"]      # RAG 검색용 벡터 저장
prompt_collection = db["prompt_logs"]        # 프롬프트 기록 저장

# ============================================
#  연결 확인용 출력
# ============================================
print(" 연결된 DB 이름:", db.name)
print(" 사용 중인 컬렉션 목록:", db.list_collection_names())

# ============================================
#  외부에서 import 할 때 접근할 객체들
# ============================================
__all__ = [
    "db",
    "scene_collection",
    "object_collection",
    "animation_collection",
    "embedding_collection",
    "prompt_collection",
]
