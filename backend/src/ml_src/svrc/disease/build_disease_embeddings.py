""" 파기 예정 소스
* 이 스크립트로 **DISEASE\_MASTER**가 채워지고, **초기 증상 그래프**(DISEASE\_SYMPTOM)가 형성됩니다.
* 이후 **recommend/랭커**는 이 그래프를 사용해 “증상 집합 → 질병 Top-K”를 빠르게 점수화합니다.
* `SYMPTOM_PHRASE_LOG`는 **정규화 품질 개선**(동의어 사전 확장/임계값 튜닝/미세조정 데이터 생성)에 쓰입니다.
"""
## 2) `build_disease_embeddings.py`

"""
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

[ETL] DISEASE_MASTER (+ DISEASE_SYMPTOM/ SYMPTOM_MASTER) → disease_embedding_item
- 질병 텍스트(이름 + 증상목록 + 설명)를 문장 임베딩으로 변환하고 캐시에 저장합니다.
- 런타임에서 사용자 프롬프트 임베딩과 코사인 유사도를 계산해 의미검색(Top-K)을 수행할 때 사용합니다.
실행 예시:
  python build_disease_embeddings.py --limit 500
설치:
  pip install sentence-transformers
"""

import os
import re
import sys
import json
import argparse
import hashlib
import logging
from typing import List

import pymysql
from dotenv import load_dotenv

# 임베딩 모델 (비LLM)
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

load_dotenv()

DB = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'db': os.getenv('DB_NAME', 'yame'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True,
}

EMB_ENABLE = os.getenv('EMBEDDING_ENABLE', '1') == '1'
EMB_MODEL_NAME = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/distiluse-base-multilingual-cased-v2')
EMB_BATCH = int(os.getenv('EMBEDDING_BATCH', '32'))

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger('build_disease_embeddings')


def get_conn():
    return pymysql.connect(**DB)


def sha256(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or '')).strip()

# 병합 텍스트 구성(질병명 + 증상리스트 + 설명)
PICK_EMB = """
SELECT d.DISEASE_ID, d.DISEASE_NAME_KOR, d.DISEASE_NAME_ENG, d.DESCRIPTION,
       GROUP_CONCAT(sm.CANONICAL ORDER BY sm.CANONICAL SEPARATOR ', ') AS SYMPTOMS
FROM DISEASE_MASTER d
LEFT JOIN DISEASE_SYMPTOM ds ON ds.DISEASE_ID = d.DISEASE_ID
LEFT JOIN SYMPTOM_MASTER sm ON sm.SYMPTOM_ID = ds.SYMPTOM_ID
WHERE d.DTYPE='disease'
GROUP BY d.DISEASE_ID
ORDER BY d.DISEASE_ID ASC
"""

UPSERT_EMB = """
INSERT INTO disease_embedding_item (ITEM_SEQ, TEXT_HASH, TEXT_SOURCE, DIM, EMBEDDING)
VALUES (%s, %s, %s, %s, %s)
ON DUPLICATE KEY UPDATE
  TEXT_HASH=VALUES(TEXT_HASH),
  TEXT_SOURCE=VALUES(TEXT_SOURCE),
  DIM=VALUES(DIM),
  EMBEDDING=VALUES(EMBEDDING)
"""


def build_text(row: dict) -> str:
    parts = [row.get('DISEASE_NAME_KOR') or '']
    if row.get('DISEASE_NAME_ENG'):
        parts.append(f"({row['DISEASE_NAME_ENG']})")
    if row.get('SYMPTOMS'):
        parts.append(f"증상: {row['SYMPTOMS']}")
    if row.get('DESCRIPTION'):
        parts.append(row['DESCRIPTION'])
    return "\n".join([clean_text(p) for p in parts if p])


def main():
    # ap = argparse.ArgumentParser()
    # ap.add_argument('--limit', type=int, default=int(os.getenv('BATCH_LIMIT', '500')))
    # args = ap.parse_args()

    # if not EMB_ENABLE:
    #     logger.warning('[EMB] EMBEDDING_ENABLE=0 → 작업을 건너뜁니다.')
    #     return
    # if SentenceTransformer is None:
    #     logger.error('[EMB] sentence-transformers 미설치. pip install sentence-transformers 후 재시도하세요.')
    #     sys.exit(1)

    model = SentenceTransformer(EMB_MODEL_NAME)
    logger.info(f'[EMB] 모델 로드 완료: {EMB_MODEL_NAME} (dim={model.get_sentence_embedding_dimension()})')

    # 1) 대상 레코드 조회
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(PICK_EMB)
            rows = cur.fetchall()
    if not rows:
        logger.info('[EMB] 임베딩 대상이 없습니다.')
        return

    # 2) 텍스트 구성
    texts = [build_text(r) for r in rows]

    # 3) 임베딩 계산(배치)
    logger.info(f'[EMB] 인코딩 시작 — batch={EMB_BATCH}, n={len(texts)}')
    vecs = model.encode(texts, batch_size=EMB_BATCH, show_progress_bar=True)

    # 4) 업서트
    done = 0
    for r, v, t in zip(rows, vecs, texts):
        item_seq = f"DISEASE:{r['DISEASE_ID']}"           # 일관키 규칙
        thash = sha256(t + '|' + EMB_MODEL_NAME)           # 텍스트+모델 결합 해시로 멱등성 보장
        emb_json = json.dumps([float(x) for x in v], ensure_ascii=False)
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(UPSERT_EMB, (item_seq, thash, t, len(v), emb_json))
                done += 1
    logger.info(f'[EMB] 완료 — upsert={done}')


if __name__ == '__main__':
    main()