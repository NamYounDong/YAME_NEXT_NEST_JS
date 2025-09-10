/**
 * HIRA 병원 데이터베이스 매퍼 (HospitalMapper)
 * 
 * 이 파일은 HIRA(Health Insurance Review & Assessment Service)에서 제공하는
 * 병원 정보의 데이터베이스 CRUD 작업을 담당합니다.
 * 
 * 주요 기능:
 * - 병원 정보 조회 (YKIHO 기준)
 * - 새로운 병원 정보 삽입
 * - 기존 병원 정보 업데이트
 * - 병원 정보 삭제
 * - 통계 정보 조회 (전체 개수, 최근 업데이트 개수)
 * - 지역별 병원 검색
 * - 병원명 기반 검색
 * 
 * 데이터베이스 테이블: HIRA_HOSPITAL_INFO
 * 컬럼명 규칙: UPPER_SNAKE_CASE (예: YADM_NM, X_POS)
 * 반환 데이터: 카멜케이스로 자동 변환 (예: yadmNm, xPos)
 * 
 * HIRA는 건강보험심사평가원으로, 전국의 모든 의료기관 정보를
 * 표준화된 형태로 제공하는 공식 기관입니다.
 * 
 * @author YAME Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { HiraHospitalInfo } from '../interfaces/data-collection.interface';

/**
 * HIRA 병원 데이터베이스 매퍼 클래스
 * 
 * 이 클래스는 HIRA(Health Insurance Review & Assessment Service)에서 제공하는
 * 병원 정보를 데이터베이스에 저장하고 관리하는 역할을 합니다.
 * 
 * 주요 특징:
 * - 스네이크 케이스 컬럼명을 카멜케이스로 자동 변환
 * - 위치 정보(POINT 형식) 지원
 * - 의료진 정보 관리 (의사 수, 간호사 수 등)
 * - 행정구역 정보 관리 (시도, 시군구, 읍면동)
 * - 진료과별 전문의 수 관리
 * - HIRA와의 연계 정보 관리
 * 
 * 병원 정보에는 다음과 같은 상세 정보가 포함됩니다:
 * - 기본 정보: 기관명, 주소, 전화번호, 홈페이지
 * - 위치 정보: 경도(X_POS), 위도(Y_POS), POINT 형식
 * - 의료진 정보: 총 의사 수, 전문의 수, 인턴 수, 레지던트 수
 * - 진료과별 정보: 내과, 외과, 소아과, 산부인과, 한의과 등
 * - 행정구역: 시도, 시군구, 읍면동 코드 및 명칭
 */
@Injectable()
export class HospitalMapper {
  constructor(private databaseService: DatabaseService) {}

  /**
   * 요양기호로 병원 정보 조회
   * 
   * HIRA에서 발급하는 요양기관 기호(YKIHO)를 사용하여
   * 해당 병원의 상세 정보를 조회합니다.
   * 
   * @param ykiho - HIRA 요양기관 기호 (암호화된 식별자)
   * @returns 병원 정보 객체 (카멜케이스) 또는 null
   * 
   * @example
   * const hospital = await hospitalMapper.findByYkiho('YKIHO123456');
   * console.log(hospital.yadmNm); // "서울대병원"
   */
  async findByYkiho(ykiho: string): Promise<any> {
    const query = 'SELECT * FROM HIRA_HOSPITAL_INFO WHERE YKIHO = ?';
    const results = await this.databaseService.query(query, [ykiho]);
    if (results.length > 0) {
      return this.convertSnakeToCamel(results[0]);
    }
    return null;
  }

  /**
   * 새로운 병원 정보 삽입
   * 
   * 데이터베이스에 존재하지 않는 새로운 병원 정보를
   * HIRA_HOSPITAL_INFO 테이블에 삽입합니다.
   * 
   * @param hospital - 삽입할 병원 정보 객체
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * const newHospital = {
   *   ykiho: 'YKIHO123456',
   *   yadmNm: '서울대병원',
   *   addr: '서울시...',
   *   // ... 기타 필드들
   * };
   * await hospitalMapper.insert(newHospital);
   */
  async insert(hospital: HiraHospitalInfo): Promise<void> {
    try {
      const query = `
        INSERT INTO HIRA_HOSPITAL_INFO (
          YKIHO, YADM_NM, TELNO, HOSP_URL, CL_CD, CL_CD_NM, SIDO_CD, SIDO_CD_NM, SGGU_CD, SGGU_CD_NM,
          ADDR, EMDONG_NM, POST_NO, X_POS, Y_POS, LOCATION,
          DR_TOT_CNT, MDEPT_GDR_CNT, MDEPT_INTN_CNT, MDEPT_RESDNT_CNT, MDEPT_SDR_CNT,
          DETY_GDR_CNT, DETY_INTN_CNT, DETY_RESDNT_CNT, DETY_SDR_CNT,
          CMDC_GDR_CNT, CMDC_INTN_CNT, CMDC_RESDNT_CNT, CMDC_SDR_CNT, PNURS_CNT, ESTB_DD
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.databaseService.execute(query, [
        hospital.ykiho, hospital.yadmNm, hospital.telno, hospital.hospUrl,
        hospital.clCd, hospital.clCdNm, hospital.sidoCd, hospital.sidoCdNm,
        hospital.sgguCd, hospital.sgguCdNm, hospital.addr, hospital.emdongNm,
        hospital.postNo, hospital.xPos, hospital.yPos, hospital.location || null,
        hospital.drTotCnt, hospital.mdeptGdrCnt, hospital.mdeptIntnCnt,
        hospital.mdeptResdntCnt, hospital.mdeptSdrCnt, hospital.detyGdrCnt,
        hospital.detyIntnCnt, hospital.detyResdntCnt, hospital.detySdrCnt,
        hospital.cmdcGdrCnt, hospital.cmdcIntnCnt, hospital.cmdcResdntCnt,
        hospital.cmdcSdrCnt, hospital.pnursCnt, hospital.estbDd
      ]);
    } catch (error) {
      console.error(`병원 정보 삽입 실패: ${JSON.stringify(hospital)}`);
      throw error;
    }
  }

  /**
   * 기존 병원 정보 업데이트
   * 
   * 이미 데이터베이스에 존재하는 병원의 정보를
   * 새로운 데이터로 업데이트합니다.
   * 
   * @param hospital - 업데이트할 병원 정보 객체
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * const updatedHospital = {
   *   ykiho: 'YKIHO123456',
   *   yadmNm: '서울대병원 (업데이트됨)',
   *   // ... 기타 수정된 필드들
   * };
   * await hospitalMapper.update(updatedHospital);
   */
  async update(hospital: HiraHospitalInfo): Promise<void> {
    try {
      const query = `
        UPDATE HIRA_HOSPITAL_INFO SET
          YADM_NM = ?, TELNO = ?, HOSP_URL = ?, CL_CD = ?, CL_CD_NM = ?, 
          SIDO_CD = ?, SIDO_CD_NM = ?, SGGU_CD = ?, SGGU_CD_NM = ?, ADDR = ?, 
          EMDONG_NM = ?, POST_NO = ?, X_POS = ?, Y_POS = ?, LOCATION = ?,
          DR_TOT_CNT = ?, MDEPT_GDR_CNT = ?, MDEPT_INTN_CNT = ?, MDEPT_RESDNT_CNT = ?, MDEPT_SDR_CNT = ?,
          DETY_GDR_CNT = ?, DETY_INTN_CNT = ?, DETY_RESDNT_CNT = ?, DETY_SDR_CNT = ?,
          CMDC_GDR_CNT = ?, CMDC_INTN_CNT = ?, CMDC_RESDNT_CNT = ?, CMDC_SDR_CNT = ?, 
          PNURS_CNT = ?, ESTB_DD = ?, UPDATED_AT = NOW()
        WHERE YKIHO = ?
      `;

      await this.databaseService.execute(query, [
        hospital.yadmNm, hospital.telno, hospital.hospUrl, hospital.clCd, hospital.clCdNm,
        hospital.sidoCd, hospital.sidoCdNm, hospital.sgguCd, hospital.sgguCdNm, hospital.addr,
        hospital.emdongNm, hospital.postNo, hospital.xPos, hospital.yPos, hospital.location || null,
        hospital.drTotCnt, hospital.mdeptGdrCnt, hospital.mdeptIntnCnt, hospital.mdeptResdntCnt, hospital.mdeptSdrCnt,
        hospital.detyGdrCnt, hospital.detyIntnCnt, hospital.detyResdntCnt, hospital.detySdrCnt,
        hospital.cmdcGdrCnt, hospital.cmdcIntnCnt, hospital.cmdcResdntCnt, hospital.cmdcSdrCnt,
        hospital.pnursCnt, hospital.estbDd, hospital.ykiho
      ]);
    } catch (error) {
      console.error(`병원 정보 업데이트 실패: ${JSON.stringify(hospital)}`);
      throw error;
    }
  }

  /**
   * 요양기호로 병원 정보 삭제
   * 
   * 지정된 YKIHO를 가진 병원 정보를
   * 데이터베이스에서 완전히 삭제합니다.
   * 
   * @param ykiho - 삭제할 병원의 YKIHO
   * @throws DatabaseError - 데이터베이스 오류 발생 시
   * 
   * @example
   * await hospitalMapper.deleteByYkiho('YKIHO123456');
   */
  async deleteByYkiho(ykiho: string): Promise<void> {
    try {
      const query = 'DELETE FROM HIRA_HOSPITAL_INFO WHERE YKIHO = ?';
      await this.databaseService.execute(query, [ykiho]);
    } catch (error) {
      console.error(`병원 정보 삭제 실패: YKIHO=${ykiho}`);
      throw error;
    }
  }

  /**
   * 전체 병원 수 조회
   * 
   * 데이터베이스에 등록된 모든 병원의
   * 총 개수를 반환합니다.
   * 
   * @returns 전체 병원 수
   * 
   * @example
   * const totalCount = await hospitalMapper.countAll();
   * console.log(`전체 병원 수: ${totalCount}개`);
   */
  async countAll(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM HIRA_HOSPITAL_INFO';
    const results = await this.databaseService.query(query);
    return results[0]?.count || 0;
  }

  /**
   * 최근 업데이트된 병원 수 조회
   * 
   * 지정된 일수 내에 업데이트된 병원의
   * 개수를 반환합니다.
   * 
   * @param days - 기준이 되는 일수 (예: 7일 전부터)
   * @returns 최근 업데이트된 병원 수
   * 
   * @example
   * const recentCount = await hospitalMapper.countRecentlyUpdated(7);
   * console.log(`최근 7일간 업데이트된 병원: ${recentCount}개`);
   */
  async countRecentlyUpdated(days: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM HIRA_HOSPITAL_INFO WHERE UPDATED_AT > DATE_SUB(NOW(), INTERVAL ? DAY)';
    const results = await this.databaseService.query(query, [days]);
    return results[0]?.count || 0;
  }

  /**
   * 병원 정보 통계 조회
   * 
   * 병원 정보에 대한 종합적인 통계를 제공합니다.
   * 
   * @returns 병원 통계 정보 객체
   *   - total_count: 전체 병원 수
   *   - updated_today: 오늘 업데이트된 병원 수
   *   - updated_this_week: 이번 주 업데이트된 병원 수
   *   - last_updated: 마지막 업데이트 시각
   * 
   * @example
   * const stats = await hospitalMapper.getStats();
   * console.log(`전체: ${stats.totalCount}개, 오늘: ${stats.updatedToday}개`);
   */
  async getStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN UPDATED_AT > DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as updated_today,
        COUNT(CASE WHEN UPDATED_AT > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as updated_this_week,
        MAX(UPDATED_AT) as last_updated
      FROM HIRA_HOSPITAL_INFO
    `;
    
    const results = await this.databaseService.query(query);
    return this.convertSnakeToCamel(results[0]);
  }

  /**
   * 지역별 병원 검색
   * 
   * 시도명과 시군구명을 기준으로 병원을 검색합니다.
   * 
   * @param sido - 시도명 (예: "서울특별시", "경기도")
   * @param sggu - 시군구명 (예: "강남구", "수원시")
   * @returns 해당 지역의 병원 목록
   * 
   * @example
   * // 서울시 전체 병원 검색
   * const seoulHospitals = await hospitalMapper.findByRegion('서울특별시');
   * 
   * // 서울시 강남구 병원 검색
   * const gangnamHospitals = await hospitalMapper.findByRegion('서울특별시', '강남구');
   */
  async findByRegion(sido?: string, sggu?: string): Promise<any[]> {
    let query = 'SELECT * FROM HIRA_HOSPITAL_INFO';
    const params: any[] = [];

    if (sido && sggu) {
      query += ' WHERE SIDO_CD_NM = ? AND SGGU_CD_NM = ?';
      params.push(sido, sggu);
    } else if (sido) {
      query += ' WHERE SIDO_CD_NM = ?';
      params.push(sido);
    }

    const results = await this.databaseService.query(query, params);
    return results.map(result => this.convertSnakeToCamel(result));
  }

  /**
   * 병원명으로 검색
   * 
   * 병원명에 특정 키워드가 포함된 병원들을
   * 검색하여 반환합니다.
   * 
   * @param name - 검색할 병원명 키워드 (부분 일치)
   * @returns 병원명에 키워드가 포함된 병원 목록
   * 
   * @example
   * const seoulHospitals = await hospitalMapper.findByName('서울');
   * console.log(`"서울"이 포함된 병원: ${seoulHospitals.length}개`);
   */
  async findByName(name: string): Promise<any[]> {
    const query = 'SELECT * FROM HIRA_HOSPITAL_INFO WHERE YADM_NM LIKE ?';
    const results = await this.databaseService.query(query, [`%${name}%`]);
    return results.map(result => this.convertSnakeToCamel(result));
  }

  /**
   * 스네이크 케이스를 카멜케이스로 변환
   * 
   * 데이터베이스에서 반환된 UPPER_SNAKE_CASE 컬럼명을
   * JavaScript/TypeScript에서 사용하는 camelCase로 변환합니다.
   * 
   * 변환 예시:
   * - YADM_NM → yadmNm
   * - X_POS → xPos
   * - DR_TOT_CNT → drTotCnt
   * - MDEPT_GDR_CNT → mdeptGdrCnt
   * 
   * @param obj - 스네이크 케이스 키를 가진 객체
   * @returns 카멜케이스 키를 가진 객체
   * 
   * @private
   * 
   * @example
   * const snakeObj = { YADM_NM: "서울대병원", X_POS: 127.1234 };
   * const camelObj = this.convertSnakeToCamel(snakeObj);
   * // 결과: { yadmNm: "서울대병원", xPos: 127.1234 }
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
