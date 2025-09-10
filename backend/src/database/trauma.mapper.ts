/**
 * 외상센터 데이터베이스 매퍼 (TraumaMapper)
 * 
 * 이 파일은 외상센터 정보의 데이터베이스 CRUD 작업을 담당합니다.
 * 
 * 주요 기능:
 * - 외상센터 정보 조회 (HPID 기준)
 * - 새로운 외상센터 정보 삽입
 * - 기존 외상센터 정보 업데이트
 * - 외상센터 정보 삭제
 * - 통계 정보 조회 (전체 개수, 최근 업데이트 개수)
 * 
 * 데이터베이스 테이블: NEMC_TRAUMA_BASE
 * 컬럼명 규칙: UPPER_SNAKE_CASE (예: DUTY_NAME, WGS84_LON)
 * 반환 데이터: 카멜케이스로 자동 변환 (예: dutyName, wgs84Lon)
 * 
 * 외상센터는 중증외상 환자를 전문적으로 치료하는 의료기관으로,
 * 응급의료기관과 유사한 구조를 가지고 있지만 외상 치료에 특화되어 있습니다.
 * 
 * @author YAME Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { TraumaBaseInfo } from '../interfaces/data-collection.interface';

/**
 * 외상센터 데이터베이스 매퍼 클래스
 * 
 * 이 클래스는 NEMC(National Emergency Medical Center) API에서 제공하는
 * 외상센터 정보를 데이터베이스에 저장하고 관리하는 역할을 합니다.
 * 
 * 주요 특징:
 * - 스네이크 케이스 컬럼명을 카멜케이스로 자동 변환
 * - 위치 정보(POINT 형식) 지원
 * - 진료시간, 특수진료센터 정보 관리
 * - HIRA 병원 정보와의 연계 지원
 * - 외상 치료 전문성 정보 관리
 * 
 * 외상센터는 다음과 같은 특수 진료센터를 운영할 수 있습니다:
 * - 뇌혈관센터 (HVEC)
 * - 심혈관센터 (HVOC)
 * - 화상센터 (HVCC)
 * - 신경과 (HVNCC)
 * - 중증소아센터 (HVCCC)
 * - 중환자실 (HVICC)
 * - 외상센터 (H_VGC)
 */
@Injectable()
export class TraumaMapper {
  constructor(private databaseService: DatabaseService) {}

  /**
   * HPID로 외상센터 정보 조회
   * 
   * 외상센터의 고유 식별자(HPID)를 사용하여
   * 해당 센터의 상세 정보를 조회합니다.
   * 
   * @param hpid - 외상센터 고유 ID (Hospital ID)
   * @returns 외상센터 정보 객체 (카멜케이스) 또는 null
   * 
   * @example
   * const trauma = await traumaMapper.findByHpid('T000001');
   * console.log(trauma.dutyName); // "서울대병원 외상센터"
   */
  async findByHpid(hpid: string): Promise<any> {
    const query = 'SELECT * FROM NEMC_TRAUMA_BASE WHERE HPID = ?';
    const results = await this.databaseService.query(query, [hpid]);
    if (results.length > 0) {
      return this.convertSnakeToCamel(results[0]);
    }
    return null;
  }

  /**
   * 새로운 외상센터 정보 삽입
   * 
   * 데이터베이스에 존재하지 않는 새로운 외상센터 정보를
   * NEMC_TRAUMA_BASE 테이블에 삽입합니다.
   * 
   * @param trauma - 삽입할 외상센터 정보 객체
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * const newTrauma = {
   *   hpid: 'T000001',
   *   dutyName: '서울대병원 외상센터',
   *   dutyAddr: '서울시...',
   *   // ... 기타 필드들
   * };
   * await traumaMapper.insert(newTrauma);
   */
  async insert(trauma: TraumaBaseInfo): Promise<void> {
    try {
      const query = `
        INSERT INTO NEMC_TRAUMA_BASE (
          HPID, DUTY_NAME, DUTY_ADDR, DUTY_TEL1, DUTY_TEL3, POST_CDN1, POST_CDN2,
          WGS84_LON, WGS84_LAT, LOCATION, DUTY_INF, DUTY_MAPIMG, DUTY_ERYN, DUTY_HAYN, DUTY_HANO,
          HVEC, HVOC, HVCC, HVNCC, HVCCC, HVICC, H_VGC,
          DUTY_TIME1S, DUTY_TIME1C, DUTY_TIME2S, DUTY_TIME2C, DUTY_TIME3S, DUTY_TIME3C,
          DUTY_TIME4S, DUTY_TIME4C, DUTY_TIME5S, DUTY_TIME5C, DUTY_TIME6S, DUTY_TIME6C,
          DUTY_TIME7S, DUTY_TIME7C, DUTY_TIME8S, DUTY_TIME8C,
          M_KIOSK_TY25, M_KIOSK_TY1, M_KIOSK_TY2, M_KIOSK_TY3, M_KIOSK_TY4, M_KIOSK_TY5,
          M_KIOSK_TY6, M_KIOSK_TY7, M_KIOSK_TY8, M_KIOSK_TY9, M_KIOSK_TY10, M_KIOSK_TY11,
          DGID_ID_NAME, HPBDN, HPCCUYN, HPCUYN, HPERYN, HPGRYN, HPICUYN, HPNICUYN, HPOPYN,
          HIRA_YKIHO
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;

      await this.databaseService.execute(query, [
        trauma.hpid, trauma.dutyName, trauma.dutyAddr, trauma.dutyTel1, trauma.dutyTel3,
        trauma.postCdn1, trauma.postCdn2, trauma.wgs84Lon, trauma.wgs84Lat, trauma.location || null,
        trauma.dutyInf, trauma.dutyMapimg, trauma.dutyEryn, trauma.dutyHayn, trauma.dutyHano,
        trauma.hvec, trauma.hvoc, trauma.hvcc, trauma.hvncc, trauma.hvccc, trauma.hvicc, trauma.hvgc,
        trauma.dutyTime1s, trauma.dutyTime1c, trauma.dutyTime2s, trauma.dutyTime2c,
        trauma.dutyTime3s, trauma.dutyTime3c, trauma.dutyTime4s, trauma.dutyTime4c,
        trauma.dutyTime5s, trauma.dutyTime5c, trauma.dutyTime6s, trauma.dutyTime6c,
        trauma.dutyTime7s, trauma.dutyTime7c, trauma.dutyTime8s, trauma.dutyTime8c,
        trauma.MKioskTy25, trauma.MKioskTy1, trauma.MKioskTy2, trauma.MKioskTy3,
        trauma.MKioskTy4, trauma.MKioskTy5, trauma.MKioskTy6, trauma.MKioskTy7,
        trauma.MKioskTy8, trauma.MKioskTy9, trauma.MKioskTy10, trauma.MKioskTy11,
        trauma.dgidIdName, trauma.hpbdn, trauma.hpccuyn, trauma.hpcuyn, trauma.hperyn,
        trauma.hpgryn, trauma.hpicuyn, trauma.hpnicuyn, trauma.hpopyn, trauma.hira_ykiho || null
      ]);
    } catch (error) {
      console.error(`외상센터 정보 삽입 실패: ${JSON.stringify(trauma)}`);
      throw error;
    }
  }

  /**
   * 기존 외상센터 정보 업데이트
   * 
   * 이미 데이터베이스에 존재하는 외상센터의 정보를
   * 새로운 데이터로 업데이트합니다.
   * 
   * @param trauma - 업데이트할 외상센터 정보 객체
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * const updatedTrauma = {
   *   hpid: 'T000001',
   *   dutyName: '서울대병원 외상센터 (업데이트됨)',
   *   // ... 기타 수정된 필드들
   * };
   * await traumaMapper.update(updatedTrauma);
   */
  async update(trauma: TraumaBaseInfo): Promise<void> {
    try {
      const query = `
        UPDATE NEMC_TRAUMA_BASE SET
          DUTY_NAME = ?, DUTY_ADDR = ?, DUTY_TEL1 = ?, DUTY_TEL3 = ?, POST_CDN1 = ?, POST_CDN2 = ?,
          WGS84_LON = ?, WGS84_LAT = ?, LOCATION = ?, DUTY_INF = ?, DUTY_MAPIMG = ?, DUTY_ERYN = ?, DUTY_HAYN = ?, DUTY_HANO = ?,
          HVEC = ?, HVOC = ?, HVCC = ?, HVNCC = ?, HVCCC = ?, HVICC = ?, H_VGC = ?,
          DUTY_TIME1S = ?, DUTY_TIME1C = ?, DUTY_TIME2S = ?, DUTY_TIME2C = ?, DUTY_TIME3S = ?, DUTY_TIME3C = ?,
          DUTY_TIME4S = ?, DUTY_TIME4C = ?, DUTY_TIME5S = ?, DUTY_TIME5C = ?, DUTY_TIME6S = ?, DUTY_TIME6C = ?,
          DUTY_TIME7S = ?, DUTY_TIME7C = ?, DUTY_TIME8S = ?, DUTY_TIME8C = ?,
          M_KIOSK_TY25 = ?, M_KIOSK_TY1 = ?, M_KIOSK_TY2 = ?, M_KIOSK_TY3 = ?, M_KIOSK_TY4 = ?, M_KIOSK_TY5 = ?,
          M_KIOSK_TY6 = ?, M_KIOSK_TY7 = ?, M_KIOSK_TY8 = ?, M_KIOSK_TY9 = ?, M_KIOSK_TY10 = ?, M_KIOSK_TY11 = ?,
          DGID_ID_NAME = ?, HPBDN = ?, HPCCUYN = ?, HPCUYN = ?, HPERYN = ?, HPGRYN = ?, HPICUYN = ?, HPNICUYN = ?, HPOPYN = ?,
          HIRA_YKIHO = ?, UPDATED_AT = NOW()
        WHERE HPID = ?
      `;

      await this.databaseService.execute(query, [
        trauma.dutyName, trauma.dutyAddr, trauma.dutyTel1, trauma.dutyTel3,
        trauma.postCdn1, trauma.postCdn2, trauma.wgs84Lon, trauma.wgs84Lat, trauma.location || null,
        trauma.dutyInf, trauma.dutyMapimg, trauma.dutyEryn, trauma.dutyHayn, trauma.dutyHano,
        trauma.hvec, trauma.hvoc, trauma.hvcc, trauma.hvncc, trauma.hvccc, trauma.hvicc, trauma.hvgc,
        trauma.dutyTime1s, trauma.dutyTime1c, trauma.dutyTime2s, trauma.dutyTime2c,
        trauma.dutyTime3s, trauma.dutyTime3c, trauma.dutyTime4s, trauma.dutyTime4c,
        trauma.dutyTime5s, trauma.dutyTime5c, trauma.dutyTime6s, trauma.dutyTime6c,
        trauma.dutyTime7s, trauma.dutyTime7c, trauma.dutyTime8s, trauma.dutyTime8c,
        trauma.MKioskTy25, trauma.MKioskTy1, trauma.MKioskTy2, trauma.MKioskTy3,
        trauma.MKioskTy4, trauma.MKioskTy5, trauma.MKioskTy6, trauma.MKioskTy7,
        trauma.MKioskTy8, trauma.MKioskTy9, trauma.MKioskTy10, trauma.MKioskTy11,
        trauma.dgidIdName, trauma.hpbdn, trauma.hpccuyn, trauma.hpcuyn, trauma.hperyn,
        trauma.hpgryn, trauma.hpicuyn, trauma.hpnicuyn, trauma.hpopyn, trauma.hira_ykiho || null, trauma.hpid
      ]);
    } catch (error) {
      console.error(`외상센터 정보 업데이트 실패: ${JSON.stringify(trauma)}`);
      throw error;
    }
  }

  /**
   * HPID로 외상센터 정보 삭제
   * 
   * 지정된 HPID를 가진 외상센터 정보를
   * 데이터베이스에서 완전히 삭제합니다.
   * 
   * @param hpid - 삭제할 외상센터의 HPID
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * await traumaMapper.deleteByHpid('T000001');
   */
  async deleteByHpid(hpid: string): Promise<void> {
    try {
      const query = 'DELETE FROM NEMC_TRAUMA_BASE WHERE HPID = ?';
      await this.databaseService.execute(query, [hpid]);
    } catch (error) {
      console.error(`외상센터 정보 삭제 실패: HPID=${hpid}`);
      throw error;
    }
  }

  /**
   * 전체 외상센터 수 조회
   * 
   * 데이터베이스에 등록된 모든 외상센터의
   * 총 개수를 반환합니다.
   * 
   * @returns 전체 외상센터 수
   * 
   * @example
   * const totalCount = await traumaMapper.countAll();
   * console.log(`전체 외상센터 수: ${totalCount}개`);
   */
  async countAll(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM NEMC_TRAUMA_BASE';
    const results = await this.databaseService.query(query);
    return results[0]?.count || 0;
  }

  /**
   * 최근 업데이트된 외상센터 수 조회
   * 
   * 지정된 일수 내에 업데이트된 외상센터의
   * 개수를 반환합니다.
   * 
   * @param days - 기준이 되는 일수 (예: 7일 전부터)
   * @returns 최근 업데이트된 외상센터 수
   * 
   * @example
   * const recentCount = await traumaMapper.countRecentlyUpdated(7);
   * console.log(`최근 7일간 업데이트된 외상센터: ${recentCount}개`);
   */
  async countRecentlyUpdated(days: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM NEMC_TRAUMA_BASE WHERE UPDATED_AT > DATE_SUB(NOW(), INTERVAL ? DAY)';
    const results = await this.databaseService.query(query, [days]);
    return results[0]?.count || 0;
  }

  /**
   * 스네이크 케이스를 카멜케이스로 변환
   * 
   * 데이터베이스에서 반환된 UPPER_SNAKE_CASE 컬럼명을
   * JavaScript/TypeScript에서 사용하는 camelCase로 변환합니다.
   * 
   * 변환 예시:
   * - DUTY_NAME → dutyName
   * - WGS84_LON → wgs84Lon
   * - M_KIOSK_TY25 → mKioskTy25
   * - H_VGC → hVgc (외상센터 전용)
   * 
   * @param obj - 스네이크 케이스 키를 가진 객체
   * @returns 카멜케이스 키를 가진 객체
   * 
   * @private
   * 
   * @example
   * const snakeObj = { DUTY_NAME: "서울대병원 외상센터", WGS84_LON: 127.1234 };
   * const camelObj = this.convertSnakeToCamel(snakeObj);
   * // 결과: { dutyName: "서울대병원 외상센터", wgs84Lon: 127.1234 }
   */
  private convertSnakeToCamel(obj: any): any {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      converted[camelKey] = value;
    }
    return converted;
  }
}
