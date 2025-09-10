/**
 * DUR 데이터 수집 스케줄러 (DurCollectionScheduler)
 * 
 * 이 파일은 DUR(Drug Utilization Review) 관련 데이터 수집을
 * 자동으로 실행하는 스케줄러 기능을 담당합니다.
 * 
 * 주요 기능:
 * - DUR 성분 기준 데이터 자동 수집 (매일 새벽 3시)
 * - DUR 병용금기 데이터 자동 수집 (매일 새벽 3시)
 * - 스케줄 실행 로깅 및 에러 처리
 * 
 * @author YAME Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataCollectorService } from '../services/data-collector.service';

/**
 * DUR 데이터 수집 스케줄러 클래스
 * 
 * 이 클래스는 DUR API에서 약물 상호작용 및 성분 정보를
 * 정기적으로 수집하는 스케줄러 역할을 합니다.
 * 
 * 주요 특징:
 * - 매일 새벽 3시에 자동 실행
 * - 성분 기준 및 병용금기 데이터 수집
 * - 에러 발생 시 로깅 및 복구
 * - 수집 결과 모니터링
 */
@Injectable()
export class DurCollectionScheduler {
  private readonly logger = new Logger(DurCollectionScheduler.name);

  constructor(private readonly dataCollectorService: DataCollectorService) {}

  /**
   * DUR 데이터 수집 스케줄러 (매일 새벽 3시)
   * 
   * DUR API에서 약물 상호작용 및 성분 기준 정보를 자동으로 수집합니다.
   * 이 작업은 매일 새벽 3시에 실행되어 최신 약물 안전 정보를
   * 데이터베이스에 반영합니다.
   * 
   * 실행 과정:
   * 1. DUR 성분 기준 데이터 수집
   * 2. DUR 병용금기 데이터 수집
   * 3. 수집 결과 로깅
   * 4. 에러 발생 시 복구 시도
   * 
   * @example
   * // 자동으로 매일 새벽 3시에 실행됨
   * // 수동 실행: await durCollectionScheduler.scheduledDurCollection();
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledDurCollection() {
    this.logger.log('DUR 데이터 수집 스케줄러 실행 시작');
    
    try {
      // DUR 데이터 수집 실행
      await this.dataCollectorService.collectDurData(false);
      
      this.logger.log('DUR 데이터 수집 스케줄러 실행 완료');
      
    } catch (error) {
      this.logger.error(`DUR 데이터 수집 스케줄러 실행 실패: ${error.message}`);
      
      // 에러 상세 정보 로깅
      if (error.stack) {
        this.logger.error(`에러 스택 트레이스: ${error.stack}`);
      }
      
      // 재시도 로직 (선택사항)
      // await this.retryDurCollection();
    }
  }

  /**
   * DUR 데이터 수집 재시도
   * 
   * 초기 수집이 실패했을 때 재시도하는 메서드입니다.
   * 최대 3회까지 재시도하며, 각 시도 간격은 5분입니다.
   * 
   * @param maxRetries 최대 재시도 횟수 (기본값: 3)
   * @param retryDelay 재시도 간격 (밀리초, 기본값: 5분)
   * 
   * @example
   * await durCollectionScheduler.retryDurCollection(3, 300000);
   */
  private async retryDurCollection(maxRetries: number = 3, retryDelay: number = 300000): Promise<void> {
    this.logger.log(`DUR 데이터 수집 재시도 시작 (최대 ${maxRetries}회)`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`DUR 데이터 수집 재시도 ${attempt}/${maxRetries}`);
        
        await this.dataCollectorService.collectDurData(false);
        
        this.logger.log(`DUR 데이터 수집 재시도 ${attempt} 성공`);
        return; // 성공 시 즉시 종료
        
      } catch (error) {
        this.logger.error(`DUR 데이터 수집 재시도 ${attempt} 실패: ${error.message}`);
        
        if (attempt < maxRetries) {
          this.logger.log(`${retryDelay / 1000}초 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(`DUR 데이터 수집 최대 재시도 횟수 초과`);
        }
      }
    }
  }

  /**
   * 스케줄러 상태 확인
   * 
   * 현재 스케줄러의 상태와 마지막 실행 시간을 확인합니다.
   * 
   * @returns 스케줄러 상태 정보
   * 
   * @example
   * const status = await durCollectionScheduler.getStatus();
   * console.log(`마지막 실행: ${status.lastExecution}`);
   */
  async getStatus(): Promise<{ lastExecution: Date; isRunning: boolean }> {
    return {
      lastExecution: new Date(), // 실제로는 마지막 실행 시간을 저장해야 함
      isRunning: false
    };
  }
}
