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
from urllib.parse import quote


import requests
import pymysql
from bs4 import BeautifulSoup
from dotenv import load_dotenv


load_dotenv()


# -----------------------
# 설정 로딩
# -----------------------
DB = dict(
    host=os.getenv('DB_HOST','127.0.0.1'),
    port=int(os.getenv('DB_PORT','3306')),
    user=os.getenv('DB_USER','root'),
    password=os.getenv('DB_PASS',''),
    database=os.getenv('DB_NAME','yame'),
    charset='utf8mb4',
    autocommit=False,
    cursorclass=pymysql.cursors.DictCursor,
)


WIKI_RPS = float(os.getenv('WIKI_RPS','0.5')) # 초당 요청 수 (0.5 => 2초당 1회)
AMC_RPS = float(os.getenv('AMC_RPS','0.3')) # 초당 요청 수
HTTP_TIMEOUT = int(os.getenv('HTTP_TIMEOUT','10'))
MAX_RETRIES = int(os.getenv('MAX_RETRIES','4'))
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
        if self.min_interval <= 0: 
            return
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


def parse_sections_from_html(html: str) -> List[Tuple[str,int,str,Optional[str]]]:
    """HTML에서 섹션들을 파싱하여 (SECTION_NAME, ORDER_NO, TEXT_CLEAN, TEXT_JSON) 리스트 반환"""
    soup = BeautifulSoup(html, 'html.parser')
    blocks = []
    
    # h2, h3, h4 태그들을 찾아서 섹션으로 처리
    for i, heading in enumerate(soup.find_all(['h2', 'h3', 'h4']), 1):
        section_name = heading.get_text().strip()
        if not section_name:
            continue
            
        # 다음 헤딩까지의 내용을 수집
        content_parts = []
        for sibling in heading.find_next_siblings():
            if sibling.name in ['h2', 'h3', 'h4']:
                break
            content_parts.append(sibling.get_text().strip())
        
        content_text = '\n'.join(content_parts).strip()
        if content_text:
            blocks.append((section_name, i, content_text, None))
    
    return blocks


# -----------------------
# DAO 클래스
# -----------------------
class DAO:
    def __init__(self):
        self.conn = pymysql.connect(**DB)
    
    def close(self):
        if self.conn:
            self.conn.close()
    
    def claim_queue_one(self, source_filter: str = 'ANY') -> Optional[Dict]:
        """큐에서 한 건을 가져와서 CLAIMED 상태로 변경 (트랜잭션/락)"""
        with self.conn.cursor() as cur:
            # 트랜잭션 시작
            self.conn.begin()
            
            # 조건에 맞는 항목 찾기
            if source_filter == 'ANY':
                cur.execute("""
                    SELECT QID, SOURCE, URL_OR_TITLE FROM CRAWL_QUEUE 
                    WHERE STATUS = 'PENDING' 
                    ORDER BY PRIORITY DESC, CREATED_AT ASC 
                    LIMIT 1 FOR UPDATE
                """)
            else:
                cur.execute("""
                    SELECT QID, SOURCE, URL_OR_TITLE FROM CRAWL_QUEUE 
                    WHERE STATUS = 'PENDING' AND SOURCE = %s
                    ORDER BY PRIORITY DESC, CREATED_AT ASC 
                    LIMIT 1 FOR UPDATE
                """, (source_filter,))
            
            item = cur.fetchone()
            if not item:
                self.conn.rollback()
                return None
            
            # 상태를 CLAIMED로 변경
            cur.execute("""
                UPDATE CRAWL_QUEUE 
                SET STATUS = 'CLAIMED', CLAIMED_AT = NOW() 
                WHERE QID = %s
            """, (item['QID'],))
            
            self.conn.commit()
            return item
    
    def mark_queue_success(self, qid: int):
        """큐 항목을 SUCCESS 상태로 변경"""
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE CRAWL_QUEUE 
                SET STATUS = 'SUCCESS', COMPLETED_AT = NOW() 
                WHERE QID = %s
            """, (qid,))
            self.conn.commit()
    
    def mark_queue_error(self, qid: int, error_msg: str):
        """큐 항목을 ERROR 상태로 변경"""
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE CRAWL_QUEUE 
                SET STATUS = 'ERROR', ERROR_MSG = %s, COMPLETED_AT = NOW() 
                WHERE QID = %s
            """, (error_msg, qid))
            self.conn.commit()
    
    def upsert_source_page(self, rec: Dict) -> int:
        """SOURCE_PAGE에 멱등 업서트 (HASH_SHA1 기준)"""
        with self.conn.cursor() as cur:
            # 기존 레코드 확인
            cur.execute("""
                SELECT SPID FROM SOURCE_PAGE 
                WHERE SOURCE = %s AND HASH_SHA1 = %s
            """, (rec['SOURCE'], rec['HASH_SHA1']))
            
            existing = cur.fetchone()
            if existing:
                return existing['SPID']
            
            # 새 레코드 삽입
            cur.execute("""
                INSERT INTO SOURCE_PAGE
                (SOURCE, LANG, PAGE_ID, REV_ID, TITLE, URL, CATEGORY_PATH, RAW_WIKITEXT, RAW_HTML, HASH_SHA1, CRAWLED_AT)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
            """, (
                rec['SOURCE'], rec.get('LANG','ko'), rec.get('PAGE_ID',0), rec.get('REV_ID',0),
                rec['TITLE'], rec['URL'], rec.get('CATEGORY_PATH'),
                rec.get('RAW_WIKITEXT'), rec.get('RAW_HTML'), rec['HASH_SHA1']
            ))
            spid = cur.lastrowid
            self.conn.commit()
            return spid
    
    def insert_sections(self, source_page_id: int, sections: List[Tuple[str,int,str,Optional[str]]]):
        """섹션 일괄 삽입: (SECTION_NAME, ORDER_NO, TEXT_CLEAN, TEXT_JSON)
        - 단순히 새 버전에 대해서만 삽입(페이지 버전은 SOURCE_PAGE 행으로 분리 관리)
        """
        with self.conn.cursor() as cur:
            for name, order_no, text_clean, text_json in sections:
                cur.execute("""
                    INSERT INTO SOURCE_SECTION
                    (SOURCE_PAGE_ID, SECTION_NAME, ORDER_NO, TEXT_CLEAN, TEXT_JSON)
                    VALUES (%s,%s,%s,%s,%s)
                """, (source_page_id, name, order_no, text_clean, text_json))
            self.conn.commit()
    
    def log_run(self, job_name: str, source: str, status: str, rows_in: int, rows_upserted: int, rows_skipped: int):
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ETL_JOB_RUNS (JOB_NAME, SOURCE, STARTED_AT, ENDED_AT, STATUS, ROWS_IN, ROWS_UPSERTED, ROWS_SKIPPED, LOG_SUMMARY)
                VALUES (%s,%s,NOW(),NOW(),%s,%s,%s,%s,%s)
            """, (job_name, source, status, rows_in, rows_upserted, rows_skipped, None))
            self.conn.commit()


# -----------------------
# Fetcher 클래스들
# -----------------------
class WikiFetcher:
    def __init__(self):
        self.API = "https://ko.wikipedia.org/w/api.php"
        self.rl = RateLimiter(WIKI_RPS)
    
    def fetch_title(self, title: str) -> Dict:
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
                return dict(
                    SOURCE='WIKIPEDIA', LANG='ko', PAGE_ID=pageid, REV_ID=revid,
                    TITLE=title, URL=url, CATEGORY_PATH=None,
                    RAW_WIKITEXT=wikitext, RAW_HTML=html, HASH_SHA1=h,
                    SECTIONS=sections
                )
            except Exception as e:
                if attempt+1 >= MAX_RETRIES:
                    raise
                backoff_sleep(attempt)


class AmcFetcher:
    def __init__(self):
        self.rl = RateLimiter(AMC_RPS)
    
    def fetch_url(self, url: str) -> Dict:
        self.rl.wait()
        # 백오프 리트라이 루프
        for attempt in range(MAX_RETRIES):
            try:
                res = requests.get(url, timeout=HTTP_TIMEOUT)
                if res.status_code >= 500 or res.status_code == 429:
                    backoff_sleep(attempt)
                    continue
                res.raise_for_status()
                
                soup = BeautifulSoup(res.text, 'html.parser')
                
                # 제목 추출
                title_elem = soup.find('h1') or soup.find('title')
                title = title_elem.get_text().strip() if title_elem else url
                
                # 본문 추출 (간단한 방식)
                body_text = ""
                body_elem = soup.find('div', class_='content') or soup.find('main') or soup.find('article')
                if body_elem:
                    body_text = body_elem.get_text().strip()
                
                # 해시(HTML 기준)
                h = sha1_hex(res.text)
                
                # 섹션 파싱
                sections = parse_sections_from_html(res.text)
                if body_text:
                    sections.append(('본문', 1, body_text, None))
                
                return dict(
                    SOURCE='AMC', LANG='ko', PAGE_ID=0, REV_ID=0,
                    TITLE=title, URL=url, CATEGORY_PATH=None,
                    RAW_WIKITEXT=None, RAW_HTML=res.text, HASH_SHA1=h,
                    SECTIONS=sections
                )
            except Exception as e:
                if attempt+1 >= MAX_RETRIES:
                    raise
                backoff_sleep(attempt)


# -----------------------
# 메인 루프
# -----------------------


def process_one(dao: DAO, source: str) -> bool:
    # 1) 큐에서 한 건 가져오기
    item = dao.claim_queue_one(source_filter=source)
    if not item:
        return False

    qid = item['QID']; src = item['SOURCE']; key = item['URL_OR_TITLE']

    try:
        # 2) 원문 수집
        if src == 'WIKIPEDIA':
            rec = WikiFetcher().fetch_title(key)
        elif src == 'AMC':
            rec = AmcFetcher().fetch_url(key)
        else:
            dao.mark_queue_error(qid, f'Unsupported SOURCE={src}')
            return True

        # 3) SOURCE_PAGE 업서트
        spid = dao.upsert_source_page(rec)

        # 4) 섹션 저장(새 버전에 대해서만)
        dao.insert_sections(spid, rec['SECTIONS'])

        # 5) 큐 상태를 SUCCESS로 변경
        dao.mark_queue_success(qid)

    except Exception as e:
        dao.mark_queue_error(qid, str(e))
        return True

    return True


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', choices=['once','loop'], default='once')
    ap.add_argument('--max-items', type=int, default=10)
    ap.add_argument('--source', choices=['AMC','WIKIPEDIA','ANY'], default=DEFAULT_SOURCE)
    args = ap.parse_args()

    dao = DAO()
    processed = 0; skipped = 0
    try:
        if args.mode == 'once':
            ok = process_one(dao, args.source)
            processed += 1 if ok else 0
        else:
            # loop 모드: max-items까지 처리, 큐가 비면 종료
            while processed < args.max_items:
                ok = process_one(dao, args.source)
                if not ok:
                    break
                processed += 1
        # 실행 로그(간단)
        dao.log_run(job_name='CRAWLER', source=args.source, status='SUCCESS', rows_in=processed, rows_upserted=processed, rows_skipped=skipped)
        # 최종 요약(JSON 라인) — Nest가 파싱하여 표시
        print(json.dumps({'ok': True, 'stats': {'processed': processed, 'skipped': skipped}}, ensure_ascii=False))
    finally:
        dao.close()


if __name__ == '__main__':
    main()