# 파기 예정 소스
# - 학습으로서 의미 없는 소스(데이터 이슈)
# - 설계 및 판단 미스 : 증상 및 질병 데이터의 집합이 아닌, 질병의 마스터 데이터로 학습하려고 함. 이는 러닝의 이해가 부족하여 잘못된 판단을 함.


import hashlib
from typing import Iterable, Dict, List, Tuple
import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy import text
from config.database import engine, read_df, execute
import os

# DDL_EMBED_TABLE = """
# CREATE TABLE IF NOT EXISTS embedding_item (
#   ITEM_SEQ      VARCHAR(20)   NOT NULL PRIMARY KEY,
#   TEXT_HASH     CHAR(64)      NOT NULL,
#   TEXT_SOURCE   LONGTEXT      NOT NULL,
#   DIM           INT           NOT NULL,
#   EMBEDDING     JSON          NOT NULL,
#   UPDATED_AT    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
# """
# def ensure_table():
#     with engine.begin() as conn:
#         conn.execute(text(DDL_EMBED_TABLE))




EMBED_NAME = os.getenv("EMBED_NAME", "distiluse-base-multilingual-cased-v2")
def build_item_text(row: pd.Series) -> str:
    # 추천 관련성이 높은 필드들을 합성
    return " ".join(str(x) for x in [
        row.get("ITEM_NAME",""),
        row.get("CLASS_NAME",""),
        row.get("MATERIAL_NAME",""),
        row.get("CHART","")
    ] if pd.notna(x))

def text_hash(text: str) -> str:
    # 모델명이 바뀌면 강제로 재계산되도록 모델명 포함
    h = hashlib.sha256()
    h.update((EMBED_NAME + "||" + (text or "")).encode("utf-8"))
    return h.hexdigest()

def fetch_otc_items(max_rows=3000) -> pd.DataFrame:
    return read_df(f"""
        SELECT ITEM_SEQ, ITEM_NAME, ENTP_NAME, ETC_OTC_CODE, ETC_OTC_NAME,
               CLASS_NO, CLASS_NAME, MATERIAL_NAME, CHART, STORAGE_METHOD
        FROM ITEM_DUR_INFO
        WHERE (ETC_OTC_NAME LIKE '%%일반%%' OR ETC_OTC_CODE IN ('OTC','G'))
        LIMIT {max_rows}
    """)

def load_embeddings_for_items(items_df: pd.DataFrame, embed: SentenceTransformer
) -> Tuple[np.ndarray, List[str], pd.DataFrame]:
    """
    반환:
      - E: (N, D) 임베딩 행렬 (items_df 순서와 동일)
      - missing: 캐시에 없어서 이번에 새로 계산/업서트된 ITEM_SEQ 목록
      - cache_df: 캐시 raw
    동작:
      1) 캐시에서 TEXT_HASH 일치하는 건 로드
      2) 누락/불일치 건은 계산 -> UPSERT
      3) 최종적으로 순서 정렬하여 반환
    """
    # ensure_table() //
    items = items_df.copy()
    items["TEXT_SOURCE"] = items.apply(build_item_text, axis=1)
    items["TEXT_HASH"] = items["TEXT_SOURCE"].apply(text_hash)

    item_seqs = items["ITEM_SEQ"].astype(str).tolist()
    # 1) 캐시 조회
    placeholder = ",".join([":id"+str(i) for i in range(len(item_seqs))]) or "''"
    params = {("id"+str(i)): v for i, v in enumerate(item_seqs)}
    cache_df = read_df(f"""
        SELECT ITEM_SEQ, TEXT_HASH, DIM, EMBEDDING
        FROM embedding_item
        WHERE ITEM_SEQ IN ({placeholder})
    """, params)

    cache_map = {(r.ITEM_SEQ, r.TEXT_HASH): (r.DIM, r.EMBEDDING) for _, r in cache_df.iterrows()}

    # 2) 누락/해시불일치 선별
    to_compute_rows = []
    for _, r in items.iterrows():
        key = (str(r.ITEM_SEQ), r.TEXT_HASH)
        if key not in cache_map:
            to_compute_rows.append(r)

    missing_ids = []
    if to_compute_rows:
        texts = [r.TEXT_SOURCE for r in to_compute_rows]
        vecs = embed.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        dim = int(vecs.shape[1]) if vecs.ndim == 2 else int(vecs.shape[0])
        # UPSERT
        rows = []
        for r, v in zip(to_compute_rows, vecs):
            rows.append({
                "ITEM_SEQ": str(r.ITEM_SEQ),
                "TEXT_HASH": r.TEXT_HASH,
                "TEXT_SOURCE": r.TEXT_SOURCE,
                "DIM": dim,
                "EMBEDDING": v.tolist()
            })
            cache_map[(str(r.ITEM_SEQ), r.TEXT_HASH)] = (dim, v.tolist())
            missing_ids.append(str(r.ITEM_SEQ))

        # 벌크 UPSERT
        if rows:
            # MySQL JSON 파라미터는 문자열로 직렬화하지 않아도 SQLAlchemy가 처리
            values_clause = ", ".join([
                "(:ITEM_SEQ{0}, :TEXT_HASH{0}, :TEXT_SOURCE{0}, :DIM{0}, :EMBEDDING{0})".format(i)
                for i in range(len(rows))
            ])
            params = {}
            for i, row in enumerate(rows):
                for k, v in row.items():
                    params[f"{k}{i}"] = v
            execute(f"""
                INSERT INTO embedding_item (ITEM_SEQ, TEXT_HASH, TEXT_SOURCE, DIM, EMBEDDING)
                VALUES {values_clause}
                ON DUPLICATE KEY UPDATE
                  TEXT_HASH=VALUES(TEXT_HASH),
                  TEXT_SOURCE=VALUES(TEXT_SOURCE),
                  DIM=VALUES(DIM),
                  EMBEDDING=VALUES(EMBEDDING),
                  UPDATED_AT=CURRENT_TIMESTAMP
            """, params)

    # 3) 최종 행렬 구성 (items_df 순서 보장)
    mats = []
    for _, r in items.iterrows():
        dim, emb = cache_map[(str(r.ITEM_SEQ), r.TEXT_HASH)]
        mats.append(np.array(emb, dtype=np.float32))
    E = np.vstack(mats) if mats else np.zeros((0, embed.get_sentence_embedding_dimension()), dtype=np.float32)
    return E, missing_ids, cache_df
