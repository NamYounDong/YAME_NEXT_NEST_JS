"""
채팅 API 엔드포인트

증상 분석 챗봇 API를 제공합니다.

엔드포인트:
- POST /api/chat/message - 메시지 전송
- POST /api/chat/select-disease - 질환 선택
- POST /api/chat/close-session - 세션 종료
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
import logging

from app.models.chat import (
    ChatRequest,
    ChatResponse,
    DiseaseSelectionRequest,
    SessionCloseRequest
)
from app.services.symptom_agent import symptom_agent
from app.services.drug_recommender import drug_recommender
from app.database.redis_manager import redis_manager

# 로거
logger = logging.getLogger(__name__)

# 라우터 생성
router = APIRouter()


@router.post("/message", response_model=ChatResponse, summary="채팅 메시지 전송")
async def send_message(request: ChatRequest) -> ChatResponse:
    """
    사용자 메시지를 처리하고 챗봇 응답을 반환합니다.
    
    **플로우:**
    1. 사용자 메시지 분석
    2. 증상 정보 수집
    3. 추가 질문 또는 질환 추론
    
    **요청 예시:**
    ```json
    {
        "session_id": "user-session-uuid",
        "message": "머리가 아프고 열이 나요",
        "user_age": 35,
        "is_pregnant": false,
        "location": {"latitude": 37.5, "longitude": 126.9}
    }
    ```
    
    **응답 예시:**
    ```json
    {
        "session_id": "user-session-uuid",
        "message": "증상이 언제부터 시작되었나요?",
        "message_type": "text",
        "timestamp": "2024-01-01T12:00:00"
    }
    ```
    """
    try:
        logger.info(f"[API] 메시지 수신: session={request.session_id}")
        
        # 사용자 컨텍스트 준비
        user_context = {}
        if request.user_age:
            user_context["user_age"] = request.user_age
        if request.is_pregnant is not None:
            user_context["is_pregnant"] = request.is_pregnant
        if request.location:
            user_context["location"] = request.location
        
        # 에이전트 처리
        response = await symptom_agent.chat(
            session_id=request.session_id,
            user_message=request.message,
            user_context=user_context if user_context else None
        )
        
        # ChatResponse 생성
        return ChatResponse(
            session_id=request.session_id,
            message=response["message"],
            message_type=response["message_type"],
            disease_options=response.get("disease_options"),
            recommendation=response.get("recommendation")
        )
        
    except Exception as e:
        logger.error(f"[API] 메시지 처리 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메시지 처리 중 오류가 발생했습니다."
        )


@router.post("/select-disease", response_model=ChatResponse, summary="질환 선택")
async def select_disease(request: DiseaseSelectionRequest) -> ChatResponse:
    """
    사용자가 선택한 질환에 대한 약품/병원 추천을 제공합니다.
    
    **플로우:**
    1. 선택한 질환 확인
    2. 심각도 평가
    3. 약국 또는 병원 추천
    
    **요청 예시:**
    ```json
    {
        "session_id": "user-session-uuid",
        "selected_disease_id": "disease_1"
    }
    ```
    
    **응답 예시 (약국 추천):**
    ```json
    {
        "session_id": "user-session-uuid",
        "message": "감기가 의심됩니다...",
        "message_type": "recommendation",
        "recommendation": {
            "type": "PHARMACY",
            "drugs": [...],
            "facilities": [...]
        }
    }
    ```
    """
    try:
        logger.info(
            f"[API] 질환 선택: session={request.session_id}, "
            f"disease={request.selected_disease_id}"
        )
        
        # 약품 추천
        response = await drug_recommender.recommend(
            session_id=request.session_id,
            selected_disease_id=request.selected_disease_id
        )
        
        # ChatResponse 생성
        return ChatResponse(
            session_id=request.session_id,
            message=response["message"],
            message_type=response["message_type"],
            disease_options=response.get("disease_options"),
            recommendation=response.get("recommendation")
        )
        
    except Exception as e:
        logger.error(f"[API] 질환 선택 처리 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="질환 선택 처리 중 오류가 발생했습니다."
        )


@router.post("/close-session", summary="세션 종료")
async def close_session(request: SessionCloseRequest) -> Dict[str, Any]:
    """
    채팅 세션을 종료하고 Redis 메모리를 해제합니다.
    
    **중요:**
    - 사용자가 "완료" 버튼을 눌렀을 때 호출
    - Redis에서 대화 히스토리 및 컨텍스트 삭제
    - 메모리 누수 방지
    
    **요청 예시:**
    ```json
    {
        "session_id": "user-session-uuid"
    }
    ```
    
    **응답 예시:**
    ```json
    {
        "success": true,
        "message": "세션이 종료되었습니다."
    }
    ```
    """
    try:
        logger.info(f"[API] 세션 종료: session={request.session_id}")
        
        # Redis에서 세션 데이터 삭제
        success = redis_manager.clear_session(request.session_id)
        
        if success:
            logger.info(f"[API] 세션 종료 완료: {request.session_id}")
            return {
                "success": True,
                "message": "세션이 종료되었습니다. 감사합니다!"
            }
        else:
            logger.warning(f"[API] 세션 종료 실패 (세션 없음): {request.session_id}")
            return {
                "success": False,
                "message": "세션을 찾을 수 없습니다."
            }
        
    except Exception as e:
        logger.error(f"[API] 세션 종료 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="세션 종료 중 오류가 발생했습니다."
        )

