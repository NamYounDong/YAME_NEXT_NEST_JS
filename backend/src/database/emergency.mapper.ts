/**
 * 응급의료기관 데이터베이스 매퍼 (EmergencyMapper)
 * 
 * 이 파일은 응급의료기관 정보의 데이터베이스 CRUD 작업을 담당합니다.
 * 
 * 주요 기능:
 * - 응급의료기관 정보 조회 (HPID 기준)
 * - 새로운 응급의료기관 정보 삽입
 * - 기존 응급의료기관 정보 업데이트
 * - 응급의료기관 정보 삭제
 * - 통계 정보 조회 (전체 개수, 최근 업데이트 개수)
 * - HIRA 요양기호 기반 검색
 * - 지역별 응급의료기관 검색
 * 
 * 데이터베이스 테이블: NEMC_EMERGENCY_BASE
 * 컬럼명 규칙: UPPER_SNAKE_CASE (예: DUTY_NAME, WGS84_LON)
 * 반환 데이터: 카멜케이스로 자동 변환 (예: dutyName, wgs84Lon)
 * 
 * @author YAME Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { EmergencyBaseInfo } from '../interfaces/data-collection.interface';

/**
 * 응급의료기관 데이터베이스 매퍼 클래스
 * 
 * 이 클래스는 NEMC(National Emergency Medical Center) API에서 제공하는
 * 응급의료기관 정보를 데이터베이스에 저장하고 관리하는 역할을 합니다.
 * 
 * 주요 특징:
 * - 스네이크 케이스 컬럼명을 카멜케이스로 자동 변환
 * - 위치 정보(POINT 형식) 지원
 * - 진료시간, 특수진료센터 정보 관리
 * - HIRA 병원 정보와의 연계 지원
 */
@Injectable()
export class EmergencyMapper {
  constructor(private databaseService: DatabaseService) {}

  /**
   * HPID로 응급의료기관 정보 조회
   * 
   * 응급의료기관의 고유 식별자(HPID)를 사용하여
   * 해당 기관의 상세 정보를 조회합니다.
   * 
   * @param hpid - 응급의료기관 고유 ID (Hospital ID)
   * @returns 응급의료기관 정보 객체 (카멜케이스) 또는 null
   * 
   * @example
   * const emergency = await emergencyMapper.findByHpid('A000001');
   * console.log(emergency.dutyName); // "서울대병원"
   */
  async findByHpid(hpid: string): Promise<any> {
    const query = 'SELECT * FROM NEMC_EMERGENCY_BASE WHERE HPID = ?';
    const results = await this.databaseService.query(query, [hpid]);
    if (results.length > 0) {
      return this.convertSnakeToCamel(results[0]);
    }
    return null;
  }

  /**
   * 새로운 응급의료기관 정보 삽입
   * 
   * 데이터베이스에 존재하지 않는 새로운 응급의료기관 정보를
   * NEMC_EMERGENCY_BASE 테이블에 삽입합니다.
   * 
   * @param emergency - 삽입할 응급의료기관 정보 객체
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * const newEmergency = {
   *   hpid: 'A000001',
   *   dutyName: '서울대병원',
   *   dutyAddr: '서울시...',
   *   // ... 기타 필드들
   * };
   * await emergencyMapper.insert(newEmergency);
   */
  async insert(emergency: EmergencyBaseInfo): Promise<void> {
    try {
      const query = `
        INSERT INTO NEMC_EMERGENCY_BASE (
          HPID, DUTY_NAME, DUTY_ADDR, DUTY_TEL1, DUTY_TEL3, POST_CDN1, POST_CDN2,
          WGS84_LON, WGS84_LAT, LOCATION, DUTY_INF, DUTY_MAPIMG, DUTY_ERYN, DUTY_HAYN, DUTY_HANO,
          HVEC, HVOC, HVCC, HVNCC, HVCCC, HVICC, HVGC,
          DUTY_TIME1S, DUTY_TIME1C, DUTY_TIME2S, DUTY_TIME2C, DUTY_TIME3S, DUTY_TIME3C,
          DUTY_TIME4S, DUTY_TIME4C, DUTY_TIME5S, DUTY_TIME5C, DUTY_TIME6S, DUTY_TIME6C,
          DUTY_TIME7S, DUTY_TIME7C, DUTY_TIME8S, DUTY_TIME8C,
          M_KIOSK_TY25, M_KIOSK_TY1, M_KIOSK_TY2, M_KIOSK_TY3, M_KIOSK_TY4, M_KIOSK_TY5,
          M_KIOSK_TY6, M_KIOSK_TY7, M_KIOSK_TY8, M_KIOSK_TY9, M_KIOSK_TY10, M_KIOSK_TY11,
          DGID_ID_NAME, HPBDN, HPCCUYN, HPCUYN, HPERYN, HPGRYN, HPICUYN, HPNICUYN, HPOPYN,
          HIRA_YKIHO
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, 
          ?
        )
      `;

      await this.databaseService.execute(query, [
        emergency.hpid, emergency.dutyName, emergency.dutyAddr, emergency.dutyTel1, emergency.dutyTel3,
        emergency.postCdn1, emergency.postCdn2, emergency.wgs84Lon, emergency.wgs84Lat, emergency.location || null,
        emergency.dutyInf, emergency.dutyMapimg, emergency.dutyEryn, emergency.dutyHayn, emergency.dutyHano,
        emergency.hvec, emergency.hvoc, emergency.hvcc, emergency.hvncc, emergency.hvccc, emergency.hvicc, emergency.hvgc,
        emergency.dutyTime1s, emergency.dutyTime1c, emergency.dutyTime2s, emergency.dutyTime2c,
        emergency.dutyTime3s, emergency.dutyTime3c, emergency.dutyTime4s, emergency.dutyTime4c,
        emergency.dutyTime5s, emergency.dutyTime5c, emergency.dutyTime6s, emergency.dutyTime6c,
        emergency.dutyTime7s, emergency.dutyTime7c, emergency.dutyTime8s, emergency.dutyTime8c,
        emergency.MKioskTy25, emergency.MKioskTy1, emergency.MKioskTy2, emergency.MKioskTy3,
        emergency.MKioskTy4, emergency.MKioskTy5, emergency.MKioskTy6, emergency.MKioskTy7,
        emergency.MKioskTy8, emergency.MKioskTy9, emergency.MKioskTy10, emergency.MKioskTy11,
        emergency.dgidIdName, emergency.hpbdn, emergency.hpccuyn, emergency.hpcuyn, emergency.hperyn,
        emergency.hpgryn, emergency.hpicuyn, emergency.hpnicuyn, emergency.hpopyn, emergency.hira_ykiho || null
      ]);
    } catch (error) {
      console.error(`응급의료기관 정보 삽입 실패: ${JSON.stringify(emergency)}`);
      throw error;
    }
  }

  /**
   * 기존 응급의료기관 정보 업데이트
   * 
   * 이미 데이터베이스에 존재하는 응급의료기관의 정보를
   * 새로운 데이터로 업데이트합니다.
   * 
   * @param emergency - 업데이트할 응급의료기관 정보 객체
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * const updatedEmergency = {
   *   hpid: 'A000001',
   *   dutyName: '서울대병원 (업데이트됨)',
   *   // ... 기타 수정된 필드들
   * };
   * await emergencyMapper.update(updatedEmergency);
   */
  async update(emergency: EmergencyBaseInfo): Promise<void> {
    try {
      const query = `
        UPDATE NEMC_EMERGENCY_BASE SET
          DUTY_NAME = ?, DUTY_ADDR = ?, DUTY_TEL1 = ?, DUTY_TEL3 = ?, POST_CDN1 = ?, POST_CDN2 = ?,
          WGS84_LON = ?, WGS84_LAT = ?, LOCATION = ?, DUTY_INF = ?, DUTY_MAPIMG = ?, DUTY_ERYN = ?, DUTY_HAYN = ?, DUTY_HANO = ?,
          HVEC = ?, HVOC = ?, HVCC = ?, HVNCC = ?, HVCCC = ?, HVICC = ?, HVGC = ?,
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
        emergency.dutyName, emergency.dutyAddr, emergency.dutyTel1, emergency.dutyTel3,
        emergency.postCdn1, emergency.postCdn2, emergency.wgs84Lon, emergency.wgs84Lat, emergency.location || null,
        emergency.dutyInf, emergency.dutyMapimg, emergency.dutyEryn, emergency.dutyHayn, emergency.dutyHano,
        emergency.hvec, emergency.hvoc, emergency.hvcc, emergency.hvncc, emergency.hvccc, emergency.hvicc, emergency.hvgc,
        emergency.dutyTime1s, emergency.dutyTime1c, emergency.dutyTime2s, emergency.dutyTime2c,
        emergency.dutyTime3s, emergency.dutyTime3c, emergency.dutyTime4s, emergency.dutyTime4c,
        emergency.dutyTime5s, emergency.dutyTime5c, emergency.dutyTime6s, emergency.dutyTime6c,
        emergency.dutyTime7s, emergency.dutyTime7c, emergency.dutyTime8s, emergency.dutyTime8c,
        emergency.MKioskTy25, emergency.MKioskTy1, emergency.MKioskTy2, emergency.MKioskTy3,
        emergency.MKioskTy4, emergency.MKioskTy5, emergency.MKioskTy6, emergency.MKioskTy7,
        emergency.MKioskTy8, emergency.MKioskTy9, emergency.MKioskTy10, emergency.MKioskTy11,
        emergency.dgidIdName, emergency.hpbdn, emergency.hpccuyn, emergency.hpcuyn, emergency.hperyn,
        emergency.hpgryn, emergency.hpicuyn, emergency.hpnicuyn, emergency.hpopyn, emergency.hira_ykiho || null, emergency.hpid
      ]);
    } catch (error) {
      console.error(`응급의료기관 정보 업데이트 실패: ${JSON.stringify(emergency)}`);
      throw error;
    }
  }

  /**
   * HPID로 응급의료기관 정보 삭제
   * 
   * 지정된 HPID를 가진 응급의료기관 정보를
   * 데이터베이스에서 완전히 삭제합니다.
   * 
   * @param hpid - 삭제할 응급의료기관의 HPID
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * await emergencyMapper.deleteByHpid('A000001');
   */
  async deleteByHpid(hpid: string): Promise<void> {
    try {
      const query = 'DELETE FROM NEMC_EMERGENCY_BASE WHERE HPID = ?';
      await this.databaseService.execute(query, [hpid]);
    } catch (error) {
      console.error(`응급의료기관 정보 삭제 실패: HPID=${hpid}`);
      throw error;
    }
  }

  /**
   * 전체 응급의료기관 수 조회
   * 
   * 데이터베이스에 등록된 모든 응급의료기관의
   * 총 개수를 반환합니다.
   * 
   * @returns 전체 응급의료기관 수
   * 
   * @example
   * const totalCount = await emergencyMapper.countAll();
   * console.log(`전체 응급의료기관 수: ${totalCount}개`);
   */
  async countAll(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM NEMC_EMERGENCY_BASE';
    const results = await this.databaseService.query(query);
    return results[0]?.count || 0;
  }

  /**
   * 최근 업데이트된 응급의료기관 수 조회
   * 
   * 지정된 일수 내에 업데이트된 응급의료기관의
   * 개수를 반환합니다.
   * 
   * @param days - 기준이 되는 일수 (예: 7일 전부터)
   * @returns 최근 업데이트된 응급의료기관 수
   * 
   * @example
   * const recentCount = await emergencyMapper.countRecentlyUpdated(7);
   * console.log(`최근 7일간 업데이트된 기관: ${recentCount}개`);
   */
  async countRecentlyUpdated(days: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM NEMC_EMERGENCY_BASE WHERE UPDATED_AT > DATE_SUB(NOW(), INTERVAL ? DAY)';
    const results = await this.databaseService.query(query, [days]);
    return results[0]?.count || 0;
  }

  /**
   * HIRA 요양기호로 응급의료기관 검색
   * 
   * HIRA(Health Insurance Review & Assessment Service)의
   * 요양기호를 사용하여 연계된 응급의료기관을 검색합니다.
   * 
   * @param hiraYkiho - HIRA 요양기관 기호
   * @returns 연계된 응급의료기관 정보 또는 null
   * 
   * @example
   * const emergency = await emergencyMapper.findByHiraYkiho('HIRA123456');
   * if (emergency) {
   *   console.log(`연계된 응급의료기관: ${emergency.dutyName}`);
   * }
   */
  async findByHiraYkiho(hiraYkiho: string): Promise<any> {
    const query = 'SELECT * FROM NEMC_EMERGENCY_BASE WHERE HIRA_YKIHO = ?';
    const results = await this.databaseService.query(query, [hiraYkiho]);
    if (results.length > 0) {
      return this.convertSnakeToCamel(results[0]);
    }
    return null;
  }

  /**
   * 지역별 응급의료기관 검색
   * 
   * 주소에 특정 지역명이 포함된 응급의료기관들을
   * 검색하여 반환합니다.
   * 
   * @param region - 검색할 지역명 (예: "서울시", "강남구")
   * @returns 해당 지역의 응급의료기관 목록
   * 
   * @example
   * const seoulEmergencies = await emergencyMapper.findByRegion('서울시');
   * console.log(`서울시 응급의료기관: ${seoulEmergencies.length}개`);
   */
  async findByRegion(region: string): Promise<any[]> {
    const query = 'SELECT * FROM NEMC_EMERGENCY_BASE WHERE DUTY_ADDR LIKE ?';
    const results = await this.databaseService.query(query, [`%${region}%`]);
    return results.map(result => this.convertSnakeToCamel(result));
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
   * 
   * @param obj - 스네이크 케이스 키를 가진 객체
   * @returns 카멜케이스 키를 가진 객체
   * 
   * @private
   * 
   * @example
   * const snakeObj = { DUTY_NAME: "서울대병원", WGS84_LON: 127.1234 };
   * const camelObj = this.convertSnakeToCamel(snakeObj);
   * // 결과: { dutyName: "서울대병원", wgs84Lon: 127.1234 }
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
