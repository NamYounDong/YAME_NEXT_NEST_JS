/**
 * 증상 로그 컨트롤러
 * LLM RAG 기반 증상 분석 및 약 추천 API
 */

import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyzeSymptomDto } from '../interfaces/analyze-symptom.dto';
import { SymptomAnalysisService } from '../services/symptom-analysis.service';
import { DrugRecommendationService } from '../services/drug-recommendation.service';
import { FacilitySearchService } from '../services/facility-search.service';
import { VWorldService } from '../services/vworld.service';

@ApiTags('Symptom Analysis')
@Controller('api/symptom-logs')
export class SymptomLogsController {
  private readonly logger = new Logger(SymptomLogsController.name);

  constructor(
    private symptomAnalysisService: SymptomAnalysisService,
    private drugRecommendationService: DrugRecommendationService,
    private facilitySearchService: FacilitySearchService,
    private vworldService: VWorldService,
  ) {}

  /**
   * 증상 분석 및 추천 엔드포인트
   * POST /api/symptom-logs/analyze
   */
  @Post('analyze')
  @ApiOperation({
    summary: '증상 분석 및 추천',
    description: `
사용자의 증상을 LLM으로 분석하여 다음을 제공합니다:
1. 증상의 의학 용어 변환
2. 의심되는 질병 목록
3. 약국/병원 분기 추천
4. OTC 약품 추천 (약국 추천 시)
5. 주변 약국/병원 정보
6. 지도 및 주소 정보
    `,
  })
  @ApiResponse({
    status: 200,
    description: '분석 성공',
    schema: {
      example: {
        success: true,
        data: {
          analysis: {
            medicalTerms: ['두통', '발열'],
            suspectedDiseases: [
              { disease: '감기', confidence: 0.8 },
              { disease: '독감', confidence: 0.6 },
            ],
            severityScore: 5,
            analysis: '일반적인 감기 증상으로 보입니다...',
            recommendation: 'PHARMACY',
          },
          drugs: [
            {
              itemSeq: '200001234',
              itemName: '타이레놀정',
              entpName: '한국존슨앤드존슨',
              reason: '해열 및 진통 효과',
              cautions: ['복용 전 의사와 상담'],
              durWarnings: [],
            },
          ],
          facilities: [
            {
              id: '1234567',
              name: '온누리약국',
              address: '서울특별시 강남구...',
              phone: '02-1234-5678',
              distance: 0.5,
              longitude: 127.0276,
              latitude: 37.4979,
              isOpen: true,
              type: 'PHARMACY',
            },
          ],
          addressInfo: {
            roadAddress: '서울특별시 강남구 테헤란로 123',
            jibunAddress: '서울특별시 강남구 역삼동 123-45',
            sido: '서울특별시',
            sigungu: '강남구',
            dong: '역삼동',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async analyzeSymptom(@Body() dto: AnalyzeSymptomDto) {
    try {
      this.logger.log(`증상 분석 요청: ${dto.symptomText}`);

      // 1. 증상 분석 (LLM)
      const gpsData = dto.latitude && dto.longitude
        ? { latitude: dto.latitude, longitude: dto.longitude, accuracy: dto.gpsAccuracy }
        : undefined;

      const analysis = await this.symptomAnalysisService.analyzeSymptoms(
        dto.symptomText,
        dto.subSymptoms,
        gpsData,
      );

      // 2. 약품 추천 (약국 추천 시)
      let drugs = [];
      if (analysis.recommendation === 'PHARMACY') {
        drugs = await this.drugRecommendationService.recommendDrugs(
          analysis.medicalTerms,
          analysis.suspectedDiseases,
          dto.userAge,
          dto.isPregnant,
        );
      }

      // 3. 주변 시설 검색
      let facilities = [];
      if (dto.latitude && dto.longitude) {
        if (analysis.recommendation === 'PHARMACY') {
          // 약국 검색
          const pharmacies = await this.facilitySearchService.searchNearbyPharmacies(
            dto.latitude,
            dto.longitude,
            3, // 3km 반경
            10,
          );
          facilities = this.facilitySearchService.filterOpenFacilities(pharmacies);
        } else {
          // 병원 검색
          const hospitals = await this.facilitySearchService.searchNearbyHospitals(
            dto.latitude,
            dto.longitude,
            5, // 5km 반경
            10,
          );
          facilities = this.facilitySearchService.filterOpenFacilities(hospitals);
        }
      }

      // 4. 주소 정보 변환
      let addressInfo = null;
      if (dto.latitude && dto.longitude) {
        addressInfo = await this.vworldService.coordinateToAddress(
          dto.longitude,
          dto.latitude,
        );
      }

      return {
        success: true,
        data: {
          analysis: {
            medicalTerms: analysis.medicalTerms,
            suspectedDiseases: analysis.suspectedDiseases,
            severityScore: analysis.severityScore,
            analysis: analysis.analysis,
            recommendation: analysis.recommendation,
          },
          drugs,
          facilities,
          addressInfo,
        },
      };
    } catch (error) {
      this.logger.error(`증상 분석 실패: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message || '증상 분석에 실패했습니다.',
      };
    }
  }
}

