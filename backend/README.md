# YAME Backend API

NestJS 기반의 의료 평가 시스템 백엔드 API

> 🚀 **2024.12 구조 리팩토링 완료**: 기능 중심의 디렉터리 구조로 전면 개편하여 유지보수성과 확장성을 대폭 향상시켰습니다.
> 🔄 **2024.12 데이터 수집 시스템 완성**: HIRA, E-Gen, DUR API 연동 및 자동 스케줄링 시스템 구축 완료
> 📊 **2024.12 camelCase 변환 시스템**: 데이터베이스 조회 결과 자동 camelCase 변환으로 일관성 확보
> 🔑 **2024.12 API 키 보안 강화**: decodeURIComponent 적용으로 API 키 안전성 향상
> 🏗️ **2024.12 인터페이스 구조 개선**: DUR 관련 인터페이스 공통화 및 상속 구조로 리팩토링
> 🌐 **2024.12 API 방식 개선**: GET 방식으로 변경하여 브라우저에서 직접 호출 가능
> 📝 **2024.12 로깅 강화**: API 호출 시 FULL URL 로깅으로 디버깅 용이성 향상

## 🚀 구현된 주요 기능

### 🎯 야메 처방 (핵심 기능)
- ✅ **AI 증상 분석**: ML 기반 질병 예측 및 추천 시스템
- ✅ **DUR 체크**: 의약품 금기사항 및 상호작용 검증
- ✅ **위치 기반 추천**: GPS 기반 주변 병원/약국 추천
- ✅ **피드백 시스템**: 사용자 만족도 수집 및 분석
- ✅ **병원 접수 토큰**: 병원 포털 연계를 위한 일회용 토큰
- ✅ **실시간 의료기관 정보**: 외부 API 연동으로 최신 정보 제공

### 🔄 데이터 수집 시스템
- ✅ **HIRA 병원 정보**: 건보공단 병원 기본정보 수집 (3000개씩 배치)
- ✅ **HIRA 약국 정보**: 건보공단 약국 기본정보 수집 (3000개씩 배치)
- ✅ **응급의료기관 정보**: E-Gen API 기반 응급의료기관 기본정보 수집 (3000개씩 배치)
- ✅ **외상센터 정보**: E-Gen API 기반 외상센터 기본정보 수집 (3000개씩 배치)
- ✅ **DUR 성분 정보**: MFDS DUR API 기반 의약품 성분 금기사항 수집 (100개씩 배치)
- ✅ **DUR 품목 정보**: MFDS DUR API 기반 의약품 품목 금기사항 수집 (100개씩 배치)
- ✅ **자동 스케줄링**: 일/주/3분 단위 자동 데이터 수집

### 🔄 외부 API 연동
- ✅ **HIRA API**: 건보공단 병원/약국 정보 수집
- ✅ **E-Gen API**: 응급의료기관 기본정보, 외상센터 기본정보 수집
- ✅ **MFDS DUR API**: 식약처 의약품 금기사항 정보 (성분/품목 기반)
- ✅ **공공데이터포털**: 각종 의료기관 데이터 연동
- ✅ **스케줄 기반 수집**: 정기적인 데이터 갱신 (일/주/3분 단위)

### 🗄️ 데이터베이스 & 캐시
- ✅ **MariaDB 연결**: Native 드라이버로 직접 연결 (TypeORM 제거)
- ✅ **Redis 연결**: 세션 관리 및 캐싱
- ✅ **커넥션 풀링**: 효율적인 데이터베이스 연결 관리
- ✅ **SQL 쿼리 최적화**: Prepared Statement 사용
- ✅ **데이터 수집 자동화**: 크론 기반 스케줄링
- ✅ **camelCase 변환**: 데이터베이스 조회 결과 자동 camelCase 변환

### 🛡️ 인증 & 보안
- ✅ **세션 기반 인증**: Spring Session과 호환
- ✅ **FastAPI 호환**: 동일한 세션 디코딩 로직
- ✅ **다중 프로젝트 세션 공유**: Redis 기반 세션 공유
- ✅ **JWT 지원**: 기존 시스템과의 호환성
- ✅ **역할 기반 접근 제어**: 환자, 의사, 관리자
- ✅ **외부 인증 연동**: 스프링부트 인증 서비스 호환

### 📊 API 기능
- ✅ **사용자 관리**: CRUD 작업 (MariaDB 기반)
- ✅ **건강 평가**: 의료 설문 및 평가 관리
- ✅ **증상 로그**: 증상 분석 이력 관리
- ✅ **JSON 데이터 처리**: 설문/응답 데이터 저장
- ✅ **관계형 데이터**: 환자-의사 연결
- ✅ **Swagger 문서**: 자동 생성된 API 문서
- ✅ **통계 및 분석**: 각종 데이터 통계 제공

### 개발 도구
- ✅ **TypeScript**: 타입 안전성
- ✅ **Validation**: class-validator로 입력 검증
- ✅ **Error Handling**: 체계적인 예외 처리
- ✅ **Logging**: 구조화된 로그 시스템

## 기술 스택

- **Framework**: NestJS
- **Database**: MariaDB (Native Driver)
- **Cache/Session**: Redis
- **Authentication**: Session-based + JWT (호환)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## 설치 및 실행

### 사전 요구사항
- Node.js 18+
- MariaDB 10.5+
- Redis 6.0+
- npm

### 설치
```bash
npm install
```

### 환경 변수 설정
`.env` 파일을 생성하고 다음과 같이 설정 (`config/env.example` 참고):

```env
# 마리아DB 연결 정보
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mariadb_password
DB_DATABASE=yame

# Redis 연결 정보
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT (기존 시스템과의 호환성을 위해 유지)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 환경 설정
NODE_ENV=development

# 세션 설정
SESSION_PREFIX=spring:session:sessions:

# 서버 설정
PORT=3001
```

### 데이터베이스 설정
MariaDB에 접속하여 스키마를 생성:
```bash
mysql -u root -p < database/schema.sql
```

### 실행
```bash
# 개발 모드
npm run start:dev

# 빌드
npm run build

# 운영 모드
npm run start:prod
```

## API 문서

서버 실행 후 다음 URL에서 Swagger API 문서를 확인할 수 있습니다:
- http://localhost:3001/api

## 🔐 인증 시스템

### 세션 기반 인증 (메인)
FastAPI와 동일한 로직으로 구현된 세션 인증:

```typescript
// 세션에서 사용자 정보 추출
async getUserFromSession(sessionId: string) {
  const realId = this.decodeSpringSessionId(sessionId);
  const redisKey = `spring:session:sessions:${realId}`;
  const userData = await this.redis.hget(redisKey, 'sessionAttr:USER');
  return JSON.parse(userData);
}
```

#### 세션 ID 추출 방식
- **쿠키**: `SESSION`, `JSESSIONID`
- **헤더**: `x-session-id`

#### Spring Session 호환
- 키 패턴: `spring:session:sessions:{sessionId}`
- 사용자 데이터: `sessionAttr:USER`
- JSON 파싱: GenericJackson2JsonRedisSerializer 호환

### JWT 인증 (호환성)
기존 시스템과의 호환성을 위해 JWT 인증도 지원

## 📊 주요 엔드포인트

### 🎯 야메 처방 (증상 분석) - 핵심 기능
- `POST /symptom-logs/analyze` - AI 증상 분석 및 추천
- `POST /symptom-logs/feedback` - 추천 결과 피드백 제출
- `GET /symptom-logs/feedback/stats` - 피드백 통계 조회
- `POST /symptom-logs/intake-token/:token` - 병원 접수 토큰 사용
- `GET /symptom-logs/tokens/stats` - 토큰 사용 통계

### 👥 사용자 관리 (세션 인증)
- `GET /users` - 사용자 목록 조회
- `GET /users/me` - 현재 사용자 정보
- `GET /users/:id` - 사용자 상세 조회
- `PATCH /users/:id` - 사용자 정보 수정
- `DELETE /users/:id` - 사용자 삭제

### 📋 평가 관리 (세션 인증)
- `GET /assessments` - 평가 목록 조회
- `POST /assessments` - 새로운 평가 생성
- `GET /assessments/:id` - 평가 상세 조회
- `PATCH /assessments/:id` - 평가 정보 수정
- `DELETE /assessments/:id` - 평가 삭제
- `GET /assessments?patientId=N` - 환자별 평가 조회
- `GET /assessments?doctorId=N` - 의사별 평가 조회

### 🔄 데이터 수집 관리 (관리자)
- `GET /data-collector/collect-all` - 전체 데이터 수집 실행
- `GET /data-collector/collect-hospitals` - HIRA 병원 데이터 수집
- `GET /data-collector/collect-pharmacies` - HIRA 약국 데이터 수집
- `GET /data-collector/collect-emergency` - 응급의료기관 데이터 수집
- `GET /data-collector/collect-trauma` - 외상센터 데이터 수집
- `GET /data-collector/collect-dur-ingredient` - DUR 성분 데이터 수집
- `GET /data-collector/collect-dur-item` - DUR 품목 데이터 수집
- `GET /data-collector/collect-dur-all` - DUR 전체 데이터 수집 (성분 + 품목)
- `GET /data-collector/collect-hospital` - 병원 데이터 수집 (HIRA 병원)
- `GET /data-collector/collect-pharmacy` - 약국 데이터 수집 (HIRA 약국)
- `GET /data-collector/status` - 수집 상태 조회

### 🏥 외부 API 연동
- **HIRA API**: 건보공단 병원/약국 정보 (3000개씩 배치 처리)
- **E-Gen API**: 응급의료기관 기본정보, 외상센터 기본정보 (3000개씩 배치 처리)
- **MFDS DUR API**: 의약품 금기사항 정보 (성분/품목 기반, 100개씩 배치 처리)
- **공공데이터포털**: 각종 의료기관 정보

### 🛠️ 시스템 관리
- `GET /` - API 정보
- `GET /health` - 헬스 체크
- `GET /api` - Swagger API 문서

## 🗄️ 데이터베이스 스키마

### Users 테이블
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Assessments 테이블
```sql
CREATE TABLE assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('general', 'cardiac', 'neurological', 'respiratory', 'psychological'),
  status ENUM('pending', 'in_progress', 'completed', 'reviewed'),
  questionnaire JSON,
  responses JSON,
  results TEXT,
  doctorNotes TEXT,
  patientId INT NOT NULL,
  doctorId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES users(id),
  FOREIGN KEY (doctorId) REFERENCES users(id)
);
```

## 🛡️ 보안 기능

### 데이터베이스 보안
- **SQL 인젝션 방지**: Prepared Statement 사용
- **연결 암호화**: TLS/SSL 지원
- **권한 분리**: 최소 권한 원칙

### 세션 보안
- **세션 만료**: Redis TTL 기반
- **세션 검증**: 각 요청마다 유효성 확인
- **크로스 도메인**: CORS 설정

### 입력 검증
- **class-validator**: DTO 레벨 검증
- **타입 검증**: TypeScript 타입 시스템
- **SQL 파라미터**: 바인딩 파라미터 사용

## 🔧 개발 가이드

### 새로운 기능 추가 가이드 (리팩토링된 구조)

새로운 기능적 구조에서 API 기능을 추가하는 방법:

#### 1. **📋 DTO 정의** (`interfaces/`)
```typescript
// interfaces/create-example.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateExampleDto {
  @ApiProperty({ example: 'Example Name' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Example Description' })
  @IsOptional()
  description?: string;
}
```

#### 2. **🗄️ Entity 모델 정의** (`models/`)
```typescript
// models/example.entity.ts
export interface Example {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### 3. **🔧 Service 구현** (`services/`)
```typescript
// services/example.service.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CreateExampleDto } from '../interfaces/create-example.dto';
import { Example } from '../models/example.entity';

@Injectable()
export class ExampleService {
  constructor(private databaseService: DatabaseService) {}
  
  async findAll(): Promise<Example[]> {
    const sql = 'SELECT * FROM examples WHERE active = ?';
    return this.databaseService.query(sql, [true]);
  }

  async create(createDto: CreateExampleDto): Promise<Example> {
    const sql = 'INSERT INTO examples (name, description) VALUES (?, ?)';
    const result = await this.databaseService.query(sql, [
      createDto.name, 
      createDto.description
    ]);
    return this.findById(result.insertId);
  }
}
```

#### 4. **🎯 Controller 구현** (`controllers/`)
```typescript
// controllers/example.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ExampleService } from '../services/example.service';
import { CreateExampleDto } from '../interfaces/create-example.dto';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { SessionUser } from '../decorators/session-user.decorator';

@ApiTags('Examples')
@Controller('examples')
@UseGuards(SessionAuthGuard)
@ApiSecurity('session')
export class ExampleController {
  constructor(private exampleService: ExampleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all examples' })
  findAll(@SessionUser() user: any) {
    return this.exampleService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create new example' })
  create(@Body() createDto: CreateExampleDto) {
    return this.exampleService.create(createDto);
  }
}
```

#### 5. **⚙️ Module 설정** (`config/`)
```typescript
// config/example.module.ts
import { Module } from '@nestjs/common';
import { ExampleService } from '../services/example.service';
import { ExampleController } from '../controllers/example.controller';
import { SessionModule } from './session.module';

@Module({
  imports: [SessionModule],
  controllers: [ExampleController],
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
```

#### 6. **🏠 Root Module 등록** (`app.module.ts`)
```typescript
// app.module.ts에 새 모듈 추가
import { ExampleModule } from './config/example.module';

@Module({
  imports: [
    // ... 기존 모듈들
    ExampleModule, // 추가
  ],
})
export class AppModule {}
```

### 세션 인증 사용법

```typescript
// 가드 적용
@UseGuards(SessionAuthGuard)

// 사용자 정보 접근
@Get('profile')
getProfile(@SessionUser() user: any) {
  return {
    id: user.id,
    name: user.name,
    role: user.role
  };
}

// 특정 사용자 속성만 추출
@Get('name')
getName(@SessionUser('name') userName: string) {
  return { name: userName };
}
```

### MariaDB 쿼리 작성

```typescript
// 단순 조회
const users = await this.databaseService.query(
  'SELECT * FROM users WHERE role = ?',
  ['patient']
);

// 복잡한 조인
const assessments = await this.databaseService.query(`
  SELECT 
    a.*,
    p.name as patient_name,
    d.name as doctor_name
  FROM assessments a
  LEFT JOIN users p ON a.patientId = p.id
  LEFT JOIN users d ON a.doctorId = d.id
  WHERE a.status = ?
`, ['completed']);

// 트랜잭션 (필요시)
const conn = await this.databaseService.getConnection();
try {
  await conn.beginTransaction();
  // 여러 쿼리 실행
  await conn.commit();
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  conn.release();
}
```

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# 테스트 커버리지
npm run test:cov

# E2E 테스트
npm run test:e2e

# 특정 파일 테스트
npm run test -- users.service.spec.ts
```

## 📁 프로젝트 구조

### 🏗️ 기능적 구조 (2024.12 리팩토링)

새로운 기능 중심의 디렉터리 구조로 리팩토링되어 유지보수성과 확장성이 크게 향상되었습니다.

```
src/
├── 📄 app.module.ts                    # 🏠 루트 모듈
├── 📄 main.ts                          # 🚀 애플리케이션 진입점
│
├── 📁 controllers/                     # 🎯 REST API 라우터/컨트롤러
│   ├── app.controller.ts               # 메인 API 엔드포인트
│   ├── assessments.controller.ts       # 의료 평가 API
│   ├── data-collector.controller.ts    # 데이터 수집 관리 API
│   ├── symptom-logs.controller.ts      # 증상 분석 API (야메 처방)
│   └── users.controller.ts             # 사용자 관리 API
│
├── 📁 services/                        # 🔧 비즈니스 로직 서비스
│   ├── app.service.ts                  # 메인 앱 서비스
│   ├── assessments.service.ts          # 의료 평가 비즈니스 로직
│   ├── data-collector.service.ts       # 데이터 수집 스케줄링
│   ├── database.service.ts             # 데이터베이스 연결
│   ├── emergency-base.service.ts       # 응급의료기관 데이터 수집
│   ├── feedback.service.ts             # 피드백 관리
│   ├── hira-hospital.service.ts        # HIRA 병원 데이터 수집
│   ├── hira-pharmacy.service.ts        # HIRA 약국 데이터 수집
│   ├── intake-tokens.service.ts        # 병원 접수 토큰
│   ├── redis.service.ts               # Redis 캐시 관리
│   ├── session.service.ts             # 세션 관리
│   ├── symptom-logs.service.ts        # 증상 분석 워크플로우
│   ├── trauma-base.service.ts          # 외상센터 데이터 수집
│   ├── dur-ingredient.service.ts       # DUR 성분 데이터 수집
│   ├── dur-item.service.ts             # DUR 품목 데이터 수집
│   └── users.service.ts               # 사용자 관리
│
├── 📁 models/                          # 🗄️ 데이터베이스 엔티티
│   ├── assessment.entity.ts           # 의료 평가 모델
│   ├── feedback.entity.ts            # 피드백 모델
│   ├── intake-token.entity.ts        # 접수 토큰 모델
│   ├── symptom-log.entity.ts         # 증상 로그 모델
│   └── user.entity.ts               # 사용자 모델
│
├── 📁 interfaces/                      # 📋 DTO 및 인터페이스
│   ├── create-assessment.dto.ts       # 평가 생성 DTO
│   ├── create-feedback.dto.ts        # 피드백 생성 DTO
│   ├── create-symptom-log.dto.ts     # 증상 로그 생성 DTO
│   ├── create-user.dto.ts            # 사용자 생성 DTO
│   ├── data-collection.interface.ts  # 데이터 수집 공통 인터페이스
│   ├── symptom-analysis-result.dto.ts # 분석 결과 DTO
│   ├── update-assessment.dto.ts      # 평가 수정 DTO
│   └── update-user.dto.ts           # 사용자 수정 DTO
│
├── 📁 utils/                          # 🛠️ 유틸리티 & 헬퍼
│   ├── api-collector.util.ts         # 공통 API 수집 유틸리티
│   ├── case-converter.util.ts        # camelCase 변환 유틸리티
│   ├── dur-check.service.ts          # 의약품 금기사항 체크
│   ├── geo.service.ts               # 위치 기반 서비스
│   ├── hira-collector.service.ts    # HIRA API 수집기
│   ├── hospital-collector.service.ts # 병원 데이터 수집기
│   ├── ml-prediction.service.ts     # ML 예측 서비스
│   └── pharmacy-collector.service.ts # 약국 데이터 수집기
│
├── 📁 config/                         # ⚙️ 모듈 설정
│   ├── assessments.module.ts         # 평가 모듈 설정
│   ├── data-collector.module.ts      # 데이터 수집 모듈
│   ├── database.module.ts           # 데이터베이스 모듈
│   ├── redis.module.ts             # Redis 모듈
│   ├── session.module.ts           # 세션 모듈
│   ├── symptom-logs.module.ts       # 증상 로그 모듈
│   └── users.module.ts             # 사용자 모듈
│
├── 📁 guards/                         # 🛡️ 인증 가드
│   ├── external-auth.guard.ts       # 외부 인증 가드
│   └── session-auth.guard.ts        # 세션 인증 가드
│
├── 📁 decorators/                     # 🎨 커스텀 데코레이터
│   └── session-user.decorator.ts    # 세션 사용자 데코레이터
│
├── 📁 middlewares/                    # 🔀 미들웨어 (향후 확장)
└── 📁 constants/                      # 📊 상수 정의 (향후 확장)
```

### 🚀 구조 변경의 장점

1. **🎯 명확한 책임 분리**: 각 폴더의 역할이 명확하게 구분됨
2. **🔍 쉬운 탐색**: 찾고자 하는 파일의 위치를 직관적으로 파악 가능
3. **🧩 모듈화**: 기능별 독립성과 재사용성 향상
4. **📈 확장성**: 새로운 기능 추가 시 명확한 위치 지정
5. **👥 팀 협업**: 표준화된 구조로 개발자 간 일관성 확보
6. **🛠️ 유지보수**: 관련 파일들이 논리적으로 그룹화되어 관리 용이
7. **🔄 데이터 수집 자동화**: 체계적인 API 데이터 수집 및 스케줄링
8. **📊 camelCase 변환**: 데이터베이스 조회 결과 자동 camelCase 변환으로 일관성 확보
9. **🔑 API 키 보안**: decodeURIComponent 적용으로 API 키 안전성 향상
10. **🏗️ 인터페이스 최적화**: DUR 관련 인터페이스 공통화 및 상속 구조로 코드 중복 제거
11. **🌐 API 호출 방식**: GET 방식으로 변경하여 브라우저에서 직접 호출 가능
12. **📝 로깅 시스템**: API 호출 시 FULL URL 로깅으로 디버깅 및 모니터링 용이성 향상

### 📂 폴더별 상세 설명

- **controllers/**: HTTP 요청 처리 및 라우팅 담당
- **services/**: 핵심 비즈니스 로직 구현
- **models/**: 데이터베이스 테이블과 매핑되는 엔티티
- **interfaces/**: API 요청/응답 데이터 구조 정의
- **utils/**: 재사용 가능한 유틸리티 함수 및 헬퍼
- **config/**: NestJS 모듈 설정 및 의존성 주입 관리
- **guards/**: 인증 및 권한 검사 로직
- **decorators/**: 커스텀 파라미터 데코레이터
- **middlewares/**: HTTP 요청 전처리 로직 (확장용)
- **constants/**: 애플리케이션 전역 상수 (확장용)

## 🚀 성능 최적화

### 데이터베이스
- **커넥션 풀링**: 10개 연결 유지
- **인덱스 최적화**: 자주 조회되는 컬럼에 인덱스
- **쿼리 최적화**: JOIN 최소화, 필요한 컬럼만 SELECT

### Redis
- **연결 재사용**: 단일 클라이언트 인스턴스
- **파이프라인**: 여러 명령어 일괄 처리
- **TTL 관리**: 메모리 사용량 최적화

## 🔍 모니터링 & 로깅

### 로그 시스템
```typescript
private readonly logger = new Logger(ClassName);

// 정보 로그
this.logger.log('사용자 로그인 성공', { userId, email });

// 경고 로그
this.logger.warn('세션 만료 임박', { sessionId, ttl });

// 에러 로그
this.logger.error('데이터베이스 연결 실패', error);
```

### 헬스 체크
```bash
# 서비스 상태 확인
curl http://localhost:3001/health

# 응답 예시
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "YAME Backend API"
}
```

## 📋 배포 가이드

### Docker 사용 (권장)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### 환경별 설정
- **개발**: `NODE_ENV=development`
- **스테이징**: `NODE_ENV=staging`
- **운영**: `NODE_ENV=production`

## 🤝 기여 가이드

1. **코딩 스타일**: ESLint + Prettier 설정 준수
2. **커밋 메시지**: Conventional Commits 규칙
3. **테스트**: 새 기능 추가 시 테스트 코드 작성
4. **문서화**: README 업데이트 및 API 문서 작성