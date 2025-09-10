/**
 * 응급의료기관 서비스
 * 
 * 이 서비스는 E-Gen (응급의료정보) 시스템의 응급의료기관 정보를 수집하고 
 * 관리하는 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. 응급의료기관 정보 수집: E-Gen API를 통한 전국 응급의료기관 정보 자동 수집
 * 2. 응급의료기관 데이터 관리: 병원명, 주소, 응급실 운영 현황 등의 상세 정보 관리
 * 3. 위치 기반 검색: 지역별, 응급의료 수준별 기관 검색 기능 제공
 * 4. 데이터 동기화: E-Gen의 최신 응급의료기관 정보와 시스템 데이터 동기화
 * 5. API 제공: 프론트엔드에서 응급의료기관 정보를 조회할 수 있는 인터페이스
 * 
 * 수집하는 응급의료기관 정보:
 * - 기본 정보: 기관명, 주소, 연락처, 홈페이지
 * - 응급의료 정보: 응급실 운영 여부, 응급의료 수준, 전문 진료과목
 * - 시설 정보: 응급실 병상 수, 중환자실 병상 수, 의료진 수
 * - 위치 정보: 위도, 경도, 행정구역 정보
 * - 운영 정보: 24시간 운영 여부, 응급차량 보유 현황
 * 
 * 기술적 특징:
 * - 대용량 데이터 처리: 전국 수천 개 응급의료기관 정보를 효율적으로 관리
 * - 위치 기반 검색: 지리적 근접성을 고려한 응급의료기관 검색
 * - 실시간 데이터 동기화: E-Gen API 변경사항을 자동으로 반영
 * - 에러 처리: API 호출 실패 시 재시도 및 복구 로직
 * - 응급의료 수준 분류: 1~3단계 응급의료 수준별 체계적 분류
 * 
 * 사용 사례:
 * - 응급 상황에서 가까운 응급의료기관을 찾을 때
 * - 특정 응급의료 수준의 기관을 검색할 때
 * - 응급차량이 환자를 이송할 기관을 선택할 때
 * - 의료진이 응급의료기관 정보를 업데이트할 때
 * - 응급의료 통계 및 분석 자료 작성 시
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ApiCollectorUtil } from '../utils/api-collector.util';
import { EmergencyBaseInfo, CollectionResult, SaveResult } from '../interfaces/data-collection.interface';
import { EmergencyMapper } from '../database/emergency.mapper';

@Injectable()
export class EmergencyBaseService {
  private readonly logger = new Logger(EmergencyBaseService.name);
  private readonly batchSize = 3000;

  constructor(
    private databaseService: DatabaseService,
    private apiCollector: ApiCollectorUtil,
    private emergencyMapper: EmergencyMapper,
  ) {}

  async collectEmergencyData(forceUpdate: boolean = false): Promise<CollectionResult<EmergencyBaseInfo>> {
    this.logger.log('응급의료기관 기본정보 수집 시작');

    try {
      const apiUrl = `${this.apiCollector.getEgenApiUrl()}${this.apiCollector.getEgenApiELIIPath()}`;
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

      const collectionResult = await this.apiCollector.collectDataWithPagination<EmergencyBaseInfo>(
        apiUrl,
        params,
        this.batchSize
      );

      if (collectionResult.success && collectionResult.data.length > 0) {
        const saveResult = await this.saveEmergencyData(collectionResult.data, forceUpdate);
        this.logger.log(`응급의료기관 정보 저장 완료: ${saveResult.savedCount}개 저장, ${saveResult.updatedCount}개 업데이트`);
      }

      return collectionResult;

    } catch (error) {
      this.logger.error(`응급의료기관 정보 수집 실패: ${error.message}`);
      throw error;
    }
  }

  async saveEmergencyData(emergencies: EmergencyBaseInfo[], forceUpdate: boolean = false): Promise<SaveResult> {
    const startTime = Date.now();
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      for (const emergency of emergencies) {
        try {
          const existing = await this.findEmergencyByHpid(emergency.hpid);
          
          if (existing) {
            if (forceUpdate || this.shouldUpdateEmergency(existing, emergency)) {
              await this.updateEmergency(emergency);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await this.insertEmergency(emergency);
            savedCount++;
          }
        } catch (error) {
          this.logger.error(`응급의료기관 저장 오류 (${emergency.hpid}): ${error.message}`);
          errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`응급의료기관 정보 저장 완료: ${savedCount}개 저장, ${updatedCount}개 업데이트, ${skippedCount}개 건너뜀, ${errorCount}개 오류, 처리시간: ${processingTime}ms`);

      return {
        totalCount: emergencies.length,
        savedCount,
        updatedCount,
        errorCount,
        skippedCount,
        processingTime
      };

    } catch (error) {
      this.logger.error(`응급의료기관 정보 저장 실패: ${error.message}`);
      throw error;
    }
  }

  private async findEmergencyByHpid(hpid: string): Promise<any> {
    return await this.emergencyMapper.findByHpid(hpid);
  }

  private async insertEmergency(emergency: EmergencyBaseInfo): Promise<void> {
    await this.emergencyMapper.insert(emergency);
  }

  private async updateEmergency(emergency: EmergencyBaseInfo): Promise<void> {
    await this.emergencyMapper.update(emergency);
  }

  private shouldUpdateEmergency(existing: any, newData: EmergencyBaseInfo): boolean {
    return (
      existing.dutyName !== newData.dutyName ||
      existing.dutyAddr !== newData.dutyAddr ||
      existing.dutyTel1 !== newData.dutyTel1 ||
      existing.wgs84Lon !== newData.wgs84Lon ||
      existing.wgs84Lat !== newData.wgs84Lat
    );
  }
}
