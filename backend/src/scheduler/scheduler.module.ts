/**
 * 스케줄러 모듈 (SchedulerModule)
 * 
 * 이 모듈은 모든 스케줄러 클래스들을 관리하고
 * NestJS 애플리케이션에 통합하는 역할을 합니다.
 * 
 * 주요 기능:
 * - 모든 스케줄러 클래스 등록
 * - 의존성 주입 설정
 * - 스케줄러 실행 환경 구성
 * 
 * @author YAME Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

// 스케줄러 클래스들 import
import { HiraCollectionScheduler } from './hira-collection.scheduler';
import { DurCollectionScheduler } from './dur-collection.scheduler';
import { EmergencyCollectionScheduler } from './emergency-collection.scheduler';
import { FullCollectionScheduler } from './full-collection.scheduler';

// 필요한 서비스 모듈들 import
import { DataCollectorModule } from '../config/data-collector.module';

/**
 * 스케줄러 모듈
 * 
 * 이 모듈은 다음과 같은 스케줄러들을 관리합니다:
 * - HiraCollectionScheduler: HIRA 데이터 수집 (매일 새벽 2시)
 * - DurCollectionScheduler: DUR 데이터 수집 (매일 새벽 3시)
 * - EmergencyCollectionScheduler: 응급의료 데이터 수집 (매일 새벽 3시)
 * - FullCollectionScheduler: 전체 데이터 수집 (매주 일요일 새벽 1시)
 * 
 * 모든 스케줄러는 @nestjs/schedule 패키지를 사용하여
 * cron 표현식 기반으로 실행됩니다.
 */
@Module({
  imports: [
    // NestJS 스케줄러 모듈 활성화
    ScheduleModule.forRoot(),
    
    // DataCollectorService와 관련 의존성들을 포함하는 모듈
    DataCollectorModule,
  ],
  providers: [
    // 스케줄러 클래스들
    HiraCollectionScheduler,
    DurCollectionScheduler,
    EmergencyCollectionScheduler,
    FullCollectionScheduler,
  ],
  exports: [
    // 다른 모듈에서 사용할 수 있도록 export
    HiraCollectionScheduler,
    DurCollectionScheduler,
    EmergencyCollectionScheduler,
    FullCollectionScheduler,
  ],
})
export class SchedulerModule {}
