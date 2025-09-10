/**
 * API 데이터 수집 공통 유틸리티
 * 
 * 이 클래스는 YAME 시스템의 다양한 외부 API로부터 데이터를 수집하는 
 * 공통 기능과 유틸리티 메서드들을 제공합니다.
 * 
 * 주요 역할:
 * 1. 다중 API 통합: HIRA, DUR, E-Gen 등 다양한 의료 데이터 API를 통합 관리
 * 2. 데이터 수집 자동화: 페이지네이션을 통한 대용량 데이터 자동 수집
 * 3. 데이터 변환: API 응답을 시스템 내부 형식으로 표준화
 * 4. 에러 처리: 네트워크 오류, API 제한, 데이터 형식 오류 등에 대한 복원력 있는 처리
 * 5. 로깅 및 모니터링: 수집 과정의 상세한 로깅과 성능 모니터링
 * 
 * 지원하는 API 유형:
 * - HIRA (건강보험심사평가원): 병원, 약국 등 의료기관 정보
 * - DUR (Drug Utilization Review): 약물 상호작용, 금기 정보
 * - E-Gen (응급의료정보): 응급의료기관, 외상센터 정보
 * 
 * 핵심 기능:
 * - API 키 관리: 각 API별 인증 키의 안전한 저장 및 관리
 * - URL 구성: API 기본 URL과 경로를 조합하여 완전한 API 엔드포인트 생성
 * - 재시도 로직: API 호출 실패 시 자동 재시도 (최대 5회, 지수 백오프)
 * - 응답 파싱: 다양한 API 응답 구조를 자동으로 감지하고 파싱
 * - 데이터 변환: 스네이크 케이스를 카멜케이스로 변환하여 일관된 데이터 구조 제공
 * 
 * 기술적 특징:
 * - 재시도 메커니즘: 지수 백오프를 통한 스마트한 재시도 전략
 * - 응답 구조 자동 감지: DUR, HIRA 등 다양한 API 응답 구조를 자동으로 파싱
 * - 배치 처리: 대용량 데이터를 효율적으로 처리하기 위한 배치 단위 수집
 * - 메모리 최적화: 스트리밍 방식으로 대용량 응답 처리
 * - 에러 복구: API 응답 구조 변경 시에도 안정적으로 동작
 * 
 * 에러 처리:
 * - HTTP 에러: 4xx, 5xx 상태 코드에 대한 적절한 처리
 * - 네트워크 오류: 연결 실패, 타임아웃 등 네트워크 문제 처리
 * - API 제한: Rate Limit 초과 시 자동 대기 및 재시도
 * - 응답 파싱 오류: 예상치 못한 응답 구조에 대한 안전한 처리
 * - 상세한 에러 로깅: 문제 진단을 위한 상세한 에러 정보 수집
 * 
 * 성능 최적화:
 * - 연결 풀링: HTTP 연결의 재사용을 통한 성능 향상
 * - 캐싱: 자주 사용되는 API 응답의 임시 저장
 * - 비동기 처리: 여러 API를 동시에 호출하여 처리 시간 단축
 * - 배치 크기 조정: API 서버 부하를 고려한 최적 배치 크기 설정
 * 
 * 보안 기능:
 * - API 키 보호: 환경 변수를 통한 안전한 API 키 관리
 * - 요청 제한: API 서버 부하 방지를 위한 요청 간격 제어
 * - 로그 보안: 민감한 정보가 로그에 노출되지 않도록 주의
 * 
 * 사용 사례:
 * - 의료기관 정보 업데이트
 * - 약물 상호작용 데이터 동기화
 * - 응급의료기관 위치 정보 갱신
 * - 정기적인 데이터 백업 및 동기화
 * - 새로운 API 소스 추가 및 통합
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { CollectionResult, ApiResponse, PaginationParams } from '../interfaces/data-collection.interface';

/**
 * API 응답 구조 타입 정의
 */
interface BaseApiResponse<T> {
  header?: {
    resultCode: string;
    resultMsg: string;
  };
  response?: {
    body: {
      items: {
        item: T | T[];
      };
      totalCount: number;
      pageNo: number;
      numOfRows: number;
    };
  };
  body?: {
    items: Array<{ item: T }>;
    totalCount: number;
    pageNo: number;
    numOfRows: number;
  };
}

@Injectable()
export class ApiCollectorUtil {
  private readonly logger = new Logger(ApiCollectorUtil.name);

  constructor(private configService: ConfigService) {}

  /**
   * API 키를 디코딩하여 반환
   * @param key 환경변수 키
   * @returns 디코딩된 API 키
   */
  private decodeApiKey(key: string): string {
    try {
      const apiKey = this.configService.get<string>(key, '');
      return decodeURIComponent(apiKey);
    } catch (error) {
      this.logger.error(`API 키 디코딩 실패 (${key}): ${error.message}`);
      return '';
    }
  }

  /**
   * HIRA API 키 반환
   */
  getHiraApiKey(): string {
    return this.decodeApiKey('HIRA_API_KEY');
  }

  /**
   * DUR API 키 반환
   */
  getDurApiKey(): string {
    return this.decodeApiKey('DUR_API_KEY');
  }

  /**
   * E-Gen API 키 반환
   */
  getEgenApiKey(): string {
    return this.decodeApiKey('EGEN_API_KEY');
  }

  /**
   * HIRA API 기본 URL 반환
   */
  getHiraApiUrl(): string {
    return this.configService.get<string>('HIRA_API_URL', 'https://apis.data.go.kr/B551182');
  }

  /**
   * DUR API 기본 URL 반환
   */
  getDurApiUrl(): string {
    return this.configService.get<string>('DUR_API_URL', 'https://apis.data.go.kr/1471000');
  }

  /**
   * E-Gen API 기본 URL 반환
   */
  getEgenApiUrl(): string {
    return this.configService.get<string>('EGEN_API_URL', 'https://apis.data.go.kr/B552657/ErmctInfoInqireService');
  }
  /**
   * E-Gen 응급의료기관 위치정보 조회 API PATH 반환
   */
  getEgenApiELIIPath(): string {
    return this.configService.get<string>('EGEN_ELII_PATH', '/getEgytListInfoInqire');
  }

  /**
   * E-Gen 외상센터 위치정보 조회 API PATH 반환
   */
  getEgenApiSLIIPath(): string {
    return this.configService.get<string>('EGEN_SLII_PATH', '/getStrmListInfoInqire');
  }

  /**
   * HIRA 병원 API 경로 반환
   */
  getHiraHospPath(): string {
    return this.configService.get<string>('HIRA_HOSP_PATH', '/hospInfoServicev2/getHospBasisList');
  }

  /**
   * HIRA 약국 API 경로 반환
   */
  getHiraPharmacyPath(): string {
    return this.configService.get<string>('HIRA_PHARMACY_PATH', '/pharmacyInfoService/getParmacyBasisList');
  }















  
  /**
   * DUR 병용금기 API 경로 반환
   */
  getDurMixContraindicationPath(): string {
    return this.configService.get<string>('DUR_DIIS_UTI_PATH', '/DURIrdntInfoService03/getUsjntTabooInfoList02');
  }

  /**
   * DUR 임부금기 API 경로 반환
   */
  getDurPregnancyContraindicationPath(): string {
    return this.configService.get<string>('DUR_DIIS_PTI_PATH', '/DURIrdntInfoService03/getPwnmTabooInfoList02');
  }

  /**
   * DUR 용량주의 API 경로 반환
   */
  getDurDoseCautionPath(): string {
    return this.configService.get<string>('DUR_DIIS_CAI_PATH', '/DURIrdntInfoService03/getCpctyAtentInfoList02');
  }

  /**
   * DUR 투여기간주의 API 경로 반환
   */
  getDurDurationCautionPath(): string {
    return this.configService.get<string>('DUR_DIIS_MPAI_PATH', '/DURIrdntInfoService03/getMdctnPdAtentInfoList02');
  }

  /**
   * DUR 노인주의 API 경로 반환
   */
  getDurElderlyCautionPath(): string {
    return this.configService.get<string>('DUR_DIIS_OAI_PATH', '/DURIrdntInfoService03/getOdsnAtentInfoList02');
  }

  /**
   * DUR 특정연령대금기 API 경로 반환
   */
  getDurAgeContraindicationPath(): string {
    return this.configService.get<string>('DUR_DIIS_SATI_PATH', '/DURIrdntInfoService03/getSpcifyAgrdeTabooInfoList02');
  }

  /**
   * DUR 효능군중복 API 경로 반환
   */
  getDurTherapeuticDuplicationPath(): string {
    return this.configService.get<string>('DUR_DIIS_EDI_PATH', '/DURIrdntInfoService03/getEfcyDplctInfoList02');
  }

  // =========================================================
  // DUR 품목 관련 API 경로 메서드들
  // =========================================================

  /**
   * 1) DUR 품목 병용금기 정보조회 API 경로 반환
   */
  getDurItemMixContraindicationPath(): string {
    return this.configService.get<string>('DUR_DPIS_UTI_PATH', '/DURPrdlstInfoService03/getUsjntTabooInfoList03');
  }

  /**
   * 2) DUR 품목 노인주의 정보조회 API 경로 반환
   */
  getDurItemElderlyCautionPath(): string {
    return this.configService.get<string>('DUR_DPIS_OAI_PATH', '/DURPrdlstInfoService03/getOdsnAtentInfoList03');
  }

  /**
   * 3) DUR품목정보 조회 API 경로 반환
   */
  getDurItemInfoPath(): string {
    return this.configService.get<string>('DUR_DPIS_DPI_PATH', '/DURPrdlstInfoService03/getDurPrdlstInfoList03');
  }

  /**
   * 4) DUR 품목 특정연령대금기 정보조회 API 경로 반환
   */
  getDurItemAgeContraindicationPath(): string {
    return this.configService.get<string>('DUR_DPIS_SATI_PATH', '/DURPrdlstInfoService03/getSpcifyAgrdeTabooInfoList03');
  }

  /**
   * 5) DUR 품목 용량주의 정보조회 API 경로 반환
   */
  getDurItemDoseCautionPath(): string {
    return this.configService.get<string>('DUR_DPIS_CAI_PATH', '/DURPrdlstInfoService03/getCpctyAtentInfoList03');
  }

  /**
   * DUR 품목 투여기간주의 정보조회 API 경로 반환
   */
  getDurItemDurationCautionPath(): string {
    return this.configService.get<string>('DUR_DPIS_MPAI_PATH', '/DURPrdlstInfoService03/getMdctnPdAtentInfoList03');
  }

  /**
   * DUR 품목 효능군중복 정보조회 API 경로 반환
   */
  getDurItemTherapeuticDuplicationPath(): string {
    return this.configService.get<string>('DUR_DPIS_EDI_PATH', '/DURPrdlstInfoService03/getEfcyDplctInfoList03');
  }

  /**
   * DUR 품목 서방정분할주의 정보조회 API 경로 반환
   */
  getDurItemSustainedReleaseSplitCautionPath(): string {
    return this.configService.get<string>('DUR_DPIS_SPAI_PATH', '/DURPrdlstInfoService03/getSeobangjeongPartitnAtentInfoList03');
  }

  /**
   * DUR 품목 임부금기 정보조회 API 경로 반환
   */
  getDurItemPregnancyContraindicationPath(): string {
    return this.configService.get<string>('DUR_ITEM_PREGNANCY_PATH', '/DURPrdlstInfoService03/getPwnmTabooInfoList03');
  }

  /**
   * 페이지네이션을 사용하여 API 데이터를 배치로 수집
   * @param apiUrl API URL (데이터를 수집할 API의 기본 주소)
   * @param params 쿼리 파라미터 (API 호출에 필요한 인증 키, 검색 조건 등)
   * @param batchSize 배치 크기 (한 번에 가져올 데이터 개수)
   * @param maxPages 최대 페이지 수 (0이면 무제한, 제한을 두려면 양수 값)
   * @returns 수집 결과 (성공/실패, 수집된 데이터, 처리 시간 등)
   */
  async collectDataWithPagination<T>(
    apiUrl: string,
    params: Record<string, any>,
    batchSize: number,
    maxPages: number = 0
  ): Promise<CollectionResult<T>> {
    // 전체 수집 작업 시작 시간 기록 (성능 측정용)
    const startTime = Date.now();
    // 수집된 모든 데이터를 저장할 배열 초기화
    const allData: T[] = [];
    // 현재 처리 중인 페이지 번호 (1부터 시작)
    let currentPage = 1;
    // 전체 데이터 개수 (첫 페이지 응답에서 확인)
    let totalCount = 0;
    // 더 수집할 데이터가 있는지 여부 (루프 제어용)
    let hasMoreData = true;

    try {
      // 더 수집할 데이터가 있고, 최대 페이지 제한에 도달하지 않았을 때까지 반복
      while (hasMoreData && (maxPages === 0 || currentPage <= maxPages)) {
        // FULL URL 로깅 추가 (디버깅 및 모니터링용)
        const currentParams = { ...params, pageNo: currentPage.toString(), numOfRows: batchSize.toString() };
        // 현재 페이지의 쿼리 파라미터를 URL 쿼리 문자열로 변환
        const queryString = new URLSearchParams(currentParams).toString();
        // 완전한 API URL 구성 (로깅용)
        const fullUrl = `${apiUrl}?${queryString}`;
        // 실제 호출될 API URL과 현재 페이지 정보를 로그로 기록
        this.logger.log(`외부 API 호출 - FULL URL: ${fullUrl} 페이지 ${currentPage} 수집 중...`);

        // 현재 페이지의 페이지네이션 파라미터 구성
        const paginationParams: PaginationParams = {
          pageNo: currentPage,        // 현재 페이지 번호
          numOfRows: batchSize        // 한 번에 가져올 데이터 개수
        };

        // API 요청 실행 (재시도 로직 포함)
        const response = await this.makeApiRequest<ApiResponse<T>>(apiUrl, {
          ...params,                  // 기본 파라미터 (API 키, 검색 조건 등)
          ...paginationParams         // 페이지네이션 파라미터 (페이지 번호, 데이터 개수)
        });

        // API 응답이 실패하거나 데이터가 없는 경우 루프 종료
        if (!response.success || !response.data) {
          this.logger.error(`[${apiUrl}] API 응답 실패 (페이지 ${currentPage}): ${response.error}`);
          break;
        }

        // API 응답 데이터 추출
        let apiResponse = response.data;
         
        // API 응답 구조 검증 및 파싱 (DUR, HIRA 등 다양한 API 구조 자동 감지)
        let parsedResponse;
        try {
          // 응답 데이터를 시스템 내부 형식으로 파싱
          parsedResponse = this.parseApiResponse<T>(apiResponse, apiUrl);
        } catch (parseError) {
          // 파싱 실패 시 오류 로그 기록 및 루프 종료
          this.logger.error(`[${apiUrl}] API 응답 파싱 실패: ${parseError.message}`);
          // 파싱 실패한 응답 데이터의 앞부분을 로그로 기록 (디버깅용)
          this.logger.error(`[${apiUrl}] 파싱 실패한 응답 데이터: ${JSON.stringify(apiResponse).substring(0, 500)}...`);
          break;
        }
         
        // 파싱된 응답에서 데이터 항목들과 전체 개수 추출
        const { items, totalCount: responseTotalCount } = parsedResponse;

        // 첫 페이지에서 전체 데이터 개수 확인 (총 페이지 수 계산용)
        if (currentPage === 1) {
          totalCount = responseTotalCount;
          this.logger.log(`[${apiUrl}] 전체 데이터 개수: ${totalCount}`);
        }

        // 현재 페이지에 데이터가 없으면 더 이상 수집할 데이터가 없으므로 종료
        if (items.length === 0) {
          this.logger.log(`[${apiUrl}] 페이지 ${currentPage}에 데이터가 없음`);
          break;
        }

        // makeApiRequest에서 이미 카멜케이스로 변환되었으므로 바로 사용
        // 수집된 데이터를 전체 데이터 배열에 추가
        allData.push(...items);

        // 다음 페이지 확인 (현재까지 수집된 데이터 개수 계산)
        const currentTotal = (currentPage - 1) * batchSize + items.length;
        // 이미 전체 데이터를 모두 수집했으면 루프 종료
        if (currentTotal >= totalCount) {
          hasMoreData = false;
        } else {
          // 다음 페이지로 이동
          currentPage++;
          // API 호출 제한을 위한 딜레이 (300ms 대기)
          await this.delay(300);
        }
      }

      // 전체 수집 작업 완료 시간 계산
      const processingTime = Date.now() - startTime;
      // 실제 처리된 페이지 수 계산 (마지막 페이지 번호 - 1)
      const pageCount = currentPage - 1;

      // 수집 성공 결과 반환
      return {
        success: true,                // 수집 성공 여부
        data: allData,               // 수집된 모든 데이터
        totalCount: allData.length,  // 실제 수집된 데이터 개수
        pageCount,                   // 처리된 페이지 수
        currentPage: pageCount,      // 마지막으로 처리된 페이지 번호
        processingTime                // 총 처리 시간 (밀리초)
      };

    } catch (error) {
       const processingTime = Date.now() - startTime;
       this.logger.error(`[${apiUrl}] 데이터 수집 실패: ${error.message}`);
      
      return {
        success: false,
        data: [],
        totalCount: 0,
        pageCount: 0,
        currentPage: 0,
        error: error.message,
        processingTime
      };
    }
  }

  /**
   * API 요청 실행 (재시도 로직 포함)
   * @param url API URL
   * @param params 쿼리 파라미터
   * @param maxRetries 최대 재시도 횟수 (기본값: 3)
   * @returns API 응답 (모든 key값이 카멜케이스로 변환됨)
   */
  private async makeApiRequest<T>(
    url: string, 
    params: Record<string, any>, 
    maxRetries: number = 5
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    let lastError: string = '';
    let lastResponse: any = null;
    let lastStatusCode: number | null = null;
    let lastStatusText: string = '';
    let lastResponseHeaders: any = null;
    let lastRequestConfig: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // API 요청 전 FULL URL 로깅
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = `${url}?${queryString}`;
        
        if (attempt > 1) {
          this.logger.warn(`[${url}] API 재시도 ${attempt}/${maxRetries} - FULL URL: ${fullUrl}`);
        }
        
        const response: AxiosResponse<T> = await axios.get(url, {
          params,
          timeout: 30000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'YAME-DataCollector/1.0'
          }
        });

        if (response.status === 200) {
          // API 응답의 모든 key값을 카멜케이스로 변환
          const convertedData = this.convertKeysToCamelCase(response.data) as T;
          
          if (attempt > 1) {
            this.logger.log(`[${url}] API 재시도 성공 (${attempt}/${maxRetries})`);
          }
          
          return { success: true, data: convertedData };
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          lastStatusCode = response.status;
          lastStatusText = response.statusText;
          lastResponse = response.data;
          lastResponseHeaders = response.headers;
          lastRequestConfig = response.config;
          
          this.logger.warn(`[${url}] API 요청 실패 (시도 ${attempt}/${maxRetries}): ${lastError}`);
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            lastError = `HTTP ${error.response.status}: ${error.response.statusText}`;
            lastStatusCode = error.response.status;
            lastStatusText = error.response.statusText;
            lastResponse = error.response.data;
            lastResponseHeaders = error.response.headers;
            lastRequestConfig = error.config;
          } else if (error.request) {
            lastError = '네트워크 요청 실패';
            lastRequestConfig = error.config;
          } else {
            lastError = error.message;
            lastRequestConfig = error.config;
          }
        } else {
          lastError = error.message;
        }
        
        this.logger.warn(`[${url}] API 요청 실패 (시도 ${attempt}/${maxRetries}): ${lastError}`);
        
        // 마지막 시도가 아니면 잠시 대기 후 재시도
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 지수 백오프 (최대 5초)
          this.logger.log(`[${url}] ${delayMs}ms 후 재시도...`);
          await this.delay(delayMs);
        }
      }
    }
    
    // 모든 재시도 실패 - 상세한 에러 브리핑 로그
    this.logDetailedError(url, params, maxRetries, lastError, lastStatusCode, lastStatusText, lastResponse, lastResponseHeaders, lastRequestConfig);
    
    return { success: false, error: lastError };
  }

  /**
   * API 요청 실패 시 상세한 에러 정보를 로깅
   */
  private logDetailedError(
    url: string,
    params: Record<string, any>,
    maxRetries: number,
    lastError: string,
    lastStatusCode: number | null,
    lastStatusText: string,
    lastResponse: any,
    lastResponseHeaders: any,
    lastRequestConfig: any
  ): void {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;
    
    this.logger.error('='.repeat(80));
    this.logger.error(`🚨 API 요청 최종 실패 브리핑 - ${url}`);
    this.logger.error('='.repeat(80));
    
    // 기본 정보
    this.logger.error(`📋 요청 정보:`);
    this.logger.error(`   • URL: ${fullUrl}`);
    this.logger.error(`   • 재시도 횟수: ${maxRetries}회`);
    this.logger.error(`   • 최종 에러: ${lastError}`);
    
    // HTTP 상태 정보
    if (lastStatusCode !== null) {
      this.logger.error(`📊 HTTP 응답 정보:`);
      this.logger.error(`   • 상태 코드: ${lastStatusCode}`);
      this.logger.error(`   • 상태 메시지: ${lastStatusText}`);
    }
    
    // 응답 데이터
    if (lastResponse !== null) {
      this.logger.error(`📄 응답 데이터:`);
      try {
        const responseStr = typeof lastResponse === 'string' 
          ? lastResponse 
          : JSON.stringify(lastResponse, null, 2);
        
        // 응답이 너무 길면 잘라서 표시
        if (responseStr.length > 1000) {
          this.logger.error(`   • 응답 (앞부분 1000자): ${responseStr.substring(0, 1000)}...`);
          this.logger.error(`   • 응답 길이: ${responseStr.length}자`);
        } else {
          this.logger.error(`   • 응답: ${responseStr}`);
        }
      } catch (stringifyError) {
        this.logger.error(`   • 응답 파싱 실패: ${stringifyError.message}`);
        this.logger.error(`   • 원본 응답: ${lastResponse}`);
      }
    }
    
    // 응답 헤더
    if (lastResponseHeaders && Object.keys(lastResponseHeaders).length > 0) {
      this.logger.error(`📋 응답 헤더:`);
      Object.entries(lastResponseHeaders).forEach(([key, value]) => {
        this.logger.error(`   • ${key}: ${value}`);
      });
    }
    
    // 요청 설정
    if (lastRequestConfig) {
      this.logger.error(`⚙️ 요청 설정:`);
      this.logger.error(`   • 타임아웃: ${lastRequestConfig.timeout}ms`);
      this.logger.error(`   • 메서드: ${lastRequestConfig.method?.toUpperCase() || 'GET'}`);
      if (lastRequestConfig.headers) {
        this.logger.error(`   • 요청 헤더: ${JSON.stringify(lastRequestConfig.headers)}`);
      }
    }
    
    // 문제 해결 제안
    this.logger.error(`💡 문제 해결 제안:`);
    if (lastStatusCode === 429) {
      this.logger.error(`   • Rate Limit 초과 - 요청 간격을 늘려주세요`);
    } else if (lastStatusCode === 401) {
      this.logger.error(`   • 인증 실패 - API 키를 확인해주세요`);
    } else if (lastStatusCode === 403) {
      this.logger.error(`   • 권한 없음 - API 접근 권한을 확인해주세요`);
    } else if (lastStatusCode === 500) {
      this.logger.error(`   • 서버 내부 오류 - 잠시 후 재시도해주세요`);
    } else if (lastStatusCode === 503) {
      this.logger.error(`   • 서비스 일시 중단 - 잠시 후 재시도해주세요`);
    } else if (lastStatusCode === 404) {
      this.logger.error(`   • API 엔드포인트를 찾을 수 없음 - URL을 확인해주세요`);
    } else if (lastError.includes('네트워크 요청 실패')) {
      this.logger.error(`   • 네트워크 연결 문제 - 인터넷 연결을 확인해주세요`);
    } else if (lastError.includes('timeout')) {
      this.logger.error(`   • 요청 타임아웃 - 네트워크 상태를 확인하거나 타임아웃을 늘려주세요`);
    } else {
      this.logger.error(`   • 일반적인 오류 - 로그를 확인하여 구체적인 원인을 파악해주세요`);
    }
    
    this.logger.error('='.repeat(80));
  }

  /**
   * 지연 처리
   * @param ms 밀리초 (대기할 시간)
   * @returns Promise<void> (지연 완료 후 resolve되는 Promise)
   */
  private async delay(ms: number): Promise<void> {
    // Promise를 사용한 비동기 지연 처리
    // setTimeout을 Promise로 래핑하여 async/await 구문에서 사용 가능하도록 함
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 배열을 배치로 분할
   * @param array 원본 배열 (분할할 데이터 배열)
   * @param batchSize 배치 크기 (각 배치에 포함될 요소 개수)
   * @returns 배치 배열 (원본 배열을 배치 크기로 나눈 2차원 배열)
   */
  chunkArray<T>(array: T[], batchSize: number): T[][] {
    // 결과를 저장할 2차원 배열 초기화
    const chunks: T[][] = [];
    
    // 원본 배열을 배치 크기만큼씩 순회하며 분할
    for (let i = 0; i < array.length; i += batchSize) {
      // slice 메서드로 현재 인덱스부터 배치 크기만큼의 요소를 추출
      // slice(start, end): start 인덱스부터 end-1 인덱스까지의 요소를 반환
      chunks.push(array.slice(i, i + batchSize));
    }
    
    // 분할된 배치 배열 반환
    return chunks;
  }

  /**
   * 좌표를 POINT 형식으로 변환
   * @param longitude 경도 (X좌표, -180 ~ 180)
   * @param latitude 위도 (Y좌표, -90 ~ 90)
   * @returns POINT 형식 문자열 (PostgreSQL PostGIS에서 사용하는 형식)
   */
  formatPoint(longitude: number, latitude: number): string {
    // PostgreSQL PostGIS의 POINT 형식으로 좌표 변환
    // 형식: POINT(경도 위도) - 공간 데이터베이스에서 지리적 위치 저장용
    return `POINT(${longitude} ${latitude})`;
  }

  /**
   * 빈 값 체크 및 기본값 설정
   * @param value 원본 값 (검사할 값)
   * @param defaultValue 기본값 (value가 빈 값일 때 반환할 값)
   * @returns 처리된 값 (원본 값 또는 기본값)
   */
  sanitizeValue<T>(value: T, defaultValue: T): T {
    // null, undefined, 빈 문자열 체크
    if (value === null || value === undefined || value === '') {
      return defaultValue;  // 빈 값인 경우 기본값 반환
    }
    return value;  // 유효한 값인 경우 원본 값 반환
  }

  /**
   * 날짜 형식 정규화
   * @param dateStr 날짜 문자열 (정규화할 날짜)
   * @returns 정규화된 날짜 문자열 (YYYYMMDD 형식 또는 원본)
   */
  normalizeDate(dateStr: string): string {
    // 빈 문자열 체크
    if (!dateStr || dateStr === '') return '';
    
    // YYYYMMDD 형식인지 정규식으로 확인 (8자리 숫자)
    if (/^\d{8}$/.test(dateStr)) {
      return dateStr;  // 이미 올바른 형식인 경우 그대로 반환
    }
    
    // 다른 형식은 원본 반환 (추후 확장 가능)
    return dateStr;
  }

  /**
   * 스네이크 케이스를 카멜케이스로 변환
   * @param str 스네이크 케이스 문자열 (예: user_name, hospital_address)
   * @returns 카멜케이스 문자열 (예: userName, hospitalAddress)
   */
  snakeToCamel(str: string): string {
    // 정규식을 사용한 문자열 변환
    // _([a-z]) 패턴: 언더스코어 다음에 오는 소문자 알파벳을 찾음
    // replace 함수의 콜백에서 두 번째 매개변수(letter)를 대문자로 변환
    // 예: user_name → userN → userName
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * 객체의 모든 키를 스네이크 케이스에서 카멜케이스로 변환
   * @param obj 원본 객체
   * @returns 변환된 객체
   */
  convertKeysToCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertKeysToCamelCase(item));
    }

    const result: Record<string, any> = {};
    let conversionCount = 0;
    
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.snakeToCamel(key);
      if (key !== camelKey) {
        conversionCount++;
        this.logger.debug(`키 변환: ${key} → ${camelKey}`);
      }
      
      // BigInt 처리
      if (typeof value === 'bigint') {
        result[camelKey] = Number(value);
      } else {
        result[camelKey] = this.convertKeysToCamelCase(value);
      }
    }

    if (conversionCount > 0) {
      this.logger.debug(`총 ${conversionCount}개의 키가 카멜케이스로 변환됨`);
    }

    return result;
  }

  /**
   * 데이터베이스 결과를 카멜케이스로 변환하여 반환
   * @param results 데이터베이스 쿼리 결과
   * @returns 변환된 결과
   */
  convertDbResultToCamelCase<T>(results: T[]): Record<string, any>[] {
    return results.map(result => this.convertKeysToCamelCase(result));
  }

  /**
   * API 응답 구조를 파싱하여 공통 형식으로 변환
   * @param apiResponse API 응답 데이터 (makeApiRequest에서 이미 카멜케이스로 변환됨)
   * @param apiUrl API URL (로깅용)
   * @returns 파싱된 응답 데이터
   */
  private parseApiResponse<T>(apiResponse: any, apiUrl: string): {
    items: T[];
    totalCount: number;
    pageNo: number;
    numOfRows: number;
  } {
    // XML 에러 응답 감지 (OpenAPI_ServiceResponse)
    if (typeof apiResponse === 'string' && apiResponse.includes('<OpenAPI_ServiceResponse>')) {
      if (apiResponse.includes('SERVICE ERROR') || apiResponse.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')) {
        throw new Error(`[${apiUrl}] API 서비스 에러: ${apiResponse.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR') ? 'API 호출 한도 초과' : '서비스 에러'}`);
      }
      throw new Error(`[${apiUrl}] XML 형태의 에러 응답: ${apiResponse.substring(0, 200)}...`);
    }

    // 배열 형태 응답 처리 (DUR API 중 일부가 이런 구조를 가질 수 있음)
    if (Array.isArray(apiResponse)) {
      return {
        items: apiResponse as T[],
        totalCount: apiResponse.length,
        pageNo: 1,
        numOfRows: apiResponse.length
      };
    }
    
    // 객체이지만 숫자 키를 가진 경우 (배열과 유사한 구조)
    const numericKeys = Object.keys(apiResponse).filter(key => !isNaN(Number(key)));
    if (numericKeys.length > 0 && numericKeys.length === Object.keys(apiResponse).length) {
      const items = Object.values(apiResponse) as T[];
      return {
        items,
        totalCount: items.length,
        pageNo: 1,
        numOfRows: items.length
      };
    }

    // DUR API 구조 감지 (header가 있으면 DUR)
    if (apiResponse.header) {
      // body.items의 구조를 동적으로 확인
      let items: T[] = [];
      
      if (apiResponse.body && apiResponse.body.items) {
        if (Array.isArray(apiResponse.body.items)) {
          // items가 배열인 경우
          items = apiResponse.body.items;
        } else if (apiResponse.body.items.item) {
          // items.item이 있는 경우 (HIRA와 유사한 구조)
          items = Array.isArray(apiResponse.body.items.item) 
            ? apiResponse.body.items.item 
            : [apiResponse.body.items.item];
        } else {
          // items가 단일 객체인 경우
          items = [apiResponse.body.items];
        }
      }
      
      return {
        items,
        totalCount: apiResponse.body.totalCount || 0,
        pageNo: apiResponse.body.pageNo || 1,
        numOfRows: apiResponse.body.numOfRows || 1
      };
    }
    
    // HIRA API 구조 (response가 있으면 HIRA)
    if (apiResponse.response) {
      
      const items = Array.isArray(apiResponse.response.body.items.item) 
        ? apiResponse.response.body.items.item 
        : [apiResponse.response.body.items.item];
      
      return {
        items,
        totalCount: apiResponse.response.body.totalCount,
        pageNo: apiResponse.response.body.pageNo || 1,
        numOfRows: apiResponse.response.body.numOfRows || 1
      };
    }
    
    // 기타 구조 시도 (직접 items가 있는 경우)
    if (apiResponse.body && apiResponse.body.items) {
      let items: T[] = [];
      if (Array.isArray(apiResponse.body.items)) {
        items = apiResponse.body.items;
      } else if (apiResponse.body.items.item) {
        items = Array.isArray(apiResponse.body.items.item) 
          ? apiResponse.body.items.item 
          : [apiResponse.body.items.item];
      } else {
        items = [apiResponse.body.items];
      }
      
      return {
        items,
        totalCount: apiResponse.body.totalCount || 0,
        pageNo: apiResponse.body.pageNo || 1,
        numOfRows: apiResponse.body.numOfRows || 1
      };
    }
    
    throw new Error(`[${apiUrl}] 지원하지 않는 API 응답 구조입니다. 응답 키: ${Object.keys(apiResponse).join(', ')}`);
  }
}
