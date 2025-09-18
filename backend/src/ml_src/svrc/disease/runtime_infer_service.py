#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
YAME Runtime Inference Service (실시간 추론 서비스)

📌 주요 목적:
- 사용자 증상 설명을 입력받아 관련 증상과 질병을 실시간으로 추론
- Node.js 백엔드에서 호출되어 JSON 형태로 결과 반환
- 경량화된 CLI 인터페이스로 빠른 응답 제공

🔧 핵심 기능:
1. 증상 임베딩 벡터 기반 유사도 매칭
2. 코사인 유사도를 통한 Top-K 증상 추출
3. 증상-질병 연관성을 통한 질병 후보 집계
4. JSON 형태의 구조화된 추론 결과 반환

💡 동작 원리:
1) DB에서 사전 계산된 증상 임베딩 벡터 로드
2) 사용자 입력 텍스트를 동일한 모델로 임베딩
3) 코사인 유사도 계산으로 유사한 증상들 찾기
4) 매칭된 증상들과 연관된 질병들 집계 및 점수 계산

📋 입력 파라미터:
--text "사용자 프롬프트" (필수)
[--topk-symptoms N] (기본값: 8)
[--topk-diseases N] (기본값: 8)  
[--min-score 0.25] (최소 유사도 점수)

📤 출력 형식 (JSON):
{
  "ok": true,
  "model": "모델명",
  "symptoms": [{"symptom_id": 1, "name": "발열", "score": 0.95}],
  "diseases": [{"disease_id": 1, "name_kor": "감기", "name_eng": "Cold", "score": 1.2, "matched": [...]}]
}

🚀 사용 예시:
python runtime_infer_service.py --text "몸살 기운과 발열, 기침"

🔧 필요 환경변수(.env):
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
EMB_MODEL_NAME (기본: sentence-transformers/distiluse-base-multilingual-cased-v2)
"""

# ==================== 의존성 라이브러리 임포트 ====================
import os
import re
import json
import math
import argparse
from array import array
from typing import Dict, List

import pymysql  # MySQL 데이터베이스 연결
from dotenv import load_dotenv  # 환경변수 로드

import logging
logger = logging.getLogger(__name__)

# ==================== 선택적 의존성 (성능 최적화) ====================
# numpy: 벡터 연산 가속화 (있으면 사용, 없어도 동작)
try:
    import numpy as np  # type: ignore
except Exception:  # pragma: no cover
    np = None  # type: ignore

# ==================== 임베딩 모델 전역 변수 ====================
# sentence-transformers: 사용자 텍스트 임베딩용 (지연 로드로 메모리 절약)
_SBER = None

def _embedder(model_name: str):
    """
    🤖 임베딩 모델 Lazy Loading 함수
    
    - 메모리 효율성을 위해 첫 호출 시에만 모델 로드
    - SentenceTransformer 모델을 전역 변수로 캐싱하여 재사용
    
    Args:
        model_name (str): 사용할 임베딩 모델명
        
    Returns:
        SentenceTransformer: 로드된 임베딩 모델 인스턴스
    """
    global _SBER
    if _SBER is None:
        from sentence_transformers import SentenceTransformer  # lazy import으로 시작 시간 단축
        _SBER = SentenceTransformer(model_name)
    return _SBER

# ==================== 환경 설정 및 상수 정의 ====================
load_dotenv()  # .env 파일에서 환경변수 로드

# 📊 데이터베이스 연결 설정
DB = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'db': os.getenv('DB_NAME', 'yame'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,  # 결과를 딕셔너리 형태로 반환
    'autocommit': True,  # 자동 커밋 활성화
}

# 🤖 AI 모델 설정
EMB_MODEL_NAME = os.getenv('EMB_MODEL_NAME', 'sentence-transformers/distiluse-base-multilingual-cased-v2')

# 🔢 기본 추론 파라미터
DEFAULT_TOPK_SYMPTOMS = int(os.getenv('DEFAULT_TOPK_SYMPTOMS', '8'))  # 기본 상위 증상 개수
DEFAULT_TOPK_DISEASES = int(os.getenv('DEFAULT_TOPK_DISEASES', '8'))  # 기본 상위 질병 개수

# ==================== 데이터베이스 유틸리티 ====================

def get_conn():
    """
    📊 데이터베이스 연결 객체 생성
    
    Returns:
        pymysql.Connection: MySQL 데이터베이스 연결 객체
    """
    return pymysql.connect(**DB)

# ==================== SQL 쿼리 정의 ====================

# 🔍 증상 임베딩 데이터 로드 쿼리
SQL_LOAD_EMB = """
SELECT e.SYMPTOM_ID, e.DIM, e.VEC_BLOB, e.NORM, m.CANONICAL
FROM SYMPTOM_EMBEDDING e
JOIN SYMPTOM_MASTER m ON m.SYMPTOM_ID = e.SYMPTOM_ID
WHERE e.MODEL=%s
ORDER BY e.SYMPTOM_ID
"""

# 🏥 증상에 연관된 질병 정보 조회 쿼리
SQL_PICK_DISEASE_FOR_SYMS = """
SELECT ds.DISEASE_ID, ds.SYMPTOM_ID, ds.WEIGHT,
       dm.DISEASE_NAME_KOR, dm.DISEASE_NAME_ENG
FROM DISEASE_SYMPTOM ds
JOIN DISEASE_MASTER dm ON dm.DISEASE_ID = ds.DISEASE_ID
WHERE dm.DTYPE='disease'
AND ds.SYMPTOM_ID IN ({placeholders})
"""

# ==================== 임베딩 데이터 저장소 클래스 ====================

class _Store:
    """
    💾 임베딩 벡터 메모리 캐시 저장소
    
    - 증상 임베딩 벡터들을 메모리에 캐싱하여 빠른 접근 제공
    - numpy 배열 또는 Python 리스트로 유연한 저장 지원
    """
    ids: List[int] = []                    # 증상 ID 리스트
    names: Dict[int, str] = {}             # 증상 ID -> 이름 매핑
    vecs = None                           # 임베딩 벡터 행렬 (numpy.ndarray or List[List[float]])
    norms = None                          # 벡터 노름 값들 (numpy.ndarray or List[float])
    dim: int = 0                          # 임베딩 벡터 차원 수


def load_embeddings():
    """
    📥 증상 임베딩 데이터 로드 및 메모리 캐시 구성
    
    - 데이터베이스에서 사전 계산된 증상 임베딩 벡터들을 로드
    - 메모리에 캐싱하여 추론 시 빠른 접근 제공
    - numpy 사용 가능 시 벡터 연산 최적화
    
    Raises:
        RuntimeError: 임베딩 데이터가 없을 경우
    """
    # 🔍 데이터베이스에서 임베딩 데이터 조회
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(SQL_LOAD_EMB, (EMB_MODEL_NAME,))
        rows = cur.fetchall()
    
    # ❌ 임베딩 데이터가 없는 경우 에러 발생
    if not rows:
        raise RuntimeError(f"SYMPTOM_EMBEDDING empty for model={EMB_MODEL_NAME}")

    # 📊 데이터 파싱을 위한 임시 변수들
    ids: List[int] = []
    names: Dict[int, str] = {}
    vecs: List[List[float]] = []
    norms: List[float] = []
    dim = int(rows[0]['DIM'])  # 임베딩 벡터 차원 수

    # 🔄 각 증상별 임베딩 데이터 처리
    for r in rows:
        sid = int(r['SYMPTOM_ID'])
        ids.append(sid)
        names[sid] = r['CANONICAL']  # 증상의 표준 명칭
        
        # 📦 바이너리 블롭에서 float32 벡터 복원
        v = _f32_from_blob(r['VEC_BLOB'])
        if len(v) != dim:  # 차원 불일치 시 조정
            v = v[:dim]
        vecs.append(v)
        norms.append(float(r['NORM']))  # 미리 계산된 벡터 노름

    # 🚀 성능 최적화: numpy 사용 가능 시 배열로 변환
    if np is not None:
        _Store.vecs = np.asarray(vecs, dtype=np.float32)
        _Store.norms = np.asarray(norms, dtype=np.float32)
    else:
        _Store.vecs = vecs
        _Store.norms = norms
        
    # 💾 전역 저장소에 데이터 저장
    _Store.ids = ids
    _Store.names = names
    _Store.dim = dim

# ==================== 텍스트 전처리 및 수학적 계산 함수들 ====================

# 🔍 공백 문자 정규화를 위한 정규표현식
_WS_RE = re.compile(r"\s+")

def _normalize_text(s: str) -> str:
    """
    📝 입력 텍스트 정규화
    
    - 전각 공백을 반각 공백으로 변환
    - 연속된 공백을 단일 공백으로 통합
    - 앞뒤 공백 제거
    
    Args:
        s (str): 정규화할 텍스트
        
    Returns:
        str: 정규화된 텍스트
    """
    s = (s or '').replace('\u3000', ' ')  # 전각 공백 → 반각 공백
    return _WS_RE.sub(' ', s).strip()     # 연속 공백 정리 및 앞뒤 공백 제거


def _embed_text(text: str) -> List[float]:
    """
    🤖 텍스트를 임베딩 벡터로 변환
    
    - SentenceTransformer 모델을 사용하여 텍스트 임베딩
    - 정규화된 텍스트를 벡터로 인코딩
    
    Args:
        text (str): 임베딩할 텍스트
        
    Returns:
        List[float]: 임베딩 벡터
    """
    model = _embedder(EMB_MODEL_NAME)
    v = model.encode([_normalize_text(text)], normalize_embeddings=False)[0]
    return v.tolist() if hasattr(v, 'tolist') else list(v)


def _f32_from_blob(b: bytes) -> List[float]:
    """
    📦 바이너리 블롭에서 float32 배열 복원
    
    - 데이터베이스에 저장된 바이너리 데이터를 float 리스트로 변환
    - 메모리 효율적인 바이너리 저장 형식에서 복원
    
    Args:
        b (bytes): float32 바이너리 데이터
        
    Returns:
        List[float]: 복원된 float 리스트
    """
    a = array('f')
    a.frombytes(b)
    return a.tolist()


def _l2(v: List[float]) -> float:
    """
    📏 벡터의 L2 노름(유클리디안 거리) 계산
    
    Args:
        v (List[float]): 입력 벡터
        
    Returns:
        float: L2 노름 값
    """
    return math.sqrt(sum(x * x for x in v))


def _cosine_scores(q: List[float], mat, norms):
    """
    🎯 코사인 유사도 점수 계산 (배치 처리)
    
    - 쿼리 벡터와 임베딩 행렬 간의 코사인 유사도를 효율적으로 계산
    - numpy 사용 가능 시 벡터화 연산으로 성능 최적화
    - 사전 계산된 노름 값을 활용하여 계산 속도 향상
    
    Args:
        q (List[float]): 쿼리 벡터 (사용자 입력 임베딩)
        mat: 임베딩 행렬 (numpy.ndarray 또는 List[List[float]])
        norms: 각 벡터의 노름 값들 (numpy.ndarray 또는 List[float])
        
    Returns:
        List[float]: 각 벡터와의 코사인 유사도 점수들
    """
    qn = _l2(q)  # 쿼리 벡터의 노름 계산
    
    # 🛡️ 제로 벡터 처리 (모든 유사도를 0으로 설정)
    if qn == 0:
        n = (len(norms) if isinstance(norms, list) else norms.shape[0])
        return [0.0] * n
    
    # 🚀 numpy 사용 가능 시 벡터화 연산으로 최적화
    if np is not None and isinstance(mat, np.ndarray):
        qv = np.asarray(q, dtype=np.float32)
        dots = mat @ qv                    # 행렬 곱셈으로 내적 계산
        den = norms * qn                   # 분모 계산 (노름들의 곱)
        return (dots / (den + 1e-12)).tolist()  # 0 나누기 방지를 위한 작은 값 추가
    else:
        # 📊 numpy 없을 시 Python 리스트로 처리
        out = []
        for row, cn in zip(mat, norms):  # type: ignore
            dot = sum(float(x) * float(y) for x, y in zip(row, q))  # 내적 계산
            out.append(dot / (cn * qn + 1e-12))  # 코사인 유사도 계산
        return out

# ==================== 메인 추론 엔진 ====================

def infer(text: str, topk_symptoms: int, topk_diseases: int, min_score: float) -> dict:
    """
    🧠 핵심 추론 함수 - 사용자 증상 설명을 분석하여 관련 증상과 질병 추천
    
    동작 순서:
    1. 임베딩 데이터 로드 (첫 호출 시에만)
    2. 사용자 입력 텍스트를 임베딩 벡터로 변환
    3. 코사인 유사도로 유사한 증상들 찾기
    4. 선택된 증상들과 연관된 질병들 집계
    5. 점수 기반으로 상위 결과 반환
    
    Args:
        text (str): 사용자가 입력한 증상 설명
        topk_symptoms (int): 반환할 상위 증상 개수
        topk_diseases (int): 반환할 상위 질병 개수
        min_score (float): 최소 유사도 점수 임계값
        
    Returns:
        dict: 추론 결과 (증상 리스트, 질병 리스트, 메타 정보)
    """
    # 🔄 첫 호출 시 임베딩 데이터 로드
    if not _Store.ids:
        load_embeddings()

    # 🤖 사용자 입력을 임베딩 벡터로 변환
    qv = _embed_text(text)
    
    # 🎯 모든 증상과의 코사인 유사도 계산
    scores = _cosine_scores(qv, _Store.vecs, _Store.norms)

    # 📊 상위 증상 선별 및 정렬
    idx_scores = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    out_sym: List[dict] = []
    chosen_ids: List[int] = []
    
    # 🔍 유사도 임계값을 넘는 상위 증상들 선택
    for idx, sc in idx_scores[: topk_symptoms * 2]:  # 여유분을 두고 탐색
        if sc < min_score:  # 최소 점수 미달 시 건너뛰기
            continue
        
        sid = _Store.ids[idx]
        name = _Store.names.get(sid, str(sid))
        out_sym.append({"symptom_id": sid, "name": name, "score": float(sc)})
        chosen_ids.append(sid)
        
        # 목표 개수 달성 시 종료
        if len(out_sym) >= topk_symptoms:
            break

    # 🏥 선택된 증상들과 연관된 질병 집계
    diseases: Dict[int, dict] = {}
    
    if chosen_ids:
        # 🔍 데이터베이스에서 증상-질병 연관 정보 조회
        placeholders = ",".join(["%s"] * len(chosen_ids))
        sql = SQL_PICK_DISEASE_FOR_SYMS.format(placeholders=placeholders)
        
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, chosen_ids)
            rows = cur.fetchall()
        
        # 📈 증상별 점수 빠른 조회를 위한 맵 생성
        sc_map = {s['symptom_id']: s['score'] for s in out_sym}
        
        # 🔄 각 증상-질병 연관 관계 처리
        for r in rows:
            did = int(r['DISEASE_ID'])
            sid = int(r['SYMPTOM_ID'])
            w   = float(r['WEIGHT'] or 1.0)  # 연관 가중치
            
            # 질병 정보 초기화 (첫 등장 시)
            d = diseases.setdefault(did, {
                'disease_id': did,
                'name_kor': r['DISEASE_NAME_KOR'],
                'name_eng': r['DISEASE_NAME_ENG'],
                'score': 0.0,
                'matched': [],  # 매칭된 증상들의 상세 정보
            })
            
            # 💯 질병 점수 계산: (증상 유사도) × (연관 가중치)
            sscore = sc_map.get(sid)
            if sscore is not None:
                d['score'] += w * sscore
                d['matched'].append({
                    'symptom_id': sid, 
                    'weight': w, 
                    'score': sscore
                })

    # 🏆 질병들을 점수 순으로 정렬하여 상위 결과 반환
    out_dis = sorted(diseases.values(), key=lambda x: x['score'], reverse=True)[: topk_diseases]

    # 📋 최종 결과 반환
    return {
        'ok': True,
        'model': EMB_MODEL_NAME,
        'symptoms': out_sym,    # 매칭된 증상들
        'diseases': out_dis,    # 관련 질병들
    }

# ==================== CLI 인터페이스 ====================

def main():
    """
    🖥️ 명령행 인터페이스 메인 함수
    
    - 커맨드라인 인수 파싱
    - 추론 실행 및 결과 출력
    - 에러 처리 및 JSON 형태 응답
    """
    # 📋 커맨드라인 인수 설정
    ap = argparse.ArgumentParser(
        description='YAME 실시간 추론 서비스 - 증상 설명으로 관련 질병 추천',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python runtime_infer_service.py --text "몸살 기운과 발열, 기침"
  python runtime_infer_service.py --text "두통과 어지러움" --topk-symptoms 10 --min-score 0.3
        """
    )
    
    # 필수 인수
    ap.add_argument('--text', required=True, 
                   help='사용자 증상 설명 (예: "몸살 기운과 발열, 기침")')
    
    # 선택적 인수들
    ap.add_argument('--topk-symptoms', type=int, default=DEFAULT_TOPK_SYMPTOMS,
                   help=f'반환할 상위 증상 개수 (기본값: {DEFAULT_TOPK_SYMPTOMS})')
    ap.add_argument('--topk-diseases', type=int, default=DEFAULT_TOPK_DISEASES,
                   help=f'반환할 상위 질병 개수 (기본값: {DEFAULT_TOPK_DISEASES})')
    ap.add_argument('--min-score', type=float, default=0.25,
                   help='최소 유사도 점수 임계값 (기본값: 0.25)')
    
    args = ap.parse_args()

    try:
        # 🧠 추론 실행
        res = infer(
            text=args.text,
            topk_symptoms=args.topk_symptoms,
            topk_diseases=args.topk_diseases,
            min_score=args.min_score,
        )
        
        # ✅ 성공 시 JSON 결과 출력
        print(json.dumps(res, ensure_ascii=False))
        
    except Exception as e:
        # ❌ 에러 시 에러 정보 JSON으로 출력
        error_response = {
            'ok': False, 
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_response, ensure_ascii=False))
        raise SystemExit(2)  # 비정상 종료 코드

if __name__ == '__main__':
    main()
