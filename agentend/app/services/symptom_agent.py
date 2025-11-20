"""
증상 분석 대화형 에이전트

LangChain의 Conversational Agent를 사용하여 사용자와 대화하며 증상을 파악합니다.

에이전트의 역할:
1. 증상 정보 수집 (질문을 통해)
2. 증상에서 의학 용어 추출
3. 추가 정보 요청 (언제부터, 다른 증상 등)
4. 충분한 정보가 모이면 질환 추론으로 넘어감

LangChain Agent를 사용하는 이유:
- 대화 히스토리 자동 관리
- 상태 관리 (현재 어떤 정보가 필요한지)
- 도구 사용 (RAG 검색, 데이터베이스 조회 등)
"""

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain.tools import Tool
from typing import Dict, Any, List, Optional
import logging
import json

from app.config import settings
from app.database.redis_manager import redis_manager

logger = logging.getLogger(__name__)


class SymptomAgent:
    """
    증상 분석 대화형 에이전트
    
    사용자와 대화하며 증상을 수집하고 분석합니다.
    """
    
    def __init__(self):
        """
        에이전트 초기화
        
        GPT-4o 모델을 사용하며, 대화 히스토리를 관리합니다.
        """
        # LLM 초기화 (GPT-4o)
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.3,  # 창의성 낮게 (일관된 응답)
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # 시스템 프롬프트
        self.system_prompt = """
당신은 의료 증상 분석 챗봇입니다. 사용자의 증상을 듣고 질환을 추론하는 역할을 합니다.

**주요 임무:**
1. 사용자의 증상을 자세히 파악합니다
2. 추가 질문을 통해 정보를 수집합니다:
   - 언제부터 증상이 시작되었는지
   - 다른 동반 증상이 있는지
   - 통증/불편함의 정도
3. 충분한 정보가 모이면 의심되는 질환 2-3개를 제시합니다

**대화 규칙:**
- 친근하고 공감하는 톤으로 대화합니다
- 한 번에 1-2개의 질문만 합니다 (너무 많은 질문은 피하세요)
- 의학 용어보다는 쉬운 표현을 사용합니다
- 심각한 증상(고열, 심한 통증 등)은 즉시 병원 방문을 권장합니다

**중요:**
- 절대 확정 진단을 하지 마세요 ("~입니다" 금지)
- 항상 "의심됩니다", "가능성이 있습니다" 등의 표현 사용
- 일반의약품으로 해결 가능한 수준인지 판단합니다
"""
        
        logger.info("SymptomAgent 초기화 완료")
    
    def get_chat_history(self, session_id: str) -> List[Dict[str, str]]:
        """
        Redis에서 대화 히스토리 조회
        
        Args:
            session_id: 세션 ID
        
        Returns:
            List[Dict]: 메시지 목록
        """
        messages = redis_manager.get_messages(session_id)
        
        # LangChain 형식으로 변환
        chat_history = []
        for msg in messages:
            chat_history.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        return chat_history
    
    async def chat(
        self, 
        session_id: str,
        user_message: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        사용자 메시지 처리
        
        대화 단계:
        1. 초기 증상 수집
        2. 추가 정보 질문
        3. 질환 추론
        4. 질환 선택 안내
        
        Args:
            session_id: 세션 ID
            user_message: 사용자 메시지
            user_context: 사용자 컨텍스트 (나이, 임신 여부 등)
        
        Returns:
            Dict: 챗봇 응답
        """
        try:
            logger.info(f"[{session_id}] 메시지 처리: {user_message[:50]}...")
            
            # 대화 히스토리 조회
            chat_history = self.get_chat_history(session_id)
            
            # 컨텍스트 조회/저장
            if user_context:
                redis_manager.save_context(session_id, user_context)
            else:
                user_context = redis_manager.get_context(session_id) or {}
            
            # 대화 상태 판단
            conversation_stage = self._determine_stage(chat_history, user_context)
            
            logger.info(f"[{session_id}] 대화 단계: {conversation_stage}")
            
            # 단계별 처리
            if conversation_stage == "initial":
                # 초기 인사 및 증상 수집
                response = await self._handle_initial_stage(
                    session_id, user_message, user_context
                )
            elif conversation_stage == "collecting":
                # 추가 정보 수집
                response = await self._handle_collecting_stage(
                    session_id, user_message, chat_history, user_context
                )
            elif conversation_stage == "inferring":
                # 질환 추론
                response = await self._handle_inferring_stage(
                    session_id, user_message, chat_history, user_context
                )
            else:
                # 기본 응답
                response = {
                    "message": "무엇을 도와드릴까요?",
                    "message_type": "text"
                }
            
            # Redis에 메시지 저장
            redis_manager.save_message(session_id, "user", user_message)
            redis_manager.save_message(session_id, "assistant", response["message"])
            
            # TTL 연장 (활발한 대화 중)
            redis_manager.extend_ttl(session_id)
            
            return response
            
        except Exception as e:
            logger.error(f"[{session_id}] 메시지 처리 실패: {str(e)}", exc_info=True)
            return {
                "message": "죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.",
                "message_type": "error"
            }
    
    def _determine_stage(
        self, 
        chat_history: List[Dict],
        user_context: Dict
    ) -> str:
        """
        대화 단계 판단
        
        단계:
        - initial: 첫 메시지 (인사)
        - collecting: 증상 정보 수집 중
        - inferring: 충분한 정보 수집 완료, 질환 추론 준비
        
        Args:
            chat_history: 대화 히스토리
            user_context: 사용자 컨텍스트
        
        Returns:
            str: 대화 단계
        """
        # 대화 길이로 판단
        if len(chat_history) == 0:
            return "initial"
        elif len(chat_history) < 6:  # 3회 이하 대화
            return "collecting"
        else:
            # 충분한 정보가 수집되었으면 추론 단계로
            return "inferring"
    
    async def _handle_initial_stage(
        self,
        session_id: str,
        user_message: str,
        user_context: Dict
    ) -> Dict[str, Any]:
        """
        초기 단계 처리
        
        인사 및 첫 증상 파악
        """
        prompt = f"""{self.system_prompt}

사용자가 처음 증상을 이야기했습니다: "{user_message}"

다음 작업을 수행하세요:
1. 공감하며 인사합니다
2. 증상에 대해 1-2개 질문합니다 (언제부터, 다른 증상 등)

친근하게 응답하세요."""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ])
        
        return {
            "message": response.content,
            "message_type": "text"
        }
    
    async def _handle_collecting_stage(
        self,
        session_id: str,
        user_message: str,
        chat_history: List[Dict],
        user_context: Dict
    ) -> Dict[str, Any]:
        """
        정보 수집 단계 처리
        
        추가 질문을 통해 더 많은 정보 수집
        """
        # 대화 히스토리를 컨텍스트로 전달
        history_text = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in chat_history[-4:]  # 최근 4개 메시지만
        ])
        
        prompt = f"""{self.system_prompt}

**대화 히스토리:**
{history_text}

**사용자의 최신 답변:**
{user_message}

**사용자 정보:**
- 나이: {user_context.get('user_age', '미제공')}
- 임신 여부: {'예' if user_context.get('is_pregnant') else '아니오'}

다음 작업을 수행하세요:
1. 사용자의 답변을 바탕으로 증상을 정리합니다
2. 아직 부족한 정보가 있다면 1-2개 질문합니다
3. 충분한 정보가 모였다면 "이제 증상을 분석하겠습니다"라고 말합니다

응답:"""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ])
        
        return {
            "message": response.content,
            "message_type": "text"
        }
    
    async def _handle_inferring_stage(
        self,
        session_id: str,
        user_message: str,
        chat_history: List[Dict],
        user_context: Dict
    ) -> Dict[str, Any]:
        """
        질환 추론 단계 처리
        
        수집된 증상으로 질환을 추론하고 선택지 제공
        """
        # 모든 증상 정리
        symptoms_text = "\n".join([
            msg['content'] 
            for msg in chat_history 
            if msg['role'] == 'user'
        ])
        
        prompt = f"""{self.system_prompt}

**수집된 증상 정보:**
{symptoms_text}

**사용자 정보:**
- 나이: {user_context.get('user_age', '미제공')}
- 임신 여부: {'예' if user_context.get('is_pregnant') else '아니오'}

다음 작업을 수행하세요:
1. 증상을 분석하여 의심되는 질환 2-3개를 추론합니다
2. 각 질환에 대한 신뢰도(0-100%)를 계산합니다
3. JSON 형식으로 응답합니다:

{{
  "diseases": [
    {{"id": "disease_1", "name": "질환명1", "confidence": 85, "symptoms": ["증상1", "증상2"]}},
    {{"id": "disease_2", "name": "질환명2", "confidence": 60, "symptoms": ["증상3"]}}
  ],
  "message": "증상을 분석한 결과, 다음 질환이 의심됩니다. 해당하는 것을 선택해주세요."
}}

JSON만 반환하세요."""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ])
        
        try:
            # JSON 파싱
            result = json.loads(response.content)
            
            # 컨텍스트에 질환 정보 저장
            user_context["suspected_diseases"] = result["diseases"]
            redis_manager.save_context(session_id, user_context)
            
            return {
                "message": result["message"],
                "message_type": "disease_options",
                "disease_options": result["diseases"]
            }
            
        except json.JSONDecodeError:
            # JSON 파싱 실패 시 텍스트 응답
            logger.warning(f"[{session_id}] JSON 파싱 실패, 텍스트 응답 사용")
            return {
                "message": response.content,
                "message_type": "text"
            }


# 싱글톤 인스턴스
symptom_agent = SymptomAgent()

