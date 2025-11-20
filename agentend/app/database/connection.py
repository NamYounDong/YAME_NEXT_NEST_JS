"""
MariaDB 연결 관리 모듈

SQLAlchemy를 사용하여 MariaDB 커넥션 풀을 관리합니다.
커넥션 풀을 사용하는 이유:
- 데이터베이스 연결 재사용으로 성능 향상
- 동시 접속 수 제어
- 자동 재연결 처리
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Generator
import logging

from app.config import settings

# 로거 설정
logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    데이터베이스 연결 관리 클래스
    
    싱글톤 패턴으로 구현하여 애플리케이션 전체에서
    하나의 커넥션 풀만 사용하도록 합니다.
    """
    
    _instance = None
    _engine = None
    _SessionLocal = None
    
    def __new__(cls):
        """싱글톤 인스턴스 생성"""
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """
        데이터베이스 연결 초기화
        
        이미 초기화되었으면 건너뜁니다 (싱글톤).
        """
        if self._engine is None:
            self._initialize_db()
    
    def _initialize_db(self):
        """
        SQLAlchemy 엔진 및 세션 팩토리 생성
        
        연결 문자열 형식:
        mysql+pymysql://user:password@host:port/database?charset=utf8mb4
        
        커넥션 풀 설정:
        - pool_size: 기본 연결 수 (5개)
        - max_overflow: 추가 가능한 연결 수 (10개)
        - pool_recycle: 연결 재사용 시간 (1시간)
        - pool_pre_ping: 연결 상태 자동 체크
        """
        try:
            # 연결 문자열 생성
            db_url = (
                f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
                f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
                f"?charset={settings.DB_CHARSET}"
            )
            
            # SQLAlchemy 엔진 생성
            self._engine = create_engine(
                db_url,
                poolclass=QueuePool,  # 큐 기반 커넥션 풀
                pool_size=5,  # 기본 커넥션 수
                max_overflow=10,  # 추가 가능한 커넥션 수
                pool_recycle=3600,  # 1시간마다 커넥션 재생성
                pool_pre_ping=True,  # 연결 전 상태 체크
                echo=False  # SQL 로깅 비활성화 (프로덕션)
            )
            
            # 세션 팩토리 생성
            self._SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self._engine
            )
            
            logger.info(f"데이터베이스 연결 성공: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
            
        except Exception as e:
            logger.error(f"데이터베이스 연결 실패: {str(e)}")
            raise
    
    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """
        데이터베이스 세션 컨텍스트 매니저
        
        사용 예:
            with db_manager.get_session() as session:
                result = session.execute(text("SELECT * FROM ..."))
        
        자동으로 세션을 생성하고 종료합니다.
        에러 발생 시 자동으로 롤백합니다.
        
        Yields:
            Session: SQLAlchemy 세션 객체
        """
        session = self._SessionLocal()
        try:
            yield session
            session.commit()  # 정상 종료 시 커밋
        except Exception as e:
            session.rollback()  # 에러 발생 시 롤백
            logger.error(f"데이터베이스 오류: {str(e)}")
            raise
        finally:
            session.close()  # 항상 세션 종료
    
    def test_connection(self) -> bool:
        """
        데이터베이스 연결 테스트
        
        간단한 SELECT 쿼리를 실행하여 연결 상태를 확인합니다.
        
        Returns:
            bool: 연결 성공 시 True, 실패 시 False
        """
        try:
            with self.get_session() as session:
                result = session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception as e:
            logger.error(f"연결 테스트 실패: {str(e)}")
            return False
    
    def close(self):
        """
        모든 데이터베이스 연결 종료
        
        애플리케이션 종료 시 호출합니다.
        """
        if self._engine:
            self._engine.dispose()
            logger.info("데이터베이스 연결 종료")


# 싱글톤 인스턴스 생성
db_manager = DatabaseManager()

