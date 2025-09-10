/**
 * DUR 성분 관련 데이터베이스 작업을 위한 Mapper 클래스
 * ON DUPLICATE KEY UPDATE를 사용하여 INSERT/UPDATE 처리
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';
import { BaseMapper } from './base.mapper';

@Injectable()
export class DurIngredientMapper extends BaseMapper {
  private readonly logger = new Logger(DurIngredientMapper.name);

  constructor(databaseService: DatabaseService) {
    super(databaseService);
  }

  /**
   * DUR 병용금기 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * 복합 PK: (INGR_CODE, MIXTURE_INGR_CODE) - SQL 스키마에 맞게 수정됨
   */
  async saveMixContraindication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO DUR_MIX_CONTRAINDICATION (
          TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_KOR_NAME,
          MIX, ORI, CLASS, MIXTURE_MIX_TYPE, MIXTURE_INGR_CODE,
          MIXTURE_INGR_ENG_NAME, MIXTURE_INGR_KOR_NAME, MIXTURE_MIX,
          MIXTURE_ORI, MIXTURE_CLASS, NOTIFICATION_DATE, PROHBT_CONTENT,
          REMARK, DEL_YN, CREATED_AT, UPDATED_AT
        ) VALUES (
         ?, ?, ?, ?, ?, 
         ?, ?, ?, ?, ?, 
         ?, ?, ?, 
         ?, ?, ?, ?, 
         ?, ?, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_KOR_NAME = VALUES(INGR_KOR_NAME),
          MIX = VALUES(MIX),
          ORI = VALUES(ORI),
          CLASS = VALUES(CLASS),
          MIXTURE_MIX_TYPE = VALUES(MIXTURE_MIX_TYPE),
          MIXTURE_INGR_ENG_NAME = VALUES(MIXTURE_INGR_ENG_NAME),
          MIXTURE_INGR_KOR_NAME = VALUES(MIXTURE_INGR_KOR_NAME),
          MIXTURE_MIX = VALUES(MIXTURE_MIX),
          MIXTURE_ORI = VALUES(MIXTURE_ORI),
          MIXTURE_CLASS = VALUES(MIXTURE_CLASS),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          DEL_YN = VALUES(DEL_YN),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.item.typeName || item.item.TYPE_NAME,
        item.item.mixType || item.item.MIX_TYPE,
        item.item.ingrCode || item.item.INGR_CODE,
        item.item.ingrEngName || item.item.INGR_ENG_NAME,
        item.item.ingrKorName || item.item.INGR_KOR_NAME,
        item.item.mix || item.item.MIX,
        item.item.ori || item.item.ORI,
        item.item.class || item.item.CLASS,
        item.item.mixtureMixType || item.item.MIXTURE_MIX_TYPE,
        item.item.mixtureIngrCode || item.item.MIXTURE_INGR_CODE,
        item.item.mixtureIngrEngName || item.item.MIXTURE_INGR_ENG_NAME,
        item.item.mixtureIngrKorName || item.item.MIXTURE_INGR_KOR_NAME,
        item.item.mixtureMix || item.item.MIXTURE_MIX,
        item.item.mixtureOri || item.item.MIXTURE_ORI,
        item.item.mixtureClass || item.item.MIXTURE_CLASS,
        item.item.notificationDate || item.item.NOTIFICATION_DATE,
        item.item.prohbtContent || item.item.PROHBT_CONTENT,
        item.item.remark || item.item.REMARK,
        item.item.delYn || item.item.DEL_YN
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 병용금기 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 임부금기 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async savePregnancyContraindication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO DUR_PREGNANCY_CONTRAINDICATION (
          DUR_SEQ, TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, ORI_INGR, CLASS_NAME, FORM_NAME, GRADE, NOTIFICATION_DATE,
          PROHBT_CONTENT, REMARK, DEL_YN, CREATED_AT, UPDATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          ORI_INGR = VALUES(ORI_INGR),
          CLASS_NAME = VALUES(CLASS_NAME),
          FORM_NAME = VALUES(FORM_NAME),
          GRADE = VALUES(GRADE),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          DEL_YN = VALUES(DEL_YN),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.item.durSeq || item.item.DUR_SEQ,
        item.item.typeName || item.item.TYPE_NAME,
        item.item.mixType || item.item.MIX_TYPE,
        item.item.ingrCode || item.item.INGR_CODE,
        item.item.ingrEngName || item.item.INGR_ENG_NAME,
        item.item.ingrName || item.item.INGR_NAME,
        item.item.mixIngr || item.item.MIX_INGR,
        item.item.oriIngr || item.item.ORI_INGR,
        item.item.className || item.item.CLASS_NAME,
        item.item.formName || item.item.FORM_NAME,
        item.item.grade || item.item.GRADE,
        item.item.notificationDate || item.item.NOTIFICATION_DATE,
        item.item.prohbtContent || item.item.PROHBT_CONTENT,
        item.item.remark || item.item.REMARK,
        item.item.delYn || item.item.DEL_YN
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 임부금기 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 용량주의 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async saveDoseCaution(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO DUR_DOSE_CAUTION (
          DUR_SEQ, TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, ORI_INGR, CLASS_NAME, FORM_NAME, MAX_QTY, NOTIFICATION_DATE,
          PROHBT_CONTENT, REMARK, DEL_YN, CREATED_AT, UPDATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          ORI_INGR = VALUES(ORI_INGR),
          CLASS_NAME = VALUES(CLASS_NAME),
          FORM_NAME = VALUES(FORM_NAME),
          MAX_QTY = VALUES(MAX_QTY),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          DEL_YN = VALUES(DEL_YN),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.item.durSeq || item.item.DUR_SEQ,
        item.item.typeName || item.item.TYPE_NAME,
        item.item.mixType || item.item.MIX_TYPE,
        item.item.ingrCode || item.item.INGR_CODE,
        item.item.ingrEngName || item.item.INGR_ENG_NAME,
        item.item.ingrName || item.item.INGR_NAME,
        item.item.mixIngr || item.item.MIX_INGR,
        item.item.oriIngr || item.item.ORI_INGR,
        item.item.className || item.item.CLASS_NAME,
        item.item.formName || item.item.FORM_NAME,
        item.item.maxQty || item.item.MAX_QTY,
        item.item.notificationDate || item.item.NOTIFICATION_DATE,
        item.item.prohbtContent || item.item.PROHBT_CONTENT,
        item.item.remark || item.item.REMARK,
        item.item.delYn || item.item.DEL_YN
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 용량주의 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 투여기간주의 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async saveDurationCaution(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO DUR_DURATION_CAUTION (
          DUR_SEQ, TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, ORI_INGR, CLASS_NAME, FORM_NAME, MAX_DOSAGE_TERM, NOTIFICATION_DATE,
          PROHBT_CONTENT, REMARK, DEL_YN, CREATED_AT, UPDATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          ORI_INGR = VALUES(ORI_INGR),
          CLASS_NAME = VALUES(CLASS_NAME),
          FORM_NAME = VALUES(FORM_NAME),
          MAX_DOSAGE_TERM = VALUES(MAX_DOSAGE_TERM),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          DEL_YN = VALUES(DEL_YN),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.item.durSeq || item.item.DUR_SEQ,
        item.item.typeName || item.item.TYPE_NAME,
        item.item.mixType || item.item.MIX_TYPE,
        item.item.ingrCode || item.item.INGR_CODE,
        item.item.ingrEngName || item.item.INGR_ENG_NAME,
        item.item.ingrName || item.item.INGR_NAME,
        item.item.mixIngr || item.item.MIX_INGR,
        item.item.oriIngr || item.item.ORI_INGR,
        item.item.className || item.item.CLASS_NAME,
        item.item.formName || item.item.FORM_NAME,
        item.item.maxDosageTerm || item.item.MAX_DOSAGE_TERM,
        item.item.notificationDate || item.item.NOTIFICATION_DATE,
        item.item.prohbtContent || item.item.PROHBT_CONTENT,
        item.item.remark || item.item.REMARK,
        item.item.delYn || item.item.DEL_YN
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 투여기간주의 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 노인주의 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async saveElderlyCaution(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO DUR_ELDERLY_CAUTION (
          DUR_SEQ, TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, ORI_INGR, FORM_NAME, NOTIFICATION_DATE, PROHBT_CONTENT,
          REMARK, DEL_YN, CREATED_AT, UPDATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          ORI_INGR = VALUES(ORI_INGR),
          FORM_NAME = VALUES(FORM_NAME),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          DEL_YN = VALUES(DEL_YN),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.item.durSeq || item.item.DUR_SEQ,
        item.item.typeName || item.item.TYPE_NAME,
        item.item.mixType || item.item.MIX_TYPE,
        item.item.ingrCode || item.item.INGR_CODE,
        item.item.ingrEngName || item.item.INGR_ENG_NAME,
        item.item.ingrName || item.item.INGR_NAME,
        item.item.mixIngr || item.item.MIX_INGR,
        item.item.oriIngr || item.item.ORI_INGR,
        item.item.formName || item.item.FORM_NAME,
        item.item.notificationDate || item.item.NOTIFICATION_DATE,
        item.item.prohbtContent || item.item.PROHBT_CONTENT,
        item.item.remark || item.item.REMARK,
        item.item.delYn || item.item.DEL_YN
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 노인주의 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 특정연령대금기 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async saveAgeContraindication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO DUR_AGE_CONTRAINDICATION (
          DUR_SEQ, TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, ORI_INGR, CLASS_NAME, FORM_NAME, NOTIFICATION_DATE,
          PROHBT_CONTENT, REMARK, DEL_YN, AGE_BASE, CREATED_AT, UPDATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          ORI_INGR = VALUES(ORI_INGR),
          CLASS_NAME = VALUES(CLASS_NAME),
          FORM_NAME = VALUES(FORM_NAME),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          DEL_YN = VALUES(DEL_YN),
          AGE_BASE = VALUES(AGE_BASE),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.item.durSeq || item.item.DUR_SEQ,
        item.item.typeName || item.item.TYPE_NAME,
        item.item.mixType || item.item.MIX_TYPE,
        item.item.ingrCode || item.item.INGR_CODE,
        item.item.ingrEngName || item.item.INGR_ENG_NAME,
        item.item.ingrName || item.item.INGR_NAME,
        item.item.mixIngr || item.item.MIX_INGR,
        item.item.oriIngr || item.item.ORI_INGR,
        item.item.className || item.item.CLASS_NAME,
        item.item.formName || item.item.FORM_NAME,
        item.item.notificationDate || item.item.NOTIFICATION_DATE,
        item.item.prohbtContent || item.item.PROHBT_CONTENT,
        item.item.remark || item.item.REMARK,
        item.item.delYn || item.item.DEL_YN,
        item.item.ageBase || item.item.AGE_BASE
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 특정연령대금기 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }

  /**
   * DUR 효능군중복 데이터 저장 (ON DUPLICATE KEY UPDATE)
   * PK: DUR_SEQ
   */
  async saveTherapeuticDuplication(data: any[]): Promise<number> {
    try {
      if (data.length === 0) return 0;

      const query = `
        INSERT INTO DUR_THERAPEUTIC_DUPLICATION (
          DUR_SEQ, TYPE_NAME, MIX_TYPE, INGR_CODE, INGR_ENG_NAME, INGR_NAME,
          MIX_INGR, ORI_INGR, CLASS_NAME, EFFECT_CODE, NOTIFICATION_DATE,
          PROHBT_CONTENT, REMARK, SERS_NAME, CREATED_AT, UPDATED_AT
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          TYPE_NAME = VALUES(TYPE_NAME),
          MIX_TYPE = VALUES(MIX_TYPE),
          INGR_CODE = VALUES(INGR_CODE),
          INGR_ENG_NAME = VALUES(INGR_ENG_NAME),
          INGR_NAME = VALUES(INGR_NAME),
          MIX_INGR = VALUES(MIX_INGR),
          ORI_INGR = VALUES(ORI_INGR),
          CLASS_NAME = VALUES(CLASS_NAME),
          EFFECT_CODE = VALUES(EFFECT_CODE),
          NOTIFICATION_DATE = VALUES(NOTIFICATION_DATE),
          PROHBT_CONTENT = VALUES(PROHBT_CONTENT),
          REMARK = VALUES(REMARK),
          SERS_NAME = VALUES(SERS_NAME),
          UPDATED_AT = NOW()
      `;

      const values = data.map(item => [
        item.item.durSeq || item.item.DUR_SEQ,
        item.item.typeName || item.item.TYPE_NAME,
        item.item.mixType || item.item.MIX_TYPE,
        item.item.ingrCode || item.item.INGR_CODE,
        item.item.ingrEngName || item.item.INGR_ENG_NAME,
        item.item.ingrName || item.item.INGR_NAME,
        item.item.mixIngr || item.item.MIX_INGR,
        item.item.oriIngr || item.item.ORI_INGR,
        item.item.className || item.item.CLASS_NAME,
        item.item.effectCode || item.item.EFFECT_CODE,
        item.item.notificationDate || item.item.NOTIFICATION_DATE,
        item.item.prohbtContent || item.item.PROHBT_CONTENT,
        item.item.remark || item.item.REMARK,
        item.item.sersName || item.item.SERS_NAME
      ]);

      return await this.batchExecute(query, values);
    } catch (error) {
      this.logger.error(`DUR 효능군중복 데이터 저장 실패: ${JSON.stringify(data[0])}`);
      throw error;
    }
  }
}
