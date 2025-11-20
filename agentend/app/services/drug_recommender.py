"""
약품 추천 서비스

사용자가 선택한 질환에 맞는 약품을 추천합니다.

추천 프로세스:
1. RAG로 관련 약품 검색
2. 금기사항 필터링
3. LLM이 최적 약품 선택
4. 병원 안내 또는 약국 안내 결정
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
        3. 약국 추천 시: RAG 검색 + LLM 선택
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
        - 경증 (1-6점): 일반의약품으로 치료 가능 → 약국
        - 중등도 (7점): 약품 추천 + 병원 권고
        - 중증 (8-10점): 즉시 병원 방문 → 병원
        
        Args:
            disease: 질환 정보
            user_context: 사용자 컨텍스트
        
        Returns:
            Dict: 심각도 평가 결과
        """
        prompt = f"""
다음 질환의 심각도를 평가하세요:

**질환 정보:**
- 질환명: {disease['name']}
- 신뢰도: {disease['confidence']}%
- 관련 증상: {', '.join(disease['symptoms'])}

**환자 정보:**
- 나이: {user_context.get('user_age', '미제공')}
- 임신 여부: {'예' if user_context.get('is_pregnant') else '아니오'}

**평가 기준:**
1-6점: 일반의약품(OTC)으로 치료 가능 (약국 추천)
7점: 약품 추천 + 병원 방문 권고
8-10점: 즉시 병원 방문 필요

JSON 형식으로 응답하세요:
{{
  "severity_score": 5,
  "recommendation": "PHARMACY" or "HOSPITAL",
  "reason": "판단 이유"
}}
"""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": "당신은 의료 전문가입니다. 증상의 심각도를 평가합니다."},
            {"role": "user", "content": prompt}
        ])
        
        try:
            result = json.loads(response.content)
            logger.info(f"심각도 평가: score={result['severity_score']}, recommendation={result['recommendation']}")
            return result
        except json.JSONDecodeError:
            # 파싱 실패 시 안전하게 약국 추천
            logger.warning("심각도 평가 JSON 파싱 실패, 기본값 사용")
            return {
                "severity_score": 5,
                "recommendation": "PHARMACY",
                "reason": "일반적인 증상으로 판단됩니다."
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
        2. 금기사항 필터링
        3. LLM이 최적 약품 선택 (최대 3개)
        4. 주변 약국 검색
        
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
        
        # 2. 금기사항 필터링
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
        
        # 3. LLM이 최적 약품 선택
        logger.info(f"[{session_id}] LLM 약품 선택: {len(safe_drugs)}개 후보")
        selected_drugs = await self._select_best_drugs(
            disease,
            safe_drugs[:10],  # 상위 10개만 LLM에 전달
            user_context
        )
        
        # 4. 주변 약국 검색
        nearby_pharmacies = []
        location = user_context.get('location')
        if location:
            logger.info(f"[{session_id}] 주변 약국 검색")
            with db_manager.get_session() as session:
                nearby_pharmacies = FacilityQueries.search_nearby_pharmacies(
                    session,
                    latitude=location['latitude'],
                    longitude=location['longitude'],
                    radius_km=3.0,
                    limit=5
                )
        
        # 5. 최종 메시지 생성
        message = self._generate_pharmacy_message(
            disease,
            selected_drugs,
            nearby_pharmacies,
            severity
        )
        
        return {
            "message": message,
            "message_type": "recommendation",
            "recommendation": {
                "type": "PHARMACY",
                "drugs": selected_drugs,
                "facilities": nearby_pharmacies,
                "severity_score": severity["severity_score"]
            }
        }
    
    async def _recommend_hospital(
        self,
        session_id: str,
        disease: Dict[str, Any],
        severity: Dict[str, Any],
        user_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        병원 추천
        
        심각한 증상으로 판단되면 병원 방문을 안내합니다.
        
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
        location = user_context.get('location')
        if location:
            logger.info(f"[{session_id}] 주변 병원 검색")
            with db_manager.get_session() as session:
                nearby_hospitals = FacilityQueries.search_nearby_hospitals(
                    session,
                    latitude=location['latitude'],
                    longitude=location['longitude'],
                    radius_km=5.0,
                    limit=5
                )
        
        # 메시지 생성
        message = f"""
{disease['name']}이(가) 의심됩니다.

심각도: {severity['severity_score']}/10
판단 이유: {severity['reason']}

⚠️ 일반의약품으로는 적절한 치료가 어려울 수 있습니다.
가까운 병원을 방문하여 정확한 진단을 받으시길 권장합니다.
"""
        
        if nearby_hospitals:
            message += f"\n\n🏥 **가까운 병원 ({len(nearby_hospitals)}곳)**\n"
            for hosp in nearby_hospitals[:3]:
                message += f"- {hosp['name']} ({hosp['distance_km']:.1f}km)\n"
                message += f"  {hosp['address']}\n"
                if hosp.get('phone'):
                    message += f"  ☎ {hosp['phone']}\n"
        
        return {
            "message": message,
            "message_type": "recommendation",
            "recommendation": {
                "type": "HOSPITAL",
                "facilities": nearby_hospitals,
                "severity_score": severity["severity_score"],
                "disease": disease
            }
        }
    
    async def _select_best_drugs(
        self,
        disease: Dict[str, Any],
        candidate_drugs: List[Dict[str, Any]],
        user_context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        LLM이 최적의 약품 선택
        
        RAG로 검색된 약품 중 가장 적합한 2-3개를 선택합니다.
        
        Args:
            disease: 질환 정보
            candidate_drugs: 후보 약품 리스트
            user_context: 사용자 컨텍스트
        
        Returns:
            List[Dict]: 선택된 약품 목록
        """
        # 후보 약품 정보 텍스트로 변환
        drugs_text = "\n".join([
            f"{i+1}. {drug['item_name']} ({drug['entp_name']}) - {drug['item_seq']}"
            for i, drug in enumerate(candidate_drugs)
        ])
        
        prompt = f"""
다음 질환에 가장 적합한 일반의약품 2-3개를 선택하세요:

**질환:** {disease['name']}
**증상:** {', '.join(disease['symptoms'])}

**후보 약품:**
{drugs_text}

**선택 기준:**
1. 증상 완화 효과
2. 부작용 최소화
3. 복용 편의성

JSON 형식으로 응답하세요:
{{
  "selected": [
    {{
      "item_seq": "품목코드",
      "reason": "추천 이유"
    }}
  ]
}}

최대 3개까지만 선택하세요.
"""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": "당신은 약사입니다. 일반의약품을 추천합니다."},
            {"role": "user", "content": prompt}
        ])
        
        try:
            result = json.loads(response.content)
            selected = result["selected"]
            
            # 선택된 약품 정보 보강
            selected_drugs = []
            for sel in selected:
                drug = next(
                    (d for d in candidate_drugs if d['item_seq'] == sel['item_seq']),
                    None
                )
                if drug:
                    drug['recommendation_reason'] = sel['reason']
                    selected_drugs.append(drug)
            
            logger.info(f"LLM 약품 선택 완료: {len(selected_drugs)}개")
            return selected_drugs
            
        except json.JSONDecodeError:
            # 파싱 실패 시 상위 3개 반환
            logger.warning("LLM 응답 파싱 실패, 상위 3개 반환")
            return candidate_drugs[:3]
    
    def _generate_pharmacy_message(
        self,
        disease: Dict[str, Any],
        drugs: List[Dict[str, Any]],
        pharmacies: List[Dict[str, Any]],
        severity: Dict[str, Any]
    ) -> str:
        """
        약국 추천 메시지 생성
        
        Args:
            disease: 질환 정보
            drugs: 추천 약품
            pharmacies: 주변 약국
            severity: 심각도 평가
        
        Returns:
            str: 최종 메시지
        """
        message = f"{disease['name']}이(가) 의심됩니다.\n\n"
        message += f"심각도: {severity['severity_score']}/10\n"
        message += f"{severity['reason']}\n\n"
        
        # 약품 추천
        if drugs:
            message += "💊 **추천 일반의약품**\n\n"
            for i, drug in enumerate(drugs):
                message += f"{i+1}. **{drug['item_name']}**\n"
                message += f"   제조: {drug['entp_name']}\n"
                if drug.get('recommendation_reason'):
                    message += f"   추천 이유: {drug['recommendation_reason']}\n"
                message += "\n"
        
        # 주변 약국
        if pharmacies:
            message += f"🏥 **가까운 약국 ({len(pharmacies)}곳)**\n\n"
            for pharm in pharmacies[:3]:
                message += f"- {pharm['name']} ({pharm['distance_km']:.1f}km)\n"
                message += f"  {pharm['address']}\n"
                if pharm.get('phone'):
                    message += f"  ☎ {pharm['phone']}\n"
        
        message += "\n⚠️ 증상이 악화되면 병원을 방문하세요."
        
        return message


# 싱글톤 인스턴스
drug_recommender = DrugRecommender()

