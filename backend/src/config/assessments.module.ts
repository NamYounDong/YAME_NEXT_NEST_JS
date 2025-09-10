/**
 * 의료 평가 모듈
 * 의료 평가 생성, 조회, 수정, 삭제 기능을 제공합니다.
 */

import { Module } from '@nestjs/common';
import { AssessmentsService } from '../services/assessments.service';
import { AssessmentsController } from '../controllers/assessments.controller';
import { SessionModule } from './session.module';

/**
 * 평가 모듈
 * 의료 평가와 관련된 모든 기능을 통합 관리합니다.
 */
@Module({
  imports: [SessionModule],             // SessionAuthGuard 사용을 위해 SessionModule import
  controllers: [AssessmentsController], // 평가 관리 API 컨트롤러
  providers: [AssessmentsService],      // 평가 관리 비즈니스 로직 서비스
})
export class AssessmentsModule {}
