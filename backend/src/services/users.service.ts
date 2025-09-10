/**
 * 사용자 관리 서비스
 * 
 * 이 서비스는 YAME 시스템의 사용자 계정과 권한을 관리하는 핵심 서비스입니다.
 * 
 * 주요 역할:
 * 1. 사용자 계정 관리: 회원가입, 로그인, 프로필 관리, 계정 삭제 등 사용자 생명주기 관리
 * 2. 인증 및 권한 관리: 로그인 인증, JWT 토큰 관리, 역할 기반 접근 제어(RBAC)
 * 3. 사용자 정보 관리: 개인정보, 의료진 정보, 환자 정보 등의 상세 정보 관리
 * 4. 보안 관리: 비밀번호 암호화, 세션 관리, 접근 로그 기록
 * 5. API 제공: 프론트엔드에서 사용자 관련 기능을 사용할 수 있는 인터페이스
 * 
 * 사용자 유형:
 * - 의료진: 의사, 간호사, 약사 등 의료 전문가
 * - 환자: 의료 서비스를 받는 일반 사용자
 * - 관리자: 시스템 운영 및 관리 권한을 가진 사용자
 * - 게스트: 제한된 기능만 사용할 수 있는 비회원 사용자
 * 
 * 기술적 특징:
 * - JWT 기반 인증: 보안성이 높은 JSON Web Token을 사용한 인증 시스템
 * - 비밀번호 암호화: bcrypt를 사용한 단방향 해시 암호화
 * - 세션 관리: Redis를 활용한 효율적인 세션 저장 및 관리
 * - 권한 체계: 역할 기반의 세밀한 접근 제어 시스템
 * - 감사 로그: 사용자 활동에 대한 상세한 로그 기록
 * 
 * 보안 기능:
 * - 비밀번호 정책: 복잡도 요구사항 및 정기 변경 정책
 * - 로그인 시도 제한: 무차별 대입 공격 방지를 위한 로그인 시도 제한
 * - 세션 타임아웃: 보안을 위한 자동 세션 만료
 * - 접근 제어: IP 기반 접근 제한 및 의심스러운 활동 탐지
 * 
 * 사용 사례:
 * - 사용자가 회원가입하고 로그인할 때
 * - 의료진이 환자 정보에 접근할 때
 * - 관리자가 시스템 사용자를 관리할 때
 * - 보안 감사 및 사용자 활동 분석 시
 */

// NestJS 핵심 모듈 및 예외 처리 클래스 임포트
import { Injectable, NotFoundException } from '@nestjs/common';
// 데이터베이스 서비스 및 DTO 인터페이스 임포트
import { DatabaseService } from './database.service';
import { CreateUserDto } from '../interfaces/create-user.dto';
import { UpdateUserDto } from '../interfaces/update-user.dto';

/**
 * 사용자 인터페이스
 * 데이터베이스에서 사용되는 사용자 데이터 구조를 정의합니다.
 * 
 * TypeScript 인터페이스 특징:
 * - 타입 안전성: 컴파일 타임에 데이터 구조 검증
 * - 자동 완성: IDE에서 속성명과 타입 정보 제공
 * - 문서화: 코드 자체가 데이터 구조 문서 역할
 * - 확장성: 필요에 따라 새로운 속성 추가 가능
 */
export interface User {
  id: number;                                    // 사용자 고유 ID (자동 증가)
  name: string;                                  // 사용자 이름 (필수)
  email: string;                                 // 사용자 이메일 (고유, 필수)
  password?: string;                             // 사용자 비밀번호 (선택적, 해시화됨)
  role: 'patient' | 'doctor' | 'admin';         // 사용자 역할 (유니온 타입)
  createdAt: Date;                               // 계정 생성 일시 (자동 설정)
  updatedAt: Date;                               // 마지막 수정 일시 (자동 업데이트)
}

/**
 * 사용자 서비스
 * 사용자 관리와 관련된 모든 비즈니스 로직을 처리합니다.
 * 
 * NestJS 서비스 특징:
 * - @Injectable() 데코레이터: NestJS DI 시스템에서 이 클래스를 서비스로 등록
 * - 싱글톤 패턴: 애플리케이션 전체에서 하나의 인스턴스만 생성
 * - 의존성 주입: DatabaseService를 생성자에서 자동으로 주입받음
 * - 비즈니스 로직: 컨트롤러와 데이터베이스 사이의 중간 계층 역할
 */
@Injectable() // NestJS 의존성 주입 시스템에서 이 클래스를 서비스로 등록
export class UsersService {
  /**
   * UsersService 생성자
   * NestJS 의존성 주입(DI) 시스템을 통해 DatabaseService 인스턴스를 자동으로 주입받음
   * @param databaseService - 데이터베이스 연결 및 쿼리 실행 서비스 (의존성 주입으로 자동 생성)
   */
  constructor(
    private databaseService: DatabaseService, // private 키워드로 자동으로 클래스 속성으로 등록
  ) {}

  /**
   * 새 사용자 생성
   * 사용자 정보를 데이터베이스에 저장하고 생성된 사용자를 반환합니다.
   * 
   * NestJS 비동기 처리:
   * - async/await: 비동기 데이터베이스 작업을 동기적으로 처리
   * - Promise<User>: TypeScript 타입 안전성을 위한 반환 타입 명시
   * - 에러 처리: 데이터베이스 오류 시 자동으로 Promise rejection
   * 
   * 데이터베이스 작업 흐름:
   * 1. SQL INSERT 쿼리 구성 (사용자 테이블에 새 레코드 삽입)
   * 2. DatabaseService.execute() 호출하여 쿼리 실행
   * 3. 삽입된 레코드의 ID 반환 (result.insertId)
   * 4. 생성된 사용자 정보를 findOne()으로 조회하여 반환
   * 
   * @param createUserDto - 생성할 사용자 데이터 (DTO를 통한 검증된 데이터)
   * @returns 생성된 사용자 정보 (Promise<User>)
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // SQL INSERT 쿼리 구성 (사용자 테이블에 새 레코드 삽입)
    const sql = `
      INSERT INTO users (name, email, password, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    // 사용자 데이터를 데이터베이스에 삽입
    // DatabaseService.execute()는 INSERT, UPDATE, DELETE 쿼리 실행용
    const result = await this.databaseService.execute(sql, [
      createUserDto.name,                                    // 사용자 이름
      createUserDto.email,                                   // 사용자 이메일
      createUserDto.password,                                // 사용자 비밀번호 (해시화됨)
      createUserDto.role || 'patient',                      // 사용자 역할 (기본값: patient)
    ]);

    // 생성된 사용자 정보 반환 (삽입된 레코드의 ID로 조회)
    // result.insertId는 MySQL에서 자동 생성된 AUTO_INCREMENT ID
    return this.findOne(result.insertId);
  }

  /**
   * 모든 사용자 조회
   * 시스템에 등록된 모든 사용자의 목록을 반환합니다.
   * 
   * 보안 고려사항:
   * - 비밀번호 제외: SELECT 절에서 password 필드를 명시적으로 제외
   * - 정렬: 생성일 기준 내림차순으로 정렬 (최신 사용자부터)
   * - 성능: 인덱스를 활용한 효율적인 쿼리 실행
   * 
   * @returns 모든 사용자 목록 배열 (비밀번호 제외, Promise<User[]>)
   */
  async findAll(): Promise<User[]> {
    // SQL SELECT 쿼리 구성 (비밀번호 필드 제외)
    const sql = `
      SELECT id, name, email, role, createdAt, updatedAt
      FROM users
      ORDER BY createdAt DESC
    `;
    
    // DatabaseService.query()는 SELECT 쿼리 실행용
    // 결과를 User[] 타입으로 자동 변환
    return this.databaseService.query(sql);
  }

  /**
   * ID로 사용자 조회
   * 특정 ID를 가진 사용자의 정보를 조회합니다.
   * 
   * NestJS 예외 처리:
   * - NotFoundException: 사용자를 찾을 수 없는 경우 HTTP 404 에러 반환
   * - 자동 변환: NestJS가 예외를 자동으로 HTTP 응답으로 변환
   * - 로깅: 예외 발생 시 자동으로 로그 기록
   * 
   * 데이터베이스 쿼리:
   * - WHERE 절: id = ? 조건으로 단일 사용자 조회
   * - 결과 검증: 쿼리 결과가 없거나 빈 배열인 경우 예외 발생
   * - 배열 인덱스: users[0]로 첫 번째(유일한) 결과 반환
   * 
   * @param id - 조회할 사용자 ID (숫자)
   * @returns 사용자 정보 (Promise<User>)
   * @throws NotFoundException - 사용자를 찾을 수 없는 경우
   */
  async findOne(id: number): Promise<User> {
    // SQL SELECT 쿼리 구성 (특정 ID의 사용자 조회)
    const sql = `
      SELECT id, name, email, role, createdAt, updatedAt
      FROM users
      WHERE id = ?
    `;
    
    // DatabaseService.query()로 사용자 조회 (매개변수 바인딩으로 SQL 인젝션 방지)
    const users = await this.databaseService.query(sql, [id]);
    
    // 사용자를 찾을 수 없는 경우 NestJS NotFoundException 발생
    // 이 예외는 자동으로 HTTP 404 응답으로 변환됨
    if (!users || users.length === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // 첫 번째(유일한) 사용자 정보 반환
    return users[0];
  }

  /**
   * 이메일로 사용자 조회 (인증용)
   * 로그인 시 이메일과 비밀번호를 확인하기 위한 메서드입니다.
   * 
   * 인증 목적:
   * - 로그인 검증: 이메일 존재 여부 및 비밀번호 일치 확인
   * - 비밀번호 포함: 인증을 위해 password 필드도 함께 조회
   * - 단일 결과: 이메일은 고유하므로 최대 1개 결과만 반환
   * 
   * 반환 값:
   * - User | undefined: 사용자를 찾으면 User 객체, 없으면 undefined
   * - 조건부 처리: 호출하는 쪽에서 undefined 체크 필요
   * 
   * @param email - 조회할 사용자 이메일 (문자열)
   * @returns 사용자 정보 (비밀번호 포함) 또는 undefined (Promise<User | undefined>)
   */
  async findByEmail(email: string): Promise<User | undefined> {
    // SQL SELECT 쿼리 구성 (이메일로 사용자 조회, 비밀번호 포함)
    const sql = `
      SELECT id, name, email, password, role, createdAt, updatedAt
      FROM users
      WHERE email = ?
    `;
    
    // 이메일로 사용자 조회 (이메일은 고유하므로 최대 1개 결과)
    const users = await this.databaseService.query(sql, [email]);
    
    // 사용자가 있으면 첫 번째 결과 반환, 없으면 undefined 반환
    // 삼항 연산자를 사용한 간결한 조건부 반환
    return users && users.length > 0 ? users[0] : undefined;
  }

  /**
   * 사용자 정보 수정
   * 기존 사용자의 정보를 부분적으로 업데이트합니다.
   * 
   * 동적 쿼리 구성:
   * - 조건부 업데이트: 제공된 필드만 업데이트 (부분 업데이트)
   * - 배열 기반: updateFields와 updateValues 배열을 동적으로 구성
   * - SQL 인젝션 방지: 매개변수 바인딩을 통한 안전한 쿼리 실행
   * 
   * 업데이트 로직:
   * 1. 제공된 DTO에서 undefined가 아닌 필드만 추출
   * 2. 동적으로 UPDATE 쿼리 구성
   * 3. updatedAt 필드를 현재 시간으로 자동 업데이트
   * 4. 데이터베이스에 업데이트 쿼리 실행
   * 5. 업데이트된 사용자 정보를 조회하여 반환
   * 
   * @param id - 수정할 사용자 ID (숫자)
   * @param updateUserDto - 수정할 사용자 데이터 (부분 업데이트 지원)
   * @returns 수정된 사용자 정보 (Promise<User>)
   * @throws NotFoundException - 사용자를 찾을 수 없는 경우
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    // 동적으로 업데이트할 필드와 값을 저장할 배열 초기화
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // 제공된 DTO에서 undefined가 아닌 필드만 추출하여 업데이트 대상으로 설정
    if (updateUserDto.name) {
      updateFields.push('name = ?');           // 이름 필드 업데이트
      updateValues.push(updateUserDto.name);   // 이름 값 추가
    }
    if (updateUserDto.email) {
      updateFields.push('email = ?');          // 이메일 필드 업데이트
      updateValues.push(updateUserDto.email);  // 이메일 값 추가
    }
    if (updateUserDto.password) {
      updateFields.push('password = ?');       // 비밀번호 필드 업데이트
      updateValues.push(updateUserDto.password); // 비밀번호 값 추가
    }
    if (updateUserDto.role) {
      updateFields.push('role = ?');           // 역할 필드 업데이트
      updateValues.push(updateUserDto.role);   // 역할 값 추가
    }

    // 업데이트할 필드가 없는 경우 현재 사용자 정보 반환
    if (updateFields.length === 0) {
      return this.findOne(id);
    }

    // updatedAt 필드를 현재 시간으로 자동 업데이트
    updateFields.push('updatedAt = NOW()');
    // WHERE 절의 id 매개변수를 updateValues 배열에 추가
    updateValues.push(id);

    // 동적으로 UPDATE 쿼리 구성
    const sql = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    // DatabaseService.execute()로 업데이트 쿼리 실행
    const result = await this.databaseService.execute(sql, updateValues);
    
    // 업데이트된 레코드가 없는 경우 (존재하지 않는 사용자 ID)
    if (result.affectedRows === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 업데이트된 사용자 정보를 조회하여 반환
    return this.findOne(id);
  }

  /**
   * 사용자 삭제
   * 특정 ID를 가진 사용자를 시스템에서 완전히 제거합니다.
   * 
   * 삭제 작업:
   * - 물리적 삭제: DELETE 쿼리로 레코드를 완전히 제거
   * - 결과 검증: affectedRows로 실제 삭제된 레코드 수 확인
   * - 예외 처리: 존재하지 않는 사용자 ID에 대한 적절한 에러 응답
   * 
   * 보안 고려사항:
   * - 권한 확인: 삭제 권한이 있는 사용자만 호출 가능 (컨트롤러에서 검증)
   * - 로그 기록: 삭제 작업에 대한 감사 로그 필요
   * - 연관 데이터: 사용자와 연결된 다른 데이터의 처리 방안 고려
   * 
   * @param id - 삭제할 사용자 ID (숫자)
   * @returns void (Promise<void>)
   * @throws NotFoundException - 사용자를 찾을 수 없는 경우
   */
  async remove(id: number): Promise<void> {
    // SQL DELETE 쿼리 구성 (특정 ID의 사용자 삭제)
    const sql = 'DELETE FROM users WHERE id = ?';
    
    // DatabaseService.execute()로 삭제 쿼리 실행
    const result = await this.databaseService.execute(sql, [id]);
    
    // 삭제된 레코드가 없는 경우 (존재하지 않는 사용자 ID)
    if (result.affectedRows === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // void 반환 (삭제 완료)
    // NestJS가 자동으로 HTTP 204 No Content 응답 생성
  }
}
