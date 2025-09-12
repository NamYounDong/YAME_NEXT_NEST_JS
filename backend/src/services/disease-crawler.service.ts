/**
 * 질병 정보 크롤링 서비스
 * 
 * 이 서비스는 의료 관련 질병 정보를 수집하고 관리하는 핵심 기능을 담당합니다.
 * 
 * 주요 역할:
 * 1. 질병 데이터 수집: 외부 API나 웹사이트에서 질병 관련 정보를 자동으로 수집
 * 2. 데이터 정제: 수집된 원시 데이터를 정제하고 구조화된 형태로 변환
 * 3. 데이터베이스 저장: 정제된 데이터를 데이터베이스에 저장하여 시스템에서 활용
 * 4. 스케줄링: 정기적인 데이터 수집을 위한 스케줄링 기능
 * 
 * 사용 사례:
 * - 새로운 질병 정보 업데이트
 * - 기존 질병 데이터의 정확성 검증
 * - 의료진을 위한 최신 질병 정보 제공
 * 
 * 기술적 특징:
 * - 비동기 처리로 대용량 데이터 수집 지원
 * - 에러 처리 및 재시도 로직 포함
 * - 로깅을 통한 수집 과정 모니터링
 */
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as path from 'path';
import * as readline from 'readline';
import { spawn } from 'child_process';
import { ConfigService } from '@nestjs/config';
import { DataCrawlerMapper } from 'src/database/data-crawler.mapper';

@Injectable()
export class DiseaseCrawlerService {
  
  constructor(
    private configService: ConfigService,
    private dataCrawlerMapper: DataCrawlerMapper
  ) {}


  private readonly logger = new Logger(DiseaseCrawlerService.name);
  private readonly BASE = 'https://www.amc.seoul.kr';

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchHtml(url: string): Promise<string> {
    const { data } = await axios.get(url, { timeout: 5000 });
    return data;
  }

  // 1. 질병 리스트 페이지 파싱
  private async getDiseaseListFromPage(page = 1): Promise<{ id: string; name: string }[]> {
    const url = `${this.BASE}/asan/healthinfo/disease/diseaseList.do?pageIndex=${page}`;
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const results: { id: string; name: string }[] = [];

    $('.descBox li>div>strong>a').each((_, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      const match = href?.match(/contentId=(\d+)/);
      if (match) {
        results.push({ id: match[1], name });
      }
    });

    return results;
  }

  // 2. 상세 페이지에서 설명, 증상, 동의어, 진료과 등 파싱
  private async parseDiseaseDetail(contentId: string): Promise<any> {
    const url = `${this.BASE}/asan/healthinfo/disease/diseaseDetail.do?contentId=${contentId}`;
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('.contTitle').text().trim();
    const nameMatch = title.match(/^(.+?)\((.+?)\)$/); // ex) 가스 괴저(Gas gangrene)

    const disease_name_kor = nameMatch?.[1]?.trim() || title;
    const disease_name_eng = nameMatch?.[2]?.trim() || '';

    const $dl = $('.contBox>dl');
    const descriptionChunks: string[] = [];
    const symptoms: string[] = [];
    const synonyms: string[] = [];
    const related_diseases: string[] = [];
    const departments: string[] = [];

    let lastDt = '';


    $dl.children().each((_, el) => {
      const tag = $(el)[0].tagName.toLowerCase();
      if (tag === 'dt') {
        lastDt = $(el).text().trim();
      } else if (tag === 'dd') {
        const content = $(el).text().trim().replace(/\n/g, '').replace(/\t/g, '').replace(/\r/g, '');
        if (!content) return;
        descriptionChunks.push(`■ ${lastDt}\n${content}`);
        switch (lastDt) {
          case '증상':
            $(el).find('a').each((_, a) => {
              const s = $(a).text().trim();
              if (s) symptoms.push(s);
            });
            break;

          case '진료과':
            $(el).find('a').each((_, a) => {
              const dept = $(a).text().trim();
              if (dept) departments.push(dept);
            });
            break;

          case '관련질환':
            $(el).find('a').each((_, a) => {
              const r = $(a).text().trim();
              if (r) related_diseases.push(r);
            });
            break;

          case '동의어':
            content.split(',').forEach((s) => {
              const synonym = s.trim();
              if (synonym) synonyms.push(synonym);
            });
            break;
        }
      }
    });

    return {
      content_id: contentId,
      disease_name_kor,
      disease_name_eng,
      description: descriptionChunks.join('\n\n'),
      symptoms: [...new Set(symptoms)],
      symptom_text: [...new Set(symptoms)].join(', '),
      departments: [...new Set(departments)],
      related_diseases: [...new Set(related_diseases)],
      synonyms: [...new Set(synonyms)],
      source_url: url,
    };
  }

  // 3. 전체 수집기 실행
  async runFullCrawl(maxPage = 64): Promise<any[]> {
    const allResults = [];

    for (let page = 1; page <= maxPage; page++) {
      const diseaseList = await this.getDiseaseListFromPage(page);
      if (!diseaseList.length) break;

      for (const disease of diseaseList) {
        try {
          const detail = await this.parseDiseaseDetail(disease.id);
          allResults.push(detail);

          const sleepMs = 1000 + Math.floor(Math.random() * 1000);
          this.logger.log(`⏱️ Sleep ${sleepMs}ms after contentId=${disease.id}`);
          await this.sleep(sleepMs);
        } catch (err) {
          this.logger.error(`❌ Failed to parse contentId=${disease.id}`, err);
        }
      }

      await this.sleep(2000); // 페이지 간 sleep
    }

    this.logger.log(`✅ 전체 수집 완료. 총 ${allResults.length}건`);

    await this.saveAnSanHpCrawlerDiseaseData(allResults);
    
    return allResults;
  }

  private async saveAnSanHpCrawlerDiseaseData(data: any[]): Promise<number> {
    return await this.dataCrawlerMapper.saveAnSanHpCrawlerDiseaseData(data);
  }




  /**
   * 나무위키 덤프 데이터를 수집합니다.
   * @returns 나무위키 덤프 데이터
   */
  // 스크립트 경로: 프로젝트 루트에 있다고 가정
  private readonly scriptPath = path.resolve(process.cwd(), 'src/services/py/disease_dump_extract_and_load.py');
  private readonly pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  private readonly defaultDump = process.env.NAMUWIKI_DUMP_PATH || 'namuwiki_20220301.jsonl.gz';
  


  private buildArgs(opts: RunOptions) {

    this.logger.log(`runNamuwikiDumpCrawl buildArgs scriptPath: ${this.scriptPath}`);
    const args = [
      this.scriptPath,
      '--dump', opts.dumpPath || this.defaultDump,
      '--mode', 'mysql',                 // 스크립트가 DB 저장까지 수행
      '--mysql-host', this.configService.get<string>('DB_HOST', 'localhost'),
      '--mysql-port', String(this.configService.get<number>('DB_PORT', 3306)),
      '--mysql-user', this.configService.get<string>('DB_USERNAME', 'root'),
      '--mysql-pass', this.configService.get<string>('DB_PASSWORD', 'password'),
      '--mysql-db', this.configService.get<string>('DB_DATABASE', 'yame'),
      '--batch-size', String(process.env.BATCH_SIZE || 500),
    ];


    this.logger.log(`runNamuwikiDumpCrawl buildArgs args: ${args}`);

    if (opts.createTable) args.push('--create-table'); // 테이블 없으면 생성
    return args;
  }
  /**
   * 스크립트 실행만 담당 (stdout에서 마지막 요약 JSON 한 줄만 파싱)
   */
  async runNamuwikiDumpCrawl(opts: RunOptions) {
    const args = this.buildArgs(opts);
    this.logger.log(`Running python: ${this.pythonBin} ${args.join(' ')}`);

    let summary: any = null; // 스크립트가 마지막에 {"ok": true, "inserted_or_upserted": N}
    const proc = spawn(this.pythonBin, args, { cwd: process.cwd(), env: process.env });

    const rlOut = readline.createInterface({ input: proc.stdout });
    rlOut.on('line', (line) => {
      // 진행 로그는 무시하고, JSON형 라인이면 마지막 요약으로 저장
      try {
        const obj = JSON.parse(line);
        if (obj && typeof obj === 'object' && ('ok' in obj || 'inserted_or_upserted' in obj)) {
          summary = obj;
        }
      } catch {
        // 평소에는 파서가 많은 텍스트를 안 찍지만, 찍어도 그냥 통과
      }
    });

    const rlErr = readline.createInterface({ input: proc.stderr });
    rlErr.on('line', (line) => this.logger.log(`[py] ${line}`));

    const exitCode: number = await new Promise((resolve, reject) => {
      proc.on('error', reject);
      proc.on('close', (code) => resolve(code ?? -1));
    });

    if (exitCode !== 0) {
      throw new Error(`Python exited with code ${exitCode}. 스크립트/환경 설정을 확인하세요.`);
    }

    // 요약이 없으면 대략 성공만 반환
    return {
      success: true,
      dumpPath: opts.dumpPath || this.defaultDump,
      args,
      summary: summary ?? { note: '스크립트가 요약 JSON을 출력하지 않았습니다.' },
    };
  }






  // 큐 등록(멱등): SOURCE + URL_OR_TITLE 유니크
  async enqueue(source: 'AMC'|'WIKIPEDIA', urlOrTitle: string, priority = 5) {
    return this.dataCrawlerMapper.enqueue(source, urlOrTitle, priority);
  }

  // 큐 상태 요약
  async queueStats() {
    return this.dataCrawlerMapper.queueStats();
  }

  // 최근 ETL 실행 로그
  async recentRuns(limit = 20) {
    return this.dataCrawlerMapper.recentRuns(limit);
  }

  // Python 워커 실행 — once/loop 모드
  async runWorker(mode: 'once'|'loop'='once', maxItems = 10, source?: 'AMC'|'WIKIPEDIA'|'ANY') {
    const py = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    const worker = process.env.PY_WORKER_PATH || './src/ml_src/svrc/disease/crawler_worker.py';
    const args = [worker, `--mode=${mode}`, `--source=${source}`, `--max-items=${maxItems}`];

    this.logger.log(`Spawn worker : ${py} ${args.join(' ')}`);

    return new Promise((resolve) => {
      const proc = spawn(py, args, { 
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        shell: process.platform === 'win32'
      });
      let summary: any = null;
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (buf) => {
        const text = buf.toString('utf8');
        stdout += text;
        try { 
          summary = JSON.parse(text); 
        } catch { 
          this.logger.log(`[worker] ${text.trim()}`); 
        }
      });
      
      proc.stderr.on('data', (buf) => {
        const text = buf.toString('utf8');
        stderr += text;
        this.logger.warn(`[worker:err] ${text.trim()}`);
      });
      
      proc.on('close', (code) => {
        this.logger.log(`[worker] Process exited with code: ${code}`);
        if (code !== 0) {
          this.logger.error(`[worker] STDOUT: ${stdout}`);
          this.logger.error(`[worker] STDERR: ${stderr}`);
        }
        resolve({ success: code === 0, summary, stdout, stderr });
      });
      
      proc.on('error', (error) => {
        this.logger.error(`[worker] Process error: ${error.message}`);
        resolve({ success: false, error: error.message });
      });
    });

    
    // const py = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    // const worker = process.env.PY_WORKER_PATH || './src/ml_src/svrc/disease/crawler_worker.py';
  
  
    // // 인자 구성
    // const args = [worker, `--mode=${mode}`, `--max-items=${maxItems}`];
    // if (source) args.push(`--source=${source}`);
    
    
    // this.logger.log(`Spawn: ${py} ${args.join(' ')}`);
    
    
    // return new Promise<{success:boolean, summary?:any}>((resolve) => {
    //   const proc = spawn(py, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      
      
    //   let summary: any = null; // 워커가 마지막에 JSON 요약 라인 출력
      
      
    //   proc.stdout.on('data', (buf) => {
    //     const text = buf.toString('utf8');
    //     // JSON 라인 캐치(요약)
    //     text.split('\n').forEach((line) => {
          
    //       if (!line.trim()) return;

    //       try {
    //         const obj = JSON.parse(line);
    //       if (obj && typeof obj === 'object' && (obj.ok || obj.stats)) summary = obj;
    //       } catch (_) {
    //         // 평소엔 로그 텍스트 — 필요시 logger로 넘김
    //         this.logger.log(`[py] ${line.trim()}`);
    //       }
    //     });
    //   });
    
    
    //   proc.stderr.on('data', (buf) => {
    //     this.logger.warn(`[py:err] ${buf.toString('utf8').trim()}`);
    //   });
      
      
    //   proc.on('close', (code) => {
    //     this.logger.log(`Worker exit code=${code}`);
    //     resolve({ success: code === 0, summary });
    //   });
    // });
  }


  async createWikiCategorySeed(category: string, depthLimit: number, includeSubcats: boolean, rps: number) {
    const row = await this.dataCrawlerMapper.createWikiCategorySeed(category, depthLimit, includeSubcats, rps);
    // 마리아 DB 드라이버가 insert 문 전달 시 auto_increment 컬럼이 있으면 다음과 같은 형태로 반환 해줌 
    // row { affectedRows: 1, insertId: 7n, warningStatus: 0 }
    const seedId = Number(row.insertId); 
    
    await this.dataCrawlerMapper.createWikiCategoryTodo(seedId, category);
    return { success: true, seedId };
  }

  async createAmcIndexSeed(b: { rootUrl: string; paginationMode: string; queryParamName: string; startPage: number; cssNextSelector: string; rps: number }) {
    const row = await this.dataCrawlerMapper.createAmcIndexSeed(b);
    // 마리아 DB 드라이버가 insert 문 전달 시 auto_increment 컬럼이 있으면 다음과 같은 형태로 반환 해줌 
    // row { affectedRows: 1, insertId: 7n, warningStatus: 0 }
    const seedId = Number(row.insertId); 

    // // 최초 TODO — CURRENT_URL=ROOT_URL, PAGE_NO=START_PAGE
    await this.dataCrawlerMapper.createAmcIndexTodo(seedId, b.rootUrl, b.startPage);
    return { success: true, seedId };
  }

  async seedStatus(type: 'WIKI'|'AMC', seedId: number) {
    if (type === 'WIKI') {
      const seed = await this.dataCrawlerMapper.getWikiCategorySeed(seedId);
      const todos = await this.dataCrawlerMapper.getWikiCategoryTodo(seedId);
      return { seed, todos };
    } else {
      const seed = await this.dataCrawlerMapper.getAmcIndexSeed(seedId);
      const todos = await this.dataCrawlerMapper.getAmcIndexTodo(seedId);
      return { seed, todos };
    }
  }

  runSeeder(type: 'WIKI'|'AMC', seedId: number, timeBudgetSec: number, maxApiCalls: number) {
    const py = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    const worker = process.env.PY_WORKER_PATH || './src/ml_src/svrc/disease/crawler_worker.py';
    const args = [worker, `--mode=discovery`, `--seed-type=${type}`, `--seed-id=${seedId}`, `--time-budget=${timeBudgetSec}`, `--max-api-calls=${maxApiCalls}`];

    this.logger.log(`Spawn seeder: ${py} ${args.join(' ')}`);

    return new Promise((resolve) => {
      const proc = spawn(py, args, { 
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        shell: process.platform === 'win32'
      });
      let summary: any = null;
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (buf) => {
        const text = buf.toString('utf8');
        stdout += text;
        try { 
          summary = JSON.parse(text); 
        } catch { 
          this.logger.log(`[seeder] ${text.trim()}`); 
        }
      });
      
      proc.stderr.on('data', (buf) => {
        const text = buf.toString('utf8');
        stderr += text;
        this.logger.warn(`[seeder:err] ${text.trim()}`);
      });
      
      proc.on('close', (code) => {
        this.logger.log(`[seeder] Process exited with code: ${code}`);
        if (code !== 0) {
          this.logger.error(`[seeder] STDOUT: ${stdout}`);
          this.logger.error(`[seeder] STDERR: ${stderr}`);
        }
        resolve({ success: code === 0, summary, stdout, stderr });
      });
      
      proc.on('error', (error) => {
        this.logger.error(`[seeder] Process error: ${error.message}`);
        resolve({ success: false, error: error.message });
      });
    });
  }
  


}

interface RunOptions {
  createTable?: boolean;
  dumpPath?: string;
}