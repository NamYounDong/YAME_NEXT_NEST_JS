"""
채팅 관련 Pydantic 모델

API 요청/응답 데이터 구조를 정의합니다.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    """
    채팅 메시지 모델
    
    사용자와 챗봇 간의 메시지를 표현합니다.
    """
    role: str = Field(..., description="메시지 역할 ('user' 또는 'assistant')")
    content: str = Field(..., description="메시지 내용")
    timestamp: Optional[str] = Field(None, description="메시지 생성 시각 (ISO 8601 형식)")


class ChatRequest(BaseModel):
    """
    채팅 요청 모델
    
    프론트엔드 또는 NestJS에서 보내는 채팅 요청 데이터입니다.
    """
    session_id: str = Field(..., description="세션 ID (UUID 권장)", min_length=1)
    message: str = Field(..., description="사용자 메시지", min_length=1, max_length=1000)
    
    # 사용자 컨텍스트 (선택)
    user_age: Optional[int] = Field(None, description="사용자 나이", ge=0, le=150)
    is_pregnant: Optional[bool] = Field(None, description="임신 여부")
    location: Optional[Dict[str, float]] = Field(
        None,
        description="GPS 위치 {'latitude': 37.5, 'longitude': 126.9}",
        example={"latitude": 37.5665, "longitude": 126.9780}
    )


class DiseaseOption(BaseModel):
    """
    질환 선택 옵션 모델
    
    챗봇이 제시하는 의심 질환 목록입니다.
    """
    id: str = Field(..., description="질환 고유 ID")
    name: str = Field(..., description="질환명 (예: '감기')")
    confidence: float = Field(..., description="신뢰도 (0.0 ~ 1.0)", ge=0.0, le=1.0)
    symptoms: List[str] = Field(default=[], description="관련 증상 목록")


class ChatResponse(BaseModel):
    """
    채팅 응답 모델
    
    FastAPI에서 반환하는 응답 데이터입니다.
    """
    session_id: str = Field(..., description="세션 ID")
    message: str = Field(..., description="챗봇 응답 메시지")
    message_type: str = Field(
        ...,
        description="메시지 타입 ('text', 'disease_options', 'recommendation')"
    )
    
    # 질환 선택 옵션 (message_type='disease_options'일 때만)
    disease_options: Optional[List[DiseaseOption]] = Field(
        None,
        description="의심 질환 목록"
    )
    
    # 최종 추천 (message_type='recommendation'일 때만)
    recommendation: Optional[Dict[str, Any]] = Field(
        None,
        description="약품 추천 또는 병원 안내 정보"
    )
    
    # 추가 메타데이터
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class DiseaseSelectionRequest(BaseModel):
    """
    질환 선택 요청 모델
    
    사용자가 제시된 질환 중 하나를 선택했을 때의 요청입니다.
    """
    session_id: str = Field(..., description="세션 ID")
    selected_disease_id: str = Field(..., description="선택한 질환 ID")


class SessionCloseRequest(BaseModel):
    """
    세션 종료 요청 모델
    
    채팅 종료 시 Redis 메모리를 해제하기 위한 요청입니다.
    """
    session_id: str = Field(..., description="종료할 세션 ID")


class HealthCheckResponse(BaseModel):
    """
    헬스 체크 응답 모델
    """
    status: str = Field(..., description="서비스 상태 ('ok' 또는 'error')")
    database: bool = Field(..., description="MariaDB 연결 상태")
    redis: bool = Field(..., description="Redis 연결 상태")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

