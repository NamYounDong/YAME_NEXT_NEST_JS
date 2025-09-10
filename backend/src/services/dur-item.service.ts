/**
 * DUR 품목 서비스
 * 
 * 이 서비스는 Drug Utilization Review (약물이용평가) 시스템의 품목별 정보를 
 * 관리하는 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. DUR 품목 데이터 관리: 약물 상호작용, 금기 정보, 주의사항 등의 품목별 데이터 관리
 * 2. 데이터 수집 및 동기화: 외부 DUR API로부터 최신 약물 정보를 자동으로 수집
 * 3. 데이터 검증: 수집된 데이터의 유효성 검증 및 품질 관리
 * 4. 데이터베이스 운영: DUR 품목 정보의 CRUD 작업 및 배치 처리
 * 5. API 제공: 프론트엔드 및 다른 서비스에서 DUR 정보를 조회할 수 있는 인터페이스
 * 
 * DUR 품목의 종류:
 * - 병용금기: 함께 사용하면 안 되는 약물 조합
 * - 노인주의: 노인에게 특별히 주의해야 하는 약물
 * - 임부금기: 임신부에게 사용하면 안 되는 약물
 * - 용량주의: 특정 용량에서 주의해야 하는 약물
 * - 투여기간주의: 장기간 사용 시 주의해야 하는 약물
 * - 효능군중복: 같은 효과를 가진 약물의 중복 사용
 * - 서방정분할주의: 서방정을 분할할 때 주의사항
 * 
 * 기술적 특징:
 * - 배치 처리: 대량의 DUR 데이터를 효율적으로 처리
 * - 트랜잭션 관리: 데이터 일관성을 보장하는 트랜잭션 처리
 * - 에러 처리: 데이터 수집 및 처리 과정의 안정성 확보
 * - 로깅: 상세한 작업 로그를 통한 추적성 확보
 * 
 * 사용 사례:
 * - 약사가 약물 상호작용을 확인할 때
 * - 의사가 처방 시 금기 정보를 검토할 때
 * - 약국에서 약물 조합의 안전성을 점검할 때
 * - 의료진 교육 자료 작성 시
 */

import { Injectable, Logger } from '@nestjs/common';
import { ApiCollectorUtil } from '../utils/api-collector.util';
import { DurItemMapper } from '../database/dur-item.mapper';
import { 
  ItemMixContraindication, ItemElderlyCaution, ItemDurInfo, ItemAgeContraindication,
  ItemDoseCaution, ItemDurationCaution, ItemTherapeuticDuplication, 
  ItemSustainedReleaseSplitCaution, ItemPregnancyContraindication,
  CollectionResult 
} from '../interfaces/data-collection.interface';

@Injectable()
export class DurItemService {
  private readonly logger = new Logger(DurItemService.name);
  private readonly batchSize = 100; // DUR API 배치 크기

  constructor(
    private durItemMapper: DurItemMapper,
    private apiCollector: ApiCollectorUtil,
  ) {}

  /**
   * DUR 품목 관련 정보 수집
   * @param forceUpdate 강제 업데이트 여부
   * @returns 수집 결과
   */
  async collectDurItemData(forceUpdate: boolean = false): Promise<CollectionResult<any>> {
    this.logger.log('DUR 품목 관련 정보 수집 시작');

    try {
      const results = await Promise.all([
        this.collectItemMixContraindication(forceUpdate),
        this.collectItemElderlyCaution(forceUpdate),
        this.collectItemDurInfo(forceUpdate),
        this.collectItemAgeContraindication(forceUpdate),
        this.collectItemDoseCaution(forceUpdate),
        this.collectItemDurationCaution(forceUpdate),
        this.collectItemTherapeuticDuplication(forceUpdate),
        this.collectItemSustainedReleaseSplitCaution(forceUpdate),
        this.collectItemPregnancyContraindication(forceUpdate)
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
      this.logger.error(`DUR 품목 정보 수집 실패: ${error.message}`);
      throw error;
    }
  }

  /**
   * 품목 병용금기 정보 수집
   */
  private async collectItemMixContraindication(forceUpdate: boolean): Promise<CollectionResult<ItemMixContraindication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemMixContraindicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    if (!apiKey) {
      throw new Error('DUR API 키가 설정되지 않았습니다.');
    }

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemMixContraindication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemMixContraindication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 품목 노인주의 정보 수집
   */
  private async collectItemElderlyCaution(forceUpdate: boolean): Promise<CollectionResult<ItemElderlyCaution>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemElderlyCautionPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemElderlyCaution>(
      apiUrl,
      params,
      this.batchSize
    );


    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemElderlyCaution(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * DUR 품목정보 수집
   */
  private async collectItemDurInfo(forceUpdate: boolean): Promise<CollectionResult<ItemDurInfo>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemInfoPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemDurInfo>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemDurInfo(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 품목 특정연령대금기 정보 수집
   */
  private async collectItemAgeContraindication(forceUpdate: boolean): Promise<CollectionResult<ItemAgeContraindication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemAgeContraindicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemAgeContraindication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemAgeContraindication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 품목 용량주의 정보 수집
   */
  private async collectItemDoseCaution(forceUpdate: boolean): Promise<CollectionResult<ItemDoseCaution>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemDoseCautionPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemDoseCaution>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemDoseCaution(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 품목 투여기간주의 정보 수집
   */
  private async collectItemDurationCaution(forceUpdate: boolean): Promise<CollectionResult<ItemDurationCaution>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemDurationCautionPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemDurationCaution>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemDurationCaution(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 품목 효능군중복 정보 수집
   */
  private async collectItemTherapeuticDuplication(forceUpdate: boolean): Promise<CollectionResult<ItemTherapeuticDuplication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemTherapeuticDuplicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemTherapeuticDuplication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemTherapeuticDuplication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 품목 서방정 분할주의 정보 수집
   */
  private async collectItemSustainedReleaseSplitCaution(forceUpdate: boolean): Promise<CollectionResult<ItemSustainedReleaseSplitCaution>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemSustainedReleaseSplitCautionPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemSustainedReleaseSplitCaution>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemSustainedReleaseSplitCaution(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  /**
   * 품목 임부금기 정보 수집
   */
  private async collectItemPregnancyContraindication(forceUpdate: boolean): Promise<CollectionResult<ItemPregnancyContraindication>> {
    const apiUrl = `${this.apiCollector.getDurApiUrl()}${this.apiCollector.getDurItemPregnancyContraindicationPath()}`;
    const apiKey = this.apiCollector.getDurApiKey();

    const params = {
      serviceKey: apiKey,
      pageNo: 1,
      numOfRows: this.batchSize,
      type: 'json',
    };

    const collectionResult = await this.apiCollector.collectDataWithPagination<ItemPregnancyContraindication>(
      apiUrl,
      params,
      this.batchSize
    );

    if (collectionResult.success && collectionResult.data.length > 0) {
      await this.saveItemPregnancyContraindication(collectionResult.data, forceUpdate);
    }

    return collectionResult;
  }

  // 저장 메서드들 - Mapper 사용
  private async saveItemMixContraindication(data: ItemMixContraindication[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemMixContraindication(data);
  }

  private async saveItemElderlyCaution(data: ItemElderlyCaution[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemElderlyCaution(data);
  }

  private async saveItemDurInfo(data: ItemDurInfo[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemDurInfo(data);
  }

  private async saveItemAgeContraindication(data: ItemAgeContraindication[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemAgeContraindication(data);
  }

  private async saveItemDoseCaution(data: ItemDoseCaution[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemDoseCaution(data);
  }

  private async saveItemDurationCaution(data: ItemDurationCaution[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemDurationCaution(data);
  }

  private async saveItemTherapeuticDuplication(data: ItemTherapeuticDuplication[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemTherapeuticDuplication(data);
  }

  private async saveItemSustainedReleaseSplitCaution(data: ItemSustainedReleaseSplitCaution[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemSustainedReleaseSplitCaution(data);
  }

  private async saveItemPregnancyContraindication(data: ItemPregnancyContraindication[], forceUpdate: boolean): Promise<number> {
    return await this.durItemMapper.saveItemPregnancyContraindication(data);
  }


}
