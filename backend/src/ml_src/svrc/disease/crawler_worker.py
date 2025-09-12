#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
crawler_worker.py
- 기능: CRAWL_QUEUE에서 항목을 하나씩 가져와(트랜잭션/락) → 원문 수집 → SOURCE_PAGE/SOURCE_SECTION에 멱등 업서트
- 포인트: 레이트리밋, 지수백오프, 해시 멱등(SHA1), 에러시 상태 업데이트

사용법 예시:
  python crawler_worker.py --mode=once --source=WIKIPEDIA
  python crawler_worker.py --mode=loop --max-items=100 --source=ANY

환경변수(.env): DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, WIKI_RPS, AMC_RPS, HTTP_TIMEOUT,
               MAX_RETRIES, BACKOFF_BASE, BACKOFF_MAX_SLEEP, DEFAULT_SOURCE
"""
from __future__ import annotations
import os, time, json, hashlib, random
from typing import Optional, List, Tuple, Dict
from urllib.parse import quote, urlparse, parse_qs, urlencode, urlunparse
import re

import requests
import pymysql
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# 로깅 모듈 import
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'config'))
from util import init_logger, get_logger

load_dotenv()

# -----------------------
# 로깅 초기화
# -----------------------
init_logger()
logger = get_logger("crawler_worker")

# -----------------------
# 설정 로딩
# -----------------------
DB = dict(
    host=os.getenv('DB_HOST','127.0.0.1'),
    port=int(os.getenv('DB_PORT','3306')),
    user=os.getenv('DB_USERNAME','root'),
    password=os.getenv('DB_PASSWORD',''),
    database=os.getenv('DB_NAME','yame'),
    charset='utf8mb4',
    autocommit=False,
    cursorclass=pymysql.cursors.DictCursor,
)

WIKI_RPS = float(os.getenv('WIKI_RPS','0.5'))   # 초당 요청 수 (0.5 => 2초당 1회)
AMC_RPS  = float(os.getenv('AMC_RPS','0.3'))    # 초당 요청 수
HTTP_TIMEOUT = int(os.getenv('HTTP_TIMEOUT','10'))
MAX_RETRIES  = int(os.getenv('MAX_RETRIES','4'))
BACKOFF_BASE = float(os.getenv('BACKOFF_BASE','1.5'))
BACKOFF_MAX_SLEEP = float(os.getenv('BACKOFF_MAX_SLEEP','30'))
DEFAULT_SOURCE = os.getenv('DEFAULT_SOURCE','ANY')

# -----------------------
# 유틸: 레이트리밋/백오프/해시
# -----------------------
class RateLimiter:
    def __init__(self, rps: float):
        self.min_interval = 1.0 / rps if rps > 0 else 0.0
        self.last_time = 0.0
    def wait(self):
        if self.min_interval <= 0: return
        now = time.time()
        delta = now - self.last_time
        if delta < self.min_interval:
            time.sleep(self.min_interval - delta)
        self.last_time = time.time()

def backoff_sleep(attempt: int):
    # 시도 0,1,2 ... → base^attempt * (1 + jitter)
    delay = min(BACKOFF_BASE ** attempt * (1 + random.random()*0.25), BACKOFF_MAX_SLEEP)
    time.sleep(delay)

def sha1_hex(text: str) -> str:
    return hashlib.sha1(text.encode('utf-8','ignore')).hexdigest()

# -----------------------
# DAO: MySQL 접근 (트랜잭션 기반)
# -----------------------
class DAO:
    def __init__(self):
        try:
            self.conn = pymysql.connect(**DB)
            logger.info(f"데이터베이스 연결 성공 - 호스트: {DB['host']}, 포트: {DB['port']}, 데이터베이스: {DB['database']}")
        except Exception as e:
            logger.error(f"데이터베이스 연결 실패 - 오류: {str(e)}")
            raise

    def begin(self):
        self.conn.begin()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    # 큐에서 하나 가져오기(락)
    def claim_queue_one(self, source_filter: Optional[str]=None):
        """PENDING 중 하나를 SELECT ... FOR UPDATE로 락을 걸고 FETCHED로 전이"""
        with self.conn.cursor() as cur:
            self.begin()
            # source_filter: 'AMC' | 'WIKIPEDIA' | None
            cond = ""
            params: List = []
            if source_filter and source_filter != 'ANY':
                cond = "AND SOURCE=%s"
                params.append(source_filter)
            # 가장 오래된/우선순위 높은 것 1건 락
            cur.execute(
                f"""
                SELECT QID, SOURCE, URL_OR_TITLE
                FROM CRAWL_QUEUE
                WHERE STATUS='PENDING' {cond}
                ORDER BY PRIORITY ASC, ENQ_AT ASC
                LIMIT 1
                FOR UPDATE
                """, params
            )
            row = cur.fetchone()
            if not row:
                self.commit()
                logger.info(f"큐에서 처리할 아이템이 없음 - 필터: {source_filter}")
                return None
            # 상태 전이
            cur.execute(
                "UPDATE CRAWL_QUEUE SET STATUS='FETCHED', DEQ_AT=NOW() WHERE QID=%s",
                (row['QID'],)
            )
            self.commit()
            logger.info(f"큐에서 아이템 가져옴 - QID: {row['QID']}, 소스: {row['SOURCE']}, 키: {row['URL_OR_TITLE']}")
            return row

    def mark_queue_error(self, qid: int, msg: str):
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE CRAWL_QUEUE SET STATUS='ERROR', ERROR_MSG=%s WHERE QID=%s",
                (msg[:480], qid)
            )
            self.conn.commit()
            logger.info(f"큐 아이템 에러 상태로 변경 - QID: {qid}, 메시지: {msg[:100]}")

    def mark_queue_skipped(self, qid: int, reason: str):
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE CRAWL_QUEUE SET STATUS='SKIPPED', ERROR_MSG=%s WHERE QID=%s",
                (reason[:480], qid)
            )
            self.conn.commit()
            logger.info(f"큐 아이템 스킵 상태로 변경 - QID: {qid}, 이유: {reason[:100]}")

    def upsert_source_page(self, rec: Dict) -> int:
        """SOURCE_PAGE 멱등 업서트. 반환: SOURCE_PAGE_ID
        - 위키: PAGE_ID/REV_ID 존재
        - AMC: PAGE_ID=0, REV_ID=0 으로 통일(UNIQUE 커버) + 해시 중복 소프트체크
        """
        with self.conn.cursor() as cur:
            # 소프트 중복 체크 (제목+해시)
            cur.execute(
                "SELECT SOURCE_PAGE_ID FROM SOURCE_PAGE WHERE SOURCE=%s AND TITLE=%s AND HASH_SHA1=%s LIMIT 1",
                (rec['SOURCE'], rec['TITLE'], rec['HASH_SHA1'])
            )
            row = cur.fetchone()
            if row:
                logger.info(f"기존 SOURCE_PAGE 발견 - SPID: {row['SOURCE_PAGE_ID']}, 제목: {rec['TITLE']}")
                return row['SOURCE_PAGE_ID']

            # 삽입 시도 (AMC는 PAGE_ID/REV_ID 0으로)
            cur.execute(
                """
                INSERT INTO SOURCE_PAGE
                (SOURCE, LANG, PAGE_ID, REV_ID, TITLE, URL, CATEGORY_PATH, RAW_WIKITEXT, RAW_HTML, HASH_SHA1, CRAWLED_AT)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
                """,
                (
                    rec['SOURCE'], rec.get('LANG','ko'), rec.get('PAGE_ID',0), rec.get('REV_ID',0),
                    rec['TITLE'], rec['URL'], rec.get('CATEGORY_PATH'),
                    rec.get('RAW_WIKITEXT'), rec.get('RAW_HTML'), rec['HASH_SHA1']
                )
            )
            spid = cur.lastrowid
            self.conn.commit()
            logger.info(f"새 SOURCE_PAGE 생성 - SPID: {spid}, 제목: {rec['TITLE']}, 소스: {rec['SOURCE']}")
            return spid

    def insert_sections(self, source_page_id: int, sections: List[Tuple[str,int,str,Optional[str]]]):
        """섹션 일괄 삽입: (SECTION_NAME, ORDER_NO, TEXT_CLEAN, TEXT_JSON)
        - 단순히 새 버전에 대해서만 삽입(페이지 버전은 SOURCE_PAGE 행으로 분리 관리)
        """
        with self.conn.cursor() as cur:
            for name, order_no, text_clean, text_json in sections:
                cur.execute(
                    """
                    INSERT INTO SOURCE_SECTION
                    (SOURCE_PAGE_ID, SECTION_NAME, ORDER_NO, TEXT_CLEAN, TEXT_JSON)
                    VALUES (%s,%s,%s,%s,%s)
                    """,
                    (source_page_id, name, order_no, text_clean, text_json)
                )
            self.conn.commit()
            logger.info(f"섹션 저장 완료 - SPID: {source_page_id}, 섹션 수: {len(sections)}")

    def log_run(self, job_name: str, source: str, status: str, rows_in: int, rows_upserted: int, rows_skipped: int):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ETL_JOB_RUNS (JOB_NAME, SOURCE, STARTED_AT, ENDED_AT, STATUS, ROWS_IN, ROWS_UPSERTED, ROWS_SKIPPED, LOG_SUMMARY)
                VALUES (%s,%s,NOW(),NOW(),%s,%s,%s,%s,%s)
                """,
                (job_name, source, status, rows_in, rows_upserted, rows_skipped, None)
            )
            self.conn.commit()
            logger.info(f"ETL 작업 실행 로그 기록 - 작업: {job_name}, 소스: {source}, 상태: {status}, 입력: {rows_in}, 업서트: {rows_upserted}, 스킵: {rows_skipped}")
    
    def load_amc_seed(self, seed_id: int):
        with self.conn.cursor() as cur:
            logger.info(f"AMC 시드 조회 시작 - ID: {seed_id}")
            cur.execute("SELECT * FROM AMC_INDEX_SEED WHERE SEED_ID=%s FOR UPDATE", (seed_id,))
            result = cur.fetchone()
            if result:
                logger.info(f"AMC 시드 로드 성공 - ID: {seed_id}, URL: {result.get('ROOT_URL', 'N/A')}, 상태: {result.get('STATUS', 'N/A')}")
            else:
                logger.warning(f"AMC 시드를 찾을 수 없음 - ID: {seed_id}")
                # 테이블 존재 여부와 전체 시드 수 확인
                try:
                    cur.execute("SELECT COUNT(*) as total FROM AMC_INDEX_SEED")
                    count_result = cur.fetchone()
                    logger.info(f"AMC_INDEX_SEED 테이블의 전체 시드 수: {count_result.get('total', 0) if count_result else 'N/A'}")
                except Exception as e:
                    logger.error(f"AMC_INDEX_SEED 테이블 조회 중 오류: {str(e)}")
            return result

    def update_amc_seed_status(self, seed_id: int, status: str, msg: str|None=None):
        with self.conn.cursor() as cur:
            cur.execute("UPDATE AMC_INDEX_SEED SET STATUS=%s, LAST_MESSAGE=%s WHERE SEED_ID=%s", (status, msg, seed_id))
            self.conn.commit()
            logger.info(f"AMC 시드 상태 업데이트 - ID: {seed_id}, 상태: {status}, 메시지: {msg}")

    def bump_amc_seed_counters(self, seed_id: int, pages:int=0, details:int=0):
        with self.conn.cursor() as cur:
            cur.execute("UPDATE AMC_INDEX_SEED SET PAGES_SCANNED=PAGES_SCANNED+%s, DETAILS_ENQUEUED=DETAILS_ENQUEUED+%s WHERE SEED_ID=%s", (pages, details, seed_id))
            self.conn.commit()
            logger.info(f"AMC 시드 카운터 업데이트 - ID: {seed_id}, 페이지: +{pages}, 상세: +{details}")

    def next_amc_todo(self, seed_id: int):
        with self.conn.cursor() as cur:
            self.begin()
            cur.execute(
                "SELECT * FROM AMC_INDEX_TODO WHERE SEED_ID=%s AND STATUS IN ('IN_PROGRESS','PENDING') ORDER BY FIELD(STATUS,'IN_PROGRESS','PENDING'), UPDATED_AT ASC LIMIT 1 FOR UPDATE",
                (seed_id,)
            )
            row = cur.fetchone()
            if not row:
                self.commit()
                logger.info(f"AMC TODO가 없음 - 시드 ID: {seed_id}")
                return None
            cur.execute("UPDATE AMC_INDEX_TODO SET STATUS='IN_PROGRESS' WHERE TODO_ID=%s", (row['TODO_ID'],))
            self.commit()
            logger.info(f"AMC TODO 가져옴 - TODO_ID: {row['TODO_ID']}, URL: {row.get('CURRENT_URL', 'N/A')}")
            return row

    def update_amc_todo(self, todo_id: int, *, current_url: str|None=None, page_no: int|None=None, next_hint: str|None=None, status: str|None=None, error: str|None=None):
        with self.conn.cursor() as cur:
            sets, params = [], []
            if current_url is not None:
                sets.append("CURRENT_URL=%s"); params.append(current_url)
            if page_no is not None:
                sets.append("PAGE_NO=%s"); params.append(page_no)
            if next_hint is not None:
                sets.append("NEXT_HINT=%s"); params.append(next_hint)
            if status is not None:
                sets.append("STATUS=%s"); params.append(status)
            if error is not None:
                sets.append("LAST_ERROR=%s"); params.append(error[:480])
            if not sets: return
            sql = f"UPDATE AMC_INDEX_TODO SET {', '.join(sets)}, UPDATED_AT=NOW() WHERE TODO_ID=%s"
            params.append(todo_id)
            cur.execute(sql, tuple(params))
            self.conn.commit()
            logger.info(f"AMC TODO 업데이트 - ID: {todo_id}, 상태: {status}, 페이지: {page_no}, URL: {current_url}")

    # Wikipedia 관련 메서드들 (임시 구현)
    def load_seed(self, seed_id: int):
        """Wikipedia 시드 로딩 - 임시 구현"""
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM WIKI_CATEGORY_SEED WHERE SEED_ID=%s FOR UPDATE", (seed_id,))
            return cur.fetchone()

    def update_seed_status(self, seed_id: int, status: str, msg: str|None=None):
        """Wikipedia 시드 상태 업데이트 - 임시 구현"""
        with self.conn.cursor() as cur:
            cur.execute("UPDATE WIKI_CATEGORY_SEED SET STATUS=%s, LAST_MESSAGE=%s WHERE SEED_ID=%s", (status, msg, seed_id))
            self.conn.commit()

    def next_todo(self, seed_id: int):
        """Wikipedia TODO 가져오기 - 임시 구현"""
        with self.conn.cursor() as cur:
            self.begin()
            cur.execute("""
                SELECT * FROM WIKI_CATEGORY_TODO
                WHERE SEED_ID=%s AND STATUS IN ('IN_PROGRESS','PENDING')
                ORDER BY FIELD(STATUS,'IN_PROGRESS','PENDING'), UPDATED_AT ASC
                LIMIT 1 FOR UPDATE
            """, (seed_id,))
            row = cur.fetchone()
            if not row:
                self.commit(); return None
            cur.execute("UPDATE WIKI_CATEGORY_TODO SET STATUS='IN_PROGRESS' WHERE TODO_ID=%s", (row['TODO_ID'],))
            self.commit(); return row

    def bump_seed_counters(self, seed_id: int, api_calls: int=0, pages: int=0, subcats: int=0):
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE WIKI_CATEGORY_SEED
                SET API_CALLS_TOTAL   = API_CALLS_TOTAL + %s,
                    PAGES_ENQUEUED    = PAGES_ENQUEUED + %s,
                    SUBCATS_DISCOVERED= SUBCATS_DISCOVERED + %s
                WHERE SEED_ID=%s
            """, (api_calls, pages, subcats, seed_id))
            self.conn.commit()

    def enqueue_wiki_title(self, title: str, lang: str = 'ko', priority: int = 5):
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO CRAWL_QUEUE (SOURCE, LANG, URL_OR_TITLE, PRIORITY)
                VALUES ('WIKIPEDIA', %s, %s, %s)
                ON DUPLICATE KEY UPDATE UPDATED_AT=UPDATED_AT
                """,
                (lang, title, priority)
            )
        self.conn.commit()

    def update_wiki_todo(self, todo_id: int, *, status: str | None = None,
                        error: str | None = None, page_continue: str | None = None):
        sets, params = [], []
        if status is not None:
            sets.append("STATUS=%s"); params.append(status)
        if error is not None:
            sets.append("LAST_ERROR=%s"); params.append(error[:480])
        if page_continue is not None:
            sets.append("PAGE_CONTINUE=%s"); params.append(page_continue)
        if not sets:
            return
        sql = f"UPDATE WIKI_CATEGORY_TODO SET {', '.join(sets)}, UPDATED_AT=NOW() WHERE TODO_ID=%s"
        params.append(todo_id)
        with self.conn.cursor() as cur:
            cur.execute(sql, tuple(params))
        self.conn.commit()

# -----------------------
# 페처: Wikipedia / AMC
# -----------------------
class WikiFetcher:
    API = 'https://ko.wikipedia.org/w/api.php'
    def __init__(self):
        self.rl = RateLimiter(WIKI_RPS)
        # WIKI 요청 헤더 설정: UA/수락 헤더(WIKI의 봇 정책 준수: 서비스/연락처 명시)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "YAME-WikiCrawler/1.0 (+dev.disease.recommend.medicine.service.thankyou; contact: nyd6849@gmail.com)",
            "Accept": "application/json",
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        })

    def fetch_title(self, title: str) -> Dict:
        # 레이트리밋
        self.rl.wait()
        # 백오프 리트라이 루프
        for attempt in range(MAX_RETRIES):
            try:
                params = {
                    'action': 'parse',
                    'page': title,
                    'prop': 'text|revid|sections|wikitext',
                    'format': 'json',
                    'formatversion': 2
                }
                res = requests.get(self.API, params=params, timeout=HTTP_TIMEOUT)
                if res.status_code >= 500 or res.status_code == 429:
                    backoff_sleep(attempt)
                    continue
                res.raise_for_status()
                data = res.json()
                if 'error' in data:
                    raise RuntimeError(str(data['error']))
                parsed = data['parse']
                html = parsed['text']
                wikitext = parsed.get('wikitext')
                revid = parsed.get('revid', 0)
                # pageid는 parse 응답에 없을 수 있어 별도 쿼리 필요하지만 생략 가능(0으로)
                pageid = 0
                url = f"https://ko.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}"
                
                
                # 해시(HTML 기준)
                h = sha1_hex(html)
                # 섹션 파싱
                sections = parse_sections_from_html(html)
                
                logger.info(f"Wikipedia 페이지 수집 시작 \n 제목: {title} \n URL: {url} \n 섹션 수: {len(sections)}, 해시: {h[:16]}")
                
                result = dict(
                    SOURCE='WIKIPEDIA', LANG='ko', PAGE_ID=pageid, REV_ID=revid,
                    TITLE=title, URL=url, CATEGORY_PATH=None,
                    RAW_WIKITEXT=wikitext, RAW_HTML=html, HASH_SHA1=h,
                    SECTIONS=sections
                )
                logger.info(f"Wikipedia 페이지 수집 완료 - 제목: {title}, 섹션 수: {len(sections)}, 해시: {h[:16]}")
                return result
            except Exception as e:
                if attempt+1 >= MAX_RETRIES:
                    raise
                backoff_sleep(attempt)

class AmcFetcher:
    def __init__(self):
        self.rl = RateLimiter(AMC_RPS)

    def fetch_url(self, url: str) -> Dict:
        self.rl.wait()
        for attempt in range(MAX_RETRIES):
            try:
                res = requests.get(url, timeout=HTTP_TIMEOUT, headers={'User-Agent':'YAME-Crawler/1.0'})
                if res.status_code >= 500 or res.status_code == 429:
                    backoff_sleep(attempt)
                    continue
                res.raise_for_status()
                html = res.text
                # 제목 추출
                soup = BeautifulSoup(html, 'lxml')
                title = soup.title.text.strip() if soup.title else url
                # 해시
                h = sha1_hex(html)
                # 섹션 파싱(공통 규칙: h2/h3 헤더 기반)
                sections = parse_sections_from_html(html)
                result = dict(
                    SOURCE='AMC', LANG='ko', PAGE_ID=0, REV_ID=0,
                    TITLE=title, URL=url, CATEGORY_PATH=None,
                    RAW_WIKITEXT=None, RAW_HTML=html, HASH_SHA1=h,
                    SECTIONS=sections
                )
                logger.info(f"AMC 페이지 수집 완료 - 제목: {title}, URL: {url}, 섹션 수: {len(sections)}, 해시: {h[:16]}")
                return result
            except Exception:
                if attempt+1 >= MAX_RETRIES:
                    raise
                backoff_sleep(attempt)

# -----------------------
# HTML → 섹션 파싱(공통)
# -----------------------
KNOWN_SECTION_KEYS = {
    '증상': '증상', '증세': '증상', '임상증상': '증상',
    '원인': '원인', '병인': '원인', '위험요인': '원인',
    '치료': '치료', '치료법': '치료', '치료와 관리': '치료',
    '예방': '예방', '합병증': '합병증', '진단': '진단', '검사': '검사',
}

def parse_sections_from_html(html: str) -> List[Tuple[str,int,str,Optional[str]]]:
    """헤더(h2/h3)를 기준으로 섹션 나누고 텍스트를 클린하여 반환
    반환: [(SECTION_NAME, ORDER_NO, TEXT_CLEAN, TEXT_JSON), ...]
    """
    soup = BeautifulSoup(html, 'lxml')

    # 모든 헤더 후보
    headers = soup.find_all(['h2','h3'])
    blocks = []

    def normalize_name(txt: str) -> str:
        t = (txt or '').strip().replace(':','').replace('·',' ')
        # 좌표/편집 링크 제거
        t = t.replace('[편집]', '').replace('편집', '').strip()
        # 매핑표 기반 표준화
        return KNOWN_SECTION_KEYS.get(t, t)

    order = 1
    for h in headers:
        name = normalize_name(h.get_text())
        # 현재 헤더부터 다음 동급 헤더 전까지 수집
        content_nodes = []
        for sib in h.next_siblings:
            if getattr(sib, 'name', None) in ['h2','h3']:
                break
            content_nodes.append(sib)
        text_clean = BeautifulSoup('\n'.join(str(n) for n in content_nodes), 'lxml').get_text('\n', strip=True)
        if not text_clean:
            continue
        blocks.append((name, order, text_clean, None))
        order += 1

    # 섹션이 하나도 없으면 본문 전체를 1섹션으로 처리
    if not blocks:
        body_text = soup.get_text('\n', strip=True)
        if body_text:
            blocks.append(('본문', 1, body_text, None))

    logger.info(f"HTML 섹션 파싱 완료 - 발견된 섹션 수: {len(blocks)}")
    return blocks


# -----------------------
# Wikipedia 카테고리 시더 (임시 구현)
# -----------------------
class WikiCategorySeeder:
    API = 'https://ko.wikipedia.org/w/api.php'
    def __init__(self, dao: DAO, seed_id: int, rps: float):
        self.dao = dao
        self.seed_id = seed_id
        self.rl = RateLimiter(rps)
        self.http = WikiHTTP(rps=rps, timeout=HTTP_TIMEOUT)
    
    def _call(self, params: dict) -> dict:
        self.rl.wait()
        for attempt in range(MAX_RETRIES):
            try:
                r = requests.get(self.API, params=params, timeout=HTTP_TIMEOUT)
                if r.status_code in (429,) or r.status_code >= 500:
                    backoff_sleep(attempt); continue
                r.raise_for_status()
                return r.json()
            except Exception:
                if attempt + 1 >= MAX_RETRIES:
                    raise
                backoff_sleep(attempt)

    def process_one_todo(self, todo: dict, depth_limit: int, include_subcats: bool) -> tuple[int, int, int, bool]:
        cat = todo['CATEGORY']            # 예: '분류:질병'
        depth = int(todo.get('DEPTH', 0))
        cont = todo.get('PAGE_CONTINUE')

        # 1) 문서(페이지) 적재
        params = {
            'action': 'query',
            'list': 'categorymembers',
            'cmtitle': cat,
            'cmtype': 'page',
            'cmnamespace': 0,
            'cmlimit': 50,
        }
        if cont:
            params['cmcontinue'] = cont

        data = self.http.get(params)      # ← requests.get 대신 사용
        api_calls = 1
        pages_enq = 0
        subcats_added = 0
        more = False

        members = (data.get('query', {}) or {}).get('categorymembers', []) or []
        for m in members:
            title = m.get('title')
            if not title:
                continue
            self.dao.enqueue_wiki_title(title, lang='ko', priority=5)
            pages_enq += 1

        cont_next = (data.get('continue', {}) or {}).get('cmcontinue')
        if cont_next:
            self.dao.update_wiki_todo(todo['TODO_ID'], page_continue=cont_next, status='IN_PROGRESS')
            more = True
        else:
            # 2) (옵션) 하위 카테고리 확장
            if include_subcats and depth < depth_limit:
                p2 = {
                    'action': 'query',
                    'list': 'categorymembers',
                    'cmtitle': cat,
                    'cmtype': 'subcat',
                    'cmlimit': 50,
                }
                data2 = self.http.get(p2)  # ← 여기서도 http.get
                api_calls += 1
                for m in (data2.get('query', {}) or {}).get('categorymembers', []) or []:
                    subcat_title = m.get('title')
                    if not subcat_title:
                        continue
                    with self.dao.conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO WIKI_CATEGORY_TODO (SEED_ID, CATEGORY, DEPTH, STATUS)
                            VALUES (%s, %s, %s, 'PENDING')
                            ON DUPLICATE KEY UPDATE UPDATED_AT=NOW()
                        """, (self.seed_id, subcat_title, depth + 1))
                    self.dao.conn.commit()
                    subcats_added += 1

            self.dao.update_wiki_todo(todo['TODO_ID'], status='DONE', page_continue=None)

        logger.info(
            f"Wikipedia TODO 처리 완료 - API 호출: {api_calls}, 페이지: {pages_enq}, 하위 카테고리: {subcats_added}, 추가: {more}"
        )
        return api_calls, pages_enq, subcats_added, more


class WikiHTTP:
    API = "https://ko.wikipedia.org/w/api.php"

    def __init__(self, rps: float = 1.0, timeout: float = 6.0, ua: str | None = None):
        self.s = requests.Session()
        # 설명력 있는 UA (이메일/레포/도메인 중 1개는 포함 권장)
        default_ua = f"YAMECrawler/0.2 (+https://your-domain-or-repo; contact: you@example.com) requests/{requests.__version__}"
        self.s.headers.update({
            "User-Agent": ua or os.getenv("WIKI_USER_AGENT", default_ua),
            "Accept": "application/json",
            "Accept-Language": "ko, en;q=0.8",
        })
        self.timeout = timeout
        self.rl = RateLimiter(rps)  # 프로젝트에 이미 있는 RateLimiter 사용

    def get(self, params: dict) -> dict:
        # 안전한 기본 파라미터 (UTF-8 강제, JSON 응답)
        base = {"format": "json", "utf8": 1}
        q = {**base, **params}

        self.rl.wait()
        for attempt in range(MAX_RETRIES):
            try:
                r = self.s.get(self.API, params=q, timeout=self.timeout)
                # 403은 봇 필터/차단일 확률 높음 → 백오프 재시도
                if r.status_code == 403:
                    logger.warning(f"[WIKI] 403 Forbidden (UA={self.s.headers.get('User-Agent')}) url={r.url}")
                    backoff_sleep(attempt)
                    continue

                r.raise_for_status()
                return r.json()
            except Exception as e:
                if attempt + 1 >= MAX_RETRIES:
                    # 마지막 시도 실패 시 상세 로깅
                    try:
                        logger.error(f"[WIKI] HTTP error final url={r.url} status={r.status_code} body={r.text[:300]}")
                    except Exception:
                        logger.error(f"[WIKI] HTTP error final (no response object) err={e}")
                    raise
                backoff_sleep(attempt)




# -----------------------
# AMC 인덱스 시더
# -----------------------
class AmcIndexSeeder:
    def __init__(self, dao: DAO, seed: dict):
        self.dao = dao
        self.seed = seed
        self.rl = RateLimiter(float(seed['RPS']))
        self.headers = {'User-Agent': 'YAME-AMC-Seeder/1.0 (contact: admin@example.com)'}

    def http_get(self, url: str) -> str:
        self.rl.wait()
        for attempt in range(MAX_RETRIES):
            try:
                r = requests.get(url, headers=self.headers, timeout=HTTP_TIMEOUT)
                if r.status_code in (429,) or r.status_code >= 500:
                    backoff_sleep(attempt); continue
                r.raise_for_status()
                return r.text
            except Exception:
                if attempt+1>=MAX_RETRIES: raise
                backoff_sleep(attempt)

    def extract_detail_links(self, base_url: str, html: str) -> list[str]:
        soup = BeautifulSoup(html, 'lxml')
        ids = set()
        out = []
        for a in soup.select('a[href*="diseaseDetail"]'):
            href = a.get('href') or ''
            abs_url = self.absolutize(base_url, href)
            p = urlparse(abs_url)
            qs = parse_qs(p.query)
            cid = (qs.get('contentId',[None])[0]) or (qs.get('dId',[None])[0])
            if not cid: 
                continue
            if cid in ids:
                continue
            ids.add(cid)
            # 정규화된 URL로 저장(파라미터 순서/여분 제거)
            out.append(f"{p.scheme}://{p.netloc}{p.path}?contentId={cid}")
        return out

    @staticmethod
    def absolutize(base: str, href: str) -> str:
        from urllib.parse import urljoin
        return urljoin(base, href)

   # imports 상단
    def next_page(self, current_url: str, html: str, page_no: int) -> tuple[str|None, int|None, str|None]:
        soup = BeautifulSoup(html, 'lxml')

        def build_url_with_page(base_url: str, param_name: str, n: int) -> str:
            p = urlparse(base_url)
            q = parse_qs(p.query)
            q[param_name or 'pageIndex'] = [str(n)]
            new_query = urlencode(q, doseq=True)
            return urlunparse((p.scheme, p.netloc, p.path, p.params, new_query, p.fragment))

        name   = (self.seed.get('QUERY_PARAM_NAME') or 'pageIndex')
        cur_no = int(page_no or self.seed.get('START_PAGE', 1))

        # 1) 마지막 페이지 번호 파싱
        last_no = None
        btn_last = soup.select_one('a.lastPageBtn[onclick*="fnList("]')
        if btn_last and btn_last.get('onclick'):
            m_last = re.search(r'fnList\((\d+)\)', btn_last['onclick'])
            if m_last: last_no = int(m_last.group(1))

        # 2) 마지막 페이지를 알고 있으면 "연속 1 증가" 전략 사용
        if last_no is not None:
            next_no = cur_no + 1
            if next_no > last_no:
                logger.info(f"AMC next_page: cur_no({cur_no}) >= last_no({last_no}) → 종료")
                return None, None, None
            next_url = build_url_with_page(current_url, name, next_no)
            if next_url == current_url:
                logger.info("AMC next_page: next_url == current_url (스톨) → 종료")
                return None, None, None
            logger.info(f"AMC next_page(seq): {current_url} → {next_url} ({cur_no}→{next_no}), last={last_no}")
            return next_url, next_no, f"seq(last={last_no})"

        # 3) 마지막 번호를 못 읽었을 때만 onclick 보조 사용
        btn_next = soup.select_one('a.nextPageBtn[onclick*="fnList("]')
        if btn_next and btn_next.get('onclick'):
            m_next = re.search(r'fnList\((\d+)\)', btn_next['onclick'])
            if m_next:
                next_no = int(m_next.group(1))
                if next_no <= cur_no:
                    logger.info(f"AMC next_page(onclick): next_no({next_no}) <= cur_no({cur_no}) → 종료")
                    return None, None, None
                next_url = build_url_with_page(current_url, name, next_no)
                if next_url == current_url:
                    logger.info("AMC next_page(onclick): 스톨 → 종료")
                    return None, None, None
                logger.info(f"AMC next_page(onclick): {current_url} → {next_url} ({cur_no}→{next_no})")
                return next_url, next_no, 'onclick-fnList'

        # 4) 어떤 힌트도 없으면 종료
        logger.info("AMC next_page: next 힌트 없음 → 종료")
        return None, None, None



    def process_one(self, todo: dict) -> tuple[int,int,bool]:
        url = todo['CURRENT_URL']
        page_no = todo['PAGE_NO']
        html = self.http_get(url)

        details = self.extract_detail_links(url, html)
        found = len(details)
        enq = 0
        logger.info(f"AMC process_one: {url} | page={page_no} | found={found}")

        # 빈 페이지면 마지막으로 판단하고 종료
        if found == 0:
            self.dao.update_amc_todo(todo['TODO_ID'], status='DONE', next_hint='no-details')
            logger.info("AMC: 상세 0개 → DONE(no-details)")
            return 0, 1, False

        for href in details:
            abs_url = self.absolutize(url, href)
            try:
                with self.dao.conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO CRAWL_QUEUE (SOURCE, LANG, URL_OR_TITLE, PRIORITY)
                        VALUES ('AMC','ko',?,5)
                        ON DUPLICATE KEY UPDATE UPDATED_AT=UPDATED_AT
                        """.replace('?', '%s'),
                        (abs_url,)
                    )
                self.dao.conn.commit(); enq += 1
            except Exception:
                self.dao.conn.rollback()

        next_url, next_no, hint = self.next_page(url, html, page_no)

        if next_url and next_url == url:
            self.dao.update_amc_todo(todo['TODO_ID'], status='DONE', next_hint='stall-guard')
            logger.info("AMC: next_url == current_url → DONE(stall-guard)")
            return enq, 1, False

        if next_url:
            self.dao.update_amc_todo(todo['TODO_ID'], current_url=next_url, page_no=(next_no or page_no), next_hint=hint)
            logger.info(f"AMC: 다음 페이지 있음 → enq={enq}, next={next_no}")
            return enq, 1, True
        else:
            self.dao.update_amc_todo(todo['TODO_ID'], status='DONE', next_hint=None)
            logger.info(f"AMC: 마지막 페이지 → enq={enq}")
            return enq, 1, False
        
        
# -----------------------
# Discovery 엔트리포인트 (WIKI / AMC)
# -----------------------

def run_discovery_generic(seed_type: str, seed_id: int, time_budget: int, max_calls: int):
    logger.info(f"Discovery Generic 시작 - 타입: {seed_type}, 시드 ID: {seed_id}, 시간 예산: {time_budget}초, 최대 호출: {max_calls}")
    dao = DAO(); start = time.time(); calls = 0
    try:
        if seed_type == 'WIKI':
            logger.info(f"Wikipedia 시드 로딩 - ID: {seed_id}")
            seed = dao.load_seed(seed_id)
            if not seed: 
                logger.error(f"Wikipedia 시드를 찾을 수 없음 - ID: {seed_id}")
                raise RuntimeError('wiki seed not found')
            logger.info(f"Wikipedia 시드 정보 - RPS: {seed['RPS']}, 깊이 제한: {seed['DEPTH_LIMIT']}, 하위 카테고리 포함: {seed['INCLUDE_SUBCATS']}")
            dao.update_seed_status(seed_id, 'RUNNING', 'started')
            seeder = WikiCategorySeeder(dao, seed_id, float(seed['RPS']))
            depth_limit = seed['DEPTH_LIMIT']; include_subcats = bool(seed['INCLUDE_SUBCATS'])
            
            
            try:
                with dao.conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) AS C FROM WIKI_CATEGORY_TODO WHERE SEED_ID=%s", (seed_id,))
                    row = cur.fetchone()
                todo_cnt = int((row or {}).get('C', 0))
                if todo_cnt == 0:
                    with dao.conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO WIKI_CATEGORY_TODO (SEED_ID, CATEGORY, DEPTH, STATUS)
                            VALUES (%s, %s, 0, 'PENDING')
                            ON DUPLICATE KEY UPDATE UPDATED_AT = NOW()
                        """, (seed_id, seed['ROOT_CATEGORY']))
                    dao.conn.commit()
                    logger.info(f"WIKI 부트스트랩: 루트 TODO 생성 - SEED_ID={seed_id}, CATEGORY={seed['ROOT_CATEGORY']}")
                else:
                    logger.info(f"WIKI 부트스트랩: 기존 TODO {todo_cnt}건 감지 - 그대로 진행")
            except Exception as e:
                dao.conn.rollback()
                logger.error(f"WIKI 부트스트랩 실패: {e}")
                # 부트스트랩 실패해도 루프는 시도 (next_todo가 None이면 곧바로 DONE 처리됨)
            # --- 부트스트랩 끝 ---
            
            logger.info("Wikipedia 처리 루프 시작")
            
            
            while True:
                if time.time()-start >= time_budget or calls >= max_calls:
                    logger.info(f"시간 예산 또는 호출 한도 도달 - 호출 수: {calls}, 경과 시간: {time.time()-start:.1f}초")
                    dao.update_seed_status(seed_id, 'PAUSED', f'paused at calls={calls}')
                    break
                todo = dao.next_todo(seed_id)
                if not todo:
                    logger.info("더 이상 처리할 TODO가 없음 - 완료")
                    dao.update_seed_status(seed_id, 'DONE', 'no more todos'); break
                logger.info(f"TODO 처리 시작 - ID: {todo.get('TODO_ID', 'N/A')}")
                api_calls, pages, subcats, more = seeder.process_one_todo(todo, depth_limit, include_subcats)
                calls += api_calls
                logger.info(f"TODO 처리 완료 - API 호출: {api_calls}, 페이지: {pages}, 하위 카테고리: {subcats}, 추가: {more}")
                dao.bump_seed_counters(seed_id, api_calls=api_calls, pages=pages, subcats=subcats)
            result = {'ok': True, 'mode':'discovery', 'type':'WIKI', 'seedId': seed_id, 'api_calls': calls}
            logger.info(f"Wikipedia Discovery 완료 - 시드 ID: {seed_id}, API 호출 수: {calls}")
            print(json.dumps(result, ensure_ascii=False))
            
            
        else:  # AMC
            logger.info(f"AMC 시드 로딩 시도 - ID: {seed_id}")
            try:
                seed = dao.load_amc_seed(seed_id)
                if not seed: 
                    logger.error(f"AMC 시드를 찾을 수 없음 - ID: {seed_id}")
                    # 데이터베이스에서 사용 가능한 시드 확인
                    with dao.conn.cursor() as cur:
                        cur.execute("SELECT SEED_ID, ROOT_URL, STATUS FROM AMC_INDEX_SEED LIMIT 5")
                        available_seeds = cur.fetchall()
                        logger.info(f"사용 가능한 AMC 시드들: {available_seeds}")
                    raise RuntimeError(f'amc seed not found: seed_id={seed_id}')
            except Exception as e:
                logger.error(f"AMC 시드 로딩 중 오류 발생 - ID: {seed_id}, 오류: {str(e)}")
                raise
            logger.info(f"AMC 시드 정보 - URL: {seed.get('ROOT_URL', 'N/A')}, 페이지네이션 모드: {seed.get('PAGINATION_MODE', 'N/A')}")
            dao.update_amc_seed_status(seed_id, 'RUNNING', 'started')
            seeder = AmcIndexSeeder(dao, seed)
            logger.info("AMC 처리 루프 시작")
            while True:
                if time.time()-start >= time_budget or calls >= max_calls:
                    logger.info(f"시간 예산 또는 호출 한도 도달 - 스캔된 페이지: {calls}, 경과 시간: {time.time()-start:.1f}초")
                    dao.update_amc_seed_status(seed_id, 'PAUSED', f'paused at pages_scanned={calls}')
                    break
                
                todo = dao.next_amc_todo(seed_id)
                
                if not todo:
                    logger.info("더 이상 처리할 AMC TODO가 없음 - 완료")
                    dao.update_amc_seed_status(seed_id, 'DONE', 'no more todos'); break
                    
                logger.info(f"AMC TODO 처리 시작 - ID: {todo.get('TODO_ID', 'N/A')}")
                
                logger.info(f"="*100)
                logger.info(f"todo: {todo}")
                details_enq, pages_scanned, more = seeder.process_one(todo)
                
                
                calls += pages_scanned
                logger.info(f"AMC TODO 처리 완료 - 스캔된 페이지: {pages_scanned}, 상세 정보 큐: {details_enq}, 추가: {more}")
                dao.bump_amc_seed_counters(seed_id, pages=pages_scanned, details=details_enq)
            result = {'ok': True, 'mode':'discovery', 'type':'AMC', 'seedId': seed_id, 'pages_scanned': calls}
            logger.info(f"AMC Discovery 완료 - 시드 ID: {seed_id}, 스캔된 페이지 수: {calls}")
            print(json.dumps(result, ensure_ascii=False))
    finally:
        dao.close()

# -----------------------
# 메인 루프
# -----------------------

def process_one(dao: DAO, source: str) -> bool:
    logger.info(f"단일 아이템 처리 시작 - 소스: {source}")
    # 1) 큐에서 한 건 가져오기
    item = dao.claim_queue_one(source_filter=source)
    if not item:
        logger.info(f"처리할 아이템이 없음 - 소스: {source}")
        return False

    qid = item['QID']; src = item['SOURCE']; key = item['URL_OR_TITLE']
    logger.info(f"큐 아이템 처리 시작 - QID: {qid}, 소스: {src}, 키: {key}")

    try:
        # 2) 원문 수집
        if src == 'WIKIPEDIA':
            logger.info(f"Wikipedia 페이지 수집 - 제목: {key}")
            rec = WikiFetcher().fetch_title(key)
        elif src == 'AMC':
            logger.info(f"AMC 페이지 수집 - URL: {key}")
            rec = AmcFetcher().fetch_url(key)
        else:
            dao.mark_queue_error(qid, f'Unsupported SOURCE={src}')
            logger.warning(f"지원하지 않는 소스 - QID: {qid}, 소스: {src}")
            return True

        # 3) SOURCE_PAGE 업서트
        logger.info(f"SOURCE_PAGE 업서트 시작 - QID: {qid}")
        spid = dao.upsert_source_page(rec)
        logger.info(f"SOURCE_PAGE 업서트 완료 - SPID: {spid}")

        # 4) 섹션 저장(새 버전에 대해서만)
        logger.info(f"섹션 저장 시작 - SPID: {spid}, 섹션 수: {len(rec.get('SECTIONS', []))}")
        dao.insert_sections(spid, rec['SECTIONS'])
        logger.info(f"섹션 저장 완료 - SPID: {spid}")

    except Exception as e:
        logger.error(f"아이템 처리 중 오류 발생 - QID: {qid}, 오류: {str(e)}")
        dao.mark_queue_error(qid, str(e))
        return True

    logger.info(f"아이템 처리 완료 - QID: {qid}")
    return True


def main():
    import argparse, sys, os
    
    logger.info("=== Crawler Worker 시작 ===")
    
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['once','loop','discovery'], default='once')
    # 기존 once/loop용
    ap.add_argument('--source', choices=['AMC','WIKIPEDIA','ANY'],
                    default=os.getenv('DEFAULT_SOURCE', 'ANY'))
    ap.add_argument('--max-items', type=int, default=10)

    # discovery 공용(WIKI/AMC)용
    ap.add_argument('--seed-type', choices=['WIKI','AMC'])
    ap.add_argument('--seed-id', type=int)
    ap.add_argument('--time-budget', type=int, default=300)      # 초 단위
    ap.add_argument('--max-api-calls', type=int, default=2000)   # 예산(위키=API호출수, AMC=페이지수로 카운트)

    args = ap.parse_args()
    
    logger.info(f"실행 모드: {args.mode}")
    logger.info(f"소스: {args.source}")
    logger.info(f"최대 아이템: {args.max_items}")

    if args.mode == 'discovery':
        logger.info(f"시드 타입: {args.seed_type}, 시드 ID: {args.seed_id}")
        logger.info(f"시간 예산: {args.time_budget}초, 최대 API 호출: {args.max_api_calls}")
        if not args.seed_type or not args.seed_id:
            logger.error('--seed-type(WIKI|AMC)와 --seed-id가 필요합니다.')
            ap.error('--seed-type(WIKI|AMC)와 --seed-id가 필요합니다.')
        logger.info(f"Discovery 모드 시작: {args.seed_type} 시드 ID {args.seed_id}")
        # 캔버스에 올려둔 함수명: run_discovery_generic(seed_type, seed_id, time_budget, max_calls)
        run_discovery_generic(args.seed_type, args.seed_id, args.time_budget, args.max_api_calls)
        logger.info("Discovery 모드 완료")
        return

    # 아래는 기존 once/loop 경로 유지
    dao = DAO()
    processed = 0; skipped = 0
    try:
        if args.mode == 'once':
            logger.info("Once 모드 시작 - 단일 아이템 처리")
            ok = process_one(dao, args.source)
            processed += 1 if ok else 0
            dao.log_run(job_name='CRAWLER', source=args.source, status='SUCCESS',
                        rows_in=processed, rows_upserted=processed, rows_skipped=skipped)
            logger.info(f"Once 모드 완료 - 처리된 아이템: {processed}")
            result = {'ok': True, 'mode': 'once', 'processed': processed}
            print(json.dumps(result, ensure_ascii=False))
        else:  # loop
            logger.info(f"Loop 모드 시작 - 최대 {args.max_items}개 아이템 처리")
            while processed < args.max_items:
                ok = process_one(dao, args.source)
                if not ok:
                    logger.info("더 이상 처리할 아이템이 없어 루프 종료")
                    break
                processed += 1
                if processed % 10 == 0:  # 10개마다 진행상황 로그
                    logger.info(f"진행상황: {processed}/{args.max_items} 처리 완료")
            dao.log_run(job_name='CRAWLER', source=args.source, status='SUCCESS',
                        rows_in=processed, rows_upserted=processed, rows_skipped=skipped)
            logger.info(f"Loop 모드 완료 - 총 처리된 아이템: {processed}")
            result = {'ok': True, 'mode': 'loop', 'processed': processed}
            print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        logger.error(f"크롤러 실행 중 오류 발생: {str(e)}")
        dao.log_run(job_name='CRAWLER', source=args.source, status='ERROR',
                    rows_in=processed, rows_upserted=processed, rows_skipped=skipped)
        result = {'ok': False, 'error': str(e)}
        logger.error(f"크롤러 실행 실패 - 오류: {str(e)}")
        print(json.dumps(result, ensure_ascii=False))
    finally:
        dao.close()
        logger.info("=== Crawler Worker 종료 ===")

if __name__ == '__main__':
    main()