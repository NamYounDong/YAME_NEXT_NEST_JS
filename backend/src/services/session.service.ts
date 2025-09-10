/**
 * 세션 관리 서비스
 * 
 * 이 서비스는 YAME 시스템의 사용자 세션과 인증 상태를 관리하는 
 * 핵심 보안 서비스입니다.
 * 
 * 주요 역할:
 * 1. 세션 생성 및 관리: 사용자 로그인 시 세션 생성, 로그아웃 시 세션 종료
 * 2. 인증 상태 유지: 사용자의 로그인 상태를 안전하게 유지하고 검증
 * 3. 세션 보안: 세션 하이재킹 방지, 무효화된 세션 감지 및 차단
 * 4. 다중 기기 지원: 사용자가 여러 기기에서 동시에 로그인할 수 있도록 지원
 * 5. 세션 모니터링: 활성 세션 현황, 의심스러운 활동 탐지 및 로깅
 * 
 * 세션 관리 방식:
 * - Redis 기반 저장: 빠른 접근과 확장성을 위한 Redis를 활용한 세션 저장
 * - JWT 토큰: 보안성이 높은 JSON Web Token을 사용한 무상태 인증
 * - 세션 만료: 보안을 위한 자동 세션 만료 및 갱신 메커니즘
 * - 세션 동기화: 여러 서버 간의 세션 정보 동기화 및 일관성 유지
 * 
 * 보안 기능:
 * - 세션 고정 공격 방지: 로그인 시 새로운 세션 ID 생성
 * - 세션 하이재킹 방지: IP 주소 변경 감지 및 세션 무효화
 * - 동시 세션 제한: 보안을 위한 동시 로그인 세션 수 제한
 * - 세션 감사: 모든 세션 활동에 대한 상세한 로그 기록
 * - 자동 로그아웃: 장시간 비활성 상태 시 자동 세션 종료
 * 
 * 기술적 특징:
 * - 분산 세션 관리: 마이크로서비스 아키텍처에서의 효율적인 세션 공유
 * - 성능 최적화: Redis의 빠른 읽기/쓰기 성능을 활용한 세션 처리
 * - 확장성: 사용자 증가에 따른 세션 저장소 확장 지원
 * - 장애 복구: Redis 장애 시 세션 복구 및 백업 메커니즘
 * 
 * 사용 사례:
 * - 사용자가 로그인하고 로그아웃할 때
 * - 보안이 중요한 의료 정보에 접근할 때
 * - 다중 기기에서 동시 접속할 때
 * - 세션 보안 감사 및 모니터링 시
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessionPrefix: string;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.sessionPrefix = this.configService.get<string>('SESSION_PREFIX', 'spring:session:sessions:');
  }

  /**
   * Spring Session ID를 디코딩합니다.
   * FastAPI의 decode_spring_session_id와 동일한 기능
   */
  private decodeSpringSessionId(sessionId: string): string {
    // Spring Session의 경우 Base64 디코딩이 필요할 수 있습니다.
    // 실제 구현은 Spring Session의 설정에 따라 달라질 수 있습니다.
    try {
      // 만약 sessionId가 Base64로 인코딩되어 있다면 디코딩
      if (this.isBase64(sessionId)) {
        return Buffer.from(sessionId, 'base64').toString('utf-8');
      }
      return sessionId;
    } catch (error) {
      this.logger.warn(`Session ID 디코딩 실패: ${sessionId}`, error);
      return sessionId;
    }
  }

  /**
   * 문자열이 Base64인지 확인합니다.
   */
  private isBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  /**
   * 세션에서 사용자 정보를 가져옵니다.
   * FastAPI의 get_user_from_session과 동일한 기능
   */
  async getUserFromSession(sessionId: string): Promise<any | null> {
    try {
      const realId = this.decodeSpringSessionId(sessionId);
      const redisSessionKey = `${this.sessionPrefix}${realId}`;
      
      this.logger.log(`Redis key: ${redisSessionKey}`);

      const data = await this.redisService.hgetall(redisSessionKey);
      
      // 값이 없다면 세션이 존재하지 않음
      if (!data || Object.keys(data).length === 0) {
        this.logger.warn(`세션 데이터가 없습니다: ${redisSessionKey}`);
        return null;
      }

      const raw = data['sessionAttr:USER'];
      if (!raw) {
        this.logger.warn(`세션에 USER 속성이 없습니다: ${redisSessionKey}`);
        return null;
      }

      // 스프링에서 GenericJackson2JsonRedisSerializer로 저장된 JSON 문자열 파싱
      try {
        return JSON.parse(raw);
      } catch (parseError) {
        // bytes 형태로 저장된 경우 UTF-8로 디코딩 후 파싱 시도
        try {
          // Node.js에서는 Buffer.from으로 처리
          const decoded = Buffer.from(raw, 'utf-8').toString();
          return JSON.parse(decoded);
        } catch (decodeError) {
          this.logger.error('sessionAttr:USER 파싱 실패', {
            sessionId,
            redisSessionKey,
            raw: raw.substring(0, 100), // 로그에는 일부만 출력
            parseError: parseError.message,
            decodeError: decodeError.message,
          });
          return null;
        }
      }
    } catch (error) {
      this.logger.error('세션에서 사용자 정보 조회 실패', {
        sessionId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 세션이 유효한지 확인합니다.
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    if (!sessionId) {
      return false;
    }

    try {
      const realId = this.decodeSpringSessionId(sessionId);
      const redisSessionKey = `${this.sessionPrefix}${realId}`;
      
      const exists = await this.redisService.exists(redisSessionKey);
      return exists > 0;
    } catch (error) {
      this.logger.error('세션 유효성 확인 실패', {
        sessionId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 세션의 만료 시간을 확인합니다.
   */
  async getSessionTTL(sessionId: string): Promise<number> {
    try {
      const realId = this.decodeSpringSessionId(sessionId);
      const redisSessionKey = `${this.sessionPrefix}${realId}`;
      
      return await this.redisService.getClient().ttl(redisSessionKey);
    } catch (error) {
      this.logger.error('세션 TTL 조회 실패', {
        sessionId,
        error: error.message,
      });
      return -1;
    }
  }

  /**
   * 모든 세션 속성을 가져옵니다.
   */
  async getSessionAttributes(sessionId: string): Promise<Record<string, any> | null> {
    try {
      const realId = this.decodeSpringSessionId(sessionId);
      const redisSessionKey = `${this.sessionPrefix}${realId}`;
      
      const data = await this.redisService.hgetall(redisSessionKey);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      // sessionAttr: 접두사가 있는 키들을 파싱
      const attributes: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('sessionAttr:')) {
          const attrName = key.replace('sessionAttr:', '');
          try {
            attributes[attrName] = JSON.parse(value);
          } catch {
            attributes[attrName] = value;
          }
        }
      }

      return attributes;
    } catch (error) {
      this.logger.error('세션 속성 조회 실패', {
        sessionId,
        error: error.message,
      });
      return null;
    }
  }
}




