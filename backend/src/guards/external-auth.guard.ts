/**
 * 외부 인증 서비스 연동 가드
 * 스프링부트 + 스프링 시큐리티 기반 별도 인증 서비스와 연동하는 인증 가드
 */

import { 
  Injectable, 
  CanActivate, 
  ExecutionContext,
  UnauthorizedException,
  Logger,
  createParamDecorator
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Express Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: ExternalAuthUser;
    }
  }
}

/**
 * 외부 인증 사용자 정보 인터페이스
 */
export interface ExternalAuthUser {
  id: number;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  isAuthenticated: boolean;
}

/**
 * 외부 인증 서비스 연동 가드
 * 별도의 스프링부트 인증 서비스와 연동하여 사용자 인증을 처리합니다.
 */
@Injectable()
export class ExternalAuthGuard implements CanActivate {
  private readonly logger = new Logger(ExternalAuthGuard.name);
  private readonly authServiceUrl: string;
  private readonly authServiceEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:8080');
    this.authServiceEnabled = this.configService.get<boolean>('AUTH_SERVICE_ENABLED', false);
  }

  /**
   * 요청에 대한 인증을 확인합니다.
   * @param context 실행 컨텍스트
   * @returns 인증 성공 여부
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    try {
      // 1. 인증 정보 추출
      const authInfo = this.extractAuthInfo(request);
      if (!authInfo) {
        throw new UnauthorizedException('인증 정보가 없습니다.');
      }

      // 2. 외부 인증 서비스 검증
      let user: ExternalAuthUser;
      if (this.authServiceEnabled) {
        user = await this.validateWithExternalService(authInfo);
      } else {
        // 개발 환경에서는 모킹 사용자 반환
        user = this.createMockUser(authInfo);
      }

      // 3. 요청 객체에 사용자 정보 추가
      request.user = user;

      this.logger.log(`인증 성공: ${user.username} (${user.email})`);
      return true;

    } catch (error) {
      this.logger.warn(`인증 실패: ${error.message}`);
      throw new UnauthorizedException(error.message || '인증에 실패했습니다.');
    }
  }

  /**
   * 요청에서 인증 정보를 추출합니다.
   * @param request HTTP 요청 객체
   * @returns 인증 정보 (토큰 또는 세션 ID)
   */
  private extractAuthInfo(request: Request): string | null {
    // 1. Authorization 헤더에서 Bearer 토큰 확인
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. x-session-id 헤더 확인
    const sessionHeader = request.headers['x-session-id'];
    if (sessionHeader && typeof sessionHeader === 'string') {
      return sessionHeader;
    }

    // 3. 쿠키에서 세션 ID 확인
    const sessionCookie = request.cookies?.SESSION || request.cookies?.JSESSIONID;
    if (sessionCookie) {
      return sessionCookie;
    }

    return null;
  }

  /**
   * 외부 인증 서비스에 사용자 정보를 검증 요청합니다.
   * @param authInfo 인증 정보 (토큰 또는 세션 ID)
   * @returns 외부 서비스에서 검증된 사용자 정보
   */
  private async validateWithExternalService(authInfo: string): Promise<ExternalAuthUser> {
    try {
      // TODO: 실제 외부 인증 서비스 API 호출 구현
      // const response = await axios.get(`${this.authServiceUrl}/api/auth/validate`, {
      //   headers: {
      //     'Authorization': `Bearer ${authInfo}`,
      //     'X-Session-ID': authInfo
      //   }
      // });
      
      // if (response.status !== 200 || !response.data.authenticated) {
      //   throw new UnauthorizedException('외부 인증 서비스에서 인증 실패');
      // }

      // return {
      //   id: response.data.user.id,
      //   username: response.data.user.username,
      //   email: response.data.user.email,
      //   roles: response.data.user.roles || [],
      //   permissions: response.data.user.permissions || [],
      //   sessionId: authInfo,
      //   isAuthenticated: true,
      // };

      this.logger.warn('외부 인증 서비스 연동이 아직 구현되지 않음. 모킹 사용자 반환.');
      return this.createMockUser(authInfo);

    } catch (error) {
      this.logger.error(`외부 인증 서비스 호출 오류: ${error.message}`);
      throw new UnauthorizedException('인증 서비스에 연결할 수 없습니다.');
    }
  }

  /**
   * 외부 인증 서비스 없이는 인증 불가
   * @param authInfo 인증 정보
   * @returns 예외 발생
   */
  private createMockUser(authInfo: string): ExternalAuthUser {
    this.logger.error('외부 인증 서비스가 비활성화되어 있습니다. AUTH_SERVICE_ENABLED=true로 설정하고 외부 인증 서비스를 구성해주세요.');
    
    throw new UnauthorizedException(
      '외부 인증 서비스가 설정되지 않았습니다. ' +
      'AUTH_SERVICE_ENABLED=true로 설정하고 AUTH_SERVICE_URL을 올바르게 구성해주세요.'
    );
  }
}

/**
 * 사용자 정보를 요청에서 추출하는 데코레이터
 */

export const ExternalUser = createParamDecorator(
  (data: keyof ExternalAuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ExternalAuthUser;

    return data ? user?.[data] : user;
  },
);
