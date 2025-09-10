import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionService } from '../services/session.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 쿠키에서 세션 ID 추출 (일반적으로 SESSION 또는 JSESSIONID)
    const sessionId = request.cookies?.SESSION || 
                     request.cookies?.JSESSIONID ||
                     request.headers?.['x-session-id'];

    if (!sessionId) {
      throw new UnauthorizedException('세션 ID가 없습니다');
    }

    // 세션에서 사용자 정보 조회
    const user = await this.sessionService.getUserFromSession(sessionId);
    
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 세션입니다');
    }

    // 요청 객체에 사용자 정보 추가
    request.user = user;
    request.sessionId = sessionId;

    return true;
  }
}




