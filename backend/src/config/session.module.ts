/**
 * 세션 관리 모듈
 * Spring Session과 호환되는 세션 관리 기능을 제공합니다.
 */

import { Module } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { RedisModule } from './redis.module';

/**
 * 세션 모듈
 * Redis를 통한 세션 저장소 관리 기능을 제공합니다.
 */
@Module({
  imports: [RedisModule],                         // Redis 서비스 사용을 위해 RedisModule import
  providers: [SessionService, SessionAuthGuard], // 세션 관리 서비스 및 가드
  exports: [SessionService, SessionAuthGuard],   // 다른 모듈에서 사용할 수 있도록 내보내기
})
export class SessionModule {}




