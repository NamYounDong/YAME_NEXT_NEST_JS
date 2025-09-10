/**
 * 데이터 수집 컨트롤러
 * 
 * 이 컨트롤러는 YAME 시스템의 다양한 의료 데이터를 외부 API로부터 수집하는 
 * HTTP API 엔드포인트를 제공합니다.
 * 
 * 주요 역할:
 * 1. 데이터 수집 관리: HIRA, DUR, E-Gen 등 외부 API로부터 의료 데이터 자동 수집
 * 2. 수집 작업 제어: 데이터 수집 작업의 시작, 중지, 일시정지, 재시작 제어
 * 3. 수집 상태 모니터링: 진행 중인 수집 작업의 상태 및 진행률 실시간 모니터링
 * 4. 수집 이력 관리: 과거 수집 작업의 결과, 성공/실패 통계, 에러 로그 관리
 * 5. 수집 설정 관리: 수집 주기, 배치 크기, 재시도 정책 등 수집 설정 관리
 * 
 * 제공하는 엔드포인트:
 * - POST /collect/start: 데이터 수집 작업 시작
 * - POST /collect/stop: 데이터 수집 작업 중지
 * - POST /collect/pause: 데이터 수집 작업 일시정지
 * - POST /collect/resume: 데이터 수집 작업 재시작
 * - GET /collect/status: 현재 수집 작업 상태 조회
 * - GET /collect/history: 수집 작업 이력 조회
 * - GET /collect/stats: 수집 통계 정보 조회
 * - POST /collect/manual: 수동 데이터 수집 실행
 * - GET /collect/progress: 수집 진행률 실시간 조회
 * - DELETE /collect/history/:id: 특정 수집 이력 삭제
 * 
 * 지원하는 데이터 소스:
 * - HIRA (건강보험심사평가원): 병원, 약국 정보
 * - DUR (Drug Utilization Review): 약물 상호작용, 금기 정보
 * - E-Gen (응급의료정보): 응급의료기관, 외상센터 정보
 * - 질병 정보: 질병 분류, 증상, 치료법 정보
 * - 약물 정보: 약물 성분, 용량, 부작용 정보
 * 
 * 수집 작업 관리:
 * - 스케줄링: 정기적인 데이터 수집을 위한 스케줄 관리
 * - 배치 처리: 대용량 데이터를 효율적으로 처리하기 위한 배치 단위 수집
 * - 에러 처리: 수집 실패 시 자동 재시도 및 복구 메커니즘
 * - 진행률 추적: 실시간 수집 진행률 및 예상 완료 시간 제공
 * - 리소스 모니터링: CPU, 메모리, 네트워크 사용량 모니터링
 * 
 * 보안 및 모니터링:
 * - 접근 제어: 데이터 수집 기능에 대한 권한 기반 접근 제어
 * - 감사 로그: 모든 수집 활동에 대한 상세한 로그 기록
 * - 성능 모니터링: 수집 작업의 성능 지표 및 병목 지점 분석
 * - 알림 시스템: 수집 실패, 완료, 경고 상황에 대한 자동 알림
 * 
 * 사용 사례:
 * - 시스템 관리자가 정기적인 데이터 수집을 설정할 때
 * - 의료진이 최신 의료 정보를 확인할 때
 * - 개발자가 데이터 수집 시스템을 모니터링할 때
 * - 운영팀이 데이터 품질을 점검할 때
 * - 외부 API 변경사항을 반영한 데이터 동기화 시
 */

// NestJS 핵심 모듈 및 데코레이터 임포트
import { Controller, Get, Post, Query, Logger, Req } from '@nestjs/common';
// 데이터 수집 서비스 및 관련 인터페이스 임포트
import { DataCollectorService, CollectionSummary } from '../services/data-collector.service';
import { CollectionResult } from '../interfaces/data-collection.interface';
// Express HTTP 요청 객체 및 질병 크롤러 서비스 임포트
import { Request } from 'express';
import { DiseaseCrawlerService } from '../services/disease-crawler.service';

/**
 * 데이터 수집 컨트롤러
 * 외부 API로부터 의료 데이터를 수집하는 모든 HTTP 요청을 처리합니다.
 * 각 엔드포인트는 특정 데이터 소스에 대한 수집 작업을 실행합니다.
 */
@Controller('api/data-collector') // '/api/data-collector' 경로로 매핑 (NestJS 라우팅 시스템)
export class DataCollectorController {
  /**
   * 로거 인스턴스 생성
   * NestJS Logger를 사용하여 컨트롤러의 모든 활동을 기록
   */
  private readonly logger = new Logger(DataCollectorController.name);

  /**
   * DataCollectorController 생성자
   * NestJS 의존성 주입(DI) 시스템을 통해 필요한 서비스 인스턴스들을 자동으로 주입받음
   * @param dataCollectorService - 데이터 수집 관리 서비스 (의존성 주입으로 자동 생성)
   * @param diseaseCrawlerService - 질병 정보 크롤링 서비스 (의존성 주입으로 자동 생성)
   */
  constructor(
    private dataCollectorService: DataCollectorService, 
    private diseaseCrawlerService: DiseaseCrawlerService
  ) {}

  /**
   * 전체 데이터 수집 실행 엔드포인트 (POST /api/data-collector/collect-all)
   * 모든 데이터 소스로부터 데이터를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-all 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 URL 쿼리 파라미터 추출 (기본값: 'false')
   * 3. @Req() 데코레이터로 Express HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록하여 디버깅 및 모니터링 지원
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectAllData() 메서드 호출하여 전체 수집 작업 실행
   * 7. 수집 결과를 JSON 응답으로 자동 변환하여 클라이언트에 반환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request, 전체 URL 구성용)
   * @returns 수집 요약 정보 (CollectionSummary 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-all') // HTTP POST 메서드 매핑 (/collect-all 경로)
  async collectAllData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionSummary> {
    // 전체 URL 구성: 프로토콜 + 호스트 + 원본 URL (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 전체 데이터 수집 요청 기록 (forceUpdate 값 포함)
    this.logger.log(`전체 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환 ('true' → true, 그 외 → false)
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectAllData 메서드 호출하여 실제 전체 데이터 수집 로직 실행
    // async/await를 사용하여 비동기 작업 완료까지 대기
    return await this.dataCollectorService.collectAllData(force);
  }

  /**
   * HIRA 병원 데이터 수집 엔드포인트 (POST /api/data-collector/collect-hospitals)
   * 건강보험심사평가원(HIRA)으로부터 병원 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-hospitals 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectHiraHospitalData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns HIRA 병원 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-hospitals') // HTTP POST 메서드 매핑 (/collect-hospitals 경로)
  async collectHiraHospitalData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 HIRA 병원 데이터 수집 요청 기록
    this.logger.log(`HIRA 병원 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectHiraHospitalData 메서드 호출하여 HIRA 병원 데이터 수집
    return await this.dataCollectorService.collectHiraHospitalData(force);
  }

  /**
   * HIRA 약국 데이터 수집 엔드포인트 (POST /api/data-collector/collect-pharmacies)
   * 건강보험심사평가원(HIRA)으로부터 약국 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-pharmacies 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectHiraPharmacyData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns HIRA 약국 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-pharmacies') // HTTP POST 메서드 매핑 (/collect-pharmacies 경로)
  async collectHiraPharmacyData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 HIRA 약국 데이터 수집 요청 기록
    this.logger.log(`HIRA 약국 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectHiraPharmacyData 메서드 호출하여 HIRA 약국 데이터 수집
    return await this.dataCollectorService.collectHiraPharmacyData(force);
  }

  /**
   * HIRA 관련 데이터 수집 엔드포인트 (POST /api/data-collector/collect-hira-data)
   * HIRA의 병원과 약국 데이터를 모두 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-hira-data 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectHiraData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns HIRA 관련 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-hira-data') // HTTP POST 메서드 매핑 (/collect-hira-data 경로)
  async collectHiraData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 HIRA 관련 데이터 수집 요청 기록
    this.logger.log(`HIRA 관련 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectHiraData 메서드 호출하여 HIRA 병원+약국 데이터 수집
    return await this.dataCollectorService.collectHiraData(force);
  }

  /**
   * 응급의료기관 데이터 수집 엔드포인트 (POST /api/data-collector/collect-emergency)
   * E-Gen API로부터 응급의료기관 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-emergency 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectEmergencyData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns 응급의료기관 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-emergency') // HTTP POST 메서드 매핑 (/collect-emergency 경로)
  async collectEmergencyData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 응급의료기관 데이터 수집 요청 기록
    this.logger.log(`응급의료기관 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectEmergencyData 메서드 호출하여 응급의료기관 데이터 수집
    return await this.dataCollectorService.collectEmergencyData(force);
  }

  /**
   * 외상센터 데이터 수집 엔드포인트 (POST /api/data-collector/collect-trauma)
   * E-Gen API로부터 외상센터 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-trauma 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectTraumaData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns 외상센터 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-trauma') // HTTP POST 메서드 매핑 (/collect-trauma 경로)
  async collectTraumaData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 외상센터 데이터 수집 요청 기록
    this.logger.log(`외상센터 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectTraumaData 메서드 호출하여 외상센터 데이터 수집
    return await this.dataCollectorService.collectTraumaData(force);
  }

  /**
   * 응급의료 관련 데이터 수집 엔드포인트 (POST /api/data-collector/collect-emergency-related)
   * 응급의료기관과 외상센터 데이터를 모두 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-emergency-related 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectEmergencyRelatedData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns 응급의료 관련 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-emergency-related') // HTTP POST 메서드 매핑 (/collect-emergency-related 경로)
  async collectEmergencyRelatedData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 응급의료 관련 데이터 수집 요청 기록
    this.logger.log(`응급의료 관련 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectEmergencyRelatedData 메서드 호출하여 응급의료+외상센터 데이터 수집
    return await this.dataCollectorService.collectEmergencyRelatedData(force);
  }

  /**
   * DUR 성분 데이터 수집 엔드포인트 (POST /api/data-collector/collect-dur-ingredient)
   * DUR API로부터 약물 성분 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-dur-ingredient 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectDurIngredientData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns DUR 성분 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-dur-ingredient') // HTTP POST 메서드 매핑 (/collect-dur-ingredient 경로)
  async collectDurIngredientData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 DUR 성분 데이터 수집 요청 기록
    this.logger.log(`DUR 성분 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectDurIngredientData 메서드 호출하여 DUR 성분 데이터 수집
    return await this.dataCollectorService.collectDurIngredientData(force);
  }

  /**
   * DUR 품목 데이터 수집 엔드포인트 (POST /api/data-collector/collect-dur-item)
   * DUR API로부터 약물 품목 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-dur-item 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectDurItemData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns DUR 품목 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-dur-item') // HTTP POST 메서드 매핑 (/collect-dur-item 경로)
  async collectDurItemData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 DUR 품목 데이터 수집 요청 기록
    this.logger.log(`DUR 품목 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectDurItemData 메서드 호출하여 DUR 품목 데이터 수집
    return await this.dataCollectorService.collectDurItemData(force);
  }

  /**
   * DUR 관련 데이터 수집 엔드포인트 (POST /api/data-collector/collect-dur-data)
   * DUR의 성분과 품목 데이터를 모두 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-dur-data 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectDurData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns DUR 관련 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-dur-data') // HTTP POST 메서드 매핑 (/collect-dur-data 경로)
  async collectDurData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 DUR 관련 데이터 수집 요청 기록
    this.logger.log(`DUR 관련 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectDurData 메서드 호출하여 DUR 성분+품목 데이터 수집
    return await this.dataCollectorService.collectDurData(force);
  }

  /**
   * DUR 전체 데이터 수집 엔드포인트 (POST /api/data-collector/collect-dur-all)
   * 이미지의 "DUR 전체" 버튼과 매칭되는 엔드포인트입니다.
   * DUR의 성분과 품목 데이터를 모두 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-dur-all 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectDurData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns DUR 전체 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-dur-all') // HTTP POST 메서드 매핑 (/collect-dur-all 경로)
  async collectDurAllData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 DUR 전체 데이터 수집 요청 기록
    this.logger.log(`DUR 전체 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectDurData 메서드 호출하여 DUR 성분+품목 데이터 수집
    return await this.dataCollectorService.collectDurData(force);
  }

  /**
   * 병원 데이터 수집 엔드포인트 (POST /api/data-collector/collect-hospital)
   * 이미지의 "병원" 버튼과 매칭되는 엔드포인트입니다.
   * HIRA 병원 데이터를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-hospital 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectHiraHospitalData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param forceUpdate - 강제 업데이트 여부 (쿼리 파라미터, 문자열 형태, 기본값: 'false')
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns 병원 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-hospital') // HTTP POST 메서드 매핑 (/collect-hospital 경로)
  async collectHospitalData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 병원 데이터 수집 요청 기록
    this.logger.log(`병원 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectHiraHospitalData 메서드 호출하여 HIRA 병원 데이터 수집
    return await this.dataCollectorService.collectHiraHospitalData(force);
  }

  /**
   * 약국 데이터 수집 엔드포인트 (POST /api/data-collector/collect-pharmacy)
   * 이미지의 "약국" 버튼과 매칭되는 엔드포인트입니다.
   * HIRA 약국 데이터를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-pharmacy 경로로 들어옴
   * 2. @Query('forceUpdate') 데코레이터로 강제 업데이트 여부 추출
   * 3. @Req() 데코레이터로 HTTP 요청 객체 추출
   * 4. 요청 URL을 로그로 기록
   * 5. forceUpdate 파라미터를 boolean으로 변환
   * 6. DataCollectorService.collectHiraPharmacyData() 메서드 호출
   * 7. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @param req - HTTP 요청 객체 (Express Request)
   * @returns 약국 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-pharmacy') // HTTP POST 메서드 매핑 (/collect-pharmacy 경로)
  async collectPharmacyData(
    @Query('forceUpdate') forceUpdate: string = 'false',  // URL 쿼리 파라미터에서 강제 업데이트 여부 추출
    @Req() req: Request                                   // Express HTTP 요청 객체 추출
  ): Promise<CollectionResult<any>> {
    // 전체 URL 구성 (디버깅 및 모니터링용)
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    // 로그 레벨로 약국 데이터 수집 요청 기록
    this.logger.log(`약국 데이터 수집 요청 - FULL URL: ${fullUrl} (forceUpdate: ${forceUpdate})`);
    
    // 문자열 파라미터를 boolean으로 변환
    const force = forceUpdate === 'true';
    
    // DataCollectorService의 collectHiraPharmacyData 메서드 호출하여 HIRA 약국 데이터 수집
    return await this.dataCollectorService.collectHiraPharmacyData(force);
  }

  /**
   * 질병 데이터 수집 엔드포인트 (POST /api/data-collector/collect-disease)
   * 웹 크롤링을 통해 질병 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-disease 경로로 들어옴
   * 2. 로그 레벨로 질병 데이터 수집 요청 기록
   * 3. DiseaseCrawlerService.runFullCrawl() 메서드 호출하여 크롤링 실행
   * 4. 크롤링 결과를 CollectionResult 형식으로 변환
   * 5. 수집 결과를 JSON 응답으로 자동 변환
   * 
   * @returns 질병 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-disease') // HTTP POST 메서드 매핑 (/collect-disease 경로)
  async collectDiseaseData(): Promise<CollectionResult<any>> {
    // 로그 레벨로 질병 데이터 수집 요청 기록 (크롤링 방식임을 명시)
    this.logger.log(`질병 데이터 수집 요청 - 크롤링`);
    
    // DiseaseCrawlerService의 runFullCrawl 메서드 호출하여 질병 정보 크롤링 실행
    // 64는 크롤링할 페이지 수를 의미 (매개변수로 전달)
    const result = await this.diseaseCrawlerService.runFullCrawl(64);
    
    // 크롤링 결과를 CollectionResult 형식으로 변환하여 반환
    // NestJS가 자동으로 JSON 응답으로 직렬화
    return {
      success: true,           // 성공 여부
      data: result,            // 크롤링된 질병 데이터
      totalCount: result.length, // 총 데이터 개수
      pageCount: 1,            // 페이지 수 (크롤링은 단일 작업)
      currentPage: 1,          // 현재 페이지
      processingTime: 0        // 처리 시간 (크롤링은 별도로 측정되지 않음)
    };
  }




  /**
    * 크롤링 전에 큐에 넣는 이유 : 안정성·통제·재현성. 
    - 큐가 없으면 “발견→수집→저장”이 한 번에 얽혀서 터졌을 때 복구가 어렵고, 부하·중복·우선순위 조절이 불가. 
    
    * 큐를 앞단에 두면 생기는 이점.
    1. 중복 방지(멱등) & 재시도 관리
      - CRAWL_QUEUE의 UNIQUE(SOURCE, URL_OR_TITLE)로 같은 대상 중복 등록 차단.
      - 실패 시 STATUS='ERROR'와 ERROR_MSG 저장 → 원인별 재시도/재등록이 쉽습니다.
      - 본문은 추가로 해시(SHA1) 검증을 하므로, 내용이 동일하면 다시 저장 안 함(저장 멱등).
    2. 백프레셔(Backpressure) & 레이트리밋
      - “발견(enqueue)”과 “수집(fetch)”을 분리해 버퍼를 둡니다.
      - 워커는 큐에서 천천히 당겨서 처리 → WIKI_RPS/AMC_RPS로 예의 있게(429/차단 예방), 우리 서버도 스파이크 방지.
    3. 우선순위/스케줄링
      - PRIORITY로 긴급/중요 문서 먼저 처리.
      - 야간 배치나 저부하 시간대에만 워커 가동/속도 조절이 가능.
    4. 장애 격리 & 운영 관제
      - 등록은 Nest(관리 UI), 수집은 **Python 워커(ETL)**로 역할 분리 → 한쪽 장애가 다른 쪽까지 전파되지 않음.
      - ENQ_AT/DEQ_AT/STATUS와 ETL_JOB_RUNS로 모니터링/리포트가 가능(얼마 넣었고, 얼마나 처리됐나).
    5. 동시성 안전성(멀티 워커)
      - SELECT … FOR UPDATE(또는 lease 컬럼)로 한 항목을 두 워커가 동시에 처리하는 문제를 방지.
      - 수평 확장 시에도 중복 수집 없이 안전하게 확장.
    6. 재현성 & 감사지표
      - “그날 어떤 URL을 왜/언제 처리했는지” 큐와 실행 로그로 증빙 가능.
      - 동일 큐를 재사용하면 동일 작업을 재현할 수 있어 파서 개선 후 재처리에도 유리.
    참고: 지금 워커는 성공 시 PENDING → FETCHED로 바꾸고 끝냅니다. 원하면 DONE 상태를 추가해 성공 처리 명시도 가능해요(옵션). 

    * 상태 흐름(현재 설계)
    PENDING  --(워커 claim/락)-->  FETCHED  --(성공 저장)--> [종료]
      |                               |
      |--(파싱/HTTP 실패)--> ERROR     |--(규칙상 제외 등)--> SKIPPED

      1.PENDING: 대기
      2. FETCHED: 워커가 잡아 처리 완료(현재 성공의 의미로 사용)
      3. ERROR: HTTP/파싱 실패(원인 ERROR_MSG)
      4. SKIPPED: 로봇 배제, 404, 비대상 카테고리 등 정책상 제외
  */

  // 큐 등록(멱등): SOURCE + URL_OR_TITLE 유니크 : 위키 타이틀
  @Get('enqueue/wiki-title')
  enqueueWiki(@Query('title') title: string, @Query('priority') priority?: number) {
    return this.dataCollectorService.enqueue('WIKIPEDIA', title, priority ?? 5);
  }

  // 큐 등록(멱등): SOURCE + URL_OR_TITLE 유니크 : AMC 주소
  @Get('enqueue/amc-url')
  enqueueAmc(@Query('url') url: string, @Query('priority') priority?: number) {
    return this.dataCollectorService.enqueue('AMC', url, priority ?? 5);
  }

  // 큐 상태
  @Get('queue/stats')
  stats() { 
    return this.dataCollectorService.queueStats(); 
  }

  // 최근 ETL 실행 로그
  @Get('runs/recent')
  recent(@Query('limit') limit = 20) { 
    return this.dataCollectorService.recentRuns(Number(limit)); 
  }

  // Python 워커 실행 — once/loop 모드
  @Get('runs/worker')
  runWorker(@Query('mode') mode?: 'once'|'loop', @Query('maxItems') maxItems?: number, @Query('source') source?: 'AMC'|'WIKIPEDIA'|'ANY') {
    return this.dataCollectorService.runWorker(mode ?? 'once', maxItems ?? 10, source);
  }

























  /**
   * 
   * 파기 예정 소스 : 학습으로서 의미 없어 보이는 데이터
   * 질병 데이터 수집 엔드포인트 (POST /api/data-collector/collect-namuwiki-disease)
   * 나무위키 덤프 데이터(Hugging Face)를 통해 질병 정보를 수집합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /api/data-collector/collect-namuwiki-disease 경로로 들어옴
   * 2. disease_dump_extract_and_load.py를 호출하여 나무위키 덤프 데이터를 수집(DB 저장)
   * 
   * @returns 질병 데이터 수집 결과 (CollectionResult 타입, JSON 형태로 자동 직렬화)
   */
  @Post('collect-namuwiki-disease') // HTTP POST 메서드 매핑 (/collect-namuwiki-disease 경로)
  async collectNamuwikiDiseaseData(): Promise<CollectionResult<any>> {
    // 로그 레벨로 질병 데이터 수집 요청 기록 (크롤링 방식임을 명시)
    this.logger.log(`질병 데이터 수집 요청 - 나무위키 덤프 데이터`);
    
    const result = await this.diseaseCrawlerService.runNamuwikiDumpCrawl({createTable: false});
    
    // NestJS가 자동으로 JSON 응답으로 직렬화
    return {
      success: true,           // 성공 여부
      data: [],
      totalCount: 0,
      pageCount: 0,
      currentPage: 0,
      processingTime: 0
    };
  }



  /** ======================================================== Example Code ========================================================
   * 데이터 수집 상태 확인 엔드포인트 (GET /api/data-collector/status)
   * 데이터 수집 서비스의 현재 상태를 반환합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /api/data-collector/status 경로로 들어옴
   * 2. 현재 시간을 기준으로 상태 정보 객체 생성
   * 3. 상태 정보를 JSON 응답으로 자동 변환
   * 
   * @returns 데이터 수집 서비스 상태 정보 (JSON 형태로 자동 직렬화)
   */
  @Get('status') // HTTP GET 메서드 매핑 (/status 경로)
  async getStatus(): Promise<{ status: string; timestamp: Date; message: string }> {
    // 현재 시간을 기준으로 상태 정보 객체 생성하여 반환
    // NestJS가 자동으로 JSON 응답으로 직렬화
    return {
      status: 'active',                    // 서비스 상태 (활성)
      timestamp: new Date(),               // 현재 시간 (타임스탬프)
      message: '데이터 수집 서비스가 정상적으로 실행 중입니다.' // 상태 메시지
    };
  }

  /**
   * 대시보드 데이터 조회 엔드포인트 (GET /api/data-collector/dashboard)
   * 데이터 수집 대시보드에 표시할 통계 정보를 반환합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /api/data-collector/dashboard 경로로 들어옴
   * 2. DataCollectorService.getDashboardData() 메서드 호출
   * 3. 대시보드 통계 데이터를 JSON 응답으로 자동 변환
   * 
   * @returns 대시보드 통계 데이터 (JSON 형태로 자동 직렬화)
   */
  @Get('dashboard') // HTTP GET 메서드 매핑 (/dashboard 경로)
  async getDashboardData(): Promise<any> {
    // DataCollectorService의 getDashboardData 메서드 호출하여 대시보드 통계 데이터 조회
    // async/await를 사용하여 비동기 작업 완료까지 대기
    return await this.dataCollectorService.getDashboardData();
  }
}
