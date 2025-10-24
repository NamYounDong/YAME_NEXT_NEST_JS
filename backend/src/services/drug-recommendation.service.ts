/**
 * 약품 추천 서비스
 * DUR 데이터와 LLM을 활용한 약품 추천
 */

import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { DatabaseService } from './database.service';

export interface DrugRecommendation {
  itemSeq: string;
  itemName: string;
  entpName: string;
  reason: string;
  cautions: string[];
  durWarnings: string[];
}

@Injectable()
export class DrugRecommendationService {
  private readonly logger = new Logger(DrugRecommendationService.name);

  constructor(
    private openaiService: OpenAIService,
    private databaseService: DatabaseService,
  ) {}

  /**
   * 증상에 맞는 약품 추천
   * @param medicalTerms 의학 용어 배열
   * @param suspectedDiseases 의심 질병 목록
   * @param userAge 사용자 나이 (선택)
   * @param isPregnant 임신 여부 (선택)
   * @returns 추천 약품 목록
   */
  async recommendDrugs(
    medicalTerms: string[],
    suspectedDiseases: Array<{ disease: string; confidence: number }>,
    userAge?: number,
    isPregnant?: boolean,
  ): Promise<DrugRecommendation[]> {
    try {
      this.logger.log(`[DrugRecommendation] 약품 추천 시작`);
      this.logger.log(`[DrugRecommendation] 의학 용어: ${medicalTerms.join(', ')}`);
      this.logger.log(`[DrugRecommendation] 의심 질병: ${suspectedDiseases.map(d => d.disease).join(', ')}`);
      this.logger.log(`[DrugRecommendation] 사용자 정보: 나이=${userAge || '미제공'}, 임신=${isPregnant ? '예' : '아니오'}`);

      // OTC 약품 데이터 조회
      const otcDrugs = await this.getOTCDrugs(medicalTerms);

      if (otcDrugs.length === 0) {
        this.logger.warn('[DrugRecommendation] ⚠️ OTC 약품을 찾을 수 없습니다.');
        return [];
      }

      this.logger.log(`[DrugRecommendation] ${otcDrugs.length}개의 OTC 약품을 LLM에 전달합니다.`);

      // LLM을 사용하여 약품 추천
      const recommendations = await this.openaiService.recommendDrugs(
        medicalTerms,
        suspectedDiseases,
        otcDrugs,
      );

      this.logger.log(`[DrugRecommendation] LLM이 ${recommendations.length}개 약품을 추천했습니다.`);

      // DUR 체크 수행
      const enhancedRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          this.logger.log(`[DrugRecommendation] DUR 체크: ${rec.itemName} (${rec.itemSeq})`);
          const durWarnings = await this.checkDUR(rec.itemSeq, userAge, isPregnant);
          if (durWarnings.length > 0) {
            this.logger.warn(`[DrugRecommendation] DUR 경고: ${durWarnings.join(', ')}`);
          }
          const drugInfo = otcDrugs.find(d => (d.ITEM_SEQ || d.itemSeq) === rec.itemSeq);
          
          return {
            ...rec,
            entpName: drugInfo?.ENTP_NAME || drugInfo?.entpName || '',
            durWarnings,
          };
        }),
      );

      this.logger.log(`[DrugRecommendation] 최종 추천 약품 ${enhancedRecommendations.length}개`);
      return enhancedRecommendations;
    } catch (error) {
      this.logger.error(`약품 추천 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * OTC 약품 데이터 조회
   * @param keywords 검색 키워드
   * @returns OTC 약품 목록
   */
  private async getOTCDrugs(keywords: string[]): Promise<any[]> {
    try {
      this.logger.log(`[DrugRecommendation] OTC 약품 검색 시작`);
      this.logger.log(`[DrugRecommendation] 검색 키워드: ${keywords.join(', ')}`);
      
      // 키워드를 포함하는 OTC 약품 검색
      const keywordConditions = keywords.map(() => 
        '(ITEM_NAME LIKE ? OR CLASS_NO LIKE ? OR MATERIAL_NAME LIKE ?)'
      ).join(' OR ');

      const params = keywords.flatMap(keyword => [
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
      ]);

      this.logger.log(`[DrugRecommendation] 검색 파라미터: ${JSON.stringify(params)}`);

      const query = `
        SELECT 
          ITEM_SEQ,
          ITEM_NAME,
          ENTP_NAME,
          CLASS_NO,
          MATERIAL_NAME,
          CHART,
          ETC_OTC_CODE
        FROM ITEM_DUR_INFO
        WHERE (${keywordConditions})
          AND ETC_OTC_CODE = '02'
          AND (CANCEL_NAME IS NULL OR CANCEL_NAME = '정상')
        LIMIT 50
      `;

      this.logger.log(`[DrugRecommendation] 실행 SQL:\n${query}`);

      const results = await this.databaseService.query(query, params);
      
      this.logger.log(`[DrugRecommendation] 검색 결과: ${results.length}개 약품 발견`);
      if (results.length > 0) {
        this.logger.log(`[DrugRecommendation] 처음 5개 약품:`);
        results.slice(0, 5).forEach((drug, idx) => {
          this.logger.log(`  ${idx + 1}. ${drug.ITEM_NAME || drug.itemName} (${drug.ITEM_SEQ || drug.itemSeq})`);
        });
      } else {
        this.logger.warn(`[DrugRecommendation] ⚠️ 검색 결과가 없습니다!`);
        this.logger.warn(`[DrugRecommendation] 데이터베이스 확인 필요:`);
        this.logger.warn(`  1. ITEM_DUR_INFO 테이블에 데이터가 있는지 확인`);
        this.logger.warn(`  2. ETC_OTC_CODE = '02' 조건이 맞는지 확인`);
        this.logger.warn(`  3. 검색 키워드가 한글/영문 중 어느 것으로 저장되어 있는지 확인`);
      }
      
      return results;
    } catch (error) {
      this.logger.error(`OTC 약품 조회 실패: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * DUR 체크 수행
   * @param itemSeq 품목 기준코드
   * @param userAge 사용자 나이
   * @param isPregnant 임신 여부
   * @returns 경고 메시지 배열
   */
  private async checkDUR(itemSeq: string, userAge?: number, isPregnant?: boolean): Promise<string[]> {
    const warnings: string[] = [];

    try {
      // 연령 금기 체크
      if (userAge !== undefined) {
        const ageWarning = await this.checkAgeContraindication(itemSeq, userAge);
        if (ageWarning) warnings.push(ageWarning);
      }

      // 임부 금기 체크
      if (isPregnant) {
        const pregnancyWarning = await this.checkPregnancyContraindication(itemSeq);
        if (pregnancyWarning) warnings.push(pregnancyWarning);
      }

      // 노인 주의 체크
      if (userAge && userAge >= 65) {
        const elderlyWarning = await this.checkElderlyCaution(itemSeq);
        if (elderlyWarning) warnings.push(elderlyWarning);
      }

      return warnings;
    } catch (error) {
      this.logger.error(`DUR 체크 실패: ${error.message}`, error.stack);
      return warnings;
    }
  }

  /**
   * 연령 금기 체크
   */
  private async checkAgeContraindication(itemSeq: string, age: number): Promise<string | null> {
    try {
      const query = `
        SELECT PROHBT_CONTENT
        FROM ITEM_AGE_CONTRAINDICATION
        WHERE ITEM_SEQ = ?
        LIMIT 1
      `;
      const results = await this.databaseService.query(query, [itemSeq]);
      
      if (results.length > 0) {
        return `연령 주의: ${results[0].PROHBT_CONTENT || results[0].prohbtContent}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 임부 금기 체크
   */
  private async checkPregnancyContraindication(itemSeq: string): Promise<string | null> {
    try {
      const query = `
        SELECT PROHBT_CONTENT
        FROM ITEM_PREGNANCY_CONTRAINDICATION
        WHERE ITEM_SEQ = ?
        LIMIT 1
      `;
      const results = await this.databaseService.query(query, [itemSeq]);
      
      if (results.length > 0) {
        return `임부 금기: ${results[0].PROHBT_CONTENT || results[0].prohbtContent}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 노인 주의 체크
   */
  private async checkElderlyCaution(itemSeq: string): Promise<string | null> {
    try {
      const query = `
        SELECT PROHBT_CONTENT
        FROM ITEM_ELDERLY_CAUTION
        WHERE ITEM_SEQ = ?
        LIMIT 1
      `;
      const results = await this.databaseService.query(query, [itemSeq]);
      
      if (results.length > 0) {
        return `노인 주의: ${results[0].PROHBT_CONTENT || results[0].prohbtContent}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

