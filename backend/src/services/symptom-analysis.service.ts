/**
 * 증상 분석 서비스
 * 사용자 증상을 분석하고 의학 용어로 변환
 */

import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { DatabaseService } from './database.service';

export interface SymptomAnalysisResult {
  medicalTerms: string[];
  suspectedDiseases: Array<{ disease: string; confidence: number }>;
  severityScore: number;
  analysis: string;
  needsHospital: boolean;
  recommendation: 'PHARMACY' | 'HOSPITAL';
}

@Injectable()
export class SymptomAnalysisService {
  private readonly logger = new Logger(SymptomAnalysisService.name);

  constructor(
    private openaiService: OpenAIService,
    private databaseService: DatabaseService,
  ) {}

  /**
   * 사용자 증상 분석
   * @param symptomText 사용자 입력 증상
   * @param subSymptoms 보조 증상 배열
   * @param gpsData GPS 정보
   * @returns 분석 결과
   */
  async analyzeSymptoms(
    symptomText: string,
    subSymptoms?: string[],
    gpsData?: { latitude: number; longitude: number; accuracy?: number },
  ): Promise<SymptomAnalysisResult> {
    try {
      this.logger.log(`[SymptomAnalysis] 증상 분석 시작: ${symptomText}`);
      if (subSymptoms && subSymptoms.length > 0) {
        this.logger.log(`[SymptomAnalysis] 보조 증상: ${subSymptoms.join(', ')}`);
      }

      // OpenAI를 사용하여 증상 분석
      const aiAnalysis = await this.openaiService.analyzeSymptoms(symptomText, subSymptoms);
      
      this.logger.log(`[SymptomAnalysis] LLM 분석 결과:
- 의학 용어: ${aiAnalysis.medicalTerms.join(', ')}
- 의심 질병: ${aiAnalysis.suspectedDiseases.map(d => `${d.disease}(${(d.confidence * 100).toFixed(0)}%)`).join(', ')}
- 심각도: ${aiAnalysis.severityScore}/10
- 병원 필요: ${aiAnalysis.needsHospital ? '예' : '아니오'}`);

      // 병원/약국 분기 결정
      const recommendation = this.determineRecommendation(aiAnalysis.severityScore, aiAnalysis.needsHospital);
      this.logger.log(`[SymptomAnalysis] 최종 추천: ${recommendation}`);

      // 분석 결과 저장
      await this.saveAnalysisLog({
        symptomText,
        subSymptoms,
        gpsData,
        aiAnalysis,
        recommendation,
      });

      return {
        ...aiAnalysis,
        recommendation,
      };
    } catch (error) {
      this.logger.error(`증상 분석 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 병원/약국 추천 결정
   * @param severityScore 심각도 점수
   * @param needsHospital 병원 필요 여부
   * @returns 추천 타입
   */
  private determineRecommendation(severityScore: number, needsHospital: boolean): 'PHARMACY' | 'HOSPITAL' {
    // 심각도가 7 이상이거나 LLM이 병원 방문을 권장하면 병원
    if (severityScore >= 7 || needsHospital) {
      return 'HOSPITAL';
    }
    return 'PHARMACY';
  }

  /**
   * 분석 결과를 데이터베이스에 저장
   * @param data 저장할 데이터
   */
  private async saveAnalysisLog(data: {
    symptomText: string;
    subSymptoms?: string[];
    gpsData?: { latitude: number; longitude: number; accuracy?: number };
    aiAnalysis: any;
    recommendation: 'PHARMACY' | 'HOSPITAL';
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO SYMPTOM_LOGS (
          SYMPTOM_TEXT,
          SUB_SYMPTOMS,
          MEDICAL_TERMS,
          SUSPECTED_DISEASES,
          LLM_ANALYSIS,
          SEVERITY_SCORE,
          RECOMMENDATION,
          LONGITUDE,
          LATITUDE,
          GPS_ACCURACY_M,
          CREATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const params = [
        data.symptomText,
        data.subSymptoms ? JSON.stringify(data.subSymptoms) : null,
        JSON.stringify(data.aiAnalysis.medicalTerms),
        JSON.stringify(data.aiAnalysis.suspectedDiseases),
        data.aiAnalysis.analysis,
        data.aiAnalysis.severityScore,
        data.recommendation,
        data.gpsData?.longitude?.toString() || null,
        data.gpsData?.latitude?.toString() || null,
        data.gpsData?.accuracy || null,
      ];

      await this.databaseService.query(query, params);
      this.logger.log('증상 로그 저장 완료');
    } catch (error) {
      this.logger.error(`증상 로그 저장 실패: ${error.message}`, error.stack);
      // 로그 저장 실패는 전체 프로세스를 중단하지 않음
    }
  }
}

