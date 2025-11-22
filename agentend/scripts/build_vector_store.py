"""
DUR 데이터 벡터 스토어 구축 스크립트

MariaDB에서 OTC 약품 데이터를 조회하여 벡터 스토어를 생성합니다.

실행 방법:
    python scripts/build_vector_store.py

주의:
- OpenAI API 키가 필요합니다 (.env 파일)
- 약 1-2분 소요 (약품 수에 따라 다름)
- API 비용 발생 (약 $0.02 per 1M tokens)
"""

import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
import logging

from app.config import settings
from app.database.connection import db_manager
from app.rag.vector_store import vector_store_manager

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def fetch_otc_drugs_from_db(limit: int = None) -> list:
    """
    MariaDB에서 OTC 약품 데이터 조회
    
    조회 조건:
    - ETC_OTC_CODE = '02' (일반의약품)
    - CANCEL_NAME IS NULL (취소되지 않은 약품)
    - 주요 정보만 SELECT (품목코드, 품목명, 성분, 분류 등)
    
    Args:
        limit: 최대 조회 개수 (None이면 전체)
    
    Returns:
        list: 약품 정보 리스트
    """
    try:
        with db_manager.get_session() as session:
            # SQL 쿼리
            query_str = """
                SELECT 
                    ITEM_SEQ,
                    ITEM_NAME,
                    ENTP_NAME,
                    MATERIAL_NAME,
                    CLASS_NO,
                    EE_DOC_ID,
                    UD_DOC_ID,
                    CHART
                FROM ITEM_DUR_INFO
                WHERE ETC_OTC_CODE = '일반의약품'
                AND CANCEL_NAME = '정상'
                ORDER BY ITEM_NAME
            """
            
            # LIMIT 추가 (선택)
            if limit:
                query_str += f" LIMIT {limit}"
            
            query = text(query_str)
            result = session.execute(query)
            
            # Dictionary로 변환
            drugs = [dict(row._mapping) for row in result]
            
            logger.info(f"[OK] OTC 약품 조회 완료: {len(drugs)}개")
            return drugs
            
    except Exception as e:
        logger.error(f"[ERROR] OTC 약품 조회 실패: {str(e)}")
        return []


def main():
    """
    메인 실행 함수
    """
    logger.info("=" * 60)
    logger.info("DUR 벡터 스토어 구축 시작")
    logger.info("=" * 60)
    
    # 1. 데이터베이스 연결 확인
    logger.info("1. 데이터베이스 연결 확인...")
    if not db_manager.test_connection():
        logger.error("[ERROR] 데이터베이스 연결 실패. 환경 변수를 확인하세요.")
        return
    logger.info("[OK] 데이터베이스 연결 성공")
    
    # 2. OTC 약품 데이터 조회
    logger.info("2. OTC 약품 데이터 조회...")
    drugs = fetch_otc_drugs_from_db(limit=None)  # 전체 조회 (테스트 시 limit=100 추천)
    
    if not drugs:
        logger.error("[ERROR] 조회된 약품이 없습니다.")
        return
    
    logger.info(f"[OK] {len(drugs)}개 약품 조회 완료")
    
    # 3. 벡터 스토어 구축
    logger.info("3. 벡터 스토어 구축 중...")
    logger.info("   (OpenAI Embeddings API 호출 - 시간이 걸릴 수 있습니다)")
    
    success = vector_store_manager.build_vector_store(drugs)
    
    if not success:
        logger.error("[ERROR] 벡터 스토어 구축 실패")
        return
    
    logger.info("[OK] 벡터 스토어 구축 완료")
    
    # 4. 검색 테스트
    logger.info("4. 검색 테스트...")
    test_query = "두통 해열"
    results = vector_store_manager.search(test_query, k=5)
    
    if results:
        logger.info(f"[OK] 검색 테스트 성공: '{test_query}' -> {len(results)}개 결과")
        logger.info("\n상위 3개 결과:")
        for i, doc in enumerate(results[:3]):
            logger.info(f"  {i+1}. {doc.metadata.get('item_name')} ({doc.metadata.get('entp_name')})")
    else:
        logger.warning("[WARNING] 검색 결과 없음")
    
    logger.info("=" * 60)
    logger.info("벡터 스토어 구축 완료!")
    logger.info(f"저장 위치: {settings.VECTOR_STORE_PATH}")
    logger.info("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n작업이 중단되었습니다.")
    except Exception as e:
        logger.error(f"오류 발생: {str(e)}", exc_info=True)
    finally:
        # 연결 정리
        db_manager.close()

