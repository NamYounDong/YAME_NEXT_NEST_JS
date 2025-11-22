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
1. 추가 질문을 통해 정보를 수집합니다:
   - 언제부터 증상이 시작되었는지
   - 다른 동반 증상이 있는지
   - 통증/불편함의 정도
2. 충분한 정보가 모이면 의심되는 질환 2-3개를 제시합니다

**대화 규칙:**
- 친근하고 공감하는 톤으로 대화합니다
- 한 번에 1-2개의 질문만 합니다
- 의학 용어보다는 쉬운 표현을 사용합니다
- 심각한 증상(고열, 심한 통증 등)은 즉시 병원 방문을 권장합니다

**중요:**
- **사용자가 이미 말한 증상을 반복하지 마세요**
- **간결하게 핵심만 전달하세요** (2-3문장)
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
        5. (추가) 약품 추천 시 필요한 정보 수집 (나이/임신)
        
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
                # 새로운 컨텍스트 정보를 기존 컨텍스트에 병합
                existing_context = redis_manager.get_context(session_id) or {}
                existing_context.update(user_context)
                redis_manager.save_context(session_id, existing_context)
                user_context = existing_context
            else:
                user_context = redis_manager.get_context(session_id) or {}
            
            # **우선 순위 1: 약품 추천 시 필요한 추가 정보 수집 중인지 확인**
            if user_context.get("awaiting_info"):
                logger.info(f"[{session_id}] 추가 정보 수집 모드")
                response = await self._handle_info_collection(
                    session_id, user_message, user_context
                )
            else:
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
    
    async def _handle_info_collection(
        self,
        session_id: str,
        user_message: str,
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        약품 추천 시 필요한 추가 정보 수집 처리
        
        사용자가 나이/임신 여부를 답변하면:
        1. LLM으로 정보 파싱
        2. 컨텍스트에 저장
        3. drug_recommender 재실행
        
        Args:
            session_id: 세션 ID
            user_message: 사용자 메시지
            user_context: 사용자 컨텍스트
        
        Returns:
            Dict: 챗봇 응답
        """
        logger.info(f"[{session_id}] 추가 정보 파싱 시작")
        
        awaiting_info = user_context.get("awaiting_info", {})
        missing_info = awaiting_info.get("missing", [])
        disease_id = awaiting_info.get("disease_id")
        
        # LLM으로 사용자 응답에서 나이/임신 정보 추출
        prompt = f"""
사용자가 다음 질문에 답변했습니다:
"{user_message}"

필요한 정보: {missing_info}

사용자 응답에서 다음 정보를 추출하세요:
{"- 나이 (숫자)" if "age" in missing_info else ""}
{"- 임신 여부 (예/아니오)" if "pregnancy" in missing_info else ""}

JSON 형식으로 응답하세요:
{{
  "age": 35 또는 null,
  "is_pregnant": true/false 또는 null,
  "success": true/false  (정보 추출 성공 여부)
}}
"""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": "당신은 사용자 응답에서 의료 정보를 추출하는 AI입니다."},
            {"role": "user", "content": prompt}
        ])
        
        try:
            import json
            parsed_info = json.loads(response.content)
            
            if parsed_info.get("success"):
                # 컨텍스트 업데이트
                if parsed_info.get("age") is not None:
                    user_context["user_age"] = parsed_info["age"]
                if parsed_info.get("is_pregnant") is not None:
                    user_context["is_pregnant"] = parsed_info["is_pregnant"]
                
                # awaiting_info 제거
                user_context.pop("awaiting_info", None)
                
                # 컨텍스트 저장
                redis_manager.save_context(session_id, user_context)
                
                logger.info(f"[{session_id}] 정보 수집 완료: age={user_context.get('user_age')}, pregnant={user_context.get('is_pregnant')}")
                
                # drug_recommender 재실행
                from app.services.drug_recommender import drug_recommender
                recommendation_response = await drug_recommender.recommend(
                    session_id=session_id,
                    selected_disease_id=disease_id
                )
                
                return recommendation_response
            else:
                # 정보 추출 실패, 다시 물어보기
                logger.warning(f"[{session_id}] 정보 추출 실패, 재질문")
                return {
                    "message": "죄송합니다. 정보를 정확히 이해하지 못했습니다. 다시 한 번 말씀해주시겠어요?",
                    "message_type": "text"
                }
                
        except Exception as e:
            logger.error(f"[{session_id}] 정보 파싱 실패: {str(e)}")
            # 실패 시 awaiting_info 유지하고 재질문
            return {
                "message": "정보를 이해하는 데 문제가 있었습니다. 다시 한 번 말씀해주시겠어요?",
                "message_type": "text"
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
        # 첫 메시지
        if len(chat_history) == 0:
            return "initial"
        
        # 최소 1회 대화 후부터 충분한 정보 확인
        # 사용자 메시지만 추출 (증상 정보)
        user_messages = [msg['content'] for msg in chat_history if msg['role'] == 'user']
        
        # 최소 2개 이상의 사용자 메시지가 있고, 증상이 구체적이면 추론 가능
        if len(user_messages) >= 2:
            # 증상 내용 길이 확인 (구체적인 증상 설명이 있는지)
            total_length = sum(len(msg) for msg in user_messages)
            if total_length > 30:  # 충분한 정보량
                return "inferring"
        
        # 3회 이상 대화했으면 무조건 추론 (무한 루프 방지)
        if len(chat_history) >= 6:  # 3회 왕복
            return "inferring"
        
        # 그 외에는 정보 수집
        return "collecting"
    
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
        prompt = f"""사용자가 증상을 이야기했습니다.

다음 작업을 수행하세요:
1. 짧게 공감합니다 (1문장)
2. 증상 파악을 위해 1-2개 질문합니다 (언제부터, 다른 증상 등)

**중요: 사용자가 말한 증상을 반복하지 말고, 바로 질문하세요.**

사용자 메시지: {user_message}"""
        
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
            for msg in chat_history[-3:]  # 최근 3개 메시지만
        ])
        
        prompt = f"""**최근 대화:**
{history_text}

**사용자의 최신 답변:**
{user_message}

다음 중 하나를 선택하세요:

**A) 정보가 충분함** - 즉시 질환 추론 단계로 진행
  조건: 주 증상, 발생 시기, 강도 중 2개 이상 확인됨
  응답: "READY_TO_INFER"

**B) 정보가 부족함** - 1개 질문 추가
  조건: 핵심 정보가 부족함
  응답: 구체적인 질문 1개

**중요:**
- 사용자가 이미 말한 내용 반복 금지
- 불필요한 질문 금지 (예: 스트레스, 생활습관 등)
- 정보가 충분하면 즉시 "READY_TO_INFER" 응답"""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ])
        
        # READY_TO_INFER 시그널이 있으면 즉시 추론 단계로
        if "READY_TO_INFER" in response.content:
            logger.info(f"[{session_id}] 정보 수집 완료 → 즉시 질환 추론")
            return await self._handle_inferring_stage(
                session_id=session_id,
                user_message=user_message,
                chat_history=chat_history,
                user_context=user_context
            )
        
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
        
        prompt = f"""수집된 증상을 분석하여 의심되는 질환을 추론하세요.

        **증상:**
        {symptoms_text}

        **출력 형식 (JSON만):**
        {{
        "diseases": [
            {{"id": "disease_1", "name": "감기", "confidence": 0.85, "symptoms": ["두통", "발열"]}},
            {{"id": "disease_2", "name": "독감", "confidence": 0.65, "symptoms": ["오한"]}},
            {{"id": "disease_3", "name": "편두통", "confidence": 0.45, "symptoms": ["두통"]}}
        ],
        "message": "증상을 분석한 결과입니다. 해당하는 질환을 선택해주세요."
        }}

        중요: 
        - confidence는 0.0~1.0 사이의 소수점 값으로 표현 (85% = 0.85)
        - JSON 외에 다른 텍스트는 절대 포함하지 마세요."""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": "당신은 의료 AI입니다. 증상을 분석하여 JSON 형식으로만 응답합니다. 다른 텍스트는 포함하지 않습니다."},
            {"role": "user", "content": prompt}
        ])
        
        try:
            # JSON 파싱 (코드 블록 제거)
            content = response.content.strip()
            # ```json 제거
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:].strip()
            
            result = json.loads(content)
            
            # confidence 값을 0-1 범위로 변환 (LLM이 0-100으로 반환할 경우)
            for disease in result["diseases"]:
                if disease["confidence"] > 1:
                    disease["confidence"] = disease["confidence"] / 100.0
            
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

