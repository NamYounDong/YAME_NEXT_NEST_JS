/**
 * 외상센터 서비스
 * 
 * 이 서비스는 E-Gen (응급의료정보) 시스템의 외상센터 정보를 수집하고 
 * 관리하는 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. 외상센터 정보 수집: E-Gen API를 통한 전국 외상센터 정보 자동 수집
 * 2. 외상센터 데이터 관리: 센터명, 주소, 외상치료 수준 등의 상세 정보 관리
 * 3. 위치 기반 검색: 지역별, 외상치료 수준별 센터 검색 기능 제공
 * 4. 데이터 동기화: E-Gen의 최신 외상센터 정보와 시스템 데이터 동기화
 * 5. API 제공: 프론트엔드에서 외상센터 정보를 조회할 수 있는 인터페이스
 * 
 * 수집하는 외상센터 정보:
 * - 기본 정보: 센터명, 주소, 연락처, 홈페이지
 * - 외상치료 정보: 외상치료 수준, 전문 진료과목, 수술실 현황
 * - 시설 정보: 외상치료 병상 수, 중환자실 병상 수, 의료진 수
 * - 위치 정보: 위도, 경도, 행정구역 정보
 * - 운영 정보: 24시간 운영 여부, 응급차량 보유 현황
 * 
 * 외상센터의 중요성:
 * - 중증 외상 환자 치료: 교통사고, 산업재해 등 중증 외상 환자의 전문 치료
 * - 응급 수술 지원: 24시간 응급 수술이 가능한 전문 의료진과 시설
 * - 지역별 분산: 전국 각 지역에 외상센터를 분산 배치하여 접근성 향상
 * - 의료진 교육: 외상치료 전문의 양성을 위한 교육 및 훈련
 * 
 * 기술적 특징:
 * - 대용량 데이터 처리: 전국 수십 개 외상센터 정보를 효율적으로 관리
 * - 위치 기반 검색: 지리적 근접성을 고려한 외상센터 검색
 * - 실시간 데이터 동기화: E-Gen API 변경사항을 자동으로 반영
 * - 에러 처리: API 호출 실패 시 재시도 및 복구 로직
 * - 외상치료 수준 분류: 1~3단계 외상치료 수준별 체계적 분류
 * 
 * 사용 사례:
 * - 중증 외상 환자를 이송할 외상센터를 찾을 때
 * - 특정 외상치료 수준의 센터를 검색할 때
 * - 응급차량이 외상 환자를 이송할 기관을 선택할 때
 * - 의료진이 외상센터 정보를 업데이트할 때
 * - 외상치료 통계 및 분석 자료 작성 시
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ApiCollectorUtil } from '../utils/api-collector.util';
import { TraumaBaseInfo, CollectionResult, SaveResult } from '../interfaces/data-collection.interface';
import { TraumaMapper } from '../database/trauma.mapper';

@Injectable()
export class TraumaBaseService {
  private readonly logger = new Logger(TraumaBaseService.name);
  private readonly batchSize = 3000;

  constructor(
    private databaseService: DatabaseService,
    private apiCollector: ApiCollectorUtil,
    private traumaMapper: TraumaMapper,
  ) {}

  async collectTraumaData(forceUpdate: boolean = false): Promise<CollectionResult<TraumaBaseInfo>> {
    this.logger.log('외상센터 기본정보 수집 시작');

    try {
      const apiUrl = `${this.apiCollector.getEgenApiUrl()}${this.apiCollector.getEgenApiSLIIPath()}`;
      const apiKey = this.apiCollector.getEgenApiKey();

      if (!apiKey) {
        throw new Error('E-Gen API 키가 설정되지 않았습니다.');
      }

      const params = {
        serviceKey: apiKey,
        pageNo: 1,
        numOfRows: this.batchSize,
        type: 'json'
      };

      const collectionResult = await this.apiCollector.collectDataWithPagination<TraumaBaseInfo>(
        apiUrl,
        params,
        this.batchSize
      );

      if (collectionResult.success && collectionResult.data.length > 0) {
        const saveResult = await this.saveTraumaData(collectionResult.data, forceUpdate);
        this.logger.log(`외상센터 정보 저장 완료: ${saveResult.savedCount}개 저장, ${saveResult.updatedCount}개 업데이트`);
      }

      return collectionResult;

    } catch (error) {
      this.logger.error(`외상센터 정보 수집 실패: ${error.message}`);
      throw error;
    }
  }

  async saveTraumaData(traumas: TraumaBaseInfo[], forceUpdate: boolean = false): Promise<SaveResult> {
    const startTime = Date.now();
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      for (const trauma of traumas) {
        try {
          const existing = await this.findTraumaByHpid(trauma.hpid);
          
          if (existing) {
            if (forceUpdate || this.shouldUpdateTrauma(existing, trauma)) {
              await this.updateTrauma(trauma);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await this.insertTrauma(trauma);
            savedCount++;
          }
        } catch (error) {
          this.logger.error(`외상센터 저장 오류 (${trauma.hpid}): ${error.message}`);
          errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`외상센터 정보 저장 완료: ${savedCount}개 저장, ${updatedCount}개 업데이트, ${skippedCount}개 건너뜀, ${errorCount}개 오류, 처리시간: ${processingTime}ms`);

      return {
        totalCount: traumas.length,
        savedCount,
        updatedCount,
        errorCount,
        skippedCount,
        processingTime
      };

    } catch (error) {
      this.logger.error(`외상센터 정보 저장 실패: ${error.message}`);
      throw error;
    }
  }

  private async findTraumaByHpid(hpid: string): Promise<any> {
    return await this.traumaMapper.findByHpid(hpid);
  }

  private async insertTrauma(trauma: TraumaBaseInfo): Promise<void> {
    await this.traumaMapper.insert(trauma);
  }

  private async updateTrauma(trauma: TraumaBaseInfo): Promise<void> {
    await this.traumaMapper.update(trauma);
  }

  private shouldUpdateTrauma(existing: any, newData: TraumaBaseInfo): boolean {
    return (
      existing.dutyName !== newData.dutyName ||
      existing.dutyAddr !== newData.dutyAddr ||
      existing.dutyTel1 !== newData.dutyTel1 ||
      existing.wgs84Lon !== newData.wgs84Lon ||
      existing.wgs84Lat !== newData.wgs84Lat
    );
  }
}
