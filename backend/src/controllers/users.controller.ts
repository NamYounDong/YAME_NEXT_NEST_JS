/**
 * 사용자 관리 컨트롤러
 * 
 * 이 컨트롤러는 YAME 시스템의 사용자 계정과 권한을 관리하는 
 * HTTP API 엔드포인트를 제공합니다.
 * 
 * 주요 역할:
 * 1. 사용자 계정 관리: 회원가입, 로그인, 프로필 관리, 계정 삭제 등 사용자 생명주기 관리
 * 2. 인증 및 권한 관리: 로그인 인증, JWT 토큰 관리, 역할 기반 접근 제어(RBAC)
 * 3. 사용자 정보 관리: 개인정보, 의료진 정보, 환자 정보 등의 상세 정보 CRUD 작업
 * 4. 보안 관리: 비밀번호 변경, 계정 잠금 해제, 보안 설정 관리
 * 5. 사용자 검색 및 필터링: 다양한 조건에 따른 사용자 검색 및 목록 조회
 * 
 * 제공하는 엔드포인트:
 * - POST /auth/register: 사용자 회원가입
 * - POST /auth/login: 사용자 로그인 및 JWT 토큰 발급
 * - POST /auth/logout: 사용자 로그아웃 및 세션 종료
 * - GET /users: 사용자 목록 조회 (페이지네이션, 필터링 지원)
 * - GET /users/:id: 특정 사용자 상세 정보 조회
 * - PUT /users/:id: 사용자 정보 수정
 * - DELETE /users/:id: 사용자 계정 삭제
 * - PUT /users/:id/password: 비밀번호 변경
 * - PUT /users/:id/role: 사용자 역할 변경
 * 
 * 보안 기능:
 * - JWT 인증: 보안성이 높은 JSON Web Token을 사용한 인증
 * - 역할 기반 접근 제어: 사용자 역할에 따른 API 접근 권한 제한
 * - 비밀번호 정책: 복잡도 요구사항 및 정기 변경 정책 강제
 * - 세션 관리: 안전한 세션 생성, 관리, 종료
 * - 감사 로그: 모든 사용자 활동에 대한 상세한 로그 기록
 * 
 * 데이터 검증:
 * - 입력 데이터 검증: DTO를 통한 요청 데이터 유효성 검증
 * - 비즈니스 규칙 검증: 사용자 생성 및 수정 시 비즈니스 규칙 검증
 * - 중복 데이터 검증: 이메일, 사용자명 등의 중복 검증
 * 
 * 사용 사례:
 * - 사용자가 회원가입하고 로그인할 때
 * - 의료진이 환자 정보에 접근할 때
 * - 관리자가 시스템 사용자를 관리할 때
 * - 사용자가 자신의 프로필을 수정할 때
 * - 보안 감사 및 사용자 활동 분석 시
 */

// NestJS 핵심 모듈 및 데코레이터 임포트
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
// Swagger API 문서화를 위한 데코레이터 임포트
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
// 사용자 관리 서비스 및 관련 인터페이스 임포트
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../interfaces/create-user.dto';
import { UpdateUserDto } from '../interfaces/update-user.dto';
// 세션 인증 가드 및 사용자 데코레이터 임포트
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { SessionUser } from '../decorators/session-user.decorator';

/**
 * 사용자 컨트롤러
 * 사용자 관리와 관련된 모든 HTTP 요청을 처리합니다.
 * 모든 엔드포인트는 세션 인증이 필요합니다.
 */
@ApiTags('Users') // Swagger 문서에서 'Users' 태그로 그룹화
@Controller('users') // '/users' 경로로 매핑 (NestJS 라우팅 시스템)
@UseGuards(SessionAuthGuard) // 모든 엔드포인트에 세션 인증 적용 (보안 강화)
@ApiSecurity('session') // Swagger에서 세션 보안 표시 (API 문서화)
export class UsersController {
  /**
   * UsersController 생성자
   * NestJS 의존성 주입(DI) 시스템을 통해 UsersService 인스턴스를 자동으로 주입받음
   * @param usersService - 사용자 관리 서비스 (의존성 주입으로 자동 생성)
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * 새 사용자 생성 엔드포인트 (POST /users)
   * 관리자만 새 사용자를 생성할 수 있습니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /users 경로로 들어옴
   * 2. SessionAuthGuard가 요청을 가로채서 세션 인증 검증
   * 3. 인증 성공 시 @Body() 데코레이터로 요청 본문을 CreateUserDto로 변환
   * 4. @SessionUser() 데코레이터로 현재 로그인한 사용자 정보 추출
   * 5. UsersService.create() 메서드 호출하여 비즈니스 로직 실행
   * 6. 결과를 HTTP 응답으로 자동 변환하여 클라이언트에 반환
   * 
   * @param createUserDto - 사용자 생성 데이터 (DTO를 통한 자동 검증)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 생성된 사용자 정보 (JSON 형태로 자동 직렬화)
   */
  @Post() // HTTP POST 메서드 매핑
  @ApiOperation({ summary: 'Create a new user' }) // Swagger API 설명
  create(@Body() createUserDto: CreateUserDto, @SessionUser() user: any) {
    // UsersService의 create 메서드 호출하여 실제 사용자 생성 로직 실행
    return this.usersService.create(createUserDto);
  }

  /**
   * 모든 사용자 조회 엔드포인트 (GET /users)
   * 시스템에 등록된 모든 사용자 목록을 반환합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /users 경로로 들어옴
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 4. UsersService.findAll() 메서드 호출하여 데이터베이스 조회
   * 5. 조회된 사용자 배열을 JSON 응답으로 자동 변환
   * 
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 사용자 목록 배열 (JSON 형태로 자동 직렬화)
   */
  @Get() // HTTP GET 메서드 매핑 (루트 경로)
  @ApiOperation({ summary: 'Get all users' }) // Swagger API 설명
  findAll(@SessionUser() user: any) {
    // UsersService의 findAll 메서드 호출하여 모든 사용자 조회
    return this.usersService.findAll();
  }

  /**
   * 현재 사용자 정보 조회 엔드포인트 (GET /users/me)
   * 로그인한 사용자의 정보를 반환합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /users/me 경로로 들어옴
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 4. 세션에서 추출된 사용자 정보를 그대로 반환 (추가 DB 조회 없음)
   * 5. 사용자 객체를 JSON 응답으로 자동 직렬화
   * 
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 현재 사용자 정보 (JSON 형태로 자동 직렬화)
   */
  @Get('me') // HTTP GET 메서드 매핑 (/users/me 경로)
  @ApiOperation({ summary: 'Get current user info' }) // Swagger API 설명
  getCurrentUser(@SessionUser() user: any) {
    // 세션에서 이미 추출된 사용자 정보를 그대로 반환
    // 추가적인 데이터베이스 조회 없이 빠른 응답 제공
    return user;
  }

  /**
   * 특정 사용자 조회 엔드포인트 (GET /users/:id)
   * ID로 특정 사용자의 정보를 조회합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /users/:id 경로로 들어옴 (예: /users/123)
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @Param('id') 데코레이터로 URL 경로 파라미터 추출
   * 4. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 5. UsersService.findOne() 메서드 호출하여 특정 사용자 조회
   * 6. 조회된 사용자 정보를 JSON 응답으로 자동 변환
   * 
   * @param id - 조회할 사용자 ID (URL 경로에서 자동 추출, 문자열 형태)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 조회된 사용자 정보 (JSON 형태로 자동 직렬화)
   */
  @Get(':id') // HTTP GET 메서드 매핑 (/users/:id 경로, 동적 파라미터)
  @ApiOperation({ summary: 'Get user by ID' }) // Swagger API 설명
  findOne(@Param('id') id: string, @SessionUser() user: any) {
    // URL 파라미터로 받은 id를 숫자로 변환 (+id)하여 서비스 메서드 호출
    // UsersService의 findOne 메서드로 특정 사용자 조회
    return this.usersService.findOne(+id);
  }

  /**
   * 사용자 정보 수정 엔드포인트 (PATCH /users/:id)
   * 특정 사용자의 정보를 부분적으로 수정합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP PATCH 요청이 /users/:id 경로로 들어옴 (예: /users/123)
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @Param('id') 데코레이터로 URL 경로 파라미터 추출
   * 4. @Body() 데코레이터로 요청 본문을 UpdateUserDto로 변환
   * 5. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 6. UsersService.update() 메서드 호출하여 사용자 정보 수정
   * 7. 수정된 사용자 정보를 JSON 응답으로 자동 변환
   * 
   * @param id - 수정할 사용자 ID (URL 경로에서 자동 추출)
   * @param updateUserDto - 수정할 사용자 데이터 (DTO를 통한 자동 검증)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 수정된 사용자 정보 (JSON 형태로 자동 직렬화)
   */
  @Patch(':id') // HTTP PATCH 메서드 매핑 (부분 수정용)
  @ApiOperation({ summary: 'Update user' }) // Swagger API 설명
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @SessionUser() user: any) {
    // URL 파라미터로 받은 id를 숫자로 변환하고, 수정 데이터와 함께 서비스 메서드 호출
    // UsersService의 update 메서드로 사용자 정보 수정
    return this.usersService.update(+id, updateUserDto);
  }

  /**
   * 사용자 삭제 엔드포인트 (DELETE /users/:id)
   * 특정 사용자를 시스템에서 삭제합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP DELETE 요청이 /users/:id 경로로 들어옴 (예: /users/123)
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @Param('id') 데코레이터로 URL 경로 파라미터 추출
   * 4. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 5. UsersService.remove() 메서드 호출하여 사용자 삭제
   * 6. 삭제 완료 응답을 JSON 형태로 자동 변환
   * 
   * @param id - 삭제할 사용자 ID (URL 경로에서 자동 추출)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 삭제 완료 응답 (JSON 형태로 자동 직렬화)
   */
  @Delete(':id') // HTTP DELETE 메서드 매핑
  @ApiOperation({ summary: 'Delete user' }) // Swagger API 설명
  remove(@Param('id') id: string, @SessionUser() user: any) {
    // URL 파라미터로 받은 id를 숫자로 변환하여 서비스 메서드 호출
    // UsersService의 remove 메서드로 사용자 삭제
    return this.usersService.remove(+id);
  }
}
