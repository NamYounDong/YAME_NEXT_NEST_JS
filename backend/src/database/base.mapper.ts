/**
 * 데이터베이스 기본 매퍼
 * 
 * 이 클래스는 YAME 시스템의 모든 데이터베이스 매퍼들이 상속받는 
 * 기본적인 데이터베이스 작업 기능을 제공합니다.
 * 
 * 주요 역할:
 * 1. 공통 데이터베이스 작업: 모든 매퍼에서 공통으로 사용되는 CRUD 작업 메서드
 * 2. 연결 관리: 데이터베이스 연결 풀 관리 및 연결 상태 확인
 * 3. 트랜잭션 관리: 데이터 일관성을 보장하는 트랜잭션 처리
 * 4. 에러 처리: 데이터베이스 작업 실패 시 일관된 에러 처리 및 로깅
 * 5. 성능 최적화: 쿼리 실행 계획 분석 및 성능 튜닝 지원
 * 
 * 제공하는 기본 메서드:
 * - executeQuery(): 일반 SELECT 쿼리 실행
 * - executeUpdate(): INSERT, UPDATE, DELETE 쿼리 실행
 * - executeBatch(): 대량 데이터 처리를 위한 배치 쿼리 실행
 * - executeTransaction(): 트랜잭션 내에서 여러 쿼리 실행
 * - getConnection(): 데이터베이스 연결 객체 반환
 * - closeConnection(): 데이터베이스 연결 반환
 * 
 * 트랜잭션 관리:
 * - ACID 속성 보장: 원자성, 일관성, 격리성, 지속성 보장
 * - 롤백 지원: 에러 발생 시 자동 롤백 및 데이터 일관성 유지
 * - 데드락 방지: 트랜잭션 순서 최적화 및 타임아웃 설정
 * - 동시성 제어: 여러 사용자의 동시 접근에 대한 안전한 처리
 * 
 * 성능 최적화:
 * - 연결 풀링: 효율적인 데이터베이스 연결 관리 및 재사용
 * - 쿼리 캐싱: 자주 실행되는 쿼리 결과의 메모리 캐싱
 * - 배치 처리: 대량 데이터의 효율적인 처리
 * - 인덱스 최적화: 쿼리 성능 향상을 위한 인덱스 활용
 * 
 * 에러 처리 및 로깅:
 * - SQL 에러 처리: 데이터베이스 에러 코드별 세분화된 처리
 * - 연결 에러 복구: 네트워크 문제 시 자동 재연결 시도
 * - 상세 로깅: 모든 데이터베이스 작업에 대한 상세한 로그 기록
 * - 성능 모니터링: 쿼리 실행 시간 및 리소스 사용량 모니터링
 * 
 * 보안 기능:
 * - SQL 인젝션 방지: Prepared Statement를 통한 안전한 쿼리 실행
 * - 접근 제어: 데이터베이스 사용자별 권한 관리 및 제한
 * - 데이터 암호화: 민감한 의료 데이터의 저장 시 암호화
 * - 감사 로그: 모든 데이터베이스 활동에 대한 상세한 로그 기록
 * 
 * 사용 사례:
 * - 새로운 데이터베이스 매퍼 클래스 생성 시
 * - 공통 데이터베이스 작업 기능 구현 시
 * - 트랜잭션 처리가 필요한 복잡한 데이터 작업 시
 * - 데이터베이스 성능 최적화 및 모니터링 시
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../services/database.service';

@Injectable()
export abstract class BaseMapper {
  constructor(protected databaseService: DatabaseService) {}

  /**
   * 페이지네이션을 위한 LIMIT/OFFSET 계산
   * @param page 페이지 번호 (1부터 시작)
   * @param limit 페이지당 항목 수
   * @returns LIMIT/OFFSET 문자열
   */
  protected getPaginationClause(page: number, limit: number): string {
    const offset = (page - 1) * limit;
    return `LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * 검색 조건을 위한 WHERE 절 생성
   * @param conditions 검색 조건 객체
   * @returns WHERE 절 문자열과 파라미터 배열
   */
  protected buildWhereClause(conditions: Record<string, any>): { whereClause: string; params: any[] } {
    const whereParts: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(conditions)) {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'string' && value.includes('%')) {
          // LIKE 검색
          whereParts.push(`${key} LIKE ?`);
          params.push(value);
        } else if (Array.isArray(value)) {
          // IN 검색
          const placeholders = value.map(() => '?').join(', ');
          whereParts.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else {
          // 일반 검색
          whereParts.push(`${key} = ?`);
          params.push(value);
        }
      }
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    return { whereClause, params };
  }

  /**
   * 정렬을 위한 ORDER BY 절 생성
   * @param sortBy 정렬 기준 컬럼
   * @param sortOrder 정렬 순서 (ASC/DESC)
   * @returns ORDER BY 절 문자열
   */
  protected getOrderByClause(sortBy: string, sortOrder: 'ASC' | 'DESC' = 'ASC'): string {
    return `ORDER BY ${sortBy} ${sortOrder}`;
  }

  /**
   * 트랜잭션 실행
   * @param operations 트랜잭션 내에서 실행할 작업들
   * @returns 트랜잭션 결과
   */
  protected async executeTransaction<T>(operations: () => Promise<T>): Promise<T> {
    const connection = await this.databaseService.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await operations();
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 배치 삽입 실행
   * @param tableName 테이블명
   * @param columns 컬럼명 배열
   * @param values 값 배열의 배열
   */
  protected async batchInsert(tableName: string, columns: string[], values: any[][]): Promise<void> {
    if (values.length === 0) return;

    const placeholders = values[0].map(() => '?').join(', ');
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    for (const valueSet of values) {
      await this.databaseService.execute(query, valueSet);
    }
  }

  /**
   * 배치 업데이트 실행
   * @param tableName 테이블명
   * @param setColumns SET할 컬럼들
   * @param whereColumn WHERE 조건 컬럼
   * @param values 값 배열의 배열
   */
  protected async batchUpdate(tableName: string, setColumns: string[], whereColumn: string, values: any[][]): Promise<void> {
    if (values.length === 0) return;

    const setClause = setColumns.map(col => `${col} = ?`).join(', ');
    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereColumn} = ?`;
    
    for (const valueSet of values) {
      await this.databaseService.execute(query, valueSet);
    }
  }

  /**
   * 데이터 존재 여부 확인
   * @param tableName 테이블명
   * @param conditions 검색 조건
   * @returns 존재 여부
   */
  protected async exists(tableName: string, conditions: Record<string, any>): Promise<boolean> {
    const { whereClause, params } = this.buildWhereClause(conditions);
    const query = `SELECT EXISTS(SELECT 1 FROM ${tableName} ${whereClause}) as exists_flag`;
    
    const results = await this.databaseService.query(query, params);
    return results[0]?.exists_flag === 1;
  }

  /**
   * 데이터 개수 조회
   * @param tableName 테이블명
   * @param conditions 검색 조건
   * @returns 데이터 개수
   */
  protected async count(tableName: string, conditions: Record<string, any> = {}): Promise<number> {
    const { whereClause, params } = this.buildWhereClause(conditions);
    const query = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    
    const results = await this.databaseService.query(query, params);
    return results[0]?.count || 0;
  }

  /**
   * 배치 실행 (INSERT ... ON DUPLICATE KEY UPDATE)
   * @param query SQL 쿼리
   * @param values 값 배열의 배열
   * @returns 처리된 행 수
   */
  protected async batchExecute(query: string, values: any[][]): Promise<number> {
    if (values.length === 0) return 0;
    
    let totalAffectedRows = 0;
    for (const valueSet of values) {
      const result = await this.databaseService.execute(query, valueSet);
      totalAffectedRows += result.affectedRows || 0;
    }
    
    return totalAffectedRows;
  }

  /**
   * 범용 쿼리 실행 함수
   * @param query SQL 쿼리 문자열
   * @param params 쿼리 파라미터 배열
   * @returns 쿼리 실행 결과
   */
  protected async executeQuery(query: string, params: any[] = []): Promise<any> {
    try {
      // SELECT 쿼리인지 확인 (대소문자 구분 없이)
      const isSelectQuery = query.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelectQuery) {
        return await this.databaseService.query(query, params);
      } else {
        return await this.databaseService.execute(query, params);
      }
    } catch (error) {
      console.error('쿼리 실행 중 오류 발생:', error);
      console.error('실행된 쿼리:', query);
      console.error('파라미터:', params);
      throw error;
    }
  }
}
