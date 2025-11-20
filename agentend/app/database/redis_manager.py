"""
Redis 연결 및 세션 관리 모듈

Redis를 사용하여 챗봇 대화 히스토리를 저장하고 관리합니다.

사용 이유:
- 빠른 읽기/쓰기 성능 (인메모리 데이터베이스)
- TTL(Time To Live) 지원으로 자동 메모리 해제
- 세션별 독립적인 대화 히스토리 관리

Redis 키 형식:
    chatbot:session:{session_id}  - 대화 히스토리
    chatbot:context:{session_id}  - 사용자 컨텍스트 (나이, 임신 여부 등)
"""

import redis
import json
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.config import settings

# 로거 설정
logger = logging.getLogger(__name__)


class RedisManager:
    """
    Redis 연결 및 세션 관리 클래스
    
    싱글톤 패턴으로 구현하여 하나의 Redis 클라이언트만 사용합니다.
    """
    
    _instance = None
    _client = None
    
    def __new__(cls):
        """싱글톤 인스턴스 생성"""
        if cls._instance is None:
            cls._instance = super(RedisManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Redis 클라이언트 초기화"""
        if self._client is None:
            self._initialize_redis()
    
    def _initialize_redis(self):
        """
        Redis 클라이언트 생성 및 연결
        
        연결 설정:
        - decode_responses=True: 자동으로 bytes를 str로 변환
        - max_connections: 커넥션 풀 크기
        """
        try:
            # Redis 클라이언트 생성
            self._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                db=settings.REDIS_DB,
                decode_responses=True,  # bytes → str 자동 변환
                max_connections=10,  # 커넥션 풀 크기
                socket_timeout=5,  # 타임아웃 (초)
                socket_connect_timeout=5,
                retry_on_timeout=True  # 타임아웃 시 재시도
            )
            
            # 연결 테스트
            self._client.ping()
            logger.info(f"Redis 연결 성공: {settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}")
            
        except Exception as e:
            logger.error(f"Redis 연결 실패: {str(e)}")
            raise
    
    def save_message(
        self, 
        session_id: str, 
        role: str, 
        content: str
    ) -> bool:
        """
        채팅 메시지를 Redis에 저장
        
        메시지는 JSON 배열 형태로 저장됩니다:
        [
            {"role": "user", "content": "증상", "timestamp": "2024-01-01T12:00:00"},
            {"role": "assistant", "content": "응답", "timestamp": "2024-01-01T12:00:01"}
        ]
        
        Args:
            session_id: 세션 ID (고유 식별자)
            role: 메시지 역할 ("user" 또는 "assistant")
            content: 메시지 내용
        
        Returns:
            bool: 저장 성공 시 True
        """
        try:
            key = f"chatbot:session:{session_id}"
            
            # 기존 메시지 가져오기
            existing = self._client.get(key)
            messages = json.loads(existing) if existing else []
            
            # 새 메시지 추가
            messages.append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            # Redis에 저장 (JSON 문자열로 변환)
            self._client.setex(
                key,
                settings.REDIS_SESSION_TTL,  # TTL 설정 (자동 만료)
                json.dumps(messages, ensure_ascii=False)
            )
            
            logger.debug(f"메시지 저장: session={session_id}, role={role}")
            return True
            
        except Exception as e:
            logger.error(f"메시지 저장 실패: {str(e)}")
            return False
    
    def get_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """
        세션의 모든 메시지 조회
        
        Args:
            session_id: 세션 ID
        
        Returns:
            List[Dict]: 메시지 목록 (시간순 정렬)
        """
        try:
            key = f"chatbot:session:{session_id}"
            data = self._client.get(key)
            
            if data:
                messages = json.loads(data)
                logger.debug(f"메시지 조회: session={session_id}, count={len(messages)}")
                return messages
            else:
                logger.debug(f"세션 없음: {session_id}")
                return []
                
        except Exception as e:
            logger.error(f"메시지 조회 실패: {str(e)}")
            return []
    
    def save_context(
        self, 
        session_id: str, 
        context: Dict[str, Any]
    ) -> bool:
        """
        사용자 컨텍스트 저장
        
        컨텍스트 예시:
        {
            "user_age": 35,
            "is_pregnant": false,
            "location": {"lat": 37.5, "lng": 126.9},
            "suspected_diseases": ["감기", "독감"]
        }
        
        Args:
            session_id: 세션 ID
            context: 컨텍스트 딕셔너리
        
        Returns:
            bool: 저장 성공 시 True
        """
        try:
            key = f"chatbot:context:{session_id}"
            self._client.setex(
                key,
                settings.REDIS_SESSION_TTL,
                json.dumps(context, ensure_ascii=False)
            )
            logger.debug(f"컨텍스트 저장: session={session_id}")
            return True
            
        except Exception as e:
            logger.error(f"컨텍스트 저장 실패: {str(e)}")
            return False
    
    def get_context(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        사용자 컨텍스트 조회
        
        Args:
            session_id: 세션 ID
        
        Returns:
            Dict 또는 None: 컨텍스트 딕셔너리
        """
        try:
            key = f"chatbot:context:{session_id}"
            data = self._client.get(key)
            
            if data:
                context = json.loads(data)
                logger.debug(f"컨텍스트 조회: session={session_id}")
                return context
            else:
                return None
                
        except Exception as e:
            logger.error(f"컨텍스트 조회 실패: {str(e)}")
            return None
    
    def clear_session(self, session_id: str) -> bool:
        """
        세션 데이터 완전 삭제
        
        채팅 종료 시 호출하여 메모리 해제합니다.
        - 대화 히스토리 삭제
        - 사용자 컨텍스트 삭제
        
        Args:
            session_id: 세션 ID
        
        Returns:
            bool: 삭제 성공 시 True
        """
        try:
            # 모든 관련 키 삭제
            keys = [
                f"chatbot:session:{session_id}",
                f"chatbot:context:{session_id}"
            ]
            deleted = self._client.delete(*keys)
            
            logger.info(f"세션 삭제: session={session_id}, keys={deleted}")
            return deleted > 0
            
        except Exception as e:
            logger.error(f"세션 삭제 실패: {str(e)}")
            return False
    
    def extend_ttl(self, session_id: str) -> bool:
        """
        세션 TTL 연장
        
        사용자가 활발하게 대화 중일 때 호출하여 세션 만료를 방지합니다.
        
        Args:
            session_id: 세션 ID
        
        Returns:
            bool: 연장 성공 시 True
        """
        try:
            keys = [
                f"chatbot:session:{session_id}",
                f"chatbot:context:{session_id}"
            ]
            
            for key in keys:
                if self._client.exists(key):
                    self._client.expire(key, settings.REDIS_SESSION_TTL)
            
            logger.debug(f"세션 TTL 연장: session={session_id}")
            return True
            
        except Exception as e:
            logger.error(f"TTL 연장 실패: {str(e)}")
            return False
    
    def test_connection(self) -> bool:
        """
        Redis 연결 테스트
        
        Returns:
            bool: 연결 성공 시 True
        """
        try:
            return self._client.ping()
        except Exception as e:
            logger.error(f"Redis 연결 테스트 실패: {str(e)}")
            return False
    
    def close(self):
        """Redis 연결 종료"""
        if self._client:
            self._client.close()
            logger.info("Redis 연결 종료")


# 싱글톤 인스턴스 생성
redis_manager = RedisManager()

