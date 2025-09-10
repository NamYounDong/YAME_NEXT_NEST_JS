/**
 * HIRA 약국 서비스
 * 
 * 이 서비스는 건강보험심사평가원(HIRA)의 약국 정보를 수집하고 관리하는 
 * 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. 약국 정보 수집: HIRA API를 통한 전국 약국의 기본 정보 자동 수집
 * 2. 약국 데이터 관리: 약국명, 주소, 연락처, 운영시간 등의 상세 정보 관리
 * 3. 위치 기반 검색: 지역별, 서비스별 약국 검색 기능 제공
 * 4. 데이터 동기화: HIRA의 최신 약국 정보와 시스템 데이터 동기화
 * 5. API 제공: 프론트엔드에서 약국 정보를 조회할 수 있는 인터페이스
 * 
 * 수집하는 약국 정보:
 * - 기본 정보: 약국명, 주소, 연락처, 홈페이지
 * - 운영 정보: 영업시간, 휴무일, 야간 운영 여부
 * - 서비스 정보: 처방전 조제, 의약품 판매, 건강상담
 * - 위치 정보: 위도, 경도, 행정구역 정보
 * - 평가 정보: HIRA 평가 결과, 고객 만족도
 * 
 * 기술적 특징:
 * - 대용량 데이터 처리: 전국 수만 개 약국 정보를 효율적으로 관리
 * - 위치 기반 검색: 지리적 근접성을 고려한 약국 검색
 * - 실시간 데이터 동기화: HIRA API 변경사항을 자동으로 반영
 * - 에러 처리: API 호출 실패 시 재시도 및 복구 로직
 * - 서비스 분류: 약국별 제공 서비스를 체계적으로 분류
 * 
 * 사용 사례:
 * - 환자가 가까운 약국을 찾을 때
 * - 특정 서비스를 제공하는 약국을 검색할 때
 * - 야간 약국이나 24시간 운영 약국을 찾을 때
 * - 약사가 약국 정보를 업데이트할 때
 * - 의료 통계 및 분석 자료 작성 시
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ApiCollectorUtil } from '../utils/api-collector.util';
import { HiraPharmacyInfo, CollectionResult, SaveResult } from '../interfaces/data-collection.interface';
import { PharmacyMapper } from '../database/pharmacy.mapper';

@Injectable()
export class HiraPharmacyService {
  private readonly logger = new Logger(HiraPharmacyService.name);
  private readonly batchSize = 3000; // HIRA API 배치 크기

  constructor(
    private databaseService: DatabaseService,
    private apiCollector: ApiCollectorUtil,
    private pharmacyMapper: PharmacyMapper,
  ) {}

  /**
   * HIRA 약국 정보 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectPharmacyData(forceUpdate: boolean = false): Promise<CollectionResult<HiraPharmacyInfo>> {
    this.logger.log('HIRA 약국 정보 수집 시작');

    try {
      const apiUrl = `${this.apiCollector.getHiraApiUrl()}${this.apiCollector.getHiraPharmacyPath()}`;
      const apiKey = this.apiCollector.getHiraApiKey();

      if (!apiKey) {
        throw new Error('HIRA API 키가 설정되지 않았습니다.');
      }

      const params = {
        serviceKey: apiKey,
        pageNo: 1,
        numOfRows: this.batchSize,
        type: 'json'
      };

      // HIRA 약국 API 호출 전 FULL URL 로깅
      const queryString = new URLSearchParams({
        serviceKey: apiKey,
        pageNo: '1',
        numOfRows: this.batchSize.toString(),
        type: 'json'
      }).toString();
      const fullUrl = `${apiUrl}?${queryString}`;
      this.logger.log(`HIRA 약국 API 호출 - FULL URL: ${fullUrl}`);

      const collectionResult = await this.apiCollector.collectDataWithPagination<HiraPharmacyInfo>(
        apiUrl,
        params,
        this.batchSize
      );

      if (collectionResult.success && collectionResult.data.length > 0) {
        // 데이터베이스에 저장
        const saveResult = await this.savePharmacyData(collectionResult.data, forceUpdate);
        this.logger.log(`HIRA 약국 정보 저장 완료: ${saveResult.savedCount}개 저장, ${saveResult.updatedCount}개 업데이트`);
      }

      return collectionResult;

    } catch (error) {
      this.logger.error(`HIRA 약국 정보 수집 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 약국 정보를 데이터베이스에 저장
   * @param pharmacies 약국 정보 배열
   * @param forceUpdate 강제 업데이트 여부
   * @returns 저장 결과
   */
  async savePharmacyData(pharmacies: HiraPharmacyInfo[], forceUpdate: boolean = false): Promise<SaveResult> {
    const startTime = Date.now();
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      for (const pharmacy of pharmacies) {
        try {
          const existingPharmacy = await this.findPharmacyByYkiho(pharmacy.ykiho);
          
          if (existingPharmacy) {
            if (forceUpdate || this.shouldUpdatePharmacy(existingPharmacy, pharmacy)) {
              await this.updatePharmacy(pharmacy);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await this.insertPharmacy(pharmacy);
            savedCount++;
          }
        } catch (error) {
          this.logger.error(`약국 정보 저장 오류 (${pharmacy.ykiho}): ${error.message}`);
          errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`약국 정보 저장 완료: ${savedCount}개 저장, ${updatedCount}개 업데이트, ${skippedCount}개 건너뜀, ${errorCount}개 오류, 처리시간: ${processingTime}ms`);

      return {
        totalCount: pharmacies.length,
        savedCount,
        updatedCount,
        errorCount,
        skippedCount,
        processingTime
      };

    } catch (error) {
      this.logger.error(`약국 정보 저장 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 요양기호로 약국 정보 조회
   * @param ykiho 요양기호
   * @returns 약국 정보
   */
  private async findPharmacyByYkiho(ykiho: string): Promise<any> {
    return await this.pharmacyMapper.findByYkiho(ykiho);
  }

  /**
   * 새로운 약국 정보 삽입
   * @param pharmacy 약국 정보
   */
  private async insertPharmacy(pharmacy: HiraPharmacyInfo): Promise<void> {
    await this.pharmacyMapper.insert(pharmacy);
  }

  /**
   * 기존 약국 정보 업데이트
   * @param pharmacy 약국 정보
   */
  private async updatePharmacy(pharmacy: HiraPharmacyInfo): Promise<void> {
    await this.pharmacyMapper.update(pharmacy);
  }

  /**
   * 약국 정보 업데이트 필요 여부 확인
   * @param existing 기존 약국 정보
   * @param newData 새로운 약국 정보
   * @returns 업데이트 필요 여부
   */
  private shouldUpdatePharmacy(existing: any, newData: HiraPharmacyInfo): boolean {
    return (
      existing.yadmNm !== newData.yadmNm ||
      existing.clCd !== newData.clCd ||
      existing.clCdNm !== newData.clCdNm ||
      existing.sidoCd !== newData.sidoCd ||
      existing.sidoCdNm !== newData.sidoCdNm ||
      existing.sgguCd !== newData.sgguCd ||
      existing.sgguCdNm !== newData.sgguCdNm ||
      existing.emdongNm !== newData.emdongNm ||
      existing.postNo !== newData.postNo ||
      existing.addr !== newData.addr ||
      existing.telno !== newData.telno ||
      existing.estbDd !== newData.estbDd ||
      existing.xPos !== newData.xPos ||
      existing.yPos !== newData.yPos
    );
  }

  /**
   * 약국 정보 통계 조회
   * @returns 약국 정보 통계
   */
  async getPharmacyStats(): Promise<any> {
    try {
      return await this.pharmacyMapper.getStats();
    } catch (error) {
      this.logger.error(`약국 정보 통계 조회 실패: ${error.message}`);
      throw error;
    }
  }
}
