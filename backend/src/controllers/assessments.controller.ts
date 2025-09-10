/**
 * 의료 평가 컨트롤러
 * 
 * 이 컨트롤러는 YAME 시스템의 핵심 기능인 의료 평가 및 진단을 관리하는 
 * HTTP API 엔드포인트를 제공합니다.
 * 
 * 주요 역할:
 * 1. 의료 평가 관리: 환자의 증상, 병력, 검사 결과를 종합하여 의료 평가 생성 및 관리
 * 2. 진단 지원: 증상 기반의 예상 진단 및 차별 진단 정보 제공
 * 3. 치료 계획 수립: 진단 결과를 바탕으로 한 개인화된 치료 계획 제안 및 관리
 * 4. 의료진 협업: 다학제 의료진 간의 협업을 위한 평가 정보 공유 및 협업 도구 제공
 * 5. 평가 이력 관리: 환자의 의료 평가 이력 및 진행 상황 추적
 * 
 * 제공하는 엔드포인트:
 * - POST /assessments: 새로운 의료 평가 생성
 * - GET /assessments: 의료 평가 목록 조회 (페이지네이션, 필터링 지원)
 * - GET /assessments/:id: 특정 의료 평가 상세 정보 조회
 * - PUT /assessments/:id: 의료 평가 정보 수정
 * - DELETE /assessments/:id: 의료 평가 삭제
 * - POST /assessments/:id/diagnosis: 진단 정보 추가
 * - PUT /assessments/:id/treatment: 치료 계획 수정
 * - GET /assessments/patient/:patientId: 특정 환자의 평가 이력 조회
 * - POST /assessments/:id/collaborate: 의료진 간 협업 요청
 * 
 * 의료 평가 프로세스:
 * - 증상 수집: 환자의 주관적 증상 및 객관적 징후 수집
 * - 병력 조사: 과거 병력, 가족력, 복용 약물 등 상세 병력 조사
 * - 검사 결과 분석: 혈액검사, 영상검사, 생리학적 검사 결과 종합 분석
 * - 진단 추론: 증상과 검사 결과를 바탕으로 한 의학적 추론
 * - 치료 계획: 진단 결과에 따른 개인화된 치료 방안 제시
 * - 진행 추적: 치료 진행 상황 및 효과 모니터링
 * 
 * 보안 및 개인정보 보호:
 * - 환자 정보 보호: 민감한 의료 정보에 대한 접근 제어 및 암호화
 * - 의료진 인증: 의료진의 신원 확인 및 권한 검증
 * - 감사 로그: 모든 의료 평가 활동에 대한 상세한 로그 기록
 * - 데이터 암호화: 저장 및 전송 시 의료 데이터 암호화
 * 
 * 사용 사례:
 * - 의사가 환자 진단을 내릴 때
 * - 간호사가 환자 상태를 평가할 때
 * - 약사가 약물 상호작용을 확인할 때
 * - 환자가 자신의 증상을 이해할 때
 * - 의료진 간의 협업 및 정보 공유 시
 * - 의료 교육 및 연구 자료 작성 시
 */

// NestJS 핵심 모듈 및 데코레이터 임포트
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
// Swagger API 문서화를 위한 데코레이터 임포트
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
// 의료 평가 서비스 및 관련 인터페이스 임포트
import { AssessmentsService } from '../services/assessments.service';
import { CreateAssessmentDto } from '../interfaces/create-assessment.dto';
import { UpdateAssessmentDto } from '../interfaces/update-assessment.dto';
// 세션 인증 가드 및 사용자 데코레이터 임포트
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { SessionUser } from '../decorators/session-user.decorator';

/**
 * 평가 컨트롤러
 * 의료 평가 관리와 관련된 모든 HTTP 요청을 처리합니다.
 * 모든 엔드포인트는 세션 인증이 필요합니다.
 */
@ApiTags('Assessments') // Swagger 문서에서 'Assessments' 태그로 그룹화
@Controller('assessments') // '/assessments' 경로로 매핑 (NestJS 라우팅 시스템)
@UseGuards(SessionAuthGuard) // 모든 엔드포인트에 세션 인증 적용 (보안 강화)
@ApiSecurity('session') // Swagger에서 세션 보안 표시 (API 문서화)
export class AssessmentsController {
  /**
   * AssessmentsController 생성자
   * NestJS 의존성 주입(DI) 시스템을 통해 AssessmentsService 인스턴스를 자동으로 주입받음
   * @param assessmentsService - 의료 평가 관리 서비스 (의존성 주입으로 자동 생성)
   */
  constructor(private readonly assessmentsService: AssessmentsService) {}

  /**
   * 새 의료 평가 생성 엔드포인트 (POST /assessments)
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP POST 요청이 /assessments 경로로 들어옴
   * 2. SessionAuthGuard가 요청을 가로채서 세션 인증 검증
   * 3. 인증 성공 시 @Body() 데코레이터로 요청 본문을 CreateAssessmentDto로 변환
   * 4. @SessionUser() 데코레이터로 현재 로그인한 사용자 정보 추출
   * 5. AssessmentsService.create() 메서드 호출하여 의료 평가 생성 로직 실행
   * 6. 결과를 HTTP 응답으로 자동 변환하여 클라이언트에 반환
   * 
   * @param createAssessmentDto - 의료 평가 생성 데이터 (DTO를 통한 자동 검증)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 생성된 의료 평가 정보 (JSON 형태로 자동 직렬화)
   */
  @Post() // HTTP POST 메서드 매핑
  @ApiOperation({ summary: 'Create a new assessment' }) // Swagger API 설명
  create(@Body() createAssessmentDto: CreateAssessmentDto, @SessionUser() user: any) {
    // AssessmentsService의 create 메서드 호출하여 실제 의료 평가 생성 로직 실행
    return this.assessmentsService.create(createAssessmentDto);
  }

  /**
   * 의료 평가 목록 조회 엔드포인트 (GET /assessments)
   * 쿼리 파라미터에 따라 환자별, 의사별, 또는 전체 평가 목록을 반환합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /assessments 경로로 들어옴 (쿼리 파라미터 포함 가능)
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @Query() 데코레이터로 URL 쿼리 파라미터 추출 (patientId, doctorId)
   * 4. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 5. 쿼리 파라미터에 따라 적절한 서비스 메서드 호출
   * 6. 조회된 평가 목록을 JSON 응답으로 자동 변환
   * 
   * @param patientId - 환자 ID (선택적, 쿼리 파라미터에서 추출)
   * @param doctorId - 의사 ID (선택적, 쿼리 파라미터에서 추출)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 의료 평가 목록 배열 (JSON 형태로 자동 직렬화)
   */
  @Get() // HTTP GET 메서드 매핑 (루트 경로)
  @ApiOperation({ summary: 'Get all assessments' }) // Swagger API 설명
  @ApiQuery({ name: 'patientId', required: false, type: Number }) // Swagger 쿼리 파라미터 문서화
  @ApiQuery({ name: 'doctorId', required: false, type: Number }) // Swagger 쿼리 파라미터 문서화
  findAll(
    @Query('patientId') patientId?: number,  // URL 쿼리 파라미터에서 환자 ID 추출 (선택적)
    @Query('doctorId') doctorId?: number,   // URL 쿼리 파라미터에서 의사 ID 추출 (선택적)
    @SessionUser() user?: any,              // 현재 로그인한 사용자 정보 (세션에서 자동 추출)
  ) {
    // 환자 ID가 제공된 경우: 해당 환자의 평가 목록만 조회
    if (patientId) {
      // AssessmentsService의 findByPatient 메서드로 환자별 평가 조회
      return this.assessmentsService.findByPatient(+patientId);
    }
    
    // 의사 ID가 제공된 경우: 해당 의사의 평가 목록만 조회
    if (doctorId) {
      // AssessmentsService의 findByDoctor 메서드로 의사별 평가 조회
      return this.assessmentsService.findByDoctor(+doctorId);
    }
    
    // 쿼리 파라미터가 없는 경우: 전체 평가 목록 조회
    // AssessmentsService의 findAll 메서드로 모든 평가 조회
    return this.assessmentsService.findAll();
  }

  /**
   * 특정 의료 평가 조회 엔드포인트 (GET /assessments/:id)
   * ID로 특정 의료 평가의 상세 정보를 조회합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /assessments/:id 경로로 들어옴 (예: /assessments/123)
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @Param('id') 데코레이터로 URL 경로 파라미터 추출
   * 4. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 5. AssessmentsService.findOne() 메서드 호출하여 특정 평가 조회
   * 6. 조회된 평가 정보를 JSON 응답으로 자동 변환
   * 
   * @param id - 조회할 의료 평가 ID (URL 경로에서 자동 추출, 문자열 형태)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 조회된 의료 평가 정보 (JSON 형태로 자동 직렬화)
   */
  @Get(':id') // HTTP GET 메서드 매핑 (/assessments/:id 경로, 동적 파라미터)
  @ApiOperation({ summary: 'Get assessment by ID' }) // Swagger API 설명
  findOne(@Param('id') id: string, @SessionUser() user: any) {
    // URL 파라미터로 받은 id를 숫자로 변환 (+id)하여 서비스 메서드 호출
    // AssessmentsService의 findOne 메서드로 특정 의료 평가 조회
    return this.assessmentsService.findOne(+id);
  }

  /**
   * 의료 평가 정보 수정 엔드포인트 (PATCH /assessments/:id)
   * 특정 의료 평가의 정보를 부분적으로 수정합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP PATCH 요청이 /assessments/:id 경로로 들어옴 (예: /assessments/123)
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @Param('id') 데코레이터로 URL 경로 파라미터 추출
   * 4. @Body() 데코레이터로 요청 본문을 UpdateAssessmentDto로 변환
   * 5. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 6. AssessmentsService.update() 메서드 호출하여 평가 정보 수정
   * 7. 수정된 평가 정보를 JSON 응답으로 자동 변환
   * 
   * @param id - 수정할 의료 평가 ID (URL 경로에서 자동 추출)
   * @param updateAssessmentDto - 수정할 평가 데이터 (DTO를 통한 자동 검증)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 수정된 의료 평가 정보 (JSON 형태로 자동 직렬화)
   */
  @Patch(':id') // HTTP PATCH 메서드 매핑 (부분 수정용)
  @ApiOperation({ summary: 'Update assessment' }) // Swagger API 설명
  update(@Param('id') id: string, @Body() updateAssessmentDto: UpdateAssessmentDto, @SessionUser() user: any) {
    // URL 파라미터로 받은 id를 숫자로 변환하고, 수정 데이터와 함께 서비스 메서드 호출
    // AssessmentsService의 update 메서드로 의료 평가 정보 수정
    return this.assessmentsService.update(+id, updateAssessmentDto);
  }

  /**
   * 의료 평가 삭제 엔드포인트 (DELETE /assessments/:id)
   * 특정 의료 평가를 시스템에서 삭제합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP DELETE 요청이 /assessments/:id 경로로 들어옴 (예: /assessments/123)
   * 2. SessionAuthGuard가 세션 인증 검증
   * 3. @Param('id') 데코레이터로 URL 경로 파라미터 추출
   * 4. @SessionUser() 데코레이터로 현재 사용자 정보 추출
   * 5. AssessmentsService.remove() 메서드 호출하여 평가 삭제
   * 6. 삭제 완료 응답을 JSON 형태로 자동 변환
   * 
   * @param id - 삭제할 의료 평가 ID (URL 경로에서 자동 추출)
   * @param user - 현재 로그인한 사용자 정보 (세션에서 자동 추출)
   * @returns 삭제 완료 응답 (JSON 형태로 자동 직렬화)
   */
  @Delete(':id') // HTTP DELETE 메서드 매핑
  @ApiOperation({ summary: 'Delete assessment' }) // Swagger API 설명
  remove(@Param('id') id: string, @SessionUser() user: any) {
    // URL 파라미터로 받은 id를 숫자로 변환하여 서비스 메서드 호출
    // AssessmentsService의 remove 메서드로 의료 평가 삭제
    return this.assessmentsService.remove(+id);
  }
}
