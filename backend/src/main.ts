/**
 * YAME (Your Assessment for Medical Evaluation) 백엔드 애플리케이션의 진입점
 * NestJS 프레임워크를 사용하여 의료 평가 시스템의 API 서버를 구성합니다.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FileLogger } from './config/file-logger';

/**
 * 애플리케이션 부트스트랩 함수
 * NestJS 애플리케이션을 초기화하고 필요한 미들웨어와 설정을 구성합니다.
 */
async function bootstrap() {
  try {
    // 파일 로거 초기화 및 준비
    const fileLogger = new FileLogger('logs/app.log');
    await fileLogger.initialize(); // 로그 파일 준비 완료까지 대기
    
    // NestJS 애플리케이션 인스턴스 생성
    const app = await NestFactory.create(AppModule, { logger: fileLogger });
    // const app = await NestFactory.create(AppModule);

  
  // CORS (Cross-Origin Resource Sharing) 설정
  // 프론트엔드 애플리케이션에서 API에 접근할 수 있도록 허용
  app.enableCors({
    origin: '*', // Next.js 개발 서버 주소
    credentials: true, // 쿠키 및 인증 정보 포함 허용
  });

  // 전역 유효성 검사 파이프 설정
  // 모든 요청에 대해 자동으로 데이터 유효성 검사 및 변환 수행
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // DTO에 정의되지 않은 속성 제거
    transform: true, // 요청 데이터를 DTO 클래스 인스턴스로 자동 변환
  }));

  // Swagger API 문서 설정
  // 개발자를 위한 API 문서 자동 생성 및 테스트 인터페이스 제공
  const config = new DocumentBuilder()
    .setTitle('YAME API') // API 문서 제목
    .setDescription('Your Assessment for Medical Evaluation API') // API 설명
    .setVersion('1.0') // API 버전
    .addBearerAuth() // JWT 인증 방식 추가
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // /api 경로에 Swagger UI 설정

    // 서버 시작 (포트 3001에서 리스닝)
    await app.listen(3001);
    console.log('🚀 YAME Backend is running on http://localhost:3001');
    console.log('📚 API Documentation: http://localhost:3001/api');
    
  } catch (error) {
    // 앱 초기화 실패 시 에러 로깅
    console.error('❌ Failed to start YAME Backend:', error);
    
    // 파일 로거가 있다면 파일에도 기록
    try {
      const fileLogger = new FileLogger('logs/app.log');
      await fileLogger.error(`Application startup failed: ${error.message}`, 'Bootstrap');
    } catch (logError) {
      console.error('❌ Failed to log startup error:', logError);
    }
    
    process.exit(1);
  }
}



// 애플리케이션 시작
bootstrap();

