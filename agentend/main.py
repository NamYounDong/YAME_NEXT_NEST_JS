"""
YAME Agentend - FastAPI 메인 애플리케이션

LangChain과 RAG를 활용한 의료 증상 분석 챗봇 서비스입니다.

실행 방법:
    python main.py
    또는
    uvicorn main:app --host 127.0.0.1 --port 8000 --reload

주요 기능:
- LangChain 기반 대화형 에이전트
- DUR 데이터 기반 RAG 검색
- Redis를 활용한 세션 관리
- MariaDB 연동 (약품/병원 정보)
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import sys

# 로컬 모듈
from app.config import settings
from app.database.connection import db_manager
from app.database.redis_manager import redis_manager
from app.rag.vector_store import vector_store_manager
from app.models.chat import HealthCheckResponse

# 로깅 설정
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='[%(asctime)s] %(levelname)s [%(name)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # 콘솔 출력
        logging.FileHandler('agentend.log')  # 파일 저장
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리
    
    startup: 서버 시작 시 실행
    - 데이터베이스 연결 테스트
    - Redis 연결 테스트
    
    shutdown: 서버 종료 시 실행
    - 모든 연결 정리
    """
    # --- Startup ---
    logger.info("=" * 60)
    logger.info("YAME Agentend 서비스 시작")
    logger.info("=" * 60)
    
    # MariaDB 연결 테스트
    try:
        if db_manager.test_connection():
            logger.info("[OK] MariaDB 연결 성공")
        else:
            logger.error("[ERROR] MariaDB 연결 실패")
            raise Exception("데이터베이스 연결 실패")
    except Exception as e:
        logger.error(f"[ERROR] MariaDB 연결 오류: {str(e)}")
        raise
    
    # Redis 연결 테스트
    try:
        if redis_manager.test_connection():
            logger.info("[OK] Redis 연결 성공")
        else:
            logger.error("[ERROR] Redis 연결 실패")
            raise Exception("Redis 연결 실패")
    except Exception as e:
        logger.error(f"[ERROR] Redis 연결 오류: {str(e)}")
        raise
    
    # 벡터 스토어 로드
    try:
        if vector_store_manager.load_vector_store():
            logger.info("[OK] 벡터 스토어 로드 성공")
        else:
            logger.warning("[주의] 벡터 스토어가 없습니다")
            logger.warning("RAG 기능 사용 불가. 벡터 스토어를 먼저 구축하세요:")
            logger.warning("  실행: python scripts/build_vector_store.py")
    except Exception as e:
        logger.error(f"[ERROR] 벡터 스토어 로드 오류: {str(e)}")
        logger.warning("RAG 기능 없이 계속 실행됩니다")
    
    logger.info(f"서버 주소: http://{settings.HOST}:{settings.PORT}")
    logger.info(f"문서: http://{settings.HOST}:{settings.PORT}/docs")
    logger.info("=" * 60)
    
    yield  # 애플리케이션 실행
    
    # --- Shutdown ---
    logger.info("=" * 60)
    logger.info("YAME Agentend 서비스 종료")
    logger.info("=" * 60)
    
    # 연결 정리
    db_manager.close()
    redis_manager.close()
    
    logger.info("모든 연결이 정리되었습니다")


# FastAPI 애플리케이션 생성
app = FastAPI(
    title="YAME Agentend API",
    description="""
    LangChain과 RAG를 활용한 의료 증상 분석 챗봇 API
    
    ## 주요 기능
    - 대화형 증상 분석
    - DUR 데이터 기반 약품 추천
    - Redis 세션 관리
    - 병원/약국 정보 제공
    
    ## 접근 제한
    - localhost(127.0.0.1)에서만 접근 가능
    - NestJS 백엔드에서만 호출됨
    """,
    version="1.0.0",
    lifespan=lifespan  # 생명주기 관리
)

# CORS 설정
# localhost에서만 접근 가능하도록 제한
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",  # NestJS 백엔드
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET"],  # 필요한 메서드만
    allow_headers=["*"],
)


@app.get("/", tags=["System"])
async def root():
    """
    루트 엔드포인트
    
    서비스 기본 정보를 반환합니다.
    """
    return {
        "service": "YAME Agentend",
        "version": "1.0.0",
        "status": "running",
        "docs": f"http://{settings.HOST}:{settings.PORT}/docs"
    }


@app.get("/health", response_model=HealthCheckResponse, tags=["System"])
async def health_check():
    """
    헬스 체크 엔드포인트
    
    데이터베이스 및 Redis 연결 상태를 확인합니다.
    모니터링 시스템에서 주기적으로 호출하여 서비스 상태를 체크합니다.
    """
    try:
        # 데이터베이스 연결 테스트
        db_status = db_manager.test_connection()
        
        # Redis 연결 테스트
        redis_status = redis_manager.test_connection()
        
        # 하나라도 실패하면 에러
        if not db_status or not redis_status:
            return HealthCheckResponse(
                status="error",
                database=db_status,
                redis=redis_status
            )
        
        return HealthCheckResponse(
            status="ok",
            database=db_status,
            redis=redis_status
        )
        
    except Exception as e:
        logger.error(f"헬스 체크 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="서비스 상태 확인 실패"
        )


# API 라우터 등록
from app.api import chat
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


if __name__ == "__main__":
    import uvicorn
    
    # Uvicorn 서버 실행
    # 설정:
    # - host: localhost만 허용 (보안)
    # - port: .env에서 설정
    # - reload: 개발 모드에서만 사용 (코드 변경 시 자동 재시작)
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,  # 개발 모드
        log_level=settings.LOG_LEVEL.lower()
    )

