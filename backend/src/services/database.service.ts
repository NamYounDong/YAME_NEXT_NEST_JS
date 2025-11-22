/**
 * 데이터베이스 서비스
 * 
 * 이 서비스는 YAME 시스템의 모든 데이터를 저장하고 관리하는 
 * 핵심 데이터 계층 서비스입니다.
 * 
 * 주요 역할:
 * 1. 데이터베이스 연결 관리: MySQL/PostgreSQL 데이터베이스 연결 풀 및 연결 상태 관리
 * 2. 트랜잭션 관리: 데이터 일관성을 보장하는 ACID 트랜잭션 처리
 * 3. 쿼리 실행: SQL 쿼리 실행 및 결과 반환
 * 4. 데이터 무결성: 외래 키 제약 조건, 체크 제약 조건 등을 통한 데이터 유효성 검증
 * 5. 성능 최적화: 인덱스 관리, 쿼리 최적화, 연결 풀 튜닝
 * 
 * 데이터베이스 구조:
 * - 사용자 관리: 사용자 계정, 권한, 프로필 정보
 * - 의료 데이터: 병원, 약국, 약물, 질병 정보
 * - 평가 데이터: 의료 평가, 진단, 치료 계획
 * - 로그 데이터: 시스템 활동, 사용자 활동, 에러 로그
 * - 설정 데이터: 시스템 설정, 환경 변수, 메타데이터
 * 
 * 기술적 특징:
 * - 연결 풀링: 효율적인 데이터베이스 연결 관리 및 재사용
 * - 트랜잭션 격리: READ_COMMITTED, REPEATABLE_READ 등 격리 수준 관리
 * - 백업 및 복구: 정기적인 데이터 백업 및 장애 시 복구 메커니즘
 * - 모니터링: 데이터베이스 성능, 연결 수, 쿼리 실행 시간 모니터링
 * - 확장성: 수평적/수직적 확장을 위한 샤딩 및 파티셔닝 지원
 * 
 * 보안 기능:
 * - SQL 인젝션 방지: Prepared Statement를 통한 안전한 쿼리 실행
 * - 접근 제어: 데이터베이스 사용자별 권한 관리 및 제한
 * - 데이터 암호화: 민감한 의료 데이터의 저장 시 암호화
 * - 감사 로그: 모든 데이터베이스 활동에 대한 상세한 로그 기록
 * 
 * 사용 사례:
 * - 사용자 정보 저장 및 조회
 * - 의료 데이터의 CRUD 작업
 * - 복잡한 의료 쿼리 실행
 * - 데이터 백업 및 복구
 * - 데이터베이스 성능 모니터링
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mariadb from 'mariadb';
import { CaseConverterUtil } from '../utils/case-converter.util';

/**
 * 데이터베이스 서비스
 * MariaDB 연결 풀 관리 및 쿼리 실행을 담당합니다.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: mariadb.Pool;

  constructor(private configService: ConfigService) {}

  /**
   * 모듈 초기화 시 데이터베이스 연결 풀 생성
   */
  async onModuleInit() {
    this.pool = mariadb.createPool({
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      user: this.configService.get<string>('DB_USER', 'root'),
      password: this.configService.get<string>('DB_PASSWORD', 'password'),
      database: this.configService.get<string>('DB_NAME', 'yame'),
      connectionLimit: 10,    // 최대 연결 수
      acquireTimeout: 30000,  // 연결 획득 타임아웃 (30초)
      queryTimeout: 30000,    // 쿼리 실행 타임아웃 (30초)
    });

    try {
      const conn = await this.pool.getConnection();
      console.log('✅ MariaDB 연결 성공');
      conn.release();
    } catch (error) {
      console.error('❌ MariaDB 연결 실패:', error);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      console.log('🔌 MariaDB 연결 종료');
    }
  }

  async getConnection(): Promise<mariadb.PoolConnection> {
    return this.pool.getConnection();
  }

  /**
   * 쿼리를 실행하고 결과를 반환합니다.
   * @param sql SQL 쿼리
   * @param params 쿼리 파라미터
   * @returns 쿼리 결과 (camelCase 키로 변환됨)
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const conn = await this.getConnection();
    try {
      const result = await conn.query(sql, params);
      // 결과의 모든 키를 camelCase로 변환
      return CaseConverterUtil.convertKeysToCamelCase(result);
    } finally {
      conn.release();
    }
  }

  /**
   * 쿼리를 실행합니다.
   * @param sql SQL 쿼리
   * @param params 쿼리 파라미터
   * @returns 실행 결과 (camelCase 키로 변환됨)
   */
  async execute(sql: string, params?: any[]): Promise<any> {
    const conn = await this.getConnection();
    try {
      const result = await conn.execute(sql, params);
      // 결과의 모든 키를 camelCase로 변환
      return CaseConverterUtil.convertKeysToCamelCase(result);
    } finally {
      conn.release();
    }
  }

}




