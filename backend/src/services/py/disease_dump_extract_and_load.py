#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
나무위키 덤프 확보(없으면 Hugging Face에서 생성) → 미니 파서 → (A형식) MySQL 적재 또는 NDJSON 출력
- 덤프 파일이 지정 경로에 없으면: Hugging Face `heegyu/namuwiki`(2022-03-01 스냅샷)에서
  스트리밍으로 `title,text`를 뽑아 JSONL.GZ를 생성합니다.
- 그 다음, 덤프에서 '== 증상 ==' 섹션만 규칙 기반으로 추출하고, 리다이렉트(넘겨주기)로 동의어를 묶어
  (의학명=캐노니컬, 일반명/동의어, 증상) 데이터를 만듭니다.
- **질병 문서 필터**를 추가하여, 분류/섹션/제목 힌트로 **질병 관련 페이지만** 통과시킵니다.
- 출력 모드:
  1) --mode ndjson  : NDJSON(한 줄당 한 JSON) 표준출력
  2) --mode mysql   : MySQL 테이블(A형식: 단일 테이블 **NAMU_DISEASE_MASTER**)에 업서트 적재

필수/권장 패키지:
  pip install datasets pymysql python-dotenv

환경변수(선택):
  DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME

예시:
  # 1) 덤프 없으면 생성 → NDJSON 출력
  python disease_dump_extract_and_load.py \
    --dump namuwiki_20220301.jsonl.gz --mode ndjson > disease_master.ndjson

  # 2) 덤프 없으면 생성 → MySQL 테이블 생성 후 적재(업서트)
  python disease_dump_extract_and_load.py \
    --dump namuwiki_20220301.jsonl.gz --mode mysql --create-table \
    --mysql-host localhost --mysql-port 3306 --mysql-user root --mysql-pass secret --mysql-db yame

라이선스 유의: 나무위키 문서는 CC BY-NC-SA 2.0 KR(비영리, 동일조건)입니다.
"""

from __future__ import annotations
import argparse
import gzip
import io
import json
import os
import re
import sys
from collections import defaultdict
from typing import Dict, Iterator, List, Optional
from dotenv import load_dotenv

load_dotenv()  # .env 로드

# -----------------------------
# 나무마크/헤딩/리다이렉트/분류 정규식
# -----------------------------
RE_REDIRECT = re.compile(
    r"^\s*#\s*(?:redirect|넘겨주기)\s*(?:\[\[)?\s*([^\]\n#]+?)\s*(?:\]\])?\s*$",
    re.IGNORECASE | re.MULTILINE,
)
RE_HEADING = re.compile(r"^(=+)\s*(.+?)\s*\1\s*$", re.MULTILINE)
RE_LINK_PIPED = re.compile(r"\[\[([^|\]]+)\|([^\]]+)\]\]")
RE_LINK_SIMPLE = re.compile(r"\[\[([^\]]+)\]\]")
RE_HTTP_LINK = re.compile(r"\[(?:https?|ftp)://[^\s\]]+\s+([^\]]+)\]")
RE_REF_TAG = re.compile(r"<ref[^>]*>.*?</ref>", re.DOTALL | re.IGNORECASE)
RE_TRIPLE_BRACE = re.compile(r"\{\{\{.*?\}\}\}", re.DOTALL)
RE_DOUBLE_BRACE = re.compile(r"\{\{.*?\}\}", re.DOTALL)
RE_BOLD_ITALIC = re.compile(r"''+")
RE_NOISY_LINES = re.compile(r"^\s*\[\[(?:분류|분류:).*\]\]\s*$", re.MULTILINE)
RE_CATEGORY = re.compile(r"\[\[\s*(?:분류|category)\s*:\s*([^\]]+)\]\]", re.IGNORECASE)

SYMPTOM_KEYS = ["증상", "임상 증상", "임상증상", "주요 증상", "증후", "임상 소견", "종류 및 증상"]
CAUSE_KEYS   = ["원인", "병인", "병태생리", "병태 생리"]
TREAT_KEYS   = ["치료", "치료법", "치료 방법", "예후", "관리", "치료와 관리"]

# 포함/제외 카테고리 힌트(필요 시 보강)
INCLUDE_CATS = {
    "질병", "감염병", "전염병", "증후군", "의학", "의학 용어", "의학적 상태",
    "정신 질환", "희귀질환", "암", "종양", "면역질환", "자가면역질환", "질환", "장애", "염증"
}
EXCLUDE_CATS = {
    "인물", "영화", "음악", "게임", "애니메이션", "웹툰", "기업", "회사",
    "지명", "국가", "역사", "스포츠", "정치", "군사", "소프트웨어", "프로그래밍",
}



def cat_contains_any_partial(categories: list[str], keywords: set[str]) -> bool:
    # 공백 제거 + 소문자 정규화 후 부분 포함 검사
    def norm(s: str) -> str:
        return re.sub(r"\s+", "", s).lower()
    cats_n = [norm(c) for c in categories]
    keys_n = [norm(k) for k in keywords]
    return any(any(k and (k in c) for k in keys_n) for c in cats_n)

# -----------------------------
# 유틸: gzip 파일 열기
# -----------------------------
def open_maybe_gzip(path: str):
    if path.endswith('.gz'):
        return io.TextIOWrapper(gzip.open(path, 'rb'), encoding='utf-8')
    return open(path, 'r', encoding='utf-8')

# -----------------------------
# 정규식 기반 파싱 유틸
# -----------------------------
def find_redirect_target(text: str) -> Optional[str]:
    m = RE_REDIRECT.search(text)
    return m.group(1).strip() if m else None

def canonical_of(title: str, redirects: Dict[str, str]) -> str:
    seen = set()
    cur = title
    while cur in redirects and cur not in seen:
        seen.add(cur)
        cur = redirects[cur]
    return cur

def slice_sections(text: str) -> List[tuple[int, str, int, int]]:
    out = []
    matches = list(RE_HEADING.finditer(text))
    for i, m in enumerate(matches):
        level = len(m.group(1))
        title = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        out.append((level, title, start, end))
    return out

def pick_section(text: str, keys: List[str]) -> Optional[str]:
    norm = lambda s: re.sub(r"\s+", "", s).lower()
    keyset = {norm(k) for k in keys}
    for level, title, s, e in slice_sections(text):
        if norm(title) in keyset:
            return text[s:e]
    return None

def clean_namumark(raw: str) -> str:
    if not raw:
        return ''
    t = raw
    t = RE_REF_TAG.sub('', t)
    t = RE_TRIPLE_BRACE.sub('', t)
    t = RE_DOUBLE_BRACE.sub('', t)
    t = RE_LINK_PIPED.sub(r'\2', t)
    t = RE_LINK_SIMPLE.sub(r'\1', t)
    t = RE_HTTP_LINK.sub(r'\1', t)
    t = RE_BOLD_ITALIC.sub('', t)
    t = RE_NOISY_LINES.sub('', t)
    t = t.replace('\t', ' ').replace('\r', '')
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

# -----------------------------
# 분류 추출 & 질병 문서 판별
# -----------------------------
def extract_categories(text: str) -> List[str]:
    return [m.strip() for m in RE_CATEGORY.findall(text)]

def is_disease_page(title: str, text: str) -> bool:
    # 1) 카테고리 힌트: 질병 관련 포함 & 비의학 제외
    cats_list = extract_categories(text)
    if cat_contains_any_partial(cats_list, INCLUDE_CATS) and not cat_contains_any_partial(cats_list, EXCLUDE_CATS):
        return True
    # 2) 섹션 구조: 증상 + (원인 or 치료)
    has_sym = pick_section(text, SYMPTOM_KEYS) is not None
    has_ctx = (pick_section(text, CAUSE_KEYS) is not None) or (pick_section(text, TREAT_KEYS) is not None)
    # 3) 제목 힌트: …질환/…병/…증후군/…염/…암/…증
    title_hint = re.search(r"(질환|병|증후군|염|암|증)$", title)
    return bool(has_sym and (has_ctx or title_hint))

# -----------------------------
# 덤프 파일 확보(없으면 Hugging Face에서 생성)
# -----------------------------
def ensure_dump_file(out_path: str, title_key: str = 'title', text_key: str = 'text', dataset: str = 'heegyu/namuwiki', split: str = 'train') -> None:
    """out_path가 없으면 Hugging Face datasets로부터 스트리밍 저장(JSONL.GZ). 이미 있으면 no-op."""
    if os.path.exists(out_path):
        print(f"[ensure_dump] exists: {out_path}", file=sys.stderr)
        return
    print(f"[ensure_dump] creating from Hugging Face: {dataset} → {out_path}", file=sys.stderr)
    try:
        from datasets import load_dataset
    except Exception as e:
        raise RuntimeError("datasets 패키지가 필요합니다. pip install datasets") from e

    ds = load_dataset(dataset, split=split, streaming=True)
    with gzip.open(out_path, 'wt', encoding='utf-8') as fw:
        for ex in ds:
            title = ex.get(title_key)
            text = ex.get(text_key)
            if not title or not text:
                continue
            line = json.dumps({"title": title, "text": text}, ensure_ascii=False)
            fw.write(line + "\n")
    print(f"[ensure_dump] done: {out_path}", file=sys.stderr)

# -----------------------------
# 1패스: 리다이렉트 맵 생성
# -----------------------------
def pass1_build_redirects(dump_path: str, title_key: str = 'title', text_key: str = 'text') -> Dict[str, str]:
    redirects: Dict[str, str] = {}
    with open_maybe_gzip(dump_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            title = str(obj.get(title_key, '')).strip()
            text = str(obj.get(text_key, '')).strip()
            if not title or not text:
                continue
            tgt = find_redirect_target(text)
            if tgt:
                redirects[title] = tgt
    return redirects

# -----------------------------
# 2패스: 레코드 생성 제너레이터 (NDJSON 소스)
# -----------------------------
def generate_records(dump_path: str, title_key: str = 'title', text_key: str = 'text') -> Iterator[dict]:
    redirects = pass1_build_redirects(dump_path, title_key, text_key)

    inverse: Dict[str, set] = defaultdict(set)
    for src, tgt in redirects.items():
        inverse[canonical_of(tgt, redirects)].add(src)

    symptoms: Dict[str, str] = {}
    counts: Dict[str, int] = defaultdict(int)
    aliases: Dict[str, set] = defaultdict(set)

    with open_maybe_gzip(dump_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            title = str(obj.get(title_key, '')).strip()
            text  = str(obj.get(text_key, '')).strip()
            if not title or not text:
                continue

            # 🔎 질병 문서만 통과
            if not is_disease_page(title, text):
                continue

            # 리다이렉트 문서(본문X)는 스킵 (동의어는 inverse로 처리됨)
            if find_redirect_target(text):
                continue

            canon = canonical_of(title, redirects)
            counts[canon] += 1
            if canon in inverse:
                aliases[canon].update(inverse[canon])

            raw = pick_section(text, SYMPTOM_KEYS)
            if raw and canon not in symptoms:
                clean = clean_namumark(raw)
                if clean:
                    symptoms[canon] = clean

    snapshot = guess_snapshot_from_filename(dump_path)
    provider = 'namuwiki'
    keys = sorted(set(counts) | set(symptoms) | set(aliases))
    for canon in keys:
        yield {
            'canonical_title': canon,
            'aliases': sorted(aliases.get(canon, set())),
            'symptom_text': symptoms.get(canon, ''),
            'source_titles_count': int(counts.get(canon, 0)),
            'source': {
                'provider': provider,
                'snapshot': snapshot,
            },
        }

# -----------------------------
# 스냅샷 추정(파일명에 날짜 포함 시)
# -----------------------------
def guess_snapshot_from_filename(path: str) -> Optional[str]:
    base = os.path.basename(path)
    m = re.search(r'(\d{8}|\d{6})', base)
    if not m:
        return None
    val = m.group(1)
    if len(val) == 6:
        return '20' + val  # yymmdd → 20yymmdd 가정
    return val

# -----------------------------
# NDJSON 출력
# -----------------------------
def emit_ndjson(dump_path: str) -> None:
    for rec in generate_records(dump_path):
        print(json.dumps(rec, ensure_ascii=False))

# -----------------------------
# MySQL 적재(A형식 단일 테이블: NAMU_DISEASE_MASTER)
# -----------------------------
MYSQL_DDL_A = r"""
CREATE TABLE IF NOT EXISTS NAMU_DISEASE_MASTER (
  ID                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  CANONICAL_TITLE      VARCHAR(255) NOT NULL COMMENT '의학적 질병 명칭(정식/캐노니컬)',
  COMMON_NAME          VARCHAR(255) NULL COMMENT '일반적 질병명(대표 1개)',
  ALIASES_JSON         JSON NULL COMMENT '동의어/일반명 배열(JSON)',
  SYMPTOM_TEXT         MEDIUMTEXT NULL COMMENT '증상 섹션 평문화',
  SOURCE_PROVIDER      VARCHAR(50) NOT NULL DEFAULT 'namuwiki',
  SOURCE_SNAPSHOT      VARCHAR(20) NULL,
  SOURCE_TITLES_COUNT  INT NOT NULL DEFAULT 0,
  CREATED_AT           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UPDATED_AT           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY UK_CANONICAL (CANONICAL_TITLE),
  FULLTEXT KEY FT_SYMPTOM (SYMPTOM_TEXT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
"""


def mysql_connect(host: str, port: int, user: str, password: str, db: str):
    try:
        import pymysql  # type: ignore
    except Exception as e:
        raise RuntimeError("pymysql 패키지가 필요합니다. pip install pymysql") from e
    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db,
        charset='utf8mb4',
        autocommit=False,
    )


def ensure_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(MYSQL_DDL_A)
    conn.commit()


def insert_mysql(
    dump_path: str,
    host: str,
    port: int,
    user: str,
    password: str,
    db: str,
    create_table: bool = False,
    batch_size: int = 500,
) -> int:
    conn = mysql_connect(host, port, user, password, db)
    try:
        if create_table:
            ensure_table(conn)

        total = 0
        batch: List[dict] = []

        def flush_batch():
            nonlocal total, batch
            if not batch:
                return
            placeholders = ','.join(['(?,?,?,?,?,?,?)'] * len(batch))
            sql = (
                "INSERT INTO NAMU_DISEASE_MASTER "
                "(CANONICAL_TITLE, COMMON_NAME, ALIASES_JSON, SYMPTOM_TEXT, SOURCE_PROVIDER, SOURCE_SNAPSHOT, SOURCE_TITLES_COUNT) "
                f"VALUES {placeholders} "
                "ON DUPLICATE KEY UPDATE "
                "COMMON_NAME=VALUES(COMMON_NAME), "
                "ALIASES_JSON=VALUES(ALIASES_JSON), "
                "SYMPTOM_TEXT=VALUES(SYMPTOM_TEXT), "
                "SOURCE_PROVIDER=VALUES(SOURCE_PROVIDER), "
                "SOURCE_SNAPSHOT=VALUES(SOURCE_SNAPSHOT), "
                "SOURCE_TITLES_COUNT=VALUES(SOURCE_TITLES_COUNT), "
                "UPDATED_AT=CURRENT_TIMESTAMP"
            )
            params: List[object] = []
            for r in batch:
                aliases = r.get('aliases') or []
                common = aliases[0] if aliases else None
                params.extend([
                    r.get('canonical_title'),
                    common,
                    json.dumps(aliases, ensure_ascii=False),
                    r.get('symptom_text') or None,
                    (r.get('source') or {}).get('provider') or 'namuwiki',
                    (r.get('source') or {}).get('snapshot'),
                    int(r.get('source_titles_count') or 0),
                ])
            with conn.cursor() as cur:
                # PyMySQL는 %s 플레이스홀더를 사용 → '?' 치환
                cur.execute('delete from namu_disease_master')
                sql_pymysql = sql.replace('?', '%s')
                cur.execute(sql_pymysql, params)
            conn.commit()
            total += len(batch)
            batch = []

        for rec in generate_records(dump_path):
            batch.append(rec)
            if len(batch) >= batch_size:
                flush_batch()
        flush_batch()
        return total
    finally:
        conn.close()

# -----------------------------
# 메인
# -----------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dump', default='namuwiki_20220301.jsonl.gz', help='덤프 경로(JSONL.GZ). 없으면 자동 생성')
    ap.add_argument('--mode', choices=['ndjson', 'mysql'], default='ndjson', help='출력 모드')
    ap.add_argument('--title-key', default='title')
    ap.add_argument('--text-key', default='text')
    ap.add_argument('--no-ensure-dump', action='store_true', help='덤프 자동 생성 건너뛰기')

    # MySQL 옵션
    ap.add_argument('--mysql-host', default=os.getenv('DB_HOST', 'localhost'))
    ap.add_argument('--mysql-port', type=int, default=int(os.getenv('DB_PORT', '3306')))
    ap.add_argument('--mysql-user', default=os.getenv('DB_USER', 'root'))
    ap.add_argument('--mysql-pass', default=os.getenv('DB_PASS', ''))
    ap.add_argument('--mysql-db',   default=os.getenv('DB_NAME', 'yame'))
    ap.add_argument('--create-table', action='store_true', help='NAMU_DISEASE_MASTER 테이블 생성')
    ap.add_argument('--batch-size', type=int, default=500)

    args = ap.parse_args()

    # 0) 덤프 보장
    if not args.no_ensure_dump:
        ensure_dump_file(args.dump, title_key=args.title_key, text_key=args.text_key)

    # 1) 모드 분기
    if args.mode == 'ndjson':
        emit_ndjson(args.dump)
    else:
        total = insert_mysql(
            dump_path=args.dump,
            host=args.mysql_host,
            port=args.mysql_port,
            user=args.mysql_user,
            password=args.mysql_pass,
            db=args.mysql_db,
            create_table=args.create_table,
            batch_size=args.batch_size,
        )
        print(json.dumps({'ok': True, 'inserted_or_upserted': total}, ensure_ascii=False))


if __name__ == '__main__':
    main()
