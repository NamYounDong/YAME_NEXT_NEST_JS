/**
 * 데이터베이스 모듈
 * MariaDB 연결 및 관리 기능을 제공합니다.
 */

import { Global, Module } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';

/**
 * 데이터베이스 모듈
 * 전역 모듈로 설정되어 모든 모듈에서 데이터베이스 서비스를 사용할 수 있습니다.
 */
@Global() // 전역 모듈로 설정
@Module({
  providers: [DatabaseService], // 데이터베이스 연결 서비스
  exports: [DatabaseService],   // 다른 모듈에서 사용할 수 있도록 내보내기
})
export class DatabaseModule {}




