"""
RAG Retriever 모듈

벡터 스토어를 사용하여 사용자 쿼리에 적합한 약품을 검색합니다.

Retriever의 역할:
- 사용자 증상/질환 → 관련 약품 검색
- 검색 결과를 LLM에 전달하여 최종 추천
"""

from typing import List, Dict, Any
import logging

from app.rag.vector_store import vector_store_manager
from app.database.connection import db_manager
from app.database.queries import DURQueries

logger = logging.getLogger(__name__)


class DURRetriever:
    """
    DUR 데이터 Retriever
    
    벡터 검색과 SQL 검색을 결합하여 최적의 약품을 찾습니다.
    """
    
    def __init__(self):
        """
        Retriever 초기화
        
        벡터 스토어를 로드합니다.
        """
        # 벡터 스토어 로드
        if not vector_store_manager.vector_store:
            success = vector_store_manager.load_vector_store()
            if not success:
                logger.error("벡터 스토어 로드 실패. 먼저 구축해야 합니다.")
                logger.error("실행: python scripts/build_vector_store.py")
    
    def search_drugs_by_symptoms(
        self, 
        symptoms: List[str],
        k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        증상으로 약품 검색
        
        검색 전략:
        1. 벡터 검색: 증상과 의미론적으로 유사한 약품 검색
        2. 금기사항 필터링: 임신부/노인 주의사항 확인
        
        Args:
            symptoms: 증상 리스트 (예: ["두통", "발열"])
            k: 반환할 약품 개수
        
        Returns:
            List[Dict]: 약품 정보 + 메타데이터
        """
        try:
            # 증상을 하나의 쿼리로 결합
            # 예: ["두통", "발열"] → "두통 발열"
            query = " ".join(symptoms)
            logger.info(f"증상 검색: query='{query}', k={k}")
            
            # 벡터 검색 (점수 포함)
            results = vector_store_manager.search_with_score(
                query=query,
                k=k,
                filter={"is_otc": True}  # OTC만 검색
            )
            
            if not results:
                logger.warning("검색 결과 없음")
                return []
            
            # Document → Dict 변환
            drugs = []
            for doc, score in results:
                drug_info = {
                    "item_seq": doc.metadata.get("item_seq"),
                    "item_name": doc.metadata.get("item_name"),
                    "entp_name": doc.metadata.get("entp_name"),
                    "class_no": doc.metadata.get("class_no"),
                    "similarity_score": float(score),  # 유사도 점수
                    "content": doc.page_content  # 전체 내용
                }
                drugs.append(drug_info)
            
            logger.info(f"검색 완료: {len(drugs)}개 약품")
            
            # 상위 3개 로깅
            for i, drug in enumerate(drugs[:3]):
                logger.debug(
                    f"  {i+1}. {drug['item_name']} "
                    f"(score={drug['similarity_score']:.4f})"
                )
            
            return drugs
            
        except Exception as e:
            logger.error(f"약품 검색 실패: {str(e)}")
            return []
    
    def get_drug_contraindications(
        self,
        item_seq: str,
        user_age: int = None,
        is_pregnant: bool = False
    ) -> Dict[str, Any]:
        """
        약품 금기사항 조회
        
        사용자 정보에 따라 주의사항을 확인합니다:
        - 임신부: 임신부 금기사항
        - 65세 이상: 노인 주의사항
        
        Args:
            item_seq: 품목 기준코드
            user_age: 사용자 나이 (선택)
            is_pregnant: 임신 여부
        
        Returns:
            Dict: 금기사항 정보
        """
        try:
            contraindications = {
                "item_seq": item_seq,
                "has_warnings": False,
                "pregnancy_warnings": [],
                "elderly_warnings": [],
                "age_warnings": []
            }
            
            with db_manager.get_session() as session:
                # 임신부 금기사항 확인
                if is_pregnant:
                    pregnancy = DURQueries.get_pregnancy_contraindications(
                        session, item_seq
                    )
                    if pregnancy:
                        contraindications["pregnancy_warnings"] = pregnancy
                        contraindications["has_warnings"] = True
                        logger.warning(
                            f"임신부 금기: {item_seq}, "
                            f"count={len(pregnancy)}"
                        )
                
                # 노인 주의사항 확인 (65세 이상)
                if user_age and user_age >= 65:
                    elderly = DURQueries.get_elderly_cautions(
                        session, item_seq
                    )
                    if elderly:
                        contraindications["elderly_warnings"] = elderly
                        contraindications["has_warnings"] = True
                        logger.warning(
                            f"노인 주의: {item_seq}, "
                            f"count={len(elderly)}"
                        )
            
            return contraindications
            
        except Exception as e:
            logger.error(f"금기사항 조회 실패: {str(e)}")
            return {
                "item_seq": item_seq,
                "has_warnings": False,
                "pregnancy_warnings": [],
                "elderly_warnings": [],
                "age_warnings": []
            }
    
    def filter_safe_drugs(
        self,
        drugs: List[Dict[str, Any]],
        user_age: int = None,
        is_pregnant: bool = False
    ) -> List[Dict[str, Any]]:
        """
        안전한 약품만 필터링
        
        금기사항이 있는 약품을 제외합니다.
        
        Args:
            drugs: 검색된 약품 리스트
            user_age: 사용자 나이
            is_pregnant: 임신 여부
        
        Returns:
            List[Dict]: 안전한 약품 리스트
        """
        try:
            safe_drugs = []
            
            for drug in drugs:
                item_seq = drug.get("item_seq")
                
                # 금기사항 확인
                contraindications = self.get_drug_contraindications(
                    item_seq,
                    user_age,
                    is_pregnant
                )
                
                # 금기사항이 있으면 제외
                if not contraindications["has_warnings"]:
                    safe_drugs.append(drug)
                else:
                    logger.info(
                        f"금기사항으로 제외: {drug['item_name']} "
                        f"(임신={len(contraindications['pregnancy_warnings'])}, "
                        f"노인={len(contraindications['elderly_warnings'])})"
                    )
            
            logger.info(
                f"안전한 약품 필터링: {len(drugs)}개 → {len(safe_drugs)}개"
            )
            
            return safe_drugs
            
        except Exception as e:
            logger.error(f"약품 필터링 실패: {str(e)}")
            return drugs  # 에러 시 원본 반환


# 싱글톤 인스턴스
dur_retriever = DURRetriever()

