/**
 * 데이터 크롤링 수집 관련 데이터베이스 작업을 위한 Mapper 클래스
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { BaseMapper } from './base.mapper';

@Injectable()
export class DataCrawlerMapper extends BaseMapper {
    private readonly logger = new Logger(DataCrawlerMapper.name);

    constructor(databaseService: DatabaseService) {
        super(databaseService);
    }

    async saveAnSanHpCrawlerDiseaseData(data: any[]): Promise<number> {
        try {
            if (data.length === 0) return 0;

            const query = `
                INSERT INTO DISEASE_MASTER (
                    DISEASE_ID, DISEASE_NAME_KOR, DISEASE_NAME_ENG, SYMPTOMS, DESCRIPTION, SOURCE_URL, CREATED_AT
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, NOW()
                )
                ON DUPLICATE KEY UPDATE
                    DISEASE_NAME_KOR = VALUES(DISEASE_NAME_KOR),
                    DISEASE_NAME_ENG = VALUES(DISEASE_NAME_ENG),
                    SYMPTOMS = VALUES(SYMPTOMS),
                    DESCRIPTION = VALUES(DESCRIPTION),
                    SOURCE_URL = VALUES(SOURCE_URL),
                    CREATED_AT = VALUES(CREATED_AT)
            `;

            const values = data.map(item => [
                item.content_id,
                item.disease_name_kor,
                item.disease_name_eng,
                item.symptom_text,
                item.description,
                item.source_url
            ]);
 
            return await this.batchExecute(query, values);
        }
        catch (error) {
            this.logger.error(`데이터 크롤링 수집 데이터 저장 실패: ${JSON.stringify(data[0])}`);
            throw error;
        }
    }



    async enqueue(source: 'AMC'|'WIKIPEDIA', urlOrTitle: string, priority = 5) {
        const sql = `
          INSERT INTO CRAWL_QUEUE (SOURCE, LANG, URL_OR_TITLE, PRIORITY)
          VALUES (?, 'ko', ?, ?)
          ON DUPLICATE KEY UPDATE PRIORITY = LEAST(PRIORITY, VALUES(PRIORITY))`;
        await this.executeQuery(sql, [source, urlOrTitle, priority]);
        return { ok: true };
    }


    async queueStats() {
        const sql = `
          SELECT STATUS, COUNT(*) CNT FROM CRAWL_QUEUE GROUP BY STATUS ORDER BY STATUS`;
        return await this.executeQuery(sql);
    }

    async recentRuns(limit = 20) {
        const sql = `
          SELECT RUN_ID, JOB_NAME, SOURCE, STARTED_AT, ENDED_AT, STATUS, ROWS_IN, ROWS_UPSERTED, ROWS_SKIPPED
          FROM ETL_JOB_RUNS ORDER BY RUN_ID DESC LIMIT ?`;
        return await this.executeQuery(sql, [limit]);
    }



    async getWikiCategorySeed(seedId: number) {
        const sql = `
          SELECT * FROM WIKI_CATEGORY_SEED WHERE SEED_ID=?`;
        return await this.executeQuery(sql, [seedId]);
    }

    async getWikiCategoryTodo(seedId: number) {
        const sql = `
          SELECT * FROM WIKI_CATEGORY_TODO WHERE SEED_ID=?`;
        return await this.executeQuery(sql, [seedId]);
    }

    async getAmcIndexSeed(seedId: number) {
        const sql = `
          SELECT * FROM AMC_INDEX_SEED WHERE SEED_ID=?`;
        return await this.executeQuery(sql, [seedId]);
    }

    async getAmcIndexTodo(seedId: number) {
        const sql = `
          SELECT * FROM AMC_INDEX_TODO WHERE SEED_ID=?`;
        return await this.executeQuery(sql, [seedId]);
    }

    async createWikiCategorySeed(category: string, depthLimit: number, includeSubcats: boolean, rps: number) {
        const sql = `
          INSERT INTO WIKI_CATEGORY_SEED (ROOT_CATEGORY, DEPTH_LIMIT, INCLUDE_SUBCATS, RPS, STATUS)
          VALUES (?, ?, ?, ?, 'PENDING')`;
        return await this.executeQuery(sql, [category, depthLimit, includeSubcats ? 1 : 0, rps]);
    }
    
    async createWikiCategoryTodo(seedId: number, category: string) {
        const sql = `
          INSERT INTO WIKI_CATEGORY_TODO (SEED_ID, CATEGORY, DEPTH, STATUS)
          VALUES (?, ?, 0, 'PENDING')`;
        return await this.executeQuery(sql, [seedId, category]);
    }
    
    async createAmcIndexSeed(b: { rootUrl: string; paginationMode: string; queryParamName: string; startPage: number; cssNextSelector: string; rps: number }) {
        const sql = `
          INSERT INTO AMC_INDEX_SEED (ROOT_URL, PAGINATION_MODE, QUERY_PARAM_NAME, START_PAGE, CSS_NEXT_SELECTOR, RPS, STATUS)
          VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`;
        return await this.executeQuery(sql, [b.rootUrl, b.paginationMode, b.queryParamName, b.startPage, b.cssNextSelector, b.rps]);
    }
    
    
    async createAmcIndexTodo(seedId: number, rootUrl: string, startPage: number) {
        const sql = `
          INSERT INTO AMC_INDEX_TODO (SEED_ID, CURRENT_URL, PAGE_NO, STATUS)
          VALUES (?, ?, ?, 'PENDING')`;
        return await this.executeQuery(sql, [seedId, rootUrl, startPage]);
    }
    
}