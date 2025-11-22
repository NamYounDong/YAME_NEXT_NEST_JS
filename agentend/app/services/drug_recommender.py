"""
약품 추천 서비스

사용자가 선택한 질환에 맞는 약품을 추천합니다.

수정 사항:
- 나이/임신 여부는 초기에 물어보지 않음
- 약 추천 시 필요한 경우에만 대화를 통해 수집
- 금기사항이 있는 성분이 포함된 약만 확인 필요

추천 프로세스:
1. 질환 정보로 약품 검색 (RAG)
2. 나이/임신 정보가 필요한지 확인 (금기사항이 있는 성분이 있는 약인지)
3. 필요한 정보가 없으면 사용자에게 질문
4. 정보가 있으면 금기사항 필터링 후 LLM이 최적 약품 선택
5. 주변 약국/병원 안내
"""

from typing import Dict, Any, List, Optional
import logging
import json

from langchain_openai import ChatOpenAI

from app.config import settings
from app.rag.retriever import dur_retriever
from app.database.connection import db_manager
from app.database.queries import FacilityQueries
from app.database.redis_manager import redis_manager
from app.database.symptom_log import save_symptom_log

logger = logging.getLogger(__name__)


class DrugRecommender:
    """
    약품 추천 서비스
    
    질환과 사용자 정보를 기반으로 안전한 약품을 추천합니다.
    """
    
    def __init__(self):
        """
        추천 시스템 초기화
        
        GPT-4o를 사용하여 최적의 약품을 선택합니다.
        """
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0.2,  # 일관된 추천을 위해 낮은 temperature
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        logger.info("DrugRecommender 초기화 완료")
    
    async def recommend(
        self,
        session_id: str,
        selected_disease_id: str
    ) -> Dict[str, Any]:
        """
        약품 추천 메인 함수
        
        전체 플로우:
        1. 컨텍스트에서 질환 정보 조회
        2. 심각도 판단 (병원 vs 약국)
        3. 약국 추천 시: 
           3-1. RAG 검색으로 약품 후보 찾기
           3-2. 금기사항이 있는 약품인지 확인
           3-3. 필요한 정보(나이/임신)가 없으면 물어보기
           3-4. 정보가 있으면 필터링 후 추천
        4. 주변 시설 검색
        5. 최종 안내 메시지 생성
        
        Args:
            session_id: 세션 ID
            selected_disease_id: 사용자가 선택한 질환 ID
        
        Returns:
            Dict: 추천 결과
        """
        try:
            logger.info(f"[{session_id}] 약품 추천 시작: disease_id={selected_disease_id}")
            
            # 컨텍스트 조회
            user_context = redis_manager.get_context(session_id)
            if not user_context:
                logger.error(f"[{session_id}] 컨텍스트 없음")
                return {
                    "message": "세션 정보를 찾을 수 없습니다. 처음부터 다시 시작해주세요.",
                    "message_type": "error"
                }
            
            # 선택한 질환 찾기
            suspected_diseases = user_context.get("suspected_diseases", [])
            selected_disease = next(
                (d for d in suspected_diseases if d["id"] == selected_disease_id),
                None
            )
            
            if not selected_disease:
                logger.error(f"[{session_id}] 질환을 찾을 수 없음: {selected_disease_id}")
                return {
                    "message": "선택한 질환 정보를 찾을 수 없습니다.",
                    "message_type": "error"
                }
            
            logger.info(f"[{session_id}] 선택된 질환: {selected_disease['name']}")
            
            # 심각도 판단
            severity_decision = await self._assess_severity(
                selected_disease,
                user_context
            )
            
            logger.info(f"[{session_id}] 심각도 판단: {severity_decision['recommendation']}")
            
            # 병원 추천
            if severity_decision["recommendation"] == "HOSPITAL":
                return await self._recommend_hospital(
                    session_id,
                    selected_disease,
                    severity_decision,
                    user_context
                )
            
            # 약국 추천
            else:
                return await self._recommend_pharmacy(
                    session_id,
                    selected_disease,
                    severity_decision,
                    user_context
                )
            
        except Exception as e:
            logger.error(f"[{session_id}] 약품 추천 실패: {str(e)}", exc_info=True)
            return {
                "message": "추천 중 오류가 발생했습니다. 다시 시도해주세요.",
                "message_type": "error"
            }
    
    async def _assess_severity(
        self,
        disease: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        심각도 평가
        
        LLM이 질환의 심각도를 판단하여 병원/약국을 결정합니다.
        
        기준:
        - 경증 (1-5점): 일반의약품으로 치료 가능 → 약국
        - 중등도 (6-7점): 약품 추천 + 병원 방문 권고
        - 중증 (8-10점): 즉시 병원 방문 → 병원 (약품 추천 금지)
        
        응급 증상 (무조건 8점 이상):
        - 외상: 골절, 탈구, 심한 출혈, 화상(2도 이상)
        - 응급: 호흡곤란, 의식 저하, 경련, 실신, 흉통
        - 기타: 알레르기 쇼크, 극심한 통증
        
        Args:
            disease: 질환 정보
            user_context: 사용자 컨텍스트
        
        Returns:
            Dict: 심각도 평가 결과
        """
        # 나이/임신 정보가 있으면 활용, 없어도 평가 진행
        age_info = f"{user_context.get('user_age')}세" if user_context.get('user_age') else "정보 없음"
        pregnancy_info = "예" if user_context.get('is_pregnant') else "아니오" if 'is_pregnant' in user_context else "정보 없음"
        
        prompt = f"""
다음 질환의 심각도를 평가하세요:

**질환 정보:**
- 질환명: {disease['name']}
- 신뢰도: {disease['confidence']}%
- 관련 증상: {', '.join(disease['symptoms'])}

**환자 정보:**
- 나이: {age_info}
- 임신 여부: {pregnancy_info}

**평가 기준:**
1-5점: 일반의약품(OTC)으로 치료 가능 (약국 추천)
  - 예: 경미한 두통, 가벼운 감기(미열, 콧물, 기침), 소화불량, 가벼운 근육통
  - 감기 증상 (37.5도 미만 미열, 콧물, 가벼운 기침)은 3-4점
6-7점: 약품 추천 + 병원 방문 권고
  - 예: 지속되는 통증, 고열(38.5도 이상), 심한 설사, 심한 기침
8-10점: 즉시 병원 방문 필요 (약품 추천 금지)
  - 예: 골절, 탈구, 심한 출혈, 호흡곤란, 의식 저하
  - 예: 극심한 통증, 외상, 화상(2도 이상), 심한 복통
  - 예: 알레르기 쇼크, 흉통, 경련, 실신

**중요 원칙:**
1. 일반적인 감기 증상(미열, 콧물, 기침, 피로)은 3-4점으로 평가
2. 외상(골절, 탈구, 심한 출혈 등)은 무조건 8점 이상
3. 응급 증상(호흡곤란, 의식 저하, 경련 등)은 무조건 9점 이상
4. 생명에 위협이 될 수 있는 증상은 10점

JSON 형식으로 응답하세요:
{{
  "severity_score": 5,
  "recommendation": "PHARMACY" or "HOSPITAL",
  "reason": "판단 이유"
}}
"""
        
        response = await self.llm.ainvoke([
            {
                "role": "system", 
                "content": """당신은 의료 전문가입니다. 증상의 심각도를 평가합니다.

중요 원칙:
1. 일반적인 감기 증상(미열, 콧물, 기침, 피로)은 3-4점 (약국)
2. 골절, 탈구, 출혈 등 외상은 반드시 8점 이상 (병원)
3. 응급 증상(호흡곤란, 의식 저하, 경련 등)은 9점 이상 (응급)
4. 일반의약품으로 충분히 치료 가능한 증상은 5점 이하
5. 의심스러울 때만 높은 점수 부여

반드시 JSON 형식으로만 응답하세요."""
            },
            {"role": "user", "content": prompt}
        ])
        
        try:
            # LLM 응답 로그
            logger.info(f"심각도 평가 LLM 응답: {response.content[:200]}")
            
            # JSON 추출 (코드 블록이 있으면 제거)
            content = response.content.strip()
            if content.startswith("```"):
                # ```json 제거
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:].strip()
            
            result = json.loads(content)
            logger.info(f"심각도 평가: score={result['severity_score']}, recommendation={result['recommendation']}")
            return result
        except (json.JSONDecodeError, KeyError) as e:
            # 파싱 실패 시 경증으로 기본 설정 (일반적인 증상으로 가정)
            logger.error(f"심각도 평가 JSON 파싱 실패: {str(e)}")
            logger.error(f"LLM 원본 응답: {response.content}")
            return {
                "severity_score": 4,
                "recommendation": "PHARMACY",
                "reason": "일반적인 증상으로 판단됩니다. 증상이 심해지면 병원을 방문하세요."
            }
    
    async def _recommend_pharmacy(
        self,
        session_id: str,
        disease: Dict[str, Any],
        severity: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        약국 및 약품 추천
        
        1. RAG로 약품 검색
        2. 금기사항이 있는 약인지 확인 (DUR 데이터)
        3. 필요한 정보(나이/임신)가 없으면 사용자에게 질문
        4. 정보가 있으면 금기사항 필터링
        5. LLM이 최적 약품 선택 (최대 3개)
        6. 주변 약국 검색
        
        Args:
            session_id: 세션 ID
            disease: 질환 정보
            severity: 심각도 평가 결과
            user_context: 사용자 컨텍스트
        
        Returns:
            Dict: 약품 및 약국 추천 결과
        """
        # 1. RAG로 약품 검색
        logger.info(f"[{session_id}] RAG 검색: symptoms={disease['symptoms']}")
        candidate_drugs = dur_retriever.search_drugs_by_symptoms(
            symptoms=disease['symptoms'],
            k=20  # 많이 검색하여 선택지 확보
        )
        
        if not candidate_drugs:
            logger.warning(f"[{session_id}] 검색된 약품 없음")
            return {
                "message": "적합한 일반의약품을 찾을 수 없습니다. 약사와 상담하시길 권장합니다.",
                "message_type": "text"
            }
        
        # 2. 금기사항 확인 (나이/임신 정보가 필요한지 판단)
        logger.info(f"[{session_id}] 금기사항 확인 시작")
        contraindication_check = await self._check_contraindications_needed(
            candidate_drugs,
            user_context
        )
        
        # 필요한 정보가 없으면 사용자에게 질문
        if not contraindication_check["all_info_provided"]:
            missing_info = contraindication_check["missing_info"]
            
            # 컨텍스트에 '정보 요청 대기' 상태 저장
            user_context["awaiting_info"] = {
                "type": "drug_contraindication_check",
                "disease_id": disease["id"],
                "missing": missing_info
            }
            redis_manager.set_context(session_id, user_context)
            
            # 사용자에게 질문 메시지 생성
            question_message = self._generate_info_request_message(missing_info)
            
            logger.info(f"[{session_id}] 추가 정보 필요: {missing_info}")
            return {
                "message": question_message,
                "message_type": "info_request"
            }
        
        # 3. 정보가 모두 있으면 금기사항 필터링
        logger.info(f"[{session_id}] 금기사항 필터링")
        safe_drugs = dur_retriever.filter_safe_drugs(
            drugs=candidate_drugs,
            user_age=user_context.get('user_age'),
            is_pregnant=user_context.get('is_pregnant', False)
        )
        
        if not safe_drugs:
            logger.warning(f"[{session_id}] 안전한 약품 없음 (금기사항)")
            return {
                "message": "사용자 정보상 금기사항이 있어 추천할 약품이 없습니다. 의사와 상담하세요.",
                "message_type": "text"
            }
        
        # 4. LLM이 최적 약품 선택
        logger.info(f"[{session_id}] LLM 약품 선택 (후보 {len(safe_drugs)}개)")
        recommended_drugs = await self._select_best_drugs(
            disease,
            safe_drugs,
            user_context,
            top_k=3
        )
        
        # 5. 주변 약국 검색
        nearby_pharmacies = []
        location = user_context.get("location")
        if location:
            logger.info(f"[{session_id}] 주변 약국 검색")
            nearby_pharmacies = self._get_nearby_pharmacies(
                latitude=location.get("latitude"),
                longitude=location.get("longitude"),
                radius_km=3.0
            )
            logger.info(f"[{session_id}] 약국 검색 완료: {len(nearby_pharmacies)}개")
        
        # 6. 응답 메시지 생성
        message = self._generate_pharmacy_message(
            disease,
            recommended_drugs,
            nearby_pharmacies
        )
        
        # 7. 로그 저장
        save_symptom_log(
            session_id=session_id,
            symptom_data={
                'symptom_text': ' / '.join(disease.get('symptoms', [])),
            },
            selected_disease=disease,
            severity=severity,
            recommendation_type='PHARMACY',
            recommended_drugs=recommended_drugs,
            nearby_pharmacies=nearby_pharmacies,
            location=user_context.get('location'),
            suspected_diseases=user_context.get('disease_options')
        )
        
        return {
            "message": message,
            "message_type": "recommendation",
            "recommendation": {
                "type": "PHARMACY",
                "severity_score": severity.get("severity_score", 5),
                "disease": disease["name"],
                "drugs": recommended_drugs,
                "facilities": nearby_pharmacies
            }
        }
    
    async def _check_contraindications_needed(
        self,
        drugs: List[Dict[str, Any]],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        금기사항 확인을 위해 추가 정보가 필요한지 판단
        
        약품 리스트에 나이/임신 관련 금기사항이 있는 약이 포함되어 있는지 확인하고,
        해당 정보가 user_context에 없으면 요청 필요 표시
        
        Args:
            drugs: 약품 후보 리스트
            user_context: 사용자 컨텍스트
        
        Returns:
            Dict: {
                "all_info_provided": bool,
                "missing_info": List[str]  # ["age", "pregnancy"]
            }
        """
        missing_info = []
        
        # 금기사항이 있는 약이 있는지 확인 (간단히 DUR 데이터 조회)
        has_age_restriction = any(
            drug.get("dur_age_restriction") for drug in drugs
        )
        has_pregnancy_restriction = any(
            drug.get("dur_pregnancy_restriction") for drug in drugs
        )
        
        # 나이 정보 필요 여부
        if has_age_restriction and user_context.get("user_age") is None:
            missing_info.append("age")
        
        # 임신 정보 필요 여부
        if has_pregnancy_restriction and "is_pregnant" not in user_context:
            missing_info.append("pregnancy")
        
        return {
            "all_info_provided": len(missing_info) == 0,
            "missing_info": missing_info
        }
    
    def _generate_info_request_message(self, missing_info: List[str]) -> str:
        """
        사용자에게 추가 정보를 요청하는 메시지 생성
        
        Args:
            missing_info: 필요한 정보 리스트 ["age", "pregnancy"]
        
        Returns:
            str: 요청 메시지
        """
        questions = []
        
        if "age" in missing_info:
            questions.append("나이")
        if "pregnancy" in missing_info:
            questions.append("임신 여부 (임신 중이신가요?)")
        
        if len(questions) == 1:
            return f"안전한 약품 추천을 위해 {questions[0]}를 알려주시겠어요?"
        else:
            return f"안전한 약품 추천을 위해 다음 정보를 알려주세요:\n\n" + "\n".join(f"• {q}" for q in questions)
    
    async def _select_best_drugs(
        self,
        disease: Dict[str, Any],
        safe_drugs: List[Dict[str, Any]],
        user_context: Dict[str, Any],
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        LLM을 사용하여 최적의 약품 선택
        
        Args:
            disease: 질환 정보
            safe_drugs: 안전한 약품 리스트
            user_context: 사용자 컨텍스트
            top_k: 추천할 약품 개수
        
        Returns:
            List[Dict]: 추천 약품 리스트
        """
        # LLM 프롬프트 생성
        drugs_info = "\n".join([
            f"{i+1}. {drug['item_name']} ({drug['entp_name']})\n"
            f"   - 효능: {drug.get('efcy_qesitm', '정보 없음')[:100]}...\n"
            f"   - 용법: {drug.get('use_method_qesitm', '정보 없음')[:100]}..."
            for i, drug in enumerate(safe_drugs[:10])  # 최대 10개만 LLM에 전달
        ])
        
        prompt = f"""
다음 질환에 가장 적합한 일반의약품 {top_k}개를 선택하세요:

**질환 정보:**
- 질환명: {disease['name']}
- 증상: {', '.join(disease['symptoms'])}

**안전한 약품 목록:**
{drugs_info}

**선택 기준:**
1. 증상에 가장 효과적인 약
2. 부작용이 적은 약
3. 흔히 사용되는 약

JSON 배열로 응답하세요 (약품 번호만):
[1, 3, 5]
"""
        
        try:
            response = await self.llm.ainvoke([
                {"role": "system", "content": "당신은 약사입니다. 증상에 맞는 최적의 약품을 선택합니다."},
                {"role": "user", "content": prompt}
            ])
            
            # LLM 응답 파싱
            selected_indices = json.loads(response.content)
            logger.info(f"LLM 선택 약품 인덱스: {selected_indices}")
            
            # 선택된 약품 반환
            recommended = []
            for idx in selected_indices[:top_k]:
                if 0 < idx <= len(safe_drugs[:10]):
                    drug = safe_drugs[idx - 1]
                    recommended.append({
                        "item_seq": drug["item_seq"],
                        "item_name": drug["item_name"],
                        "entp_name": drug["entp_name"],
                        "efcy_qesitm": drug.get("efcy_qesitm", ""),
                        "use_method_qesitm": drug.get("use_method_qesitm", ""),
                        "recommendation_reason": f"{disease['name']} 증상 완화에 효과적"
                    })
            
            return recommended if recommended else safe_drugs[:top_k]
            
        except Exception as e:
            logger.warning(f"LLM 약품 선택 실패, 기본 선택 사용: {str(e)}")
            # LLM 실패 시 상위 3개 반환
            return [
                {
                    "item_seq": drug["item_seq"],
                    "item_name": drug["item_name"],
                    "entp_name": drug["entp_name"],
                    "efcy_qesitm": drug.get("efcy_qesitm", ""),
                    "use_method_qesitm": drug.get("use_method_qesitm", ""),
                    "recommendation_reason": f"{disease['name']} 증상 완화에 도움"
                }
                for drug in safe_drugs[:top_k]
            ]
    
    def _get_nearby_pharmacies(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 3.0,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        주변 약국 검색
        
        Args:
            latitude: 위도
            longitude: 경도
            radius_km: 검색 반경 (km)
            limit: 최대 결과 개수
        
        Returns:
            List[Dict]: 약국 정보 리스트
        """
        try:
            with db_manager.get_session() as session:
                pharmacies = FacilityQueries.search_nearby_pharmacies(
                    session=session,
                    latitude=latitude,
                    longitude=longitude,
                    radius_km=radius_km,
                    limit=limit
                )
            
            logger.info(f"주변 약국 {len(pharmacies)}개 검색 완료")
            return pharmacies
            
        except Exception as e:
            logger.error(f"약국 검색 실패: {str(e)}")
            return []
    
    def _generate_pharmacy_message(
        self,
        disease: Dict[str, Any],
        drugs: List[Dict[str, Any]],
        pharmacies: List[Dict[str, Any]]
    ) -> str:
        """
        약국 추천 메시지 생성
        
        Args:
            disease: 질환 정보
            drugs: 추천 약품 리스트
            pharmacies: 주변 약국 리스트
        
        Returns:
            str: 메시지
        """
        message = f"**{disease['name']}** 추천 약품:\n\n"
        
        if drugs:
            for i, drug in enumerate(drugs, 1):
                message += f"{i}. {drug['item_name']} ({drug['entp_name']})\n"
            message += "\n"
        
        if pharmacies:
            message += f"가까운 약국 {len(pharmacies)}곳을 확인하세요.\n\n"
        
        message += "💊 약품 구매 전 약사와 상담을 권장합니다."
        
        return message
    
    async def _recommend_hospital(
        self,
        session_id: str,
        disease: Dict[str, Any],
        severity: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        병원 추천
        
        심각도가 높아 병원 방문이 필요한 경우
        
        Args:
            session_id: 세션 ID
            disease: 질환 정보
            severity: 심각도 평가 결과
            user_context: 사용자 컨텍스트
        
        Returns:
            Dict: 병원 추천 결과
        """
        # 주변 병원 검색
        nearby_hospitals = []
        location = user_context.get("location")
        if location:
            logger.info(f"[{session_id}] 주변 병원 검색")
            try:
                with db_manager.get_session() as session:
                    hospitals = FacilityQueries.search_nearby_hospitals(
                        session=session,
                        latitude=location.get("latitude"),
                        longitude=location.get("longitude"),
                        radius_km=5.0,
                        limit=10
                    )
                nearby_hospitals = hospitals
                logger.info(f"[{session_id}] 병원 검색 완료: {len(nearby_hospitals)}개")
            except Exception as e:
                logger.error(f"병원 검색 실패: {str(e)}", exc_info=True)
        
        # 메시지 생성 (심각도에 따라 톤 조정)
        severity_score = severity.get('severity_score', 8)
        
        if severity_score >= 9:
            # 매우 심각 (응급)
            message = f"⚠️ **{disease['name']}**은 응급 상황입니다!\n\n"
            message += f"심각도: {severity_score}/10점 (응급)\n"
            message += f"사유: {severity['reason']}\n\n"
            message += "🚨 **즉시 119에 전화하거나 가까운 응급실을 방문하세요!**\n\n"
        elif severity_score >= 8:
            # 심각
            message = f"⚠️ **{disease['name']}**은 병원 진료가 필요합니다.\n\n"
            message += f"심각도: {severity_score}/10점\n"
            message += f"사유: {severity['reason']}\n\n"
            message += "🏥 일반의약품으로는 치료가 어렵습니다. 병원을 방문하세요.\n\n"
        else:
            # 중등도
            message = f"**{disease['name']}** 증상 확인이 필요합니다.\n\n"
            message += f"심각도: {severity_score}/10점\n"
            message += f"사유: {severity['reason']}\n\n"
            message += "💊 약국에서 약을 구매하되, 증상이 지속되면 병원을 방문하세요.\n\n"
        
        if nearby_hospitals:
            message += f"📍 가까운 병원 {len(nearby_hospitals)}곳을 확인하세요."
        
        # 로그 저장
        save_symptom_log(
            session_id=session_id,
            symptom_data={
                'symptom_text': ' / '.join(disease.get('symptoms', [])),
            },
            selected_disease=disease,
            severity=severity,
            recommendation_type='HOSPITAL',
            nearby_hospitals=nearby_hospitals,
            location=user_context.get('location'),
            suspected_diseases=user_context.get('disease_options')
        )
        
        return {
            "message": message,
            "message_type": "recommendation",
            "recommendation": {
                "type": "HOSPITAL",
                "severity_score": severity.get("severity_score", 8),
                "disease": disease["name"],
                "reason": severity.get("reason", ""),
                "facilities": nearby_hospitals
            }
        }


# 싱글톤 인스턴스
drug_recommender = DrugRecommender()
