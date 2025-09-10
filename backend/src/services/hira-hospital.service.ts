/**
 * HIRA 병원 서비스
 * 
 * 이 서비스는 건강보험심사평가원(HIRA)의 병원 정보를 수집하고 관리하는 
 * 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. 병원 정보 수집: HIRA API를 통한 전국 병원의 기본 정보 자동 수집
 * 2. 병원 데이터 관리: 병원명, 주소, 진료과목, 연락처 등의 상세 정보 관리
 * 3. 위치 기반 검색: 지역별, 진료과목별 병원 검색 기능 제공
 * 4. 데이터 동기화: HIRA의 최신 병원 정보와 시스템 데이터 동기화
 * 5. API 제공: 프론트엔드에서 병원 정보를 조회할 수 있는 인터페이스
 * 
 * 수집하는 병원 정보:
 * - 기본 정보: 병원명, 주소, 연락처, 홈페이지
 * - 진료 정보: 진료과목, 진료시간, 응급실 운영 여부
 * - 시설 정보: 병상 수, 의료진 수, 장비 현황
 * - 평가 정보: HIRA 평가 결과, 환자 만족도
 * - 위치 정보: 위도, 경도, 행정구역 정보
 * 
 * 기술적 특징:
 * - 대용량 데이터 처리: 전국 수만 개 병원 정보를 효율적으로 관리
 * - 위치 기반 검색: 지리적 근접성을 고려한 병원 검색
 * - 실시간 데이터 동기화: HIRA API 변경사항을 자동으로 반영
 * - 에러 처리: API 호출 실패 시 재시도 및 복구 로직
 * 
 * 사용 사례:
 * - 환자가 가까운 병원을 찾을 때
 * - 특정 진료과목이 있는 병원을 검색할 때
 * - 응급 상황에서 가까운 응급실을 찾을 때
 * - 의료진이 병원 정보를 업데이트할 때
 * - 의료 통계 및 분석 자료 작성 시
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ApiCollectorUtil } from '../utils/api-collector.util';
import { HiraHospitalInfo, CollectionResult, SaveResult } from '../interfaces/data-collection.interface';
import { HospitalMapper } from '../database/hospital.mapper';

@Injectable()
export class HiraHospitalService {
  private readonly logger = new Logger(HiraHospitalService.name);
  private readonly batchSize = 3000; // HIRA API 배치 크기

  constructor(
    private databaseService: DatabaseService,
    private apiCollector: ApiCollectorUtil,
    private hospitalMapper: HospitalMapper,
  ) {}

  /**
   * HIRA 병원 정보 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectHospitalData(forceUpdate: boolean = false): Promise<CollectionResult<HiraHospitalInfo>> {
    this.logger.log('HIRA 병원 정보 수집 시작');

    try {
      const apiUrl = `${this.apiCollector.getHiraApiUrl()}${this.apiCollector.getHiraHospPath()}`;
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

      // HIRA 병원 API 호출 전 FULL URL 로깅
      const queryString = new URLSearchParams({
        serviceKey: apiKey,
        pageNo: '1',
        numOfRows: this.batchSize.toString(),
        type: 'json'
      }).toString();
      const fullUrl = `${apiUrl}?${queryString}`;
      this.logger.log(`HIRA 병원 API 호출 - FULL URL: ${fullUrl}`);

      const collectionResult = await this.apiCollector.collectDataWithPagination<HiraHospitalInfo>(
        apiUrl,
        params,
        this.batchSize
      );

      if (collectionResult.success && collectionResult.data.length > 0) {
        // 데이터베이스에 저장
        const saveResult = await this.saveHospitalData(collectionResult.data, forceUpdate);
        this.logger.log(`HIRA 병원 정보 저장 완료: ${saveResult.savedCount}개 저장, ${saveResult.updatedCount}개 업데이트`);
      }

      return collectionResult;

    } catch (error) {
      this.logger.error(`HIRA 병원 정보 수집 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 병원 정보를 데이터베이스에 저장
   * @param hospitals 병원 정보 배열
   * @param forceUpdate 강제 업데이트 여부
   * @returns 저장 결과
   */
  async saveHospitalData(hospitals: HiraHospitalInfo[], forceUpdate: boolean = false): Promise<SaveResult> {
    const startTime = Date.now();
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    try {
      for (const hospital of hospitals) {
        try {
          const existingHospital = await this.findHospitalByYkiho(hospital.ykiho);
          
          if (existingHospital) {
            if (forceUpdate || this.shouldUpdateHospital(existingHospital, hospital)) {
              await this.updateHospital(hospital);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await this.insertHospital(hospital);
            savedCount++;
          }
        } catch (error) {
          this.logger.error(`병원 정보 저장 오류 (${hospital.ykiho}): ${error.message}`);
          errorCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`병원 정보 저장 완료: ${savedCount}개 저장, ${updatedCount}개 업데이트, ${skippedCount}개 건너뜀, ${errorCount}개 오류, 처리시간: ${processingTime}ms`);

      return {
        totalCount: hospitals.length,
        savedCount,
        updatedCount,
        errorCount,
        skippedCount,
        processingTime
      };

    } catch (error) {
      this.logger.error(`병원 정보 저장 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 요양기호로 병원 정보 조회
   * @param ykiho 요양기호
   * @returns 병원 정보
   */
  private async findHospitalByYkiho(ykiho: string): Promise<any> {
    return await this.hospitalMapper.findByYkiho(ykiho);
  }

  /**
   * 새로운 병원 정보 삽입
   * @param hospital 병원 정보
   */
  private async insertHospital(hospital: HiraHospitalInfo): Promise<void> {
    await this.hospitalMapper.insert(hospital);
  }

  /**
   * 기존 병원 정보 업데이트

  * @param hospital 병원 정보 (업데이트할 병원 데이터)
   */
  private async updateHospital(hospital: HiraHospitalInfo): Promise<void> {
    // HospitalMapper를 통해 데이터베이스의 기존 병원 정보 업데이트
    await this.hospitalMapper.update(hospital);
  }

  /**
   * 병원 정보 업데이트 필요 여부 확인
   * @param existing 기존 병원 정보 (데이터베이스에 저장된 현재 데이터)
   * @param newData 새로운 병원 정보 (HIRA API에서 수집된 최신 데이터)
   * @returns 업데이트 필요 여부 (데이터가 변경되었는지 여부)
   */
  private shouldUpdateHospital(existing: any, newData: HiraHospitalInfo): boolean {
    // 각 필드별로 기존 데이터와 새로운 데이터를 비교하여 변경사항이 있는지 확인
    return (
      existing.yadmNm !== newData.yadmNm ||           // 병원명 변경 여부
      existing.telno !== newData.telno ||             // 전화번호 변경 여부
      existing.hospUrl !== newData.hospUrl ||         // 홈페이지 URL 변경 여부
      existing.clCd !== newData.clCd ||               // 종별 코드 변경 여부
      existing.clCdNm !== newData.clCdNm ||           // 종별명 변경 여부
      existing.sidoCd !== newData.sidoCd ||           // 시도 코드 변경 여부
      existing.sidoCdNm !== newData.sidoCdNm ||       // 시도명 변경 여부
      existing.sgguCd !== newData.sgguCd ||           // 시군구 코드 변경 여부
      existing.sgguCdNm !== newData.sgguCdNm ||       // 시군구명 변경 여부
      existing.addr !== newData.addr ||               // 주소 변경 여부
      existing.emdongNm !== newData.emdongNm ||       // 읍면동명 변경 여부
      existing.postNo !== newData.postNo ||           // 우편번호 변경 여부
      existing.xPos !== newData.xPos ||               // X좌표(경도) 변경 여부
      existing.yPos !== newData.yPos ||               // Y좌표(위도) 변경 여부
      existing.drTotCnt !== newData.drTotCnt ||       // 의사 총 인원수 변경 여부
      existing.mdeptGdrCnt !== newData.mdeptGdrCnt || // 내과 전문의 인원수 변경 여부
      existing.mdeptIntnCnt !== newData.mdeptIntnCnt || // 내과 인턴 인원수 변경 여부
      existing.mdeptResdntCnt !== newData.mdeptResdntCnt || // 내과 레지던트 인원수 변경 여부
      existing.mdeptSdrCnt !== newData.mdeptSdrCnt || // 내과 전문의 수련의 인원수 변경 여부
      existing.detyGdrCnt !== newData.detyGdrCnt ||   // 치과 전문의 인원수 변경 여부
      existing.detyIntnCnt !== newData.detyIntnCnt || // 치과 인턴 인원수 변경 여부
      existing.detyResdntCnt !== newData.detyResdntCnt || // 치과 레지던트 인원수 변경 여부
      existing.detySdrCnt !== newData.detySdrCnt ||   // 치과 전문의 수련의 인원수 변경 여부
      existing.cmdcGdrCnt !== newData.cmdcGdrCnt ||   // 한방과 전문의 인원수 변경 여부
      existing.cmdcIntnCnt !== newData.cmdcIntnCnt || // 한방과 인턴 인원수 변경 여부
      existing.cmdcResdntCnt !== newData.cmdcResdntCnt || // 한방과 레지던트 인원수 변경 여부
      existing.cmdcSdrCnt !== newData.cmdcSdrCnt ||   // 한방과 전문의 수련의 인원수 변경 여부
      existing.pnursCnt !== newData.pnursCnt ||       // 간호사 인원수 변경 여부
      existing.estbDd !== newData.estbDd              // 개설일자 변경 여부
    );
  }

  /**
   * 병원 정보 통계 조회
   * @returns 병원 정보 통계 (전체 병원 수, 지역별 분포, 진료과목별 분포 등)
   */
  async getHospitalStats(): Promise<any> {
    try {
      // HospitalMapper를 통해 데이터베이스에서 병원 정보 통계 조회
      return await this.hospitalMapper.getStats();
    } catch (error) {
      // 통계 조회 중 오류 발생 시 로그 기록
      this.logger.error(`병원 정보 통계 조회 실패: ${error.message}`);
      throw error; // 오류를 상위로 전파
    }
  }
}
