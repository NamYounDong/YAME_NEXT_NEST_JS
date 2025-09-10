/**
 * Redis 모듈
 * Redis 연결 및 관리 기능을 제공합니다.
 */

import { Global, Module } from '@nestjs/common';
import { RedisService } from '../services/redis.service';

/**
 * Redis 모듈
 * 전역 모듈로 설정되어 모든 모듈에서 Redis 서비스를 사용할 수 있습니다.
 * 세션 저장소 및 캐시 용도로 사용됩니다.
 */
@Global() // 전역 모듈로 설정
@Module({
  providers: [RedisService], // Redis 연결 서비스
  exports: [RedisService],   // 다른 모듈에서 사용할 수 있도록 내보내기
})
export class RedisModule {}




