/**
 * 사용자 관리 모듈
 * 사용자 등록, 조회, 수정, 삭제 기능을 제공합니다.
 */

import { Module } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { UsersController } from '../controllers/users.controller';
import { SessionModule } from './session.module';

/**
 * 사용자 모듈
 * 사용자 관리와 관련된 모든 기능을 통합 관리합니다.
 */
@Module({
  imports: [SessionModule],       // SessionAuthGuard 사용을 위해 SessionModule import
  controllers: [UsersController], // 사용자 관리 API 컨트롤러
  providers: [UsersService],      // 사용자 관리 비즈니스 로직 서비스
  exports: [UsersService],        // 다른 모듈에서 사용할 수 있도록 내보내기
})
export class UsersModule {}
