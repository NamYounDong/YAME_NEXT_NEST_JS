#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
YAME: Symptom/Disease ETL Orchestrator
- Nest(또는 어떤 백엔드)에서 크롤링 이후 CLI 호출을 염두에 둔 단일 진입점
- 단계: parse → extract → normalize_link → embed (선택적)
- 완료 시, stdout에 단 한 줄의 JSON 요약을 출력 (Nest에서 line-read로 파싱)
- 별도 실행 로그 테이블 없음(요청 반영). 모든 로그는 stdout 로깅.

환경변수(예시)
  DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
  KO_NER_MODEL=tunib/electra-ko-base-finetuned-ner  # 설치된 경우만 사용
  EMBED_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

사용 예)
  # 특정 page 하나 처리(파싱~정규화까지)
  python etl_orchestrator.py --page-id 123 --steps parse,extract,normalize

  # 다수 페이지 일괄 처리 + 임베딩까지
  python etl_orchestrator.py --all --limit 500 --steps parse,extract,normalize,embed
"""
import os, sys, json, time, argparse, hashlib, logging, traceback, re
from typing import List, Dict, Any, Optional, Tuple
import pymysql
from contextlib import contextmanager
from dotenv import load_dotenv
load_dotenv()

# -----------------------------
# 로깅 설정
# -----------------------------
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger("etl_orchestrator")

# -----------------------------
# DB 커넥션
# -----------------------------
@contextmanager
def db_conn():
    """MySQL/MariaDB 연결 컨텍스트 매니저"""
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', '3306')),
        user=os.getenv('DB_USERNAME', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        db=os.getenv('DB_NAME', 'yame'),
        charset='utf8mb4',
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        yield conn
        conn.commit()
    except:
        conn.rollback()
        raise
    finally:
        conn.close()

# -----------------------------
# 유틸
# -----------------------------
def sha256(text: str) -> str:
    """문자열 SHA-256 해시"""
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def jprint(obj: Any):
    """최종 결과를 JSON 한 줄로 출력 (Nest에서 line-read로 수집)
    print(obj) # obj를 로그로 남김
    """
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()

# -----------------------------
# HTML → 텍스트 정제
# -----------------------------
def clean_html_to_text(raw_html: str) -> str:
    """
    HTML을 본문 텍스트로 정제한다.
    - script/style 제거, 공백 축소 등
    """
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        raise RuntimeError("beautifulsoup4 미설치: pip install beautifulsoup4")
    soup = BeautifulSoup(raw_html, 'html.parser')
    for tag in soup(['script', 'style', 'noscript']):
        tag.decompose()
    text = soup.get_text(separator=' ')
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# -----------------------------
# LEXICON 로딩(하드코딩 금지)
# -----------------------------
def load_lexicon(conn) -> Dict[str, set]:
    """
    LEXICON_TERM에서 활성 용어를 로딩한다.
    반환: {'SYMPTOM': set([...]), 'DISEASE': set([...])}
    """
    with conn.cursor() as cur:
        # 쿼리 주석: 운영 사전에서 활성 용어 조회
        cur.execute("""
        /* LEXICON_TERM 활성 용어 조회 */
        SELECT TERM_TEXT, TERM_TYPE
        FROM LEXICON_TERM
        WHERE ACTIVE_YN=1
        """)
        rows = cur.fetchall()
    lex = {'SYMPTOM': set(), 'DISEASE': set()}
    for r in rows:
        ttype = r['TERM_TYPE']
        if ttype in lex:
            lex[ttype].add(r['TERM_TEXT'])
    return lex

# -----------------------------
# 후보 추출기(사전/규칙/선택적 NER)
# -----------------------------
def lexicon_match(text: str, lex: Dict[str, set]) -> List[Tuple[str, str, str, float]]:
    """
    운영 사전 기반 매칭 (아주 단순 포함 검색; 한글 토크나이즈는 추후 교체 가능)
    결과 항목: (term, TERM_TYPE, SOURCE_TAG, CONFIDENCE)
    """
    found = []
    for t in lex['SYMPTOM']:
        if t in text:
            found.append((t, 'SYMPTOM', 'LEXICON', 0.60))
    for t in lex['DISEASE']:
        if t in text:
            found.append((t, 'DISEASE', 'LEXICON', 0.60))
    return found

def rule_based_extract(text: str) -> List[Tuple[str, str, str, float]]:
    """
    규칙 기반 후보 추출
    - 접미사: ~통(증상), ~염/~증(질병) 등 간단한 힌트
    - '... 증상' 좌측 어절
    """
    cands = []
    for m in re.finditer(r'([가-힣]{2,10})(통|염|증)\b', text):
        term = m.group(0)
        hint = 'SYMPTOM' if m.group(2) == '통' else 'DISEASE'
        cands.append((term, hint, 'RULE', 0.55))
    for m in re.finditer(r'([가-힣]{2,6})\s*증상', text):
        cands.append((m.group(1), 'SYMPTOM', 'RULE', 0.50))
    return cands

_NER_PIPE = None
def init_ner():
    """설치되어 있으면 한국어 NER 파이프라인을 준비한다(미설치면 비활성)."""
    global _NER_PIPE
    if _NER_PIPE is not None:
        return
    try:
        from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
        model_name = os.getenv('KO_NER_MODEL', 'tunib/electra-ko-base-finetuned-ner')
        tok = AutoTokenizer.from_pretrained(model_name)
        mdl = AutoModelForTokenClassification.from_pretrained(model_name)
        _NER_PIPE = pipeline('ner', model=mdl, tokenizer=tok, grouped_entities=True)
        logger.info(f"[NER] loaded: {model_name}")
    except Exception as e:
        _NER_PIPE = None
        logger.info(f"[NER] disabled: {e}")

def ner_extract(text: str) -> List[Tuple[str, str, str, float]]:
    """
    일반 NER 결과에서 의학 전용 태그가 없을 수 있으므로 UNKNOWN으로 수집.
    후속 normalize 단계에서 접미·사전으로 타입 보강.
    """
    if _NER_PIPE is None:
        return []
    out = []
    try:
        ents = _NER_PIPE(text[:4000])  # 길이 제한
        for ent in ents:
            term = ent.get('word', '').replace('##', '').strip()
            if not term or len(term) < 2:
                continue
            score = float(ent.get('score', 0.5))
            out.append((term, 'UNKNOWN', 'NER', score))
    except Exception as e:
        logger.warning(f"[NER] failed: {e}")
    return out

# -----------------------------
# STAGING 적재
# -----------------------------
def upsert_stg_page_text(conn, page_id: int, clean_text: str):
    """STG_PAGE_TEXT UPSERT (PK=PAGE_ID, UK=TEXT_HASH)"""
    text_hash = sha256(clean_text)
    with conn.cursor() as cur:
        cur.execute("""
        /* STG_PAGE_TEXT UPSERT */
        INSERT INTO STG_PAGE_TEXT (PAGE_ID, TEXT_HASH, CLEAN_TEXT, LANG)
        VALUES (%s, %s, %s, 'ko')
        ON DUPLICATE KEY UPDATE
          TEXT_HASH = VALUES(TEXT_HASH),
          CLEAN_TEXT = VALUES(CLEAN_TEXT)
        """, (page_id, text_hash, clean_text))

def bulk_insert_stg_terms(conn, page_id: int, cands: List[Tuple[str, str, str, float]], snippet: str):
    """STG_EXTRACT_TERM 벌크 INSERT"""
    if not cands:
        return 0
    rows = []
    for term, ttype, src, conf in cands:
        rows.append((page_id, term, term, ttype, src, float(conf), snippet, None))
    with conn.cursor() as cur:
        cur.executemany("""
        /* STG_EXTRACT_TERM 벌크 적재 */
        INSERT INTO STG_EXTRACT_TERM
          (PAGE_ID, TERM_TEXT, TERM_NORM, TERM_TYPE, SOURCE_TAG, CONFIDENCE, CONTEXT_SNIPPET, OFFSETS)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, rows)
    return len(rows)

# -----------------------------
# NORMALIZE / LINK
# -----------------------------
def norm_text(s: str) -> str:
    """간단 정규화(공백·특수 제거 축소)"""
    s = s.strip()
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[^0-9A-Za-z가-힣\s]', '', s)
    return s

def upsert_symptom(conn, name_ko: str) -> int:
    with conn.cursor() as cur:
        cur.execute("""
        /* DIM_SYMPTOM UPSERT by NAME_KO */
        INSERT INTO DIM_SYMPTOM (NAME_KO) VALUES (%s)
        ON DUPLICATE KEY UPDATE NAME_KO=VALUES(NAME_KO)
        """, (name_ko,))
        cur.execute("SELECT SYMPTOM_ID FROM DIM_SYMPTOM WHERE NAME_KO=%s", (name_ko,))
        return int(cur.fetchone()['SYMPTOM_ID'])

def upsert_disease(conn, name_ko: str) -> int:
    with conn.cursor() as cur:
        cur.execute("""
        /* DIM_DISEASE UPSERT by NAME_KO */
        INSERT INTO DIM_DISEASE (NAME_KO) VALUES (%s)
        ON DUPLICATE KEY UPDATE NAME_KO=VALUES(NAME_KO)
        """, (name_ko,))
        cur.execute("SELECT DISEASE_ID FROM DIM_DISEASE WHERE NAME_KO=%s", (name_ko,))
        return int(cur.fetchone()['DISEASE_ID'])

def add_alias(conn, table: str, fk_col: str, fk_id: int, alias_text: str, source_tag: str):
    with conn.cursor() as cur:
        cur.execute(f"""
        /* {table} INSERT IGNORE: alias 추가 */
        INSERT IGNORE INTO {table} ({fk_col}, ALIAS_TEXT, SOURCE_TAG)
        VALUES (%s,%s,%s)
        """, (fk_id, alias_text, source_tag))

def normalize_and_link_for_page(conn, page_id: int) -> Dict[str, int]:
    """
    특정 PAGE_ID에 대해 STG_EXTRACT_TERM을 읽어 표준 마스터 업서트 및
    FACT_SYMPTOM_DISEASE 연관 스코어를 업데이트한다(페이지 공출현 기반).
    """
    with conn.cursor() as cur:
        cur.execute("""
        /* 대상 페이지의 후보 항목 조회 */
        SELECT TERM_TEXT, TERM_TYPE, SOURCE_TAG, CONFIDENCE
        FROM STG_EXTRACT_TERM
        WHERE PAGE_ID=%s
        """, (page_id,))
        rows = cur.fetchall()

    sym_map: Dict[str, int] = {}
    dis_map: Dict[str, int] = {}

    # 1) 표준화 및 마스터/동의어 반영
    for r in rows:
        term = norm_text(r['TERM_TEXT'])
        ttype = r['TERM_TYPE']
        if ttype == 'UNKNOWN':
            if re.search(r'(통)$', term): ttype = 'SYMPTOM'
            elif re.search(r'(염|증)$', term): ttype = 'DISEASE'
        if ttype == 'SYMPTOM':
            sid = sym_map.get(term)
            if not sid:
                sid = upsert_symptom(conn, term)
                sym_map[term] = sid
            add_alias(conn, 'BR_SYMPTOM_ALIAS', 'SYMPTOM_ID', sid, term, r['SOURCE_TAG'])
        elif ttype == 'DISEASE':
            did = dis_map.get(term)
            if not did:
                did = upsert_disease(conn, term)
                dis_map[term] = did
            add_alias(conn, 'BR_DISEASE_ALIAS', 'DISEASE_ID', did, term, r['SOURCE_TAG'])

    # 2) 공출현 연관 스코어(간단)
    #    SYMPTOM x DISEASE 조합에 cooccur=1을 누적하고 score는 상향 반영
    with conn.cursor() as cur:
        for s_term, sid in sym_map.items():
            for d_term, did in dis_map.items():
                score = 0.35  # 기본 가중(간단 정책); 추후 개선
                cur.execute("""
                /* FACT_SYMPTOM_DISEASE UPSERT: 페이지 공출현 기반 누적 */
                INSERT INTO FACT_SYMPTOM_DISEASE (SYMPTOM_ID, DISEASE_ID, SCORE, EVIDENCE_JSON)
                VALUES (%s,%s,%s, JSON_OBJECT('cooccur', 1))
                ON DUPLICATE KEY UPDATE
                  SCORE = GREATEST(SCORE, VALUES(SCORE)),
                  EVIDENCE_JSON = JSON_SET(
                      IFNULL(EVIDENCE_JSON, JSON_OBJECT()),
                      '$.cooccur',
                      COALESCE(JSON_EXTRACT(EVIDENCE_JSON, '$.cooccur'), 0) + 1
                  ),
                  UPDATED_AT = NOW()
                """, (sid, did, score))

    return {
        "page_id": page_id,
        "mapped_symptoms": len(sym_map),
        "mapped_diseases": len(dis_map)
    }

# -----------------------------
# EMBEDDING (선택 실행)
# -----------------------------
def ensure_sentence_model():
    """
    sentence-transformers 모델을 준비(설치되어 있지 않으면 None 리턴).
    """
    try:
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv('EMBED_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
        model = SentenceTransformer(model_name)
        logger.info(f"[EMBED] loaded: {model_name}")
        return model
    except Exception as e:
        logger.info(f"[EMBED] disabled: {e}")
        return None

def refresh_symptom_embeddings(conn, model, model_key: str) -> int:
    """DIM_SYMPTOM 전건 임베딩 캐시 업서트"""
    if model is None:
        return 0
    with conn.cursor() as cur:
        cur.execute("SELECT SYMPTOM_ID, NAME_KO FROM DIM_SYMPTOM")
        rows = cur.fetchall()
    texts = [r['NAME_KO'] for r in rows]
    if not texts:
        return 0
    vecs = model.encode(texts, normalize_embeddings=True)  # numpy array
    with conn.cursor() as cur:
        for r, vec in zip(rows, vecs):
            cur.execute("""
            /* SYMPTOM_EMBEDDING UPSERT */
            INSERT INTO SYMPTOM_EMBEDDING (SYMPTOM_ID, MODEL_KEY, DIM, VECTOR)
            VALUES (%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
              DIM=VALUES(DIM),
              VECTOR=VALUES(VECTOR),
              UPDATED_AT=NOW()
            """, (int(r['SYMPTOM_ID']), model_key, int(len(vec)), json.dumps(vec.tolist())))
    return len(rows)

def refresh_disease_embeddings(conn, model, model_key: str) -> int:
    """DIM_DISEASE 전건 임베딩 캐시 업서트"""
    if model is None:
        return 0
    with conn.cursor() as cur:
        cur.execute("SELECT DISEASE_ID, NAME_KO FROM DIM_DISEASE")
        rows = cur.fetchall()
    texts = [r['NAME_KO'] for r in rows]
    if not texts:
        return 0
    vecs = model.encode(texts, normalize_embeddings=True)
    with conn.cursor() as cur:
        for r, vec in zip(rows, vecs):
            cur.execute("""
            /* DISEASE_EMBEDDING UPSERT */
            INSERT INTO DISEASE_EMBEDDING (DISEASE_ID, MODEL_KEY, DIM, VECTOR)
            VALUES (%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
              DIM=VALUES(DIM),
              VECTOR=VALUES(VECTOR),
              UPDATED_AT=NOW()
            """, (int(r['DISEASE_ID']), model_key, int(len(vec)), json.dumps(vec.tolist())))
    return len(rows)

# -----------------------------
# PIPELINE 스텝
# -----------------------------
def step_parse(conn, page_id: int) -> Dict[str, Any]:
    """RAW_HTML → STG_PAGE_TEXT"""
    with conn.cursor() as cur:
        cur.execute("""
        /* 대상 페이지 조회 */
        SELECT SOURCE_PAGE_ID, RAW_HTML
        FROM SOURCE_PAGE
        WHERE SOURCE_PAGE_ID=%s
        """, (page_id,))
        row = cur.fetchone()
    if not row or not row.get('RAW_HTML'):
        return {"name": "parse", "ok": False, "rows_written": 0, "error": "RAW_HTML not found"}

    clean_text = clean_html_to_text(row['RAW_HTML'])
    upsert_stg_page_text(conn, page_id, clean_text)
    return {"name": "parse", "ok": True, "rows_written": 1, "text_len": len(clean_text)}

def step_extract(conn, page_id: int, lex: Dict[str, set]) -> Dict[str, Any]:
    """STG_PAGE_TEXT.CLEAN_TEXT에서 후보 추출 → STG_EXTRACT_TERM"""
    with conn.cursor() as cur:
        cur.execute("""
        /* 정제 텍스트 조회 */
        SELECT CLEAN_TEXT FROM STG_PAGE_TEXT WHERE PAGE_ID=%s
        """, (page_id,))
        row = cur.fetchone()
    if not row:
        return {"name": "extract", "ok": False, "symptom_candidates": 0, "error": "CLEAN_TEXT not found"}

    text = row['CLEAN_TEXT']
    # 추출기 병렬 적용
    init_ner()
    cands = []
    cands += lexicon_match(text, lex)
    cands += rule_based_extract(text)
    cands += ner_extract(text)
    written = bulk_insert_stg_terms(conn, page_id, cands, text[:200])
    return {"name": "extract", "ok": True, "symptom_candidates": written}

def step_normalize_link(conn, page_id: int) -> Dict[str, Any]:
    """STG_EXTRACT_TERM → DIM/BR/FACT"""
    stats = normalize_and_link_for_page(conn, page_id)
    return {
        "name": "normalize",
        "ok": True,
        "mapped_symptoms": stats["mapped_symptoms"],
        "mapped_diseases": stats["mapped_diseases"]
    }

def step_embed(conn) -> Dict[str, Any]:
    """DIM_* → *_EMBEDDING (전건)"""
    model = ensure_sentence_model()
    model_key = os.getenv('EMBED_MODEL', 'paraphrase-multilingual-MiniLM-L12-v2')
    n_sym = refresh_symptom_embeddings(conn, model, model_key)
    n_dis = refresh_disease_embeddings(conn, model, model_key)
    return {"name": "embed", "ok": True, "items_cached": n_sym + n_dis, "model_key": model_key}

# -----------------------------
# MAIN
# -----------------------------
def parse_args():
    ap = argparse.ArgumentParser(description="YAME ETL Orchestrator")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--page-id", type=int, help="특정 SOURCE_PAGE_ID 한 건 처리")
    g.add_argument("--all", action="store_true", help="RAW_HTML 있는 모든 페이지 처리")
    ap.add_argument("--limit", type=int, default=0, help="--all에서 처리할 최대 건수(0=제한없음)")
    ap.add_argument("--steps", type=str, default="parse,extract,normalize",
                    help="쉼표구분 단계: parse,extract,normalize,embed")
    return ap.parse_args()

def main():
    t0 = time.time()
    args = parse_args()
    steps = [s.strip() for s in args.steps.split(",") if s.strip()]
    stages_report: List[Dict[str, Any]] = []
    status = "success"
    warnings: List[str] = []

    with db_conn() as conn:
        # 처리 대상 페이지 집합 결정
        page_ids: List[int] = []
        if args.page_id is not None:
            page_ids = [args.page_id]
        elif args.all:
            with conn.cursor() as cur:
                cur.execute("""
                /* RAW_HTML 보유 페이지 목록 */
                SELECT SOURCE_PAGE_ID
                FROM SOURCE_PAGE
                WHERE RAW_HTML IS NOT NULL
                ORDER BY SOURCE_PAGE_ID ASC
                """ + ("" if args.limit <= 0 else " LIMIT %s"),
                (() if args.limit <= 0 else (args.limit,)))
                page_ids = [r['SOURCE_PAGE_ID'] for r in cur.fetchall()]

        # LEXICON 로딩(하드코딩 금지)
        lex = load_lexicon(conn)

        total_sym_cands = 0
        total_mapped_sym = 0
        total_mapped_dis = 0

        # 페이지 단위 처리
        for pid in page_ids:
            logger.info(f"== Processing PAGE {pid} ==")
            if "parse" in steps:
                try:
                    rep = step_parse(conn, pid)
                    stages_report.append(rep)
                    if not rep["ok"]:
                        warnings.append(f"parse failed for page {pid}: {rep.get('error')}")
                except Exception as e:
                    status = "partial_failure"
                    warnings.append(f"parse exception for page {pid}: {e}")
                    logger.exception(e)

            if "extract" in steps:
                try:
                    rep = step_extract(conn, pid, lex)
                    stages_report.append(rep)
                    total_sym_cands += int(rep.get("symptom_candidates", 0))
                except Exception as e:
                    status = "partial_failure"
                    warnings.append(f"extract exception for page {pid}: {e}")
                    logger.exception(e)

            if "normalize" in steps or "normalize_link" in steps:
                try:
                    rep = step_normalize_link(conn, pid)
                    stages_report.append(rep)
                    total_mapped_sym += int(rep.get("mapped_symptoms", 0))
                    total_mapped_dis += int(rep.get("mapped_diseases", 0))
                except Exception as e:
                    status = "partial_failure"
                    warnings.append(f"normalize exception for page {pid}: {e}")
                    logger.exception(e)

        # 전건 단위(페이지와 무관) 임베딩 단계
        if "embed" in steps:
            try:
                rep = step_embed(conn)
                stages_report.append(rep)
            except Exception as e:
                status = "partial_failure"
                warnings.append(f"embed exception: {e}")
                logger.exception(e)

    # 최종 요약 JSON 한 줄 출력
    out = {
        "status": status,
        "processed_pages": len(page_ids),
        "stages": stages_report,
        "totals": {
            "symptom_candidates": total_sym_cands,
            "mapped_symptoms": total_mapped_sym,
            "mapped_diseases": total_mapped_dis
        },
        "t_ms": int((time.time() - t0) * 1000),
        "warnings": warnings
    }
    jprint(out)

if __name__ == "__main__":
    main()
