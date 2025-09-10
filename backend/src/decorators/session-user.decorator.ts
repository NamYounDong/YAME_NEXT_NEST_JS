/**
 * 세션 사용자 데코레이터
 * 세션에서 인증된 사용자 정보를 추출하는 데코레이터입니다.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 세션 사용자 데코레이터
 * 컨트롤러 메서드에서 @SessionUser() 데코레이터로 사용
 * 예: @SessionUser() user 또는 @SessionUser('id') userId
 */
export const SessionUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 특정 필드가 요청된 경우 해당 필드만 반환, 그렇지 않으면 전체 사용자 객체 반환
    return data ? user?.[data] : user;
  },
);




