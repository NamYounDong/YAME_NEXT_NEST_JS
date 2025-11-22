/**
 * YAME 애플리케이션의 루트 모듈
 * 모든 기능 모듈들을 통합하고 애플리케이션의 전체 구조를 정의합니다.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { DatabaseModule } from './config/database.module';
import { RedisModule } from './config/redis.module';
import { SessionModule } from './config/session.module';

import { UsersModule } from './config/users.module';
import { AssessmentsModule } from './config/assessments.module';
import { DataCollectorModule } from './config/data-collector.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SymptomChatModule } from './config/symptom-chat.module';

/**
 * 애플리케이션 루트 모듈
 * NestJS의 모듈 시스템을 통해 의존성 주입과 모듈 간 관계를 관리합니다.
 */
@Module({
  imports: [
    // 환경 변수 설정 모듈 (전역으로 사용 가능)
    ConfigModule.forRoot({
      isGlobal: true, // 모든 모듈에서 ConfigService 사용 가능
    }),
    DatabaseModule,      // 데이터베이스 연결 및 관리
    RedisModule,         // Redis 캐시 서버 연결
    SessionModule,       // 세션 관리 기능

    UsersModule,         // 사용자 관리 기능
    AssessmentsModule,   // 의료 평가 관리 기능
    DataCollectorModule, // 데이터 수집 기능
    SchedulerModule,     // 스케줄러 기능
    SymptomChatModule,   // 증상 분석 챗봇 (WebSocket + FastAPI)
  ],
  controllers: [AppController], // 루트 컨트롤러
  providers: [AppService],      // 루트 서비스
})
export class AppModule {}
