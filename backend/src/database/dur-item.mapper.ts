/**
 * DUR 품목 데이터베이스 매퍼
 * 
 * 이 클래스는 Drug Utilization Review (약물이용평가) 시스템의 품목별 정보를 
 * 데이터베이스에서 관리하는 전용 매퍼입니다.
 * 
 * 주요 역할:
 * 1. DUR 품목 데이터 관리: 약물 상호작용, 금기 정보, 주의사항 등의 품목별 데이터 CRUD 작업
 * 2. 대량 데이터 처리: 외부 DUR API로부터 수집된 대량의 품목 데이터를 효율적으로 처리
 * 3. 데이터 검증: 수집된 데이터의 유효성 검증 및 품질 관리
 * 4. 성능 최적화: DUR 품목 정보 조회 및 검색 성능 최적화
 * 5. 데이터 무결성: DUR 품목 데이터의 일관성 및 정확성 보장
 * 
 * 관리하는 DUR 품목 유형:
 * - 병용금기 (UsjntTaboo): 함께 사용하면 안 되는 약물 조합 정보
 * - 노인주의 (OdsnAtent): 노인에게 특별히 주의해야 하는 약물 정보
 * - 임부금기 (PwnmTaboo): 임신부에게 사용하면 안 되는 약물 정보
 * - 용량주의 (CpctyAtent): 특정 용량에서 주의해야 하는 약물 정보
 * - 투여기간주의 (MdctnPdAtent): 장기간 사용 시 주의해야 하는 약물 정보
 * - 효능군중복 (EfcyDplct): 같은 효과를 가진 약물의 중복 사용 정보
 * - 서방정분할주의 (SeobangjeongPartitn): 서방정을 분할할 때 주의사항
 * 
 * 데이터 구조:
 * - 기본 정보: 품목 일련번호, 품목명, 업체명, 제형 정보
 * - 성분 정보: 주요 성분 코드, 성분명, 혼합 성분 정보
 * - 유형 정보: DUR 유형 코드, 유형명, 상세 분류
 * - 주의사항: 금기 내용, 주의사항, 상세 설명
 * - 메타데이터: 생성일시, 수정일시, 데이터 소스 정보
 * 
 * 기술적 특징:
 * - 배치 처리: 대량의 DUR 데이터를 효율적으로 처리하기 위한 배치 INSERT/UPDATE
 * - 인덱스 최적화: 품목명, 성분코드, 유형별 빠른 검색을 위한 복합 인덱스
 * - 트랜잭션 관리: 데이터 일관성을 보장하는 트랜잭션 처리
 * - 에러 처리: 데이터 처리 실패 시 상세한 에러 로깅 및 복구
 * - 성능 모니터링: 쿼리 실행 시간 및 처리량 모니터링
 * 
 * 데이터 품질 관리:
 * - 중복 데이터 제거: 동일한 품목 정보의 중복 저장 방지
 * - 데이터 검증: 필수 필드 누락 및 데이터 형식 검증
 * - 이력 관리: DUR 정보 변경 이력 추적 및 관리
 * - 데이터 소스 추적: 각 데이터의 출처 및 수집 시점 기록
 * 
 * 사용 사례:
 * - 약사가 약물 상호작용을 확인할 때
 * - 의사가 처방 시 금기 정보를 검토할 때
 * - 약국에서 약물 조합의 안전성을 점검할 때
 * - 의료진 교육 자료 작성 시
 * - DUR 데이터 품질 점검 및 모니터링 시
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { BaseMapper } from './base.mapper';

@Injectable()
export class DurItemMapper extends BaseMapper {
  private readonly logger = new Logger(DurItemMapper.name);

  constructor(databaseService: DatabaseService) {
    super(databaseService);
  }

  /**
   * DUR 품목 메타정보 저장 (ON DUPLICATE KEY UPDATE)
   * PK: ITEM_SEQ
   */
  async saveItemDurInfo(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_DUR_INFO (
          ITEM_SEQ, ITEM_NAME, ENTP_NAME, ITEM_PERMIT_DATE, ETC_OTC_CODE,
          CLASS_NO, CHART, BAR_CODE, MATERIAL_NAME, EE_DOC_ID, UD_DOC_ID,
          NB_DOC_ID, INSERT_FILE, STORAGE_METHOD, VALID_TERM, REEXAM_TARGET,
          REEXAM_DATE, PACK_UNIT, EDI_CODE, CANCEL_DATE, CANCEL_NAME,
          TYPE_CODE, TYPE_NAME, CHANGE_DATE, BIZRNO, CREATED_AT, UPDATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          ITEM_NAME = VALUES(ITEM_NAME),
          ENTP_NAME = VALUES(ENTP_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          ETC_OTC_CODE = VALUES(ETC_OTC_CODE),
          CLASS_NO = VALUES(CLASS_NO),
          CHART = VALUES(CHART),
          BAR_CODE = VALUES(BAR_CODE),
          MATERIAL_NAME = VALUES(MATERIAL_NAME),
          EE_DOC_ID = VALUES(EE_DOC_ID),
          UD_DOC_ID = VALUES(UD_DOC_ID),
          NB_DOC_ID = VALUES(NB_DOC_ID),
          INSERT_FILE = VALUES(INSERT_FILE),
          STORAGE_METHOD = VALUES(STORAGE_METHOD),
          VALID_TERM = VALUES(VALID_TERM),
          REEXAM_TARGET = VALUES(REEXAM_TARGET),
          REEXAM_DATE = VALUES(REEXAM_DATE),
          PACK_UNIT = VALUES(PACK_UNIT),
          EDI_CODE = VALUES(EDI_CODE),
          CANCEL_DATE = VALUES(CANCEL_DATE),
          CANCEL_NAME = VALUES(CANCEL_NAME),
          TYPE_CODE = VALUES(TYPE_CODE),
          TYPE_NAME = VALUES(TYPE_NAME),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          BIZRNO = VALUES(BIZRNO),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.entpName || item.ENTP_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.etcOtcCode || item.ETC_OTC_CODE,
        item.classNo || item.CLASS_NO,
        item.chart || item.CHART,
        item.barCode || item.BAR_CODE,
        item.materialName || item.MATERIAL_NAME,
        item.eeDocId || item.EE_DOC_ID,
        item.udDocId || item.UD_DOC_ID,
        item.nbDocId || item.NB_DOC_ID,
        item.insertFile || item.INSERT_FILE,
        item.storageMethod || item.STORAGE_METHOD,
        item.validTerm || item.VALID_TERM,
        item.reexamTarget || item.REEXAM_TARGET,
        item.reexamDate || item.REEXAM_DATE,
        item.packUnit || item.PACK_UNIT,
        item.ediCode || item.EDI_CODE,
        item.cancelDate || item.CANCEL_DATE,
        item.cancelName || item.CANCEL_NAME,
        item.typeCode || item.TYPE_CODE,
        item.typeName || item.TYPE_NAME,
        item.changeDate || item.CHANGE_DATE,
        item.bizrno || item.BIZRNO
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 메타정보 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 품목 병용금기 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async saveItemMixContraindication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_MIX_CONTRAINDICATION (
          DUR_SEQ, TYPE_CODE, TYPE_NAME, MIX,
          INGR_CODE, INGR_KOR_NAME, INGR_ENG_NAME, MIX_INGR,
          ITEM_SEQ, ITEM_NAME, ENTP_NAME, CHART, FORM_CODE, ETC_OTC_CODE, CLASS_CODE,
          FORM_NAME, ETC_OTC_NAME, CLASS_NAME, MAIN_INGR,

          MIXTURE_DUR_SEQ, MIXTURE_MIX, MIXTURE_INGR_CODE,
          MIXTURE_INGR_KOR_NAME, MIXTURE_INGR_ENG_NAME,
          MIXTURE_ITEM_SEQ, MIXTURE_ITEM_NAME, MIXTURE_ENTP_NAME,
          MIXTURE_FORM_CODE, MIXTURE_ETC_OTC_CODE, MIXTURE_CLASS_CODE,
          MIXTURE_FORM_NAME, MIXTURE_ETC_OTC_NAME, MIXTURE_CLASS_NAME, MIXTURE_MAIN_INGR,

          NOTIFICATION_DATE, PROHBT_CONTENT, REMARK,
          ITEM_PERMIT_DATE, MIXTURE_ITEM_PERMIT_DATE, MIXTURE_CHART,
          CHANGE_DATE, MIXTURE_CHANGE_DATE, BIZRNO,
          CREATED_AT, UPDATED_AT
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,

          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,

          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_CODE                 = VALUES(TYPE_CODE),
          TYPE_NAME                 = VALUES(TYPE_NAME),
          MIX                       = VALUES(MIX),
          INGR_CODE                 = VALUES(INGR_CODE),
          INGR_KOR_NAME             = VALUES(INGR_KOR_NAME),
          INGR_ENG_NAME             = VALUES(INGR_ENG_NAME),
          MIX_INGR                  = VALUES(MIX_INGR),
          ITEM_NAME                 = VALUES(ITEM_NAME),
          ENTP_NAME                 = VALUES(ENTP_NAME),
          CHART                     = VALUES(CHART),
          FORM_CODE                 = VALUES(FORM_CODE),
          ETC_OTC_CODE              = VALUES(ETC_OTC_CODE),
          CLASS_CODE                = VALUES(CLASS_CODE),
          FORM_NAME                 = VALUES(FORM_NAME),
          ETC_OTC_NAME              = VALUES(ETC_OTC_NAME),
          CLASS_NAME                = VALUES(CLASS_NAME),
          MAIN_INGR                 = VALUES(MAIN_INGR),

          MIXTURE_MIX               = VALUES(MIXTURE_MIX),
          MIXTURE_INGR_CODE         = VALUES(MIXTURE_INGR_CODE),
          MIXTURE_INGR_KOR_NAME     = VALUES(MIXTURE_INGR_KOR_NAME),
          MIXTURE_INGR_ENG_NAME     = VALUES(MIXTURE_INGR_ENG_NAME),
          MIXTURE_DUR_SEQ           = VALUES(MIXTURE_DUR_SEQ),
          MIXTURE_ITEM_NAME         = VALUES(MIXTURE_ITEM_NAME),
          MIXTURE_ENTP_NAME         = VALUES(MIXTURE_ENTP_NAME),
          MIXTURE_FORM_CODE         = VALUES(MIXTURE_FORM_CODE),
          MIXTURE_ETC_OTC_CODE      = VALUES(MIXTURE_ETC_OTC_CODE),
          MIXTURE_CLASS_CODE        = VALUES(MIXTURE_CLASS_CODE),
          MIXTURE_FORM_NAME         = VALUES(MIXTURE_FORM_NAME),
          MIXTURE_ETC_OTC_NAME      = VALUES(MIXTURE_ETC_OTC_NAME),
          MIXTURE_CLASS_NAME        = VALUES(MIXTURE_CLASS_NAME),
          MIXTURE_MAIN_INGR         = VALUES(MIXTURE_MAIN_INGR),

          NOTIFICATION_DATE         = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT            = VALUES(PROHBT_CONTENT),
          REMARK                    = VALUES(REMARK),
          ITEM_PERMIT_DATE          = VALUES(ITEM_PERMIT_DATE),
          MIXTURE_ITEM_PERMIT_DATE  = VALUES(MIXTURE_ITEM_PERMIT_DATE),
          MIXTURE_CHART             = VALUES(MIXTURE_CHART),
          CHANGE_DATE               = VALUES(CHANGE_DATE),
          MIXTURE_CHANGE_DATE       = VALUES(MIXTURE_CHANGE_DATE),
          BIZRNO                    = VALUES(BIZRNO),
          UPDATED_AT                = NOW();
      `;


      // durSeq가 없는 데이터는 제외하고 로그 출력
      const filteredData = data.filter(item => {
        const durSeq = item.durSeq || item.DUR_SEQ;
        if (!durSeq) {
          this.logger.warn(`⚠️ DUR_SEQ가 없는 데이터 제외: ${JSON.stringify(item)}`);
          return false;
        }
        return true;
      });

      this.logger.log(`📊 데이터 필터링 결과: 전체 ${data.length}개 중 유효한 데이터 ${filteredData.length}개`);

      const values = filteredData.map(item => [
        item.durSeq || item.DUR_SEQ,
        item.typeCode || item.TYPE_CODE,
        item.typeName || item.TYPE_NAME,
        item.mix || item.MIX,
      
        item.ingrCode || item.INGR_CODE,
        item.ingrKorName || item.INGR_KOR_NAME,
        item.ingrEngName || item.INGR_ENG_NAME,
        item.mixIngr || item.MIX_INGR,
      
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.formCode || item.FORM_CODE,
        item.etcOtcCode || item.ETC_OTC_CODE,
        item.classCode || item.CLASS_CODE,
      
        item.formName || item.FORM_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.className || item.CLASS_NAME,
        item.mainIngr || item.MAIN_INGR,
      
        item.mixtureDurSeq || item.MIXTURE_DUR_SEQ,
        item.mixtureMix || item.MIXTURE_MIX,
        item.mixtureIngrCode || item.MIXTURE_INGR_CODE,
        item.mixtureIngrKorName || item.MIXTURE_INGR_KOR_NAME,
        item.mixtureIngrEngName || item.MIXTURE_INGR_ENG_NAME,
        item.mixtureItemSeq || item.MIXTURE_ITEM_SEQ,
        item.mixtureItemName || item.MIXTURE_ITEM_NAME,
        item.mixtureEntpName || item.MIXTURE_ENTP_NAME,
        item.mixtureFormCode || item.MIXTURE_FORM_CODE,
        item.mixtureEtcOtcCode || item.MIXTURE_ETC_OTC_CODE,
        item.mixtureClassCode || item.MIXTURE_CLASS_CODE,
        item.mixtureFormName || item.MIXTURE_FORM_NAME,
        item.mixtureEtcOtcName || item.MIXTURE_ETC_OTC_NAME,
        item.mixtureClassName || item.MIXTURE_CLASS_NAME,
        item.mixtureMainIngr || item.MIXTURE_MAIN_INGR,
      
        item.notificationDate || item.NOTIFICATION_DATE,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.mixtureItemPermitDate || item.MIXTURE_ITEM_PERMIT_DATE,
        item.mixtureChart || item.MIXTURE_CHART,
        item.changeDate || item.CHANGE_DATE,
        item.mixtureChangeDate || item.MIXTURE_CHANGE_DATE,
        item.bizrno || item.BIZRNO,
      ]);


      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 병용금기 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    } finally {
      this.logger.log("DUR 품목 병용금기 데이터 저장 완료");
    }
  }

  /**
   * DUR 품목 노인주의 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: ITEM_SEQ (SQL 스키마에 맞게 수정됨)
   */
  async saveItemElderlyCaution(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_ELDERLY_CAUTION (
          TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, FORM_NAME, ITEM_SEQ, ITEM_NAME, ITEM_PERMIT_DATE,
          ENTP_NAME, CHART, CLASS_CODE, CLASS_NAME, ETC_OTC_NAME, MAIN_INGR,
          NOTIFICATION_DATE, PROHBT_CONTENT, REMARK, INGR_ENG_NAME_FULL,
          CHANGE_DATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, 
          ?, ?, ?, ?, ?, ?, 
          ?, ?, ?, ?,
          ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          FORM_NAME = VALUES(FORM_NAME),
          ITEM_NAME = VALUES(ITEM_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          ENTP_NAME = VALUES(ENTP_NAME),
          CHART = VALUES(CHART),
          CLASS_CODE = VALUES(CLASS_CODE),
          CLASS_NAME = VALUES(CLASS_NAME),
          ETC_OTC_NAME = VALUES(ETC_OTC_NAME),
          MAIN_INGR = VALUES(MAIN_INGR),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          INGR_ENG_NAME_FULL = VALUES(INGR_ENG_NAME_FULL),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.typeName || item.TYPE_NAME,
        item.mixType || item.MIX_TYPE,
        item.ingrCode || item.INGR_CODE,
        item.ingrEngName || item.INGR_ENG_NAME,
        item.ingrName || item.INGR_NAME,
        item.mixIngr || item.MIX_INGR,
        item.formName || item.FORM_NAME,
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.classCode || item.CLASS_CODE,
        item.className || item.CLASS_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.mainIngr || item.MAIN_INGR,
        item.notificationDate || item.NOTIFICATION_DATE,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.ingrEngNameFull || item.INGR_ENG_NAME_FULL,
        item.changeDate || item.CHANGE_DATE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 노인주의 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 품목 특정연령대금기 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: ITEM_SEQ (SQL 스키마에 맞게 수정됨)
   */
  async saveItemAgeContraindication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_AGE_CONTRAINDICATION (
          TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, FORM_NAME, ITEM_SEQ, ITEM_NAME, ITEM_PERMIT_DATE,
          ENTP_NAME, CHART, CLASS_CODE, CLASS_NAME, ETC_OTC_NAME, MAIN_INGR,
          NOTIFICATION_DATE, PROHBT_CONTENT, REMARK, INGR_ENG_NAME_FULL,
          CHANGE_DATE, CREATED_AT, UPDATED_AT
        ) VALUES (
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, ?, 
         ?, ?, ?, ?,
         ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          FORM_NAME = VALUES(FORM_NAME),
          ITEM_NAME = VALUES(ITEM_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          ENTP_NAME = VALUES(ENTP_NAME),
          CHART = VALUES(CHART),
          CLASS_CODE = VALUES(CLASS_CODE),
          CLASS_NAME = VALUES(CLASS_NAME),
          ETC_OTC_NAME = VALUES(ETC_OTC_NAME),
          MAIN_INGR = VALUES(MAIN_INGR),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          INGR_ENG_NAME_FULL = VALUES(INGR_ENG_NAME_FULL),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.typeName || item.TYPE_NAME,
        item.mixType || item.MIX_TYPE,
        item.ingrCode || item.INGR_CODE,
        item.ingrEngName || item.INGR_ENG_NAME,
        item.ingrName || item.INGR_NAME,
        item.mixIngr || item.MIX_INGR,
        item.formName || item.FORM_NAME,
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.classCode || item.CLASS_CODE,
        item.className || item.CLASS_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.mainIngr || item.MAIN_INGR,
        item.notificationDate || item.NOTIFICATION_DATE,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.ingrEngNameFull || item.INGR_ENG_NAME_FULL,
        item.changeDate || item.CHANGE_DATE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 특정연령대금기 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 품목 용량주의 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: ITEM_SEQ (SQL 스키마에 맞게 수정됨)
   */
  async saveItemDoseCaution(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_DOSE_CAUTION (
          TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, FORM_NAME, ITEM_SEQ, ITEM_NAME, ITEM_PERMIT_DATE,
          ENTP_NAME, CHART, CLASS_CODE, CLASS_NAME, ETC_OTC_NAME, MAIN_INGR,
          NOTIFICATION_DATE, PROHBT_CONTENT, REMARK, INGR_ENG_NAME_FULL,
          CHANGE_DATE, CREATED_AT, UPDATED_AT
        ) VALUES (
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          FORM_NAME = VALUES(FORM_NAME),
          ITEM_NAME = VALUES(ITEM_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          ENTP_NAME = VALUES(ENTP_NAME),
          CHART = VALUES(CHART),
          CLASS_CODE = VALUES(CLASS_CODE),
          CLASS_NAME = VALUES(CLASS_NAME),
          ETC_OTC_NAME = VALUES(ETC_OTC_NAME),
          MAIN_INGR = VALUES(MAIN_INGR),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          INGR_ENG_NAME_FULL = VALUES(INGR_ENG_NAME_FULL),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.typeName || item.TYPE_NAME,
        item.mixType || item.MIX_TYPE,
        item.ingrCode || item.INGR_CODE,
        item.ingrEngName || item.INGR_ENG_NAME,
        item.ingrName || item.INGR_NAME,
        item.mixIngr || item.MIX_INGR,
        item.formName || item.FORM_NAME,
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.classCode || item.CLASS_CODE,
        item.className || item.CLASS_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.mainIngr || item.MAIN_INGR,
        item.notificationDate || item.NOTIFICATION_DATE,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.ingrEngNameFull || item.INGR_ENG_NAME_FULL,
        item.changeDate || item.CHANGE_DATE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 용량주의 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 품목 투여기간주의 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: ITEM_SEQ (SQL 스키마에 맞게 수정됨)
   */
  async saveItemDurationCaution(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_DURATION_CAUTION (
          TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, FORM_NAME, ITEM_SEQ, ITEM_NAME, ITEM_PERMIT_DATE,
          ENTP_NAME, CHART, CLASS_CODE, CLASS_NAME, ETC_OTC_NAME, MAIN_INGR,
          NOTIFICATION_DATE, PROHBT_CONTENT, REMARK, INGR_ENG_NAME_FULL,
          CHANGE_DATE, CREATED_AT, UPDATED_AT
        ) VALUES (
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          FORM_NAME = VALUES(FORM_NAME),
          ITEM_NAME = VALUES(ITEM_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          ENTP_NAME = VALUES(ENTP_NAME),
          CHART = VALUES(CHART),
          CLASS_CODE = VALUES(CLASS_CODE),
          CLASS_NAME = VALUES(CLASS_NAME),
          ETC_OTC_NAME = VALUES(ETC_OTC_NAME),
          MAIN_INGR = VALUES(MAIN_INGR),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          INGR_ENG_NAME_FULL = VALUES(INGR_ENG_NAME_FULL),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.typeName || item.TYPE_NAME,
        item.mixType || item.MIX_TYPE,
        item.ingrCode || item.INGR_CODE,
        item.ingrEngName || item.INGR_ENG_NAME,
        item.ingrName || item.INGR_NAME,
        item.mixIngr || item.MIX_INGR,
        item.formName || item.FORM_NAME,
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.classCode || item.CLASS_CODE,
        item.className || item.CLASS_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.mainIngr || item.MAIN_INGR,
        item.notificationDate || item.NOTIFICATION_DATE,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.ingrEngNameFull || item.INGR_ENG_NAME_FULL,
        item.changeDate || item.CHANGE_DATE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 투여기간주의 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 품목 효능군중복 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async saveItemTherapeuticDuplication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_THERAPEUTIC_DUPLICATION (
          DUR_SEQ, EFFECT_NAME, TYPE_NAME, INGR_CODE, INGR_NAME, INGR_ENG_NAME,
          FORM_CODE_NAME, MIX, MIX_INGR, ITEM_SEQ, ITEM_NAME, ITEM_PERMIT_DATE,
          ENTP_NAME, CHART, CLASS_CODE, CLASS_NAME, ETC_OTC_NAME, MAIN_INGR,
          NOTIFICATION_DATE, PROHBT_CONTENT, REMARK, INGR_ENG_NAME_FULL,
          CHANGE_DATE, CREATED_AT, UPDATED_AT
        ) VALUES (
         ?, ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, 
         ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          EFFECT_NAME = VALUES(EFFECT_NAME),
          TYPE_NAME = VALUES(TYPE_NAME),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_NAME = VALUES(INGR_NAME),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          FORM_CODE_NAME = VALUES(FORM_CODE_NAME),
          MIX = VALUES(MIX),
          MIX_INGR = VALUES(MIX_INGR),
          ITEM_SEQ = VALUES(ITEM_SEQ),
          ITEM_NAME = VALUES(ITEM_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          ENTP_NAME = VALUES(ENTP_NAME),
          CHART = VALUES(CHART),
          CLASS_CODE = VALUES(CLASS_CODE),
          CLASS_NAME = VALUES(CLASS_NAME),
          ETC_OTC_NAME = VALUES(ETC_OTC_NAME),
          MAIN_INGR = VALUES(MAIN_INGR),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          INGR_ENG_NAME_FULL = VALUES(INGR_ENG_NAME_FULL),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.durSeq || item.DUR_SEQ,
        item.effectName || item.EFFECT_NAME,
        item.typeName || item.TYPE_NAME,
        item.ingrCode || item.INGR_CODE,
        item.ingrName || item.INGR_NAME,
        item.ingrEngName || item.INGR_ENG_NAME,
        item.formCodeName || item.FORM_CODE_NAME,
        item.mix || item.MIX,
        item.mixIngr || item.MIX_INGR,
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.classCode || item.CLASS_CODE,
        item.className || item.CLASS_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.mainIngr || item.MAIN_INGR,
        item.notificationDate || item.NOTIFICATION_DATE,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.ingrEngNameFull || item.INGR_ENG_NAME_FULL,
        item.changeDate || item.CHANGE_DATE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 효능군중복 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 품목 서방정 분할주의 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: ITEM_SEQ (SQL 스키마에 맞게 수정됨)
   */
  async saveItemSustainedReleaseSplitCaution(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_SUSTAINED_RELEASE_SPLIT_CAUTION (
          TYPE_NAME, ITEM_SEQ, ITEM_NAME, ITEM_PERMIT_DATE, FORM_CODE_NAME,

          ENTP_NAME, CHART, CLASS_CODE, CLASS_NAME, ETC_OTC_NAME, MIX,

          MAIN_INGR, PROHBT_CONTENT, REMARK, CHANGE_DATE, CREATED_AT, UPDATED_AT

        ) VALUES (
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          ITEM_NAME = VALUES(ITEM_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          FORM_CODE_NAME = VALUES(FORM_CODE_NAME),
          ENTP_NAME = VALUES(ENTP_NAME),
          CHART = VALUES(CHART),
          CLASS_CODE = VALUES(CLASS_CODE),
          CLASS_NAME = VALUES(CLASS_NAME),
          ETC_OTC_NAME = VALUES(ETC_OTC_NAME),
          MIX = VALUES(MIX),
          MAIN_INGR = VALUES(MAIN_INGR),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.typeName || item.TYPE_NAME,
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.formCodeName || item.FORM_CODE_NAME,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.classCode || item.CLASS_CODE,
        item.className || item.CLASS_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.mix || item.MIX,
        item.mainIngr || item.MAIN_INGR,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.changeDate || item.CHANGE_DATE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 서방정 분할주의 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 품목 임부금기 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: ITEM_SEQ (SQL 스키마에 맞게 수정됨)
   */
  async saveItemPregnancyContraindication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO ITEM_PREGNANCY_CONTRAINDICATION (
          TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, FORM_NAME, ITEM_SEQ, ITEM_NAME, ITEM_PERMIT_DATE,
          ENTP_NAME, CHART, CLASS_CODE, CLASS_NAME, ETC_OTC_NAME, MAIN_INGR,
          NOTIFICATION_DATE, PROHBT_CONTENT, REMARK, INGR_ENG_NAME_FULL,
          CHANGE_DATE, CREATED_AT, UPDATED_AT
        ) VALUES (
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, ?, 
         ?, ?, ?,?,
         ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          FORM_NAME = VALUES(FORM_NAME),
          ITEM_NAME = VALUES(ITEM_NAME),
          ITEM_PERMIT_DATE = VALUES(ITEM_PERMIT_DATE),
          ENTP_NAME = VALUES(ENTP_NAME),
          CHART = VALUES(CHART),
          CLASS_CODE = VALUES(CLASS_CODE),
          CLASS_NAME = VALUES(CLASS_NAME),
          ETC_OTC_NAME = VALUES(ETC_OTC_NAME),
          MAIN_INGR = VALUES(MAIN_INGR),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          INGR_ENG_NAME_FULL = VALUES(INGR_ENG_NAME_FULL),
          CHANGE_DATE = VALUES(CHANGE_DATE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.typeName || item.TYPE_NAME,
        item.mixType || item.MIX_TYPE,
        item.ingrCode || item.INGR_CODE,
        item.ingrEngName || item.INGR_ENG_NAME,
        item.ingrName || item.INGR_NAME,
        item.mixIngr || item.MIX_INGR,
        item.formName || item.FORM_NAME,
        item.itemSeq || item.ITEM_SEQ,
        item.itemName || item.ITEM_NAME,
        item.itemPermitDate || item.ITEM_PERMIT_DATE,
        item.entpName || item.ENTP_NAME,
        item.chart || item.CHART,
        item.classCode || item.CLASS_CODE,
        item.className || item.CLASS_NAME,
        item.etcOtcName || item.ETC_OTC_NAME,
        item.mainIngr || item.MAIN_INGR,
        item.notificationDate || item.NOTIFICATION_DATE,
        item.prohbtContent || item.PROHBT_CONTENT,
        item.remark || item.REMARK,
        item.ingrEngNameFull || item.INGR_ENG_NAME_FULL,
        item.changeDate || item.CHANGE_DATE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 품목 임부금기 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }
}
