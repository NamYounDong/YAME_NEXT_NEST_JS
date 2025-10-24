/**
 * 증상 로그 모듈
 * LLM RAG 기반 증상 분석 및 약 추천 시스템
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SymptomLogsController } from '../controllers/symptom-logs.controller';
import { OpenAIService } from '../services/openai.service';
import { SymptomAnalysisService } from '../services/symptom-analysis.service';
import { DrugRecommendationService } from '../services/drug-recommendation.service';
import { FacilitySearchService } from '../services/facility-search.service';
import { VWorldService } from '../services/vworld.service';
import { DatabaseModule } from './database.module';

/**
 * 증상 로그 모듈
 * 
 * 주요 기능:
 * 1. LLM 기반 증상 분석 (증상 → 의학 용어 변환)
 * 2. 질병 추론 및 심각도 평가
 * 3. DUR 데이터 기반 약품 추천
 * 4. 주변 약국/병원 검색 (운영시간 고려)
 * 5. VWorld 지도 서비스 통합
 */
@Module({
  imports: [
    ConfigModule, // 환경 변수 (OPENAI_API_KEY, VWORLD_API_KEY 등)
    DatabaseModule, // 데이터베이스 연결
  ],
  controllers: [
    SymptomLogsController, // 증상 분석 API 엔드포인트
  ],
  providers: [
    OpenAIService, // OpenAI GPT-4 API 서비스
    SymptomAnalysisService, // 증상 분석 및 로그 저장
    DrugRecommendationService, // 약품 추천 및 DUR 체크
    FacilitySearchService, // 병원/약국 검색
    VWorldService, // VWorld 지도 및 주소 변환
  ],
  exports: [
    OpenAIService,
    SymptomAnalysisService,
    DrugRecommendationService,
    FacilitySearchService,
    VWorldService,
  ],
})
export class SymptomLogsModule {}
