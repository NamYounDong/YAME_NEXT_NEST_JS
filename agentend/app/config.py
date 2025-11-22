"""
환경 설정 관리 모듈

.env 파일에서 환경 변수를 로드하여 애플리케이션 전반에서 사용할 설정을 관리합니다.
Pydantic의 BaseSettings를 사용하여 타입 안전성과 검증을 보장합니다.

사용 이유:
- 환경별 설정 관리 (개발/스테이징/프로덕션)
- 타입 안전한 설정 접근
- 필수 환경 변수 누락 시 에러 발생 (조기 감지)
"""

from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """
    애플리케이션 설정 클래스
    
    .env 파일 또는 환경 변수에서 자동으로 값을 로드합니다.
    필드명은 환경 변수명과 정확히 일치해야 합니다 (대소문자 구분 없음).
    """
    
    # --- FastAPI 서버 설정 ---
    HOST: str = "127.0.0.1"  # localhost만 허용 (보안)
    PORT: int = 8000
    
    # --- OpenAI API ---
    OPENAI_API_KEY: str  # 필수 항목 (기본값 없음)
    
    # --- MariaDB 연결 정보 ---
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "password"
    DB_NAME: str = "yame"
    DB_CHARSET: str = "utf8mb4"
    
    # --- Redis 연결 정보 ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 1  # DB 0은 NestJS 세션용, DB 1은 챗봇용
    REDIS_SESSION_TTL: int = 3600  # 1시간 (초 단위)
    
    # --- LangChain / RAG 설정 ---
    VECTOR_STORE_PATH: str = "./data/chroma_db"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    RAG_TOP_K: int = 10  # RAG 검색 시 반환할 문서 개수
    
    # --- 로그 설정 ---
    LOG_LEVEL: str = "INFO"
    
    class Config:
        """
        Pydantic 설정
        
        env_file: .env 파일에서 환경 변수 로드
        case_sensitive: 환경 변수명 대소문자 구분 안 함
        """
        env_file = ".env"
        case_sensitive = False


# 싱글톤 인스턴스 생성
# 애플리케이션 전체에서 동일한 설정 객체 사용
settings = Settings()

