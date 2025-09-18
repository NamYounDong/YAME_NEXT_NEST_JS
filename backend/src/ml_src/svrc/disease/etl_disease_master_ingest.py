#!/usr/bin/env python3
# -*- coding: utf-8 -*-
""" 파기 예정 소스
etl_disease_master_ingest.py

YAME: DISEASE_MASTER / SYMPTOM_MASTER / DISEASE_SYMPTOM_MAP 적재 파이프라인 (AMC + Wikipedia)
- 문제점 교정:
  1) '치료/설명 문장'이 증상으로 들어가던 이슈 → 증상 섹션 추출 + 강력한 필터(길이, 금칙어, 품사, 문장부호)
  2) "작은 볼(협골 형성 부전)" 형태에서 ALIASES 미적재 → 괄호·구분자 기반 별칭 분리/병합 업서트
  3) DISEASE_MASTER 단건만 누적 → 페이지별 처리 루프/중복방지/링크 생성 로직 안정화
  4) Windows에서 kiwipiepy 경고 → num_workers=-1, 지연 초기화

[필요 라이브러리]
  pip install requests beautifulsoup4 pymysql kiwipiepy python-dotenv

[환경변수(.env)]
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  # 선택: AMC/WIKI 요청 튜닝
  AMC_RPS (기본 0.5), WIKI_RPS(기본 1.0)

[주의]
- 스키마 컬럼명은 운영 DB에 맞춰 DBMAP에서 매핑하세요(테이블명/컬럼명 다를 수 있음).
- PyMySQL은 Kerberos(auth_gssapi_client)를 지원하지 않음 → 계정 플러그인은
  MySQL: caching_sha2_password|mysql_native_password / MariaDB: mysql_native_password 로 설정.

작성: 2025-09-18
"""

from __future__ import annotations
import os, re, json, time, logging, html, unicodedata
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from bs4 import BeautifulSoup
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

# -----------------------------
# 로깅 설정
# -----------------------------
LOG_FMT = "[%(asctime)s] %(levelname)s %(name)s - %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
logger = logging.getLogger("etl_disease_ingest")

# -----------------------------
# 설정 로드
# -----------------------------
load_dotenv()
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "yame")
DB_USER = os.getenv("DB_USER", "etl_yame")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

AMC_RPS = float(os.getenv("AMC_RPS", "0.5"))      # 초당 요청수 제한(=1/슬립)
WIKI_RPS = float(os.getenv("WIKI_RPS", "1.0"))

# -----------------------------
# DB 스키마/컬럼 매핑
# (운영 DB와 다르면 여기만 수정)
# -----------------------------
DBMAP = {
    "DISEASE_MASTER": {
        "table": "DISEASE_MASTER",
        "id": "DISEASE_ID",
        "name": "DISEASE_NAME",            # 질병명(대표)
        "summary": "SUMMARY",              # 질환 요약(선택)
        "symptoms_json": "SYMPTOMS",       # 증상 리스트 JSON(선택)
        "source": "SOURCE",                # 'AMC'|'WIKIPEDIA'
        "url": "URL",                      # 원문 URL
        "symptom_count": "SYMPTOM_COUNT",  # 증상 수
    },
    "SYMPTOM_MASTER": {
        "table": "SYMPTOM_MASTER",
        "id": "SYMPTOM_ID",
        "name": "SYMPTOM_NAME",
        "aliases": "ALIASES",              # JSON array
        "name_norm": "NAME_NORM",          # 공백/기호 제거 정규화 키
    },
    "DISEASE_SYMPTOM_MAP": {
        "table": "DISEASE_SYMPTOM_MAP",
        "disease_id": "DISEASE_ID",
        "symptom_id": "SYMPTOM_ID",
        # 필요시 source_page_id 등 추가 가능
    },
    "SOURCE_PAGE": {
        "table": "SOURCE_PAGE",
        "id": "SOURCE_PAGE_ID",
        "source": "SOURCE",                # 'AMC'|'WIKIPEDIA'
        "lang": "LANG",
        "page_id": "PAGE_ID",              # 위키 pageid (AMC는 NULL)
        "title": "TITLE",
        "url": "URL",
        "processed": "PROCESSED",          # 0/1
    }
}

# -----------------------------
# 토크나이저/형태소 (선택)
# -----------------------------
try:
    from kiwipiepy import Kiwi
    _KIWI = None
    def get_kiwi():
        """
        Windows 멀티프로세스 이슈/경고 회피를 위한 지연 초기화.
        kiwipiepy>=0.21.0 에서 num_workers=0 의미 변경 → 이전 동작 유지하려면 -1
        """
        global _KIWI
        if _KIWI is None:
            _KIWI = Kiwi(num_workers=-1)
            logger.info("[kiwi] initialized with num_workers=-1")
        return _KIWI
except Exception as e:
    logger.warning("kiwipiepy not available; falling back to regex-only filters: %s", e)
    Kiwi = None
    def get_kiwi():
        return None

# -----------------------------
# 유틸: 정규화/필터
# -----------------------------
_HANGUL = re.compile(r"[가-힣]")
_PARENS = re.compile(r"[()（）\[\]{}]")
_SPLIT_SEPS = re.compile(r"[／/·∙・・,;]|(?:\s+또는\s+)|(?:\s+혹은\s+)")
_PUNCTUATION = re.compile(r"[^\w가-힣\s]")  # 영문/숫자/한글/공백 외 제거

BAN_KEYWORDS = {
    "치료", "검사", "수술", "예방", "약물", "투약", "약제", "용량",
    "언어 치료", "음악 치료", "재활", "물리치료", "필요합니다", "진단",
    "매너", "성격", "IQ", "지능", "지도", "교육", "프로그램",
    "원인", "경과", "합병증", "예후", "관리", "주의", "생활", "훈련",
    "증가합니다", "감소합니다", "나타납니다", "필요", "필요한",
}
BAN_TOKENS_IN_SENT = {"입니다", "합니다", "됩니다", "되며", "있습니다", "없습니다", "합니다."}

SYMPTOM_SUFFIX_HINTS = {"통", "통증", "염", "장애", "증", "부전", "염증", "발열", "기침", "오한", "두통", "혈뇨", "설사", "변비", "구토", "메스꺼움"}

def normalize_text(s: str) -> str:
    """공백/기호 정리 + NFC 정규화"""
    if not s:
        return ""
    s = html.unescape(s)
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def normalize_key(s: str) -> str:
    """DB 검색/중복 판단용 Key(공백/기호 제거, 소문자)"""
    s = normalize_text(s)
    s = _PUNCTUATION.sub("", s)
    s = s.replace(" ", "").lower()
    return s

def split_aliases(raw: str) -> Tuple[str, List[str]]:
    """
    "작은 볼(협골 형성 부전)" → ("작은 볼", ["협골 형성 부전"])
    "구토/오심" → ("구토", ["오심"])
    """
    base = normalize_text(raw)
    aliases: List[str] = []

    # 괄호 안 별칭 추출
    m = re.search(r"(.+?)\s*[\(（](.+?)[\)）]", base)
    if m:
        base = normalize_text(m.group(1))
        in_paren = normalize_text(m.group(2))
        for part in _SPLIT_SEPS.split(in_paren):
            part = normalize_text(part)
            if part and part != base:
                aliases.append(part)

    # '/' 등 구분자 별칭 분리
    parts = [p for p in _SPLIT_SEPS.split(base) if normalize_text(p)]
    if len(parts) >= 2:
        base = normalize_text(parts[0])
        for p in parts[1:]:
            p = normalize_text(p)
            if p and p != base:
                aliases.append(p)

    # 중복 제거
    uniq = []
    seen = set()
    for a in aliases:
        k = normalize_key(a)
        if k and k not in seen:
            uniq.append(a)
            seen.add(k)
    return base, uniq

def plausible_symptom(s: str) -> bool:
    """
    '문장'을 걸러내고 '짧은 증상 표현'만 통과시키는 휴리스틱.
    - 길이: 2~25
    - 문장/필수 금칙어 제외
    - (선택) 형태소로 명사구 비중 점검
    """
    txt = normalize_text(s)
    if not txt:
        return False

    # 서술체/치료/진단/행동/교육류 금칙어
    low = txt.lower()
    for ban in BAN_KEYWORDS:
        if ban in low:
            logger.debug("[skip:ban] '%s' contains banned keyword '%s'", txt, ban)
            return False
    for bt in BAN_TOKENS_IN_SENT:
        if bt in txt:
            logger.debug("[skip:sent] '%s' looks like sentence (token '%s')", txt, bt)
            return False

    # 길이/문장부호/끝마침
    if not (2 <= len(txt) <= 25):
        logger.debug("[skip:len] '%s' len=%d", txt, len(txt))
        return False
    if txt.endswith(("다", ".", "요")):
        logger.debug("[skip:end] '%s' ends like a sentence", txt)
        return False

    # 한글이 하나도 없고, 영문토큰 길어도 제외 (의학 라틴어는 길어져 버림)
    if not _HANGUL.search(txt) and len(txt) > 20:
        logger.debug("[skip:latin] '%s' non-KR long token", txt)
        return False

    # 형태소 힌트(선택)
    kiwi = get_kiwi()
    if kiwi:
        tokens = kiwi.tokenize(txt)
        # 명사 비중이 전혀 없으면 제외
        if not any(t.tag.startswith("N") for t in tokens):
            logger.debug("[skip:pos] '%s' no noun-like tokens", txt)
            return False

    # 증상 접미사 힌트 (약하지만 가점)
    if not any(txt.endswith(h) for h in SYMPTOM_SUFFIX_HINTS):
        # 접미사가 없더라도 의미상 증상일 수 있어 통과시키되, 위 필터를 다 통과해야 함
        pass

    return True

# -----------------------------
# HTTP 도우미
# -----------------------------
AMC_HEADERS = {
    "User-Agent": "YAME-ETL/1.0 (+https://github.com/NamYounDong/YAME_NEXT_NEST_JS; contact: nyd6849@gmail.com)",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
}
WIKI_API = "https://ko.wikipedia.org/w/api.php"
WIKI_HEADERS = AMC_HEADERS

def rget(url: str, headers=None, params=None, rps: float = 1.0, timeout=15):
    if params:
        url = f"{url}?{urlencode(params)}"
    resp = requests.get(url, headers=headers, timeout=timeout)
    if rps > 0:
        time.sleep(1.0 / rps)
    resp.raise_for_status()
    return resp

# -----------------------------
# 파서: AMC
# -----------------------------
def parse_amc_page(url: str) -> Tuple[str, str, List[str]]:
    """
    AMC 질환백과 상세 페이지에서 (질병명, 요약, 증상리스트) 추출
    - 증상 섹션만 파싱. bullet <li>, '•/ㆍ/·' 기호/번호 매김 파악
    """
    res = rget(url, headers=AMC_HEADERS, rps=AMC_RPS)
    soup = BeautifulSoup(res.text, "html.parser")

    # 제목
    title = soup.find(["h2", "h3"], class_=re.compile("title|tit"))
    name = normalize_text(title.get_text()) if title else ""

    # 요약(있으면 메타/리드 문단)
    summary = ""
    og = soup.find("meta", property="og:description")
    if og and og.get("content"):
        summary = normalize_text(og["content"])
    if not summary:
        first_p = soup.find("p")
        if first_p:
            summary = normalize_text(first_p.get_text())

    # 증상 섹션 찾기 (섹션 헤더 텍스트에 '증상' 포함)
    symptoms: List[str] = []
    section_candidates = []
    for hx in soup.find_all(["h2", "h3", "h4"]):
        t = normalize_text(hx.get_text())
        if "증상" in t or "징후" in t or "증상과 징후" in t:
            section_candidates.append(hx)
    for sec in section_candidates:
        # 섹션 다음 형제들을 다음 헤더 전까지 훑으며 bullet/문장 리스트 수집
        for sib in sec.find_all_next():
            if sib.name in ("h2", "h3", "h4") and sib is not sec:
                break  # 다음 섹션으로 종료
            if sib.name in ("ul", "ol"):
                for li in sib.find_all("li", recursive=False):
                    txt = normalize_text(li.get_text(" "))
                    if txt:
                        symptoms.append(txt)
            elif sib.name == "p":
                # 문단 안에 'ㆍ/•/·/숫자.' 형식 bullet 텍스트 분해
                raw = normalize_text(sib.get_text(" "))
                parts = re.split(r"[•·ㆍ]|(?:\d+\.)", raw)
                for part in parts:
                    part = normalize_text(part)
                    if part:
                        symptoms.append(part)
    # 중복/공백 제거
    uniq = []
    seen = set()
    for s in symptoms:
        s = normalize_text(s)
        if not s:
            continue
        if s in seen:
            continue
        seen.add(s)
        uniq.append(s)

    return name, summary, uniq

# -----------------------------
# 파서: Wikipedia(ko)
# -----------------------------
def parse_wiki_page(title: str) -> Tuple[str, str, List[str], str]:
    """
    위키 문서에서 (표제어, 요약(리드), 증상 리스트, pageurl) 추출
    - action=parse 로 sections/wikitext/links 불러서 '증상|증후|징후' 섹션만 파싱
    """
    # 1) 기본 파싱(섹션 목록)
    p = {
        "action": "parse",
        "page": title,
        "prop": "sections|text|revid|wikitext|displaytitle|links",
        "format": "json",
        "formatversion": "2",
        "redirects": "1",
    }
    res = rget(WIKI_API, headers=WIKI_HEADERS, params=p, rps=WIKI_RPS)
    js = res.json()
    if "error" in js:
        raise RuntimeError(f"wiki error: {js['error']}")

    disp_title = js["parse"].get("displaytitle") or title
    disp_title = BeautifulSoup(disp_title, "html.parser").get_text()

    # 리드 요약: HTML text에서 첫 문단
    html_text = js["parse"]["text"]
    soup = BeautifulSoup(html_text, "html.parser")
    lead_p = soup.find("p")
    lead = normalize_text(lead_p.get_text(" ")) if lead_p else ""

    # URL
    pageid = js["parse"].get("pageid")
    pageurl = f"https://ko.wikipedia.org/?curid={pageid}" if pageid else ""

    # '증상' 섹션 찾기
    sec_index = None
    for sec in js["parse"]["sections"]:
        h = normalize_text(sec.get("line", ""))
        if any(key in h for key in ("증상", "징후", "증상과 징후")):
            sec_index = sec["index"]
            break

    symptoms: List[str] = []
    if sec_index:
        # 해당 섹션만 HTML 재호출
        p2 = {
            "action": "parse",
            "page": title,
            "prop": "text",
            "section": sec_index,
            "format": "json",
            "formatversion": "2",
        }
        res2 = rget(WIKI_API, headers=WIKI_HEADERS, params=p2, rps=WIKI_RPS)
        js2 = res2.json()
        html_sec = js2.get("parse", {}).get("text", "")
        if html_sec:
            sec_soup = BeautifulSoup(html_sec, "html.parser")
            # bullet/문단 동일 규칙
            for ul in sec_soup.find_all(["ul", "ol"]):
                for li in ul.find_all("li", recursive=False):
                    t = normalize_text(li.get_text(" "))
                    if t:
                        symptoms.append(t)
            for ptag in sec_soup.find_all("p"):
                raw = normalize_text(ptag.get_text(" "))
                parts = re.split(r"[•·ㆍ]|(?:\d+\.)", raw)
                for part in parts:
                    part = normalize_text(part)
                    if part:
                        symptoms.append(part)

    # 정리
    uniq = []
    seen = set()
    for s in symptoms:
        s = normalize_text(s)
        if s and s not in seen:
            seen.add(s)
            uniq.append(s)

    return disp_title, lead, uniq, pageurl

# -----------------------------
# DB
# -----------------------------
def get_conn():
    try:
        conn = pymysql.connect(
            host=DB_HOST, port=DB_PORT, db=DB_NAME,
            user=DB_USER, password=DB_PASSWORD,
            charset="utf8mb4", autocommit=False,
            cursorclass=DictCursor,
        )
        return conn
    except pymysql.err.OperationalError as e:
        if e.args and e.args[0] == 2059:
            logger.error("2059 인증 플러그인 불일치. 계정 plugin을 mysql_native_password "
                         "(또는 MySQL은 caching_sha2_password)로 변경하세요.")
        raise

def upsert_disease(cur, name: str, summary: str, source: str, url: str, symptoms: List[str]) -> int:
    T = DBMAP["DISEASE_MASTER"]["table"]
    C = DBMAP["DISEASE_MASTER"]
    # name+source+url 조합에 유니크 인덱스가 없을 수도 있으니, 먼저 존재 확인
    cur.execute(f"SELECT {C['id']} FROM {T} WHERE {C['name']}=%s AND {C['source']}=%s AND {C['url']}=%s",
                (name, source, url))
    row = cur.fetchone()
    sid = len(symptoms)
    if row:
        did = row[C["id"]]
        cur.execute(
            f"UPDATE {T} SET {C['summary']}=%s, {C['symptoms_json']}=%s, {C['symptom_count']}=%s "
            f"WHERE {C['id']}=%s",
            (summary, json.dumps(symptoms, ensure_ascii=False), sid, did)
        )
        return did
    else:
        cur.execute(
            f"INSERT INTO {T} ({C['name']},{C['summary']},{C['symptoms_json']},{C['source']},{C['url']},{C['symptom_count']}) "
            f"VALUES (%s,%s,%s,%s,%s,%s)",
            (name, summary, json.dumps(symptoms, ensure_ascii=False), source, url, sid)
        )
        return cur.lastrowid

def upsert_symptom(cur, name: str, aliases: List[str]) -> Tuple[int, bool]:
    """
    SYMPTOM_MASTER 업서트
    - NAME_NORM 키로 중복 방지
    - ALIASES 병합 저장
    return: (symptom_id, created?)
    """
    T = DBMAP["SYMPTOM_MASTER"]["table"]
    C = DBMAP["SYMPTOM_MASTER"]
    key_norm = normalize_key(name)

    # 기존 찾기 (name_norm 기준)
    cur.execute(f"SELECT {C['id']}, {C['aliases']}, {C['name']}, {C['name_norm']} "
                f"FROM {T} WHERE {C['name_norm']}=%s", (key_norm,))
    row = cur.fetchone()
    if row:
        sid = row[C["id"]]
        # aliases 병합
        old_aliases = []
        if row[C["aliases"]]:
            try:
                old_aliases = json.loads(row[C["aliases"]])
            except Exception:
                old_aliases = []
        merged = merge_aliases(old_aliases, aliases, base_name=row[C["name"]])
        cur.execute(
            f"UPDATE {T} SET {C['name']}=%s, {C['aliases']}=%s WHERE {C['id']}=%s",
            (name, json.dumps(merged, ensure_ascii=False), sid)
        )
        return sid, False
    else:
        cur.execute(
            f"INSERT INTO {T} ({C['name']},{C['aliases']},{C['name_norm']}) VALUES (%s,%s,%s)",
            (name, json.dumps(uniq_aliases(aliases, base_name=name), ensure_ascii=False), key_norm)
        )
        return cur.lastrowid, True

def uniq_aliases(aliases: List[str], base_name: str) -> List[str]:
    seen: Set[str] = set([normalize_key(base_name)])
    out = []
    for a in aliases or []:
        if not a: 
            continue
        k = normalize_key(a)
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(normalize_text(a))
    return out

def merge_aliases(old_aliases: List[str], new_aliases: List[str], base_name: str) -> List[str]:
    base_k = normalize_key(base_name)
    seen: Set[str] = set([base_k])
    out = []
    for lst in (old_aliases or []), (new_aliases or []):
        for a in lst:
            if not a: 
                continue
            k = normalize_key(a)
            if not k or k in seen:
                continue
            seen.add(k)
            out.append(normalize_text(a))
    return out

def link_disease_symptom(cur, disease_id: int, symptom_id: int) -> bool:
    """
    DISEASE_SYMPTOM_MAP link 생성 (있으면 무시)
    """
    T = DBMAP["DISEASE_SYMPTOM_MAP"]["table"]
    C = DBMAP["DISEASE_SYMPTOM_MAP"]
    cur.execute(
        f"SELECT 1 FROM {T} WHERE {C['disease_id']}=%s AND {C['symptom_id']}=%s",
        (disease_id, symptom_id)
    )
    if cur.fetchone():
        return False
    cur.execute(
        f"INSERT INTO {T} ({C['disease_id']},{C['symptom_id']}) VALUES (%s,%s)",
        (disease_id, symptom_id)
    )
    return True

# -----------------------------
# 추출 파이프라인
# -----------------------------
@dataclass
class PageTask:
    spid: int
    source: str      # 'AMC' | 'WIKIPEDIA'
    title: str       # wiki title or AMC title hint
    url: str

def fetch_source_queue(conn) -> List[PageTask]:
    """
    SOURCE_PAGE 에서 PROCESSED=0 항목 가져오기
    (운영 스키마에 맞춰 where절 조정해도 됨)
    """
    T = DBMAP["SOURCE_PAGE"]["table"]
    C = DBMAP["SOURCE_PAGE"]
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT {C['id']} AS spid, {C['source']} AS source, {C['title']} AS title, {C['url']} AS url "
            f"FROM {T} WHERE COALESCE({C['processed']},0)=0 ORDER BY {C['id']} ASC LIMIT 200"
        )
        rows = cur.fetchall()
    tasks = [PageTask(spid=r["spid"], source=r["source"], title=r["title"] or "", url=r["url"]) for r in rows]
    return tasks

def mark_processed(cur, spid: int):
    T = DBMAP["SOURCE_PAGE"]["table"]
    C = DBMAP["SOURCE_PAGE"]
    cur.execute(f"UPDATE {T} SET {C['processed']}=1 WHERE {C['id']}=%s", (spid,))

def select_symptom_candidates(raw_list: List[str]) -> List[Tuple[str, List[str]]]:
    """
    원시 텍스트 리스트 → (base, aliases[])로 정리 + 품질 필터 적용
    """
    out: List[Tuple[str, List[str]]] = []
    for raw in raw_list:
        base, als = split_aliases(raw)
        # bullet 문단에서 접속사/설명 제거: "흑자는 ~" 같은 문장류 제거
        # 콜론/세미콜론으로 분해 후 가장 '짧고 명사형'에 가까운 앞부분만 채택
        cand = base.split(":", 1)[0].split("–", 1)[0].split("-", 1)[0]
        cand = re.sub(r"^[①-⑳0-9\.\)\]]+\s*", "", cand)
        cand = normalize_text(cand)
        if plausible_symptom(cand):
            # alias들도 같은 필터를 적용해서 정리
            clean_aliases = []
            for a in als:
                a = normalize_text(a)
                if plausible_symptom(a):
                    clean_aliases.append(a)
            out.append((cand, clean_aliases))
        else:
            logger.debug("[skip:candidate] '%s' → '%s'", raw, cand)
    # 중복 제거 (base 기준)
    uniq = []
    seen = set()
    for base, als in out:
        k = normalize_key(base)
        if k in seen:
            continue
        seen.add(k)
        uniq.append((base, als))
    return uniq

def process_task(conn, task: PageTask):
    """
    한 페이지 처리:
      1) 페이지 파싱 → (질병명, 요약, 원시 증상들)
      2) 증상 후보 선별/정규화 + aliases 분리
      3) DISEASE_MASTER 업서트
      4) SYMPTOM_MASTER 업서트 + alias 병합
      5) DISEASE_SYMPTOM_MAP 링크 생성
    """
    with conn.cursor() as cur:
        try:
            if task.source == "AMC":
                dname, summary, raw_symptoms = parse_amc_page(task.url)
                source = "AMC"
            elif task.source == "WIKIPEDIA":
                dname, summary, raw_symptoms, pageurl = parse_wiki_page(task.title or "")
                source = "WIKIPEDIA"
                if not task.url:
                    task.url = pageurl
            else:
                logger.warning("[spid=%s] Unknown source: %s", task.spid, task.source)
                mark_processed(cur, task.spid)
                conn.commit()
                return

            dname = normalize_text(dname) or (task.title or "")
            summary = normalize_text(summary)
            candidates = select_symptom_candidates(raw_symptoms)

            # 질병 업서트
            did = upsert_disease(cur, dname, summary, source, task.url, [c[0] for c in candidates])

            # 증상 업서트 + 링크
            new_sym = 0
            link_cnt = 0
            for base, als in candidates:
                sid, created = upsert_symptom(cur, base, als)
                if created:
                    new_sym += 1
                if link_disease_symptom(cur, did, sid):
                    link_cnt += 1

            mark_processed(cur, task.spid)
            conn.commit()

            logger.info("[OK] spid=%s did=%s sym=%d new=%d link=%d", task.spid, did, len(candidates), new_sym, link_cnt)

        except Exception as e:
            conn.rollback()
            logger.exception("[ERR] spid=%s url=%s error=%s", task.spid, task.url, e)

# -----------------------------
# 메인
# -----------------------------
def main():
    logger.info("=== DISEASE ETL START ===")
    conn = get_conn()

    tasks = fetch_source_queue(conn)
    logger.info("fetched tasks: %d", len(tasks))
    if not tasks:
        logger.warning("no tasks in SOURCE_PAGE (PROCESSED=0). nothing to do.")
        return

    total = len(tasks)
    ok = 0
    for i, t in enumerate(tasks, 1):
        logger.info("(%d/%d) processing spid=%s source=%s title='%s'", i, total, t.spid, t.source, t.title)
        process_task(conn, t)
        ok += 1
    logger.info("=== DISEASE ETL DONE: %d/%d ===", ok, total)

if __name__ == "__main__":
    main()
