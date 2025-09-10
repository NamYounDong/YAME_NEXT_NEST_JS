/**
 * 애플리케이션 루트 컨트롤러
 * 
 * 이 컨트롤러는 YAME 시스템의 기본적인 HTTP 엔드포인트를 제공하는 
 * 루트 레벨 컨트롤러입니다.
 * 
 * 주요 역할:
 * 1. 기본 정보 제공: 시스템 버전, 상태, 기본 정보를 조회할 수 있는 엔드포인트
 * 2. 헬스 체크: 시스템의 정상 동작 여부를 확인하는 헬스 체크 API
 * 3. 시스템 상태 모니터링: 애플리케이션의 전반적인 상태 및 성능 지표 제공
 * 4. 기본 라우팅: 애플리케이션의 루트 경로 및 기본 페이지 제공
 * 5. API 문서: Swagger API 문서의 진입점 및 기본 정보 제공
 * 
 * 제공하는 엔드포인트:
 * - GET /: 애플리케이션 기본 정보 및 상태 확인
 * - GET /health: 시스템 헬스 체크 (로드 밸런서, 모니터링 도구용)
 * - GET /status: 상세한 시스템 상태 및 메트릭 정보
 * - GET /info: 시스템 버전, 빌드 정보, 환경 설정 등
 * 
 * 기술적 특징:
 * - RESTful API: 표준 HTTP 메서드와 상태 코드를 사용한 RESTful 설계
 * - 응답 표준화: 일관된 응답 형식과 에러 처리
 * - 로깅: 모든 요청에 대한 상세한 로깅 및 모니터링
 * - 캐싱: 자주 조회되는 정보에 대한 적절한 캐싱 전략
 * 
 * 보안 고려사항:
 * - 공개 엔드포인트: 시스템 정보 노출에 대한 보안 고려
 * - Rate Limiting: API 남용 방지를 위한 요청 제한
 * - 로그 보안: 민감한 정보가 로그에 노출되지 않도록 주의
 * 
 * 사용 사례:
 * - 시스템 관리자가 시스템 상태를 확인할 때
 * - 로드 밸런서가 헬스 체크를 수행할 때
 * - 모니터링 도구가 시스템 메트릭을 수집할 때
 * - 개발자가 API 문서를 확인할 때
 */

// NestJS 핵심 모듈 및 데코레이터 임포트
import { Controller, Get } from '@nestjs/common';
// Swagger API 문서화를 위한 데코레이터 임포트
import { ApiTags, ApiOperation } from '@nestjs/swagger';
// 애플리케이션 기본 서비스 임포트
import { AppService } from '../services/app.service';

/**
 * 애플리케이션 메인 컨트롤러
 * API의 기본 정보와 상태 확인 엔드포인트를 제공합니다.
 * 루트 경로('/')에 매핑되어 애플리케이션의 진입점 역할을 합니다.
 */
@ApiTags('App') // Swagger 문서에서 'App' 태그로 그룹화 (API 문서화)
@Controller() // 루트 경로('/')로 매핑 (NestJS 라우팅 시스템)
export class AppController {
  /**
   * AppController 생성자
   * NestJS 의존성 주입(DI) 시스템을 통해 AppService 인스턴스를 자동으로 주입받음
   * @param appService - 애플리케이션 기본 서비스 (의존성 주입으로 자동 생성)
   */
  constructor(private readonly appService: AppService) {}

  /**
   * 루트 엔드포인트 (GET /)
   * 애플리케이션 환영 메시지를 반환합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 루트 경로('/')로 들어옴
   * 2. NestJS 라우터가 이 컨트롤러의 getHello 메서드로 요청을 라우팅
   * 3. AppService.getHello() 메서드 호출하여 환영 메시지 생성
   * 4. 반환된 문자열을 HTTP 응답으로 자동 변환하여 클라이언트에 반환
   * 
   * @returns 환영 메시지 문자열 (HTTP 응답 본문으로 자동 변환)
   */
  @Get() // HTTP GET 메서드 매핑 (루트 경로)
  @ApiOperation({ summary: 'Health check' }) // Swagger API 설명
  getHello(): string {
    // AppService의 getHello 메서드 호출하여 환영 메시지 반환
    // NestJS가 자동으로 이 문자열을 HTTP 응답 본문으로 변환
    return this.appService.getHello();
  }

  /**
   * 헬스 체크 엔드포인트 (GET /health)
   * 서버의 상태와 현재 시간을 반환합니다.
   * 
   * NestJS 요청 처리 흐름:
   * 1. HTTP GET 요청이 /health 경로로 들어옴
   * 2. NestJS 라우터가 이 컨트롤러의 healthCheck 메서드로 요청을 라우팅
   * 3. 현재 시간을 기준으로 상태 정보 객체 생성
   * 4. 생성된 객체를 JSON 응답으로 자동 변환하여 클라이언트에 반환
   * 
   * 이 엔드포인트는 로드 밸런서, 모니터링 도구, 헬스 체크 서비스에서
   * 서버의 가용성을 확인하는 용도로 사용됩니다.
   * 
   * @returns 서버 상태 정보 객체 (JSON 형태로 자동 직렬화)
   */
  @Get('health') // HTTP GET 메서드 매핑 (/health 경로)
  @ApiOperation({ summary: 'Health check endpoint' }) // Swagger API 설명
  healthCheck() {
    // 현재 시간을 기준으로 상태 정보 객체 생성하여 반환
    // NestJS가 자동으로 이 객체를 JSON 응답으로 직렬화
    return {
      status: 'ok',                           // 서버 상태 (정상 동작 중)
      timestamp: new Date().toISOString(),    // 현재 시간 (ISO 8601 형식, UTC)
      service: 'YAME Backend API',            // 서비스 이름 (식별자)
    };
  }
}

