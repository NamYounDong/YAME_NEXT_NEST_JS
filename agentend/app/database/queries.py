"""
데이터베이스 쿼리 모듈

DUR 데이터 및 병원/약국 정보를 조회하는 SQL 쿼리를 제공합니다.

쿼리 최적화:
- Prepared Statement 사용 (SQL 인젝션 방지)
- 필요한 컬럼만 SELECT
- 인덱스 활용 (ITEM_SEQ, X_POS/Y_POS, ETC_OTC_CODE 등)
"""

from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class DURQueries:
    """
    DUR (Drug Utilization Review) 데이터 조회 클래스
    
    DUR 데이터는 의약품 안전성 정보를 담고 있습니다:
    - 품목 정보 (ITEM_DUR_INFO)
    - 금기사항 (임신부, 노인, 연령별 등)
    """
    
    @staticmethod
    def get_otc_drugs_by_keywords(
        session: Session,
        keywords: List[str],
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        키워드로 OTC(일반의약품) 검색
        
        검색 대상 컬럼:
        - ITEM_NAME: 품목명
        - MATERIAL_NAME: 원료성분
        - CLASS_NO: 분류번호
        
        Args:
            session: SQLAlchemy 세션
            keywords: 검색 키워드 리스트 (예: ["두통", "해열"])
            limit: 최대 반환 개수
        
        Returns:
            List[Dict]: 약품 정보 리스트
        """
        try:
            # LIKE 조건 생성 (각 키워드에 대해)
            # 예: "두통" OR "해열" → ITEM_NAME LIKE '%두통%' OR ITEM_NAME LIKE '%해열%'
            like_conditions = []
            params = {}
            
            for i, keyword in enumerate(keywords):
                param_name = f"keyword_{i}"
                like_conditions.append(
                    f"(ITEM_NAME LIKE :{param_name} OR MATERIAL_NAME LIKE :{param_name} OR CLASS_NO LIKE :{param_name})"
                )
                params[param_name] = f"%{keyword}%"
            
            # WHERE 조건 결합
            where_clause = " OR ".join(like_conditions) if like_conditions else "1=0"
            
            # SQL 쿼리
            query = text(f"""
                SELECT 
                    ITEM_SEQ,
                    ITEM_NAME,
                    ENTP_NAME,
                    MATERIAL_NAME,
                    CLASS_NO,
                    EE_DOC_ID,
                    UD_DOC_ID,
                    NB_DOC_ID,
                    CHART
                FROM ITEM_DUR_INFO
                WHERE ETC_OTC_CODE = '02'  -- OTC(일반의약품)만
                  AND CANCEL_NAME IS NULL  -- 취소되지 않은 약품
                  AND ({where_clause})
                ORDER BY ITEM_NAME
                LIMIT :limit
            """)
            
            params['limit'] = limit
            result = session.execute(query, params)
            
            drugs = [dict(row._mapping) for row in result]
            logger.info(f"OTC 약품 검색: keywords={keywords}, count={len(drugs)}")
            
            return drugs
            
        except Exception as e:
            logger.error(f"OTC 약품 검색 실패: {str(e)}")
            return []
    
    @staticmethod
    def get_pregnancy_contraindications(
        session: Session,
        item_seq: str
    ) -> List[Dict[str, Any]]:
        """
        임신부 금기사항 조회
        
        Args:
            session: SQLAlchemy 세션
            item_seq: 품목 기준코드
        
        Returns:
            List[Dict]: 금기사항 목록
        """
        try:
            query = text("""
                SELECT 
                    TYPE_NAME,
                    INGR_NAME,
                    GRADE,
                    PROHBT_CONTENT,
                    NOTIFICATION_DATE
                FROM ITEM_PREGNANCY_CONTRAINDICATION
                WHERE ITEM_SEQ = :item_seq
            """)
            
            result = session.execute(query, {"item_seq": item_seq})
            contraindications = [dict(row._mapping) for row in result]
            
            if contraindications:
                logger.debug(f"임신부 금기: item_seq={item_seq}, count={len(contraindications)}")
            
            return contraindications
            
        except Exception as e:
            logger.error(f"임신부 금기 조회 실패: {str(e)}")
            return []
    
    @staticmethod
    def get_elderly_cautions(
        session: Session,
        item_seq: str
    ) -> List[Dict[str, Any]]:
        """
        노인 주의사항 조회
        
        Args:
            session: SQLAlchemy 세션
            item_seq: 품목 기준코드
        
        Returns:
            List[Dict]: 주의사항 목록
        """
        try:
            query = text("""
                SELECT 
                    TYPE_NAME,
                    INGR_NAME,
                    PROHBT_CONTENT,
                    NOTIFICATION_DATE
                FROM ITEM_ELDERLY_CAUTION
                WHERE ITEM_SEQ = :item_seq
            """)
            
            result = session.execute(query, {"item_seq": item_seq})
            cautions = [dict(row._mapping) for row in result]
            
            if cautions:
                logger.debug(f"노인 주의: item_seq={item_seq}, count={len(cautions)}")
            
            return cautions
            
        except Exception as e:
            logger.error(f"노인 주의 조회 실패: {str(e)}")
            return []


class FacilityQueries:
    """
    병원/약국 정보 조회 클래스
    
    공간 쿼리를 사용하여 가까운 시설을 검색합니다.
    """
    
    @staticmethod
    def search_nearby_pharmacies(
        session: Session,
        latitude: float,
        longitude: float,
        radius_km: float = 3.0,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        주변 약국 검색
        
        MariaDB의 ST_Distance_Sphere 함수를 사용하여
        구면 거리를 계산합니다 (지구 곡률 고려).
        
        Args:
            session: SQLAlchemy 세션
            latitude: 위도
            longitude: 경도
            radius_km: 검색 반경 (km)
            limit: 최대 반환 개수
        
        Returns:
            List[Dict]: 약국 정보 리스트 (거리순 정렬)
        """
        try:
            query = text("""
                SELECT 
                    YKIHO,
                    YADM_NM AS name,
                    ADDR AS address,
                    TELNO AS phone,
                    X_POS AS longitude,
                    Y_POS AS latitude,
                    ST_Distance_Sphere(
                        POINT(X_POS, Y_POS),
                        POINT(:longitude, :latitude)
                    ) / 1000 AS distance_km
                FROM HIRA_PHARMACY_INFO
                WHERE X_POS IS NOT NULL 
                  AND Y_POS IS NOT NULL
                  AND ST_Distance_Sphere(
                      POINT(X_POS, Y_POS),
                      POINT(:longitude, :latitude)
                  ) / 1000 <= :radius_km
                ORDER BY distance_km
                LIMIT :limit
            """)
            
            result = session.execute(query, {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km,
                "limit": limit
            })
            
            pharmacies = [dict(row._mapping) for row in result]
            logger.info(f"약국 검색: lat={latitude}, lng={longitude}, count={len(pharmacies)}")
            
            return pharmacies
            
        except Exception as e:
            logger.error(f"약국 검색 실패: {str(e)}")
            return []
    
    @staticmethod
    def search_nearby_hospitals(
        session: Session,
        latitude: float,
        longitude: float,
        radius_km: float = 5.0,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        주변 병원 검색
        
        Args:
            session: SQLAlchemy 세션
            latitude: 위도
            longitude: 경도
            radius_km: 검색 반경 (km)
            limit: 최대 반환 개수
        
        Returns:
            List[Dict]: 병원 정보 리스트 (거리순 정렬)
        """
        try:
            query = text("""
                SELECT 
                    YKIHO,
                    YADM_NM AS name,
                    ADDR AS address,
                    TELNO AS phone,
                    X_POS AS longitude,
                    Y_POS AS latitude,
                    CL_CD_NM AS type,
                    ST_Distance_Sphere(
                        POINT(X_POS, Y_POS),
                        POINT(:longitude, :latitude)
                    ) / 1000 AS distance_km
                FROM HIRA_HOSPITAL_INFO
                WHERE X_POS IS NOT NULL 
                  AND Y_POS IS NOT NULL
                  AND ST_Distance_Sphere(
                      POINT(X_POS, Y_POS),
                      POINT(:longitude, :latitude)
                  ) / 1000 <= :radius_km
                ORDER BY distance_km
                LIMIT :limit
            """)
            
            result = session.execute(query, {
                "latitude": latitude,
                "longitude": longitude,
                "radius_km": radius_km,
                "limit": limit
            })
            
            hospitals = [dict(row._mapping) for row in result]
            logger.info(f"병원 검색: lat={latitude}, lng={longitude}, count={len(hospitals)}")
            
            return hospitals
            
        except Exception as e:
            logger.error(f"병원 검색 실패: {str(e)}")
            return []

