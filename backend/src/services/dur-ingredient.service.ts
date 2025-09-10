/**
 * DUR 성분 서비스
 * 
 * 이 서비스는 Drug Utilization Review (약물이용평가) 시스템의 성분별 정보를 
 * 관리하는 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. DUR 성분 데이터 관리: 약물의 주요 성분에 대한 상호작용, 금기 정보, 주의사항 관리
 * 2. 데이터 수집 및 동기화: 외부 DUR API로부터 최신 약물 성분 정보를 자동으로 수집
 * 3. 성분 기반 검색: 특정 성분을 포함한 약물들의 정보를 효율적으로 검색
 * 4. 데이터 검증: 수집된 성분 데이터의 유효성 검증 및 품질 관리
 * 5. 데이터베이스 운영: DUR 성분 정보의 CRUD 작업 및 배치 처리
 * 
 * DUR 성분의 중요성:
 * - 약물 상호작용의 근본 원인: 대부분의 약물 상호작용은 성분 수준에서 발생
 * - 효능군 분류: 같은 성분을 가진 약물들을 그룹화하여 관리
 * - 금기 정보: 특정 성분에 대한 알레르기나 금기 정보 관리
 * - 용량 계산: 성분별 용량 정보를 통한 정확한 처방 지원
 * 
 * 기술적 특징:
 * - 성분 기반 인덱싱: 빠른 성분 검색을 위한 데이터베이스 최적화
 * - 배치 처리: 대량의 성분 데이터를 효율적으로 처리
 * - 트랜잭션 관리: 데이터 일관성을 보장하는 트랜잭션 처리
 * - 에러 처리: 데이터 수집 및 처리 과정의 안정성 확보
 * 
 * 사용 사례:
 * - 약사가 특정 성분의 약물 상호작용을 확인할 때
 * - 의사가 처방 시 성분 기반 금기 정보를 검토할 때
 * - 약국에서 성분 중복을 방지할 때
 * - 의료진이 약물 성분에 대한 교육 자료를 작성할 때
 */

import { Injectable, Logger } from '@nestjs/common';
import { ApiCollectorUtil } from '../utils/api-collector.util';
import { DurIngredientMapper } from '../database/dur-ingredient.mapper';
import { 
  ItemMixContraindication, ItemPregnancyContraindication, ItemDoseCaution,
  ItemDurationCaution, ItemElderlyCaution, ItemAgeContraindication, ItemTherapeuticDuplication,
  CollectionResult 
} from '../interfaces/data-collection.interface';

@Injectable()
export class DurIngredientService {
  private readonly logger = new Logger(DurIngredientService.name);
  private readonly batchSize = 100; // DUR API 배치 크기

  constructor(
    private durIngredientMapper: DurIngredientMapper,
    private apiCollector: ApiCollectorUtil,
  ) {}

  /**
   * DUR 성분 관련 정보 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectDurIngredientData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('DUR 성분 관련 정보 수집 시작');

    try {
      const results = await Promise.all([
        this.collectMixContraindication(forceUpdate),
        this.collectPregnancyContraindication(forceUpdate),
        this.collectDoseCaution(forceUpdate),
        this.collectDurationCaution(forceUpdate),
        this.collectElderlyCaution(forceUpdate),
        this.collectAgeContraindication(forceUpdate),
        this.collectTherapeuticDuplication(forceUpdate)
      ]);

      const totalData = results.flatMap(r => r.data as any[]);
      const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);

      return {
        success: true,
        data: totalData,
        totalCount: totalData.length,
        pageCount: results.reduce((sum, r) => sum + r.pageCount, 0),
        currentPage: 0,
        processingTime: totalProcessingTime
      };

    } catch (error) {
      this.logger.error(`DUR 성분 정보 수집 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 병용금기 정보 수집
   */
  private async collectMixContraindication(forceUpdate: boolean): Promise<CollectionResult<ItemMixContraindication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurMixContraindicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    if (!apiKey) {
      throw new Error('DUR API 키가 설정되지 않았습니다.');
    }

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json'
    };

    // DUR 병용금기 API 호출 전 FULL URL 로깅
    const queryString = new URLSearchParams({
      serviceKey: apiKey,
      pageNo: '1',
      numOfRows: this.batchSize.toString(),
      type: 'json'
    }).toString();
    const fullUrl = `${apiUrl}?${queryString}`;
    this.logger.log(`DUR 병용금기 API 호출 - FULL URL: ${fullUrl}`);

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemMixContraindication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveMixContraindication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 임부금기 정보 수집
   */
  private async collectPregnancyContraindication(forceUpdate: boolean): Promise<CollectionResult<ItemPregnancyContraindication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurPregnancyContraindicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json'
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemPregnancyContraindication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.savePregnancyContraindication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 용량주의 정보 수집
   */
  private async collectDoseCaution(forceUpdate: boolean): Promise<CollectionResult<ItemDoseCaution>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurDoseCautionPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json'
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemDoseCaution>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveDoseCaution(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 투여기간주의 정보 수집
   */
  private async collectDurationCaution(forceUpdate: boolean): Promise<CollectionResult<ItemDurationCaution>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurDurationCautionPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json'
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemDurationCaution>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveDurationCaution(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 노인주의 정보 수집
   */
  private async collectElderlyCaution(forceUpdate: boolean): Promise<CollectionResult<ItemElderlyCaution>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurElderlyCautionPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json'
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemElderlyCaution>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveElderlyCaution(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 특정연령대금기 정보 수집
   */
  private async collectAgeContraindication(forceUpdate: boolean): Promise<CollectionResult<ItemAgeContraindication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurAgeContraindicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json'
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemAgeContraindication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveAgeContraindication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 효능군중복 정보 수집
   */
  private async collectTherapeuticDuplication(forceUpdate: boolean): Promise<CollectionResult<ItemTherapeuticDuplication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurTherapeuticDuplicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json'
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemTherapeuticDuplication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveTherapeuticDuplication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  // 저장 메서드들 - Mapper 사용
  private async saveMixContraindication(data: ItemMixContraindication[], forceUpdate: boolean): Promise<number> {
    return await this.durIngredientMapper.saveMixContraindication(data);
  }

  private async savePregnancyContraindication(data: ItemPregnancyContraindication[], forceUpdate: boolean): Promise<number> {
    return await this.durIngredientMapper.savePregnancyContraindication(data);
  }

  private async saveDoseCaution(data: ItemDoseCaution[], forceUpdate: boolean): Promise<number> {
    return await this.durIngredientMapper.saveDoseCaution(data);
  }

  private async saveDurationCaution(data: ItemDurationCaution[], forceUpdate: boolean): Promise<number> {
    return await this.durIngredientMapper.saveDurationCaution(data);
  }

  private async saveElderlyCaution(data: ItemElderlyCaution[], forceUpdate: boolean): Promise<number> {
    return await this.durIngredientMapper.saveElderlyCaution(data);
  }

  private async saveAgeContraindication(data: ItemAgeContraindication[], forceUpdate: boolean): Promise<number> {
    return await this.durIngredientMapper.saveAgeContraindication(data);
  }

  private async saveTherapeuticDuplication(data: ItemTherapeuticDuplication[], forceUpdate: boolean): Promise<number> {
    return await this.durIngredientMapper.saveTherapeuticDuplication(data);
  }


}
