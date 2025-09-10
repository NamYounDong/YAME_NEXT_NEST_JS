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
}