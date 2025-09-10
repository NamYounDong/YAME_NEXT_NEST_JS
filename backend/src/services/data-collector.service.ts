/**
 * 데이터 수집 서비스
 * 
 * 이 서비스는 의료 시스템에서 필요한 다양한 데이터를 외부 API로부터 수집하는 
 * 중앙 집중식 데이터 수집 엔진입니다.
 * 
 * 주요 역할:
 * 1. 다중 API 통합: HIRA, DUR, E-Gen 등 다양한 의료 데이터 API를 통합 관리
 * 2. 데이터 수집 자동화: 페이지네이션을 통한 대용량 데이터 자동 수집
 * 3. 데이터 변환: API 응답을 시스템 내부 형식으로 표준화
 * 4. 에러 처리: 네트워크 오류, API 제한, 데이터 형식 오류 등에 대한 복원력 있는 처리
 * 5. 로깅 및 모니터링: 수집 과정의 상세한 로깅과 성능 모니터링
 * 
 * 지원하는 데이터 소스:
 * - HIRA (건강보험심사평가원): 병원, 약국 정보
 * - DUR (Drug Utilization Review): 약물 상호작용, 금기 정보
 * - E-Gen (응급의료정보): 응급의료기관, 외상센터 정보
 * 
 * 기술적 특징:
 * - 재시도 로직: API 실패 시 자동 재시도 (최대 5회)
 * - 지수 백오프: 재시도 간격을 점진적으로 증가시켜 서버 부하 최소화
 * - 배치 처리: 대용량 데이터를 효율적으로 처리하기 위한 배치 단위 수집
 * - 메모리 최적화: 스트리밍 방식으로 대용량 응답 처리
 * 
 * 사용 사례:
 * - 의료기관 정보 업데이트
 * - 약물 상호작용 데이터 동기화
 * - 응급의료기관 위치 정보 갱신
 * - 정기적인 데이터 백업 및 동기화
 */

// NestJS 의존성 주입 및 로깅을 위한 모듈 가져오기
import { Injectable, Logger } from '@nestjs/common';
// 각 데이터 소스별 수집 서비스들 가져오기
import { HiraHospitalService } from './hira-hospital.service';        // HIRA 병원 정보 수집
import { HiraPharmacyService } from './hira-pharmacy.service';        // HIRA 약국 정보 수집
import { EmergencyBaseService } from './emergency-base.service';      // 응급의료기관 정보 수집
import { TraumaBaseService } from './trauma-base.service';            // 외상센터 정보 수집
import { DurIngredientService } from './dur-ingredient.service';      // DUR 성분 정보 수집
import { DurItemService } from './dur-item.service';                  // DUR 품목 정보 수집
import { DiseaseCrawlerService } from './disease-crawler.service';  // 질병 정보 크롤링 서비스

// 데이터 수집 결과를 위한 인터페이스 타입 정의
import { CollectionResult } from '../interfaces/data-collection.interface';
import { spawn } from 'child_process';

// 전체 데이터 수집 결과를 요약하는 인터페이스 정의
export interface CollectionSummary {
  timestamp: Date;                    // 수집 완료 시점
  hiraHospital: CollectionResult<any>;    // HIRA 병원 수집 결과
  hiraPharmacy: CollectionResult<any>;    // HIRA 약국 수집 결과
  emergencyBase: CollectionResult<any>;   // 응급의료기관 수집 결과
  traumaBase: CollectionResult<any>;      // 외상센터 수집 결과
  durIngredient: CollectionResult<any>;   // DUR 성분 수집 결과
  durItem: CollectionResult<any>;         // DUR 품목 수집 결과
  totalProcessingTime: number;            // 전체 처리 시간 (밀리초)
  success: boolean;                       // 전체 수집 성공 여부
}

// NestJS 서비스로 등록하여 의존성 주입 가능하도록 설정
@Injectable()
export class DataCollectorService {
  // 이 서비스의 로거 인스턴스 생성 (클래스명으로 구분)
  private readonly logger = new Logger(DataCollectorService.name);

  // 생성자를 통한 의존성 주입 (각 데이터 소스별 수집 서비스들)
  constructor(
    private hiraHospitalService: HiraHospitalService,      // HIRA 병원 수집 서비스
    private hiraPharmacyService: HiraPharmacyService,      // HIRA 약국 수집 서비스
    private emergencyBaseService: EmergencyBaseService,    // 응급의료기관 수집 서비스
    private traumaBaseService: TraumaBaseService,          // 외상센터 수집 서비스
    private durIngredientService: DurIngredientService,    // DUR 성분 수집 서비스
    private durItemService: DurItemService,                // DUR 품목 수집 서비스
    private diseaseCrawlerService: DiseaseCrawlerService,  // 질병 정보 크롤링 서비스
  ) {}

  /**
   * 전체 데이터 수집 실행
   * @param forceUpdate 강제 업데이트 여부 (기존 데이터를 무조건 덮어쓸지 결정)
   * @returns 수집 요약 (각 데이터 소스별 수집 결과 및 전체 통계)
   */
  async collectAllData(forceUpdate: boolean = false): Promise<CollectionSummary> {
    // 전체 수집 작업 시작 시간 기록 (성능 측정용)
    const startTime = Date.now();
    // 전체 데이터 수집 시작을 로그로 기록
    this.logger.log('전체 데이터 수집 시작');

    try {
      // 모든 데이터 소스의 수집 작업을 동시에 실행 (병렬 처리로 성능 향상)
      const results = await Promise.all([
        this.hiraHospitalService.collectHospitalData(forceUpdate),      // HIRA 병원 정보 수집
        this.hiraPharmacyService.collectPharmacyData(forceUpdate),      // HIRA 약국 정보 수집
        this.emergencyBaseService.collectEmergencyData(forceUpdate),    // 응급의료기관 정보 수집
        this.traumaBaseService.collectTraumaData(forceUpdate),          // 외상센터 정보 수집
        this.durIngredientService.collectDurIngredientData(forceUpdate), // DUR 성분 정보 수집
        this.durItemService.collectDurItemData(forceUpdate),             // DUR 품목 정보 수집
      ]);

      // 전체 수집 작업 완료 시간 계산
      const totalProcessingTime = Date.now() - startTime;
      // 모든 수집 작업이 성공했는지 확인 (하나라도 실패하면 false)
      const success = results.every(r => r.success);

      // 수집 결과 요약 객체 생성
      const summary: CollectionSummary = {
        timestamp: new Date(),              // 현재 시점을 수집 완료 시점으로 기록
        hiraHospital: results[0],           // HIRA 병원 수집 결과 (Promise.all의 첫 번째 결과)
        hiraPharmacy: results[1],           // HIRA 약국 수집 결과 (Promise.all의 두 번째 결과)
        emergencyBase: results[2],          // 응급의료기관 수집 결과 (Promise.all의 세 번째 결과)
        traumaBase: results[3],             // 외상센터 수집 결과 (Promise.all의 네 번째 결과)
        durIngredient: results[4],          // DUR 성분 수집 결과 (Promise.all의 다섯 번째 결과)
        durItem: results[5],                // DUR 품목 수집 결과 (Promise.all의 여섯 번째 결과)
        totalProcessingTime,                // 전체 처리 시간
        success                             // 전체 성공 여부
      };

      // 전체 수집 완료 결과를 로그로 기록 (처리 시간과 성공 여부 포함)
      this.logger.log(`전체 데이터 수집 완료: 총 처리시간 ${totalProcessingTime}ms, 성공: ${success}`);
      return summary;

    } catch (error) {
      // 전체 데이터 수집 실패 시 오류 메시지를 로그로 기록하고 다시 던짐
      this.logger.error(`전체 데이터 수집 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * HIRA 병원 데이터만 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectHiraHospitalData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('HIRA 병원 데이터 수집 시작');
    return await this.hiraHospitalService.collectHospitalData(forceUpdate);
  }

  /**
   * HIRA 약국 데이터만 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectHiraPharmacyData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('HIRA 약국 데이터 수집 시작');
    return await this.hiraPharmacyService.collectPharmacyData(forceUpdate);
  }

  /**
   * 응급의료기관 데이터만 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectEmergencyData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('응급의료기관 데이터 수집 시작');
    return await this.emergencyBaseService.collectEmergencyData(forceUpdate);
  }

  /**
   * 외상센터 데이터만 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectTraumaData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('외상센터 데이터 수집 시작');
    return await this.traumaBaseService.collectTraumaData(forceUpdate);
  }

  /**
   * DUR 성분 데이터만 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectDurIngredientData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('DUR 성분 데이터 수집 시작');
    return await this.durIngredientService.collectDurIngredientData(forceUpdate);
  }

  /**
   * DUR 품목 데이터만 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectDurItemData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('DUR 품목 데이터 수집 시작');
    return await this.durItemService.collectDurItemData(forceUpdate);
  }

  /**
   * HIRA 관련 데이터 수집 (병원 + 약국)
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectHiraData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('HIRA 관련 데이터 수집 시작');

    try {
      const [hospitalResult, pharmacyResult] = await Promise.all([
        this.hiraHospitalService.collectHospitalData(forceUpdate),
        this.hiraPharmacyService.collectPharmacyData(forceUpdate)
      ]);

      const totalData = [...hospitalResult.data, ...pharmacyResult.data];
      const totalProcessingTime = hospitalResult.processingTime + pharmacyResult.processingTime;

      return {
        success: hospitalResult.success && pharmacyResult.success,
        data: totalData,
        totalCount: totalData.length,
        pageCount: hospitalResult.pageCount + pharmacyResult.pageCount,
        currentPage: 0,
        processingTime: totalProcessingTime
      };

    } catch (error) {
      this.logger.error(`HIRA 관련 데이터 수집 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 응급의료 관련 데이터 수집 (응급의료기관 + 외상센터)
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectEmergencyRelatedData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('응급의료 관련 데이터 수집 시작');

    try {
      const [emergencyResult, traumaResult] = await Promise.all([
        this.emergencyBaseService.collectEmergencyData(forceUpdate),
        this.traumaBaseService.collectTraumaData(forceUpdate)
      ]);

      const totalData = [...emergencyResult.data, ...traumaResult.data];
      const totalProcessingTime = emergencyResult.processingTime + traumaResult.processingTime;

      return {
        success: emergencyResult.success && traumaResult.success,
        data: totalData,
        totalCount: totalData.length,
        pageCount: emergencyResult.pageCount + traumaResult.pageCount,
        currentPage: 0,
        processingTime: totalProcessingTime
      };

    } catch (error) {
      this.logger.error(`응급의료 관련 데이터 수집 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * DUR 관련 데이터 수집 (성분 + 품목)
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectDurData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('DUR 관련 데이터 수집 시작');

    try {
      const [ingredientResult, itemResult] = await Promise.all([
        this.durIngredientService.collectDurIngredientData(forceUpdate),
        this.durItemService.collectDurItemData(forceUpdate)
      ]);
      
      const totalData = [...ingredientResult.data, ...itemResult.data];
      const totalProcessingTime = ingredientResult.processingTime + itemResult.processingTime;

      return {
        success: ingredientResult.success && itemResult.success,
        data: totalData,
        totalCount: totalData.length,
        pageCount: ingredientResult.pageCount + itemResult.pageCount,
        currentPage: 0,
        processingTime: totalProcessingTime
      };

      // const [itemResult] = await Promise.all([
      //   this.durItemService.collectDurItemData(forceUpdate),
      // ]);
      // return {"success": true, "data": [], "totalCount": 0, "pageCount": 0, "currentPage": 0, "processingTime": 0};

    } catch (error) {
      this.logger.error(`DUR 관련 데이터 수집 실패: ${error.message}`);
      throw error;
    }
  }








  

  // 큐 등록(멱등): SOURCE + URL_OR_TITLE 유니크
  async enqueue(source: 'AMC'|'WIKIPEDIA', urlOrTitle: string, priority = 5) {
    return this.diseaseCrawlerService.enqueue(source, urlOrTitle, priority);
  }
  
  
  // 큐 상태 요약
  async queueStats() {
    return this.diseaseCrawlerService.queueStats();
  }
  
  
  // 최근 ETL 실행 로그
  async recentRuns(limit = 20) {
    return this.diseaseCrawlerService.recentRuns(limit);
  }
  
  
  // Python 워커 실행 — once/loop 모드
  runWorker(mode: 'once'|'loop'='once', maxItems = 10, source?: 'AMC'|'WIKIPEDIA'|'ANY') {
    return this.diseaseCrawlerService.runWorker(mode, maxItems, source);
  }










  
  // =========================================================
  // 스케줄러 관련 기능은 scheduler 디렉터리로 이동됨
  // =========================================================

  /**
   * 대시보드 데이터 조회
   * @returns 대시보드 통계 데이터
   */
  async getDashboardData(): Promise<any> {
    try {
      const [hospitalStats, pharmacyStats] = await Promise.all([
        this.hiraHospitalService.getHospitalStats(),
        this.hiraPharmacyService.getPharmacyStats()
      ]);

      return {
        hospitalStats,
        pharmacyStats,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`대시보드 데이터 조회 실패: ${error.message}`);
      throw error;
    }
  }
}
