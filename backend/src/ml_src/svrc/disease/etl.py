# YAME ETL v1 — Fetch → Parse → Normalize (AMC/Wiki) + Embedding + DUR 연결
# YAME ETL v1 — SOURCE_PAGE → (Fetch) → SOURCE_PAGE_FETCH → (Parse) → DISEASE_MASTER → (Normalize) SYMPTOM_MASTER/DISEASE_SYMPTOM → (Embed) disease_embedding_item

from __future__ import annotations
import os, sys, time, hashlib, json, re, logging, argparse
from typing import List, Tuple, Optional, Dict

import pymysql
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from tqdm import tqdm

# 임베딩은 선택 설치
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

# ------------------------------------------------------------
# 설정/로거
# ------------------------------------------------------------
load_dotenv()  # .env 로드
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger("etl")

DB = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USERNAME', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'db': os.getenv('DB_DATABASE', 'yame'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True,
}

EMB_ENABLE = os.getenv('EMBEDDING_ENABLE', '0') == '1'
EMB_MODEL_NAME = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/distiluse-base-multilingual-cased-v2')
EMB_BATCH = int(os.getenv('EMBEDDING_BATCH', '32'))

# ------------------------------------------------------------
# DB 헬퍼
# ------------------------------------------------------------

def get_conn():
    return pymysql.connect(**DB)

# ------------------------------------------------------------
# 유틸
# ------------------------------------------------------------

def sha256(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

def clean_text(s: str) -> str:
    # 공백/제어문자 정리
    s = re.sub(r"\s+", " ", s or "").strip()
    return s

def split_symptoms(raw: str) -> List[str]:
    if not raw:
        return []
    # 쉼표/세미콜론/불릿/슬래시/중국어쉼표 등 다중 구분자 분해
    parts = re.split(r"[\n,;·•/，]+", raw)
    out = []
    for p in parts:
        t = clean_text(p)
        if len(t) >= 1:
            out.append(t)
    return out

# 간이 동의어 매핑(초기 버전) — 필요 시 SYMPTOM_MASTER.ALIASES로 확장
SYM_CANON_MAP = {
    "몸이 으슬으슬": "오한",
    "몸살기": "전신권태",
    "한쪽 머리가 아프다": "편두통",
    "오줌에 피": "혈뇨",
}

def canonicalize(sym: str) -> str:
    return SYM_CANON_MAP.get(sym, sym)

# ------------------------------------------------------------
# 1) FETCH 단계: SOURCE_PAGE → SOURCE_PAGE_FETCH
# ------------------------------------------------------------

HEADERS = {
    "User-Agent": "YAMEBot/1.0 (+https://example.local)"
}

FETCH_SQL_PICK = """
    SELECT SOURCE_PAGE_ID, SOURCE, LANG, TITLE, URL
    FROM SOURCE_PAGE
    WHERE FETCH_DONE = 0
    ORDER BY SOURCE_PAGE_ID ASC
    LIMIT %s
"""

FETCH_SQL_INSERT = """
    INSERT INTO SOURCE_PAGE_FETCH
        (SOURCE_PAGE_ID, HTTP_STATUS, CONTENT_TYPE, RAW_HTML, EXTRACTED_TEXT, CONTENT_HASH)
    VALUES (%s, %s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        HTTP_STATUS=VALUES(HTTP_STATUS),
        CONTENT_TYPE=VALUES(CONTENT_TYPE),
        RAW_HTML=VALUES(RAW_HTML),
        EXTRACTED_TEXT=VALUES(EXTRACTED_TEXT),
        CONTENT_HASH=VALUES(CONTENT_HASH)
"""

UPDATE_FETCH_DONE = """
    UPDATE SOURCE_PAGE
        SET FETCH_DONE=1, LAST_ERROR=NULL, UPDATED_AT=NOW()
    WHERE SOURCE_PAGE_ID=%s
"""

UPDATE_FETCH_ERROR = """
    UPDATE SOURCE_PAGE
        SET LAST_ERROR=%s, UPDATED_AT=NOW()
    WHERE SOURCE_PAGE_ID=%s
"""


def html_to_text(html: str) -> str:
    # 매우 단순한 텍스트 추출 (필요 시 html2text 대체)
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    txt = soup.get_text(" ")
    return clean_text(txt)


def step_fetch(limit: int = 200) -> int:
    done = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(FETCH_SQL_PICK, (limit,))
            rows = cur.fetchall()
    if not rows:
        logger.info("[FETCH] no rows")
        return 0

    for r in tqdm(rows, desc="fetch"):
        sid = r["SOURCE_PAGE_ID"]
        url = r["URL"]
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            status = resp.status_code
            ctype = resp.headers.get("Content-Type", "")[:120]
            html = resp.text
            text = html_to_text(html)
            chash = sha256(text) if text else None

            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(FETCH_SQL_INSERT, (sid, status, ctype, html, text, chash))
                    cur.execute(UPDATE_FETCH_DONE, (sid,))
            done += 1
        except Exception as e:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(UPDATE_FETCH_ERROR, (f"FETCH:{e}", sid))
            logger.exception(f"[FETCH] failed sid={sid}")
    logger.info(f"[FETCH] done={done}")
    return done

# ------------------------------------------------------------
# 2) PARSE 단계: SOURCE_PAGE_FETCH → DISEASE_MASTER (+ DISEASE_ALIAS)
# ------------------------------------------------------------

PICK_PARSE = """
    SELECT p.SOURCE_PAGE_ID, p.SOURCE, p.TITLE, p.URL, f.EXTRACTED_TEXT, f.RAW_HTML
    FROM SOURCE_PAGE p
    JOIN SOURCE_PAGE_FETCH f ON f.SOURCE_PAGE_ID = p.SOURCE_PAGE_ID
    WHERE p.FETCH_DONE=1 AND p.PARSE_DONE=0
    ORDER BY p.SOURCE_PAGE_ID ASC
    LIMIT %s
"""

INSERT_DISEASE = """
    INSERT INTO DISEASE_MASTER
        (DISEASE_NAME_KOR, DISEASE_NAME_ENG, DESCRIPTION, SYMPTOMS_RAW, SOURCE, SOURCE_URL, SOURCE_PAGE_ID)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        DISEASE_NAME_ENG = VALUES(DISEASE_NAME_ENG),
        DESCRIPTION      = VALUES(DESCRIPTION),
        SYMPTOMS_RAW     = VALUES(SYMPTOMS_RAW),
        SOURCE_URL       = VALUES(SOURCE_URL),
        SOURCE_PAGE_ID   = VALUES(SOURCE_PAGE_ID)
"""

GET_DISEASE_ID = """
    SELECT DISEASE_ID FROM DISEASE_MASTER
    WHERE DISEASE_NAME_KOR=%s AND SOURCE=%s
"""

INSERT_ALIAS = """
    INSERT IGNORE INTO DISEASE_ALIAS (DISEASE_ID, ALIAS_NAME, SOURCE)
    VALUES (%s, %s, %s)
"""

UPDATE_PARSE_DONE = """
    UPDATE SOURCE_PAGE SET PARSE_DONE=1, LAST_ERROR=NULL, UPDATED_AT=NOW()
    WHERE SOURCE_PAGE_ID=%s
"""

UPDATE_PARSE_ERROR = """
    UPDATE SOURCE_PAGE SET LAST_ERROR=%s, UPDATED_AT=NOW()
    WHERE SOURCE_PAGE_ID=%s
"""

# AMC 파서 (섹션 헤더 기반)
AMC_SYM_KEYS = ["증상", "증상과 징후", "임상증상"]
AMC_DESC_KEYS = ["개요", "정의", "원인", "진단", "치료"]

# 위키 파서 (ko.wikipedia.org — h2/h3/목차 앵커 기준)
WIKI_SYM_KEYS = ["증상", "증상과 징후", "임상 증상", "합병증"]
WIKI_DESC_KEYS = ["개요", "정의", "원인", "진단", "치료", "경과"]


def extract_sections_html(html: str) -> Dict[str, str]:
    """단순 헤딩(h2/h3) 기준으로 섹션 텍스트를 모읍니다."""
    soup = BeautifulSoup(html, "lxml")
    # 헤딩을 순서대로 훑으며 다음 헤딩 전까지 텍스트 수집
    sections: Dict[str, List[str]] = {}
    current = None
    for tag in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li"]):
        name = tag.name.lower()
        if name in {"h1","h2","h3","h4","h5","h6"}:
            current = clean_text(tag.get_text(" "))
            continue
        if current is None:
            continue
        txt = clean_text(tag.get_text(" "))
        if not txt:
            continue
        sections.setdefault(current, []).append(txt)
    # join
    joined = {k: "\n".join(v) for k, v in sections.items()}
    return joined


def pick_first_match(sections: Dict[str, str], keys: List[str]) -> Optional[str]:
    # 섹션 제목에 키워드가 일부라도 포함되면 매칭 (대소문자 무시)
    for title, body in sections.items():
        lt = title.lower()
        for k in keys:
            if k.lower() in lt:
                return body
    return None


def parse_amc(title: str, html: str) -> Tuple[str, str, str]:
    """(kor_name, eng_name, symptoms_raw/description)
    AMC 구조를 단순화한 휴리스틱 파서
    """
    sections = extract_sections_html(html)
    kor_name = clean_text(title)
    eng_name = None  # 필요시 괄호영문 추출
    desc = pick_first_match(sections, AMC_DESC_KEYS) or ""
    sym = pick_first_match(sections, AMC_SYM_KEYS) or ""
    return kor_name, eng_name, (sym, desc)


def parse_wiki(title: str, html: str) -> Tuple[str, str, str]:
    sections = extract_sections_html(html)
    kor_name = clean_text(title)
    # 괄호영문 신속 추출 (예: 편두통(Migraine))
    m = re.search(r"\(([^()]{2,80})\)$", kor_name)
    eng_name = m.group(1) if m else None
    # 필요 시 infobox 파싱 추가
    desc = pick_first_match(sections, WIKI_DESC_KEYS) or ""
    sym = pick_first_match(sections, WIKI_SYM_KEYS) or ""
    return kor_name, eng_name, (sym, desc)


def step_parse(limit: int = 200) -> int:
    done = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(PICK_PARSE, (limit,))
            rows = cur.fetchall()
    if not rows:
        logger.info("[PARSE] no rows")
        return 0

    for r in tqdm(rows, desc="parse"):
        sid = r["SOURCE_PAGE_ID"]
        src = r["SOURCE"]
        title = r["TITLE"]
        url = r["URL"]
        html = r["RAW_HTML"] or ""
        try:
            if src == 'AMC':
                kor, eng, (sym, desc) = parse_amc(title, html)
            else:
                kor, eng, (sym, desc) = parse_wiki(title, html)
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(INSERT_DISEASE, (
                        kor, eng, clean_text(desc), clean_text(sym), src, url, sid
                    ))
                    cur.execute(GET_DISEASE_ID, (kor, src))
                    row = cur.fetchone()
                    if not row:
                        raise RuntimeError("DISEASE_ID not found after upsert")
                    did = row["DISEASE_ID"]
                    # ALIAS 저장 (소스의 제목을 alias로 유지)
                    cur.execute(INSERT_ALIAS, (did, title, src))
                    cur.execute(UPDATE_PARSE_DONE, (sid,))
            done += 1
        except Exception as e:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(UPDATE_PARSE_ERROR, (f"PARSE:{e}", sid))
            logger.exception(f"[PARSE] failed sid={sid}")
    logger.info(f"[PARSE] done={done}")
    return done

# ------------------------------------------------------------
# 3) NORMALIZE 단계: SYMPTOM_MASTER/DISEASE_SYMPTOM 채우기
# ------------------------------------------------------------

PICK_NORM = """
SELECT DISEASE_ID, SYMPTOMS_RAW FROM DISEASE_MASTER
WHERE SYMPTOMS_RAW IS NOT NULL AND SYMPTOMS_RAW <> ''
  AND (SELECT COUNT(*) FROM DISEASE_SYMPTOM ds WHERE ds.DISEASE_ID=DISEASE_MASTER.DISEASE_ID)=0
ORDER BY DISEASE_ID ASC
LIMIT %s
"""

UPSERT_SYMPTOM = """
INSERT INTO SYMPTOM_MASTER (CANONICAL, ALIASES)
VALUES (%s, JSON_ARRAY())
ON DUPLICATE KEY UPDATE CANONICAL=VALUES(CANONICAL)
"""

GET_SYM_ID = """
SELECT SYMPTOM_ID FROM SYMPTOM_MASTER WHERE CANONICAL=%s
"""

INSERT_DS = """
INSERT IGNORE INTO DISEASE_SYMPTOM (DISEASE_ID, SYMPTOM_ID, WEIGHT)
VALUES (%s, %s, %s)
"""


def step_normalize(limit: int = 300) -> int:
    done_pairs = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(PICK_NORM, (limit,))
            rows = cur.fetchall()
    if not rows:
        logger.info("[NORM] no rows")
        return 0

    for r in tqdm(rows, desc="normalize"):
        did = r["DISEASE_ID"]
        raw = r["SYMPTOMS_RAW"]
        for s in split_symptoms(raw):
            canon = canonicalize(s)
            try:
                with get_conn() as conn:
                    with conn.cursor() as cur:
                        cur.execute(UPSERT_SYMPTOM, (canon,))  # 표준 증상 upsert
                        cur.execute(GET_SYM_ID, (canon,))
                        row = cur.fetchone()
                        if row:
                            sid = row["SYMPTOM_ID"]
                            cur.execute(INSERT_DS, (did, sid, 1.0))
                            done_pairs += 1
            except Exception:
                logger.exception(f"[NORM] failed did={did}, sym={canon}")
    logger.info(f"[NORM] pairs_inserted={done_pairs}")
    return done_pairs

# ------------------------------------------------------------
# 4) EMBED 단계: disease_embedding_item (선택)
# ------------------------------------------------------------

PICK_EMB = """
SELECT d.DISEASE_ID, d.DISEASE_NAME_KOR, d.DISEASE_NAME_ENG, d.DESCRIPTION,
       GROUP_CONCAT(sm.CANONICAL ORDER BY sm.CANONICAL SEPARATOR ', ') AS SYMPTOMS
FROM DISEASE_MASTER d
LEFT JOIN DISEASE_SYMPTOM ds ON ds.DISEASE_ID = d.DISEASE_ID
LEFT JOIN SYMPTOM_MASTER sm ON sm.SYMPTOM_ID = ds.SYMPTOM_ID
GROUP BY d.DISEASE_ID
HAVING COALESCE(SYMPTOMS,'') <> ''
ORDER BY d.DISEASE_ID ASC
LIMIT %s
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
    if row.get('SYMPTOMS'):
        parts.append(f"증상: {row['SYMPTOMS']}")
    if row.get('DESCRIPTION'):
        parts.append(row['DESCRIPTION'])
    return "\n".join([clean_text(p) for p in parts if p])


def step_embed(limit: int = 200) -> int:
    if not EMB_ENABLE or SentenceTransformer is None:
        logger.info("[EMBED] skipped (disabled or package missing)")
        return 0
    model = SentenceTransformer(EMB_MODEL_NAME)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(PICK_EMB, (limit,))
            rows = cur.fetchall()
    if not rows:
        logger.info("[EMBED] no rows")
        return 0

    texts = [build_text(r) for r in rows]
    # 배치 임베딩
    embs = model.encode(texts, batch_size=EMB_BATCH, show_progress_bar=True)

    done = 0
    for r, e in zip(rows, embs):
        item_seq = f"DISEASE:{r['DISEASE_ID']}"
        text = build_text(r)
        thash = sha256(text + '|' + EMB_MODEL_NAME)
        emb_json = json.dumps([float(x) for x in e], ensure_ascii=False)
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(UPSERT_EMB, (item_seq, thash, text, len(e), emb_json))
                done += 1
    logger.info(f"[EMBED] done={done}")
    return done

# ------------------------------------------------------------
# 5) 메인 드라이버
# ------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=200)
    args = ap.parse_args()

    logger.info("[ETL] step=FETCH")
    step_fetch(limit=args.limit)

    logger.info("[ETL] step=PARSE")
    step_parse(limit=args.limit)

    logger.info("[ETL] step=NORMALIZE")
    step_normalize(limit=args.limit)

    logger.info("[ETL] step=EMBED (optional)")
    step_embed(limit=args.limit)

if __name__ == '__main__':
    main()
    
    
"""

> 주석 예시: `logger.info("...")  # 진행 상황 로그` 처럼 각 단계별로 충분한 로그를 남깁니다.

---

## 3) DUR 연동 예시 쿼리(초안)

> 실제 테이블 명은 현재 구축된 스키마에 맞추어 수정하세요. 아래는 **개념 예시**입니다.

### 3-1. 특정 질병(또는 증상 키워드) → OTC 후보 추출

"""sql
-- 예: 해열/진해 카테고리 후보 (임시)
SELECT i.ITEM_SEQ, i.ITEM_NAME, i.ENTP_NAME, i.CLASS_NO
FROM ITEM_DUR_INFO i
WHERE i.CLASS_NO LIKE '%해열%' OR i.CLASS_NO LIKE '%진해%'
LIMIT 50;
"""

### 3-2. DUR 주의/금기 조인 (노인주의/임부금기/병용금기)

"""sql
-- 노인주의 예시
SELECT i.ITEM_SEQ, i.ITEM_NAME, e.PROHBT_CONTENT AS ELDERLY_CAUTION
FROM ITEM_DUR_INFO i
LEFT JOIN ITEM_ELDERLY_CAUTION e ON e.ITEM_SEQ = i.ITEM_SEQ
WHERE i.ITEM_SEQ IN ('201106063', '...');

-- 병용금기(성분-성분) 예시
SELECT a.ITEM_SEQ, a.ITEM_NAME, m.INGR_CODE, m.MIX AS MIX_TYPE
FROM ITEM_DUR_INFO a
LEFT JOIN ITEM_MIX_CONTRAINDICATION m ON m.ITEM_SEQ = a.ITEM_SEQ
WHERE a.ITEM_SEQ IN ('201106063', '...');
"""

### 3-3. 사용자 맥락 필터(예: 70세, 임부, 복용 성분 리스트)

"""sql
-- 복용중 성분 리스트(@user_ingrs)에 금기가 있는 후보 제거 예시 (개념)
-- 사용자 성분 집합과 병용금기 테이블을 조인해 필터링
SELECT DISTINCT c.ITEM_SEQ
FROM CANDIDATE_OTC c
LEFT JOIN DUR_MIX_CONTRAINDICATION dm ON dm.INGR_CODE = c.INGR_CODE
WHERE dm.MIX LIKE '%사용자성분코드%';
"""

---

## 4) 운영 팁

* 실패 재시도: `SOURCE_PAGE.LAST_ERROR` 보고 원인별 백오프(1m → 5m → 1h)
* 모니터링 지표: 수집/파싱 성공률, DISEASE\_SYMPTOM 평균 연결 수, 임베딩 누락률
* 배치 실행: cron/PM2/서비스 스케줄러에서 5\~15분 간격 권장(원문 변화 주기 고려)

---

## 5) 빠른 점검 쿼리

"""sql
-- 1) 수집 상태
SELECT FETCH_DONE, PARSE_DONE, NORMALIZE_DONE, EMBED_DONE, COUNT(*)
FROM SOURCE_PAGE GROUP BY 1,2,3,4;

-- 2) 질병-증상 연결 밀도
SELECT COUNT(*) AS diseases,
       AVG(cnt) AS avg_symptoms
FROM (
  SELECT d.DISEASE_ID, COUNT(ds.SYMPTOM_ID) AS cnt
  FROM DISEASE_MASTER d
  LEFT JOIN DISEASE_SYMPTOM ds ON ds.DISEASE_ID=d.DISEASE_ID
  GROUP BY d.DISEASE_ID
) t;

-- 3) 임베딩 생성 현황(아이템 수)
SELECT COUNT(*) FROM disease_embedding_item;
"""

---

### 변경/확장 가이드

* **파서 개선**: AMC/위키별 DOM 패턴을 더 정밀하게 매칭(인포박스 키-값 추출, 표/리스트 파싱)
* **증상 표준어 사전**: `SYMPTOM_MASTER.ALIASES`에 동의어 자동 병합(토큰/형태소 기반)
* **임베딩 교체**: 도메인 특화 Ko-LLM 임베딩, 또는 OpenAI Embeddings로 전환시 `EMBEDDING_ENABLE=1` + 구현 교체
* **추천 랭킹**: 증상→카테고리 매핑 규칙화 후 ML 랭킹으로 업그레이드(사용자 피드백 테이블 연동)
