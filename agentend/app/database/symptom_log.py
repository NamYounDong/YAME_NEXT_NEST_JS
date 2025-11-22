"""
증상 로그 저장 모듈

사용자의 증상 분석 결과를 DB에 저장합니다.
대시보드 통계 및 학습 데이터로 활용됩니다.
"""

import logging
import json
from typing import Dict, Any, List, Optional
from sqlalchemy import text

from app.database.connection import db_manager

logger = logging.getLogger(__name__)


def save_symptom_log(
    session_id: str,
    symptom_data: Dict[str, Any],
    selected_disease: Dict[str, Any],
    severity: Dict[str, Any],
    recommendation_type: str,  # 'PHARMACY' or 'HOSPITAL'
    recommended_drugs: Optional[List[Dict[str, Any]]] = None,
    nearby_pharmacies: Optional[List[Dict[str, Any]]] = None,
    nearby_hospitals: Optional[List[Dict[str, Any]]] = None,
    location: Optional[Dict[str, float]] = None,
    suspected_diseases: Optional[List[Dict[str, Any]]] = None,
) -> bool:
    """
    증상 로그를 DB에 저장
    
    Args:
        session_id: 세션 ID
        symptom_data: 증상 데이터 (원본 텍스트 등)
        selected_disease: 선택한 질환 정보
        severity: 심각도 평가 결과
        recommendation_type: 추천 타입 ('PHARMACY' or 'HOSPITAL')
        recommended_drugs: 추천 약품 리스트
        nearby_pharmacies: 주변 약국 리스트
        nearby_hospitals: 주변 병원 리스트
        location: 위치 정보 (latitude, longitude)
        suspected_diseases: 의심 질환 리스트
    
    Returns:
        bool: 저장 성공 여부
    """
    try:
        # 증상 텍스트 추출 (대화 히스토리에서)
        symptom_text = symptom_data.get('symptom_text', '')
        if not symptom_text and 'messages' in symptom_data:
            # 사용자 메시지들을 합쳐서 증상 텍스트 생성
            user_messages = [
                msg['content'] for msg in symptom_data['messages'] 
                if msg.get('role') == 'user'
            ]
            symptom_text = ' '.join(user_messages)
        
        # 첫 번째 추천 약품 정보 (기존 컬럼 호환)
        first_drug_name = None
        first_item_seq = None
        if recommended_drugs and len(recommended_drugs) > 0:
            first_drug_name = recommended_drugs[0].get('item_name')
            first_item_seq = recommended_drugs[0].get('item_seq')
        
        # 위치 정보
        latitude = None
        longitude = None
        gps_accuracy = None
        if location:
            latitude = location.get('latitude')
            longitude = location.get('longitude')
            gps_accuracy = location.get('accuracy')
        
        # SQL 쿼리
        query = text("""
            INSERT INTO SYMPTOM_LOGS (
                SYMPTOM_TEXT,
                PREDICTED_DISEASE,
                RECOMMENDATION,
                DRUG_SUGGESTED,
                ITEM_SEQ,
                ITEM_NAME,
                SUSPECTED_DISEASES,
                SEVERITY_SCORE,
                LLM_ANALYSIS,
                RECOMMENDED_DRUGS,
                NEARBY_PHARMACIES,
                NEARBY_HOSPITALS,
                LATITUDE,
                LONGITUDE,
                GPS_ACCURACY_M,
                CREATED_AT
            ) VALUES (
                :symptom_text,
                :predicted_disease,
                :recommendation,
                :drug_suggested,
                :item_seq,
                :item_name,
                :suspected_diseases,
                :severity_score,
                :llm_analysis,
                :recommended_drugs,
                :nearby_pharmacies,
                :nearby_hospitals,
                :latitude,
                :longitude,
                :gps_accuracy,
                NOW()
            )
        """)
        
        with db_manager.get_session() as session:
            session.execute(query, {
                'symptom_text': symptom_text[:1000] if symptom_text else None,  # TEXT 길이 제한
                'predicted_disease': selected_disease.get('name'),
                'recommendation': recommendation_type,
                'drug_suggested': first_drug_name,
                'item_seq': first_item_seq,
                'item_name': first_drug_name,
                'suspected_diseases': json.dumps(suspected_diseases, ensure_ascii=False) if suspected_diseases else None,
                'severity_score': severity.get('severity_score'),
                'llm_analysis': severity.get('reason'),
                'recommended_drugs': json.dumps(recommended_drugs, ensure_ascii=False) if recommended_drugs else None,
                'nearby_pharmacies': json.dumps(nearby_pharmacies, ensure_ascii=False) if nearby_pharmacies else None,
                'nearby_hospitals': json.dumps(nearby_hospitals, ensure_ascii=False) if nearby_hospitals else None,
                'latitude': str(latitude) if latitude else None,
                'longitude': str(longitude) if longitude else None,
                'gps_accuracy': gps_accuracy,
            })
            session.commit()
        
        logger.info(f"[{session_id}] 증상 로그 저장 완료: {selected_disease.get('name')}")
        return True
        
    except Exception as e:
        logger.error(f"[{session_id}] 증상 로그 저장 실패: {str(e)}", exc_info=True)
        return False

