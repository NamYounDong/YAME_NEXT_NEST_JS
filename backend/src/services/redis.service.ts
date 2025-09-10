/**
 * Redis 캐시 서비스
 * 
 * 이 서비스는 YAME 시스템의 성능 향상과 데이터 접근 속도 개선을 위한 
 * Redis 기반 캐싱 시스템을 관리합니다.
 * 
 * 주요 역할:
 * 1. 데이터 캐싱: 자주 사용되는 데이터를 메모리에 저장하여 빠른 접근 제공
 * 2. 세션 저장: 사용자 세션 정보를 빠르게 저장하고 검색
 * 3. 임시 데이터 저장: 일시적인 데이터나 계산 결과를 효율적으로 관리
 * 4. 성능 최적화: 데이터베이스 부하 감소 및 응답 시간 단축
 * 5. 분산 시스템 지원: 여러 서버 간의 데이터 공유 및 동기화
 * 
 * 캐싱 전략:
 * - LRU (Least Recently Used): 가장 오래 사용되지 않은 데이터를 우선 제거
 * - TTL (Time To Live): 데이터의 자동 만료 시간 설정
 * - Write-Through: 데이터 변경 시 캐시와 데이터베이스 동시 업데이트
 * - Cache-Aside: 필요할 때만 캐시에 데이터 로드
 * - Write-Back: 데이터 변경을 캐시에만 저장하고 나중에 일괄 처리
 * 
 * 캐시 대상 데이터:
 * - 의료 정보: 병원, 약국, 약물 정보 등 자주 조회되는 의료 데이터
 * - 사용자 세션: 로그인 상태 및 권한 정보
 * - API 응답: 외부 API 호출 결과의 임시 저장
 * - 계산 결과: 복잡한 의료 계산 결과의 재사용
 * - 설정 정보: 시스템 설정 및 환경 변수
 * 
 * 기술적 특징:
 * - 고성능 메모리 저장: RAM 기반의 초고속 데이터 접근
 * - 데이터 지속성: RDB 및 AOF를 통한 데이터 백업 및 복구
 * - 클러스터링: 대용량 데이터 처리 및 고가용성을 위한 클러스터 지원
 * - 메모리 최적화: 효율적인 메모리 사용을 위한 데이터 압축 및 최적화
 * - 모니터링: Redis 성능 및 메모리 사용량 실시간 모니터링
 * 
 * 사용 사례:
 * - 자주 조회되는 병원 정보를 빠르게 제공할 때
 * - 사용자 로그인 상태를 빠르게 확인할 때
 * - 외부 API 호출 결과를 임시 저장할 때
 * - 시스템 성능 최적화 및 부하 분산 시
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis 서비스
 * Redis 연결 관리 및 기본적인 Redis 명령어들을 제공합니다.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {}

  /**
   * 모듈 초기화 시 Redis 클라이언트 연결
   */
  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('REDIS_DB', 0);

    this.client = createClient({
      socket: {
        host,
        port,
      },
      password: password || undefined,
      database: db,
    });

    // Redis 클라이언트 이벤트 리스너 설정
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('✅ Redis 연결 성공');
    });

    try {
      await this.client.connect();
    } catch (error) {
      console.error('❌ Redis 연결 실패:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      console.log('🔌 Redis 연결 종료');
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    if (expireInSeconds) {
      await this.client.setEx(key, expireInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    return this.client.hGet(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hGetAll(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hSet(key, field, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }
}




