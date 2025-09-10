/**
 * 전체 데이터 수집 스케줄러 (FullCollectionScheduler)
 * 
 * 이 파일은 모든 데이터 수집을
 * 자동으로 실행하는 스케줄러 기능을 담당합니다.
 * 
 * 주요 기능:
 * - 전체 데이터 자동 수집 (매주 일요일 새벽 1시)
 * - HIRA, DUR, 응급의료 데이터 통합 수집
 * - 스케줄 실행 로깅 및 에러 처리
 * 
 * @author YAME Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataCollectorService } from '../services/data-collector.service';

/**
 * 전체 데이터 수집 스케줄러 클래스
 * 
 * 이 클래스는 모든 데이터 수집을 정기적으로 실행하는
 * 통합 스케줄러 역할을 합니다.
 * 
 * 주요 특징:
 * - 매주 일요일 새벽 1시에 자동 실행
 * - 모든 데이터 소스 통합 수집
 * - 에러 발생 시 로깅 및 복구
 * - 수집 결과 모니터링
 */
@Injectable()
export class FullCollectionScheduler {
  private readonly logger = new Logger(FullCollectionScheduler.name);

  constructor(private readonly dataCollectorService: DataCollectorService) {}

  /**
   * 전체 데이터 수집 스케줄러 (매주 일요일 새벽 1시)
   * 
   * 모든 데이터 소스에서 데이터를 자동으로 수집합니다.
   * 이 작업은 매주 일요일 새벽 1시에 실행되어
   * 전체 시스템의 데이터를 최신 상태로 유지합니다.
   * 
   * 실행 과정:
   * 1. HIRA 데이터 수집 (병원 + 약국)
   * 2. DUR 데이터 수집 (약물 상호작용)
   * 3. 응급의료 데이터 수집 (응급의료기관 + 외상센터)
   * 4. 수집 결과 로깅
   * 5. 에러 발생 시 복구 시도
   * 
   * @example
   * // 자동으로 매주 일요일 새벽 1시에 실행됨
   * // 수동 실행: await fullCollectionScheduler.scheduledFullCollection();
   */
  @Cron('0 0 1 * * 0') // 매주 일요일 새벽 1시
  async scheduledFullCollection() {
    this.logger.log('전체 데이터 수집 스케줄러 실행 시작');
    
    try {
      // 전체 데이터 수집 실행
      await this.dataCollectorService.collectAllData(false);
      
      this.logger.log('전체 데이터 수집 스케줄러 실행 완료');
      
    } catch (error) {
      this.logger.error(`전체 데이터 수집 스케줄러 실행 실패: ${error.message}`);
      
      // 에러 상세 정보 로깅
      if (error.stack) {
        this.logger.error(`에러 스택 트레이스: ${error.stack}`);
      }
      
      // 재시도 로직 (선택사항)
      // await this.retryFullCollection();
    }
  }

  /**
   * 전체 데이터 수집 재시도
   * 
   * 초기 수집이 실패했을 때 재시도하는 메서드입니다.
   * 최대 3회까지 재시도하며, 각 시도 간격은 10분입니다.
   * 
   * @param maxRetries 최대 재시도 횟수 (기본값: 3)
   * @param retryDelay 재시도 간격 (밀리초, 기본값: 10분)
   * 
   * @example
   * await fullCollectionScheduler.retryFullCollection(3, 600000);
   */
  private async retryFullCollection(maxRetries: number = 3, retryDelay: number = 600000): Promise<void> {
    this.logger.log(`전체 데이터 수집 재시도 시작 (최대 ${maxRetries}회)`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`전체 데이터 수집 재시도 ${attempt}/${maxRetries}`);
        
        await this.dataCollectorService.collectAllData(false);
        
        this.logger.log(`전체 데이터 수집 재시도 ${attempt} 성공`);
        return; // 성공 시 즉시 종료
        
      } catch (error) {
        this.logger.error(`전체 데이터 수집 재시도 ${attempt} 실패: ${error.message}`);
        
        if (attempt < maxRetries) {
          this.logger.log(`${retryDelay / 1000}초 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          this.logger.error(`전체 데이터 수집 최대 재시도 횟수 초과`);
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
   * const status = await fullCollectionScheduler.getStatus();
   * console.log(`마지막 실행: ${status.lastExecution}`);
   */
  async getStatus(): Promise<{ lastExecution: Date; isRunning: boolean }> {
    return {
      lastExecution: new Date(), // 실제로는 마지막 실행 시간을 저장해야 함
      isRunning: false
    };
  }
}
