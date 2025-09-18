#!/usr/bin/env python3
# -*- coding: utf-8 -*-
""" 파기 예정 소스
build_symptom_embeddings.py
- 목적: SYMPTOM_MASTER.CANONICAL 텍스트를 SBERT 임베딩으로 변환하여 SYMPTOM_EMBEDDING 테이블에 저장
- 특징: 비LLM, 모델/배치/DB 연결은 .env로 제어, 멱등 업서트 적용
- 활용: 런타임 증상 캐노니컬라이즈/근접탐색 가속 (runtime_infer_service.py에서 사용)
- 실행 : python build_symptom_embeddings.py
"""

# ==============================
# = build_symptom_embeddings.py =
# ==============================
import os, re, json, hashlib, argparse, logging
from typing import List
import pymysql
from dotenv import load_dotenv

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

load_dotenv()

# --- 로깅 설정 ---
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
log = logging.getLogger('build_symptom_embeddings')

# --- DB 설정(.env) ---
DB = {
    'host': os.getenv('DB_HOST','127.0.0.1'),
    'port': int(os.getenv('DB_PORT','3306')),
    'user': os.getenv('DB_USER','root'),
    'password': os.getenv('DB_PASSWORD',''),
    'db': os.getenv('DB_NAME','yame'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True,
}

# --- 모델/배치 설정(.env) ---
EMB_MODEL_NAME = os.getenv('EMBEDDING_MODEL','sentence-transformers/distiluse-base-multilingual-cased-v2')
BATCH = int(os.getenv('EMBEDDING_BATCH','64'))

# --- SQL ---
SQL_PICK = """
    SELECT SYMPTOM_ID, CANONICAL
    FROM SYMPTOM_MASTER
    ORDER BY SYMPTOM_ID ASC
"""

SQL_UPSERT = """
    INSERT INTO SYMPTOM_EMBEDDING (SYMPTOM_ID, MODEL, DIM, VEC_BLOB, NORM)
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
    DIM=VALUES(DIM),
    VEC_BLOB=VALUES(VEC_BLOB),
    NORM=VALUES(NORM),
    UPDATED_AT=NOW()
"""

def get_conn():
    """MySQL 연결 핸들 생성"""
    return pymysql.connect(**DB)

def clean(s: str) -> str:
    """공백 정리"""
    return re.sub(r"\s+"," ", (s or '')).strip()

import array, math
def _to_bytes_f32(vec):
    arr = array.array('f', vec)   # float32
    return arr.tobytes()
def _l2(vec):
    s = 0.0
    for x in vec: s += x*x
    return math.sqrt(s)


def run_build():
    """SYMPTOM_MASTER에서 표준 증상 텍스트를 읽어 임베딩 캐시를 구축"""
    if SentenceTransformer is None:
        log.error('sentence-transformers 미설치: pip install sentence-transformers')
        return 1

    model = SentenceTransformer(EMB_MODEL_NAME)
    dim = model.get_sentence_embedding_dimension()
    log.info(f"모델 로드 완료: {EMB_MODEL_NAME} (dim={dim})")

    # 1) 증상 텍스트 조회
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(SQL_PICK)
            rows = cur.fetchall()
    if not rows:
        log.warning('SYMPTOM_MASTER 비어있음 — 먼저 ETL로 증상 시드를 채워주세요.')
        return 0

    # 2) 배치 임베딩
    texts: List[str] = [clean(r['CANONICAL']) for r in rows]
    vecs = model.encode(texts, batch_size=BATCH, show_progress_bar=True)

    # 3) 업서트
    done = 0
    for r, v in zip(rows, vecs):
        vec_json = json.dumps([float(x) for x in v], ensure_ascii=False)
        with get_conn() as conn:
            with conn.cursor() as cur:
                vec_blob = _to_bytes_f32(v)
                cur.execute(SQL_UPSERT, (
                    r['SYMPTOM_ID'],
                    EMB_MODEL_NAME,
                    len(v),
                    vec_blob,
                    _l2(v),
                ))
                done += 1
    log.info(f"SYMPTOM_EMBEDDING upsert: {done}")
    return 0

if __name__ == '__main__' and os.getenv('RUN_SECTION','build_sym')=='build_sym':
    raise SystemExit(run_build())



