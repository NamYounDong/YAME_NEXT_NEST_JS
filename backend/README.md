# YAME Backend API

NestJS 기반의 의료 평가 시스템 백엔드 API

> 🚀 **2024.12 구조 리팩토링 완료**: 기능 중심의 디렉터리 구조로 전면 개편하여 유지보수성과 확장성을 대폭 향상
> 🔄 **2024.12 데이터 수집 시스템 완성**: HIRA, E-Gen, DUR API 연동 및 자동 스케줄링 시스템 구축 완료
> 📊 **2024.12 camelCase 변환 시스템**: 데이터베이스 조회 결과 자동 camelCase 변환으로 일관성 확보
> 🔑 **2024.12 API 키 보안 강화**: decodeURIComponent 적용으로 API 키 안전성 향상
> 🏗️ **2024.12 인터페이스 구조 개선**: DUR 관련 인터페이스 공통화 및 상속 구조로 리팩토링
> 🤖 **2024.12 LLM RAG 시스템 도입**: ML 기반에서 GPT-4o + DUR 데이터 기반 RAG로 전환하여 정확도 및 유연성 대폭 향상
> 🔍 **2025.01 상세 로깅 시스템 구축**: LLM 프롬프트, SQL 쿼리, 검색 결과 등 모든 프로세스 실시간 모니터링 가능

## 🚀 구현된 주요 기능

### 🎯 야메 진단 (핵심 기능) - WebSocket 기반 챗봇
- ✅ **WebSocket Gateway**: Socket.IO를 통한 실시간 양방향 통신
- ✅ **Agentend 연동**: FastAPI (LangChain + RAG) 서비스와 HTTP 통신
- ✅ **클라이언트 관리**: 세션별 독립적인 채팅 룸 관리
- ✅ **자동 재연결**: 연결 끊김 시 자동 재연결 처리
- ✅ **메시지 라우팅**: 프론트엔드 ↔ NestJS ↔ FastAPI 메시지 전달
- ✅ **세션 정리**: 채팅 종료 시 Redis 메모리 자동 해제

### 🔄 데이터 수집 시스템
- ✅ **HIRA 병원 정보**: 건보공단 병원 기본정보 수집 (3000개씩 배치)
- ✅ **HIRA 약국 정보**: 건보공단 약국 기본정보 수집 (3000개씩 배치)
- ✅ **응급의료기관 정보**: E-Gen API 기반 응급의료기관 기본정보 수집 (3000개씩 배치)
- ✅ **외상센터 정보**: E-Gen API 기반 외상센터 기본정보 수집 (3000개씩 배치)
- ✅ **DUR 성분 정보**: MFDS DUR API 기반 의약품 성분 금기사항 수집 (100개씩 배치)
- ✅ **DUR 품목 정보**: MFDS DUR API 기반 의약품 품목 금기사항 수집 (100개씩 배치)
- ✅ **자동 스케줄링**: 일/주/3분 단위 자동 데이터 수집

### 🔄 외부 API 연동
- ✅ **Agentend API**: FastAPI (LangChain + RAG) 서비스 연동 ⭐ NEW
- ✅ **HIRA API**: 건보공단 병원/약국 정보 수집
- ✅ **E-Gen API**: 응급의료기관 기본정보, 외상센터 기본정보 수집
- ✅ **MFDS DUR API**: 식약처 의약품 금기사항 정보 (성분/품목 기반)
- ✅ **VWorld API**: 위치 기반 지도 및 주소 정보 제공
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
- ✅ **증상 로그**: LLM 기반 증상 분석 이력 관리
- ✅ **JSON 데이터 처리**: 설문/응답 데이터 저장
- ✅ **관계형 데이터**: 환자-의사 연결
- ✅ **Swagger 문서**: 자동 생성된 API 문서
- ✅ **통계 및 분석**: 각종 데이터 통계 제공

### 개발 도구
- ✅ **TypeScript**: 타입 안전성
- ✅ **Validation**: class-validator로 입력 검증
- ✅ **Error Handling**: 체계적인 예외 처리
- ✅ **Logging**: 구조화된 로그 시스템 (LLM, SQL, 검색 결과 전부 로깅)
- ✅ **Debugging**: 상세한 디버깅 정보 출력 (프롬프트, 응답, 쿼리)

## 기술 스택

- **Framework**: NestJS
- **WebSocket**: Socket.IO (@nestjs/websockets)
- **Database**: MariaDB (Native Driver)
- **Cache/Session**: Redis
- **AI Service**: Agentend (FastAPI + LangChain + RAG) ⭐
- **Authentication**: Session-based + JWT (호환)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **External APIs**: Agentend, HIRA, E-Gen, MFDS DUR, VWorld

## 설치 및 실행

### 사전 요구사항
- Node.js 18+
- MariaDB 10.5+
- Redis 6.0+
- npm
- OpenAI API Key

### 설치
```bash
npm install
```

### 환경 변수 설정
`.env` 파일을 생성하고 다음과 같이 설정:

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

# Agentend (FastAPI) URL
AGENTEND_URL=http://127.0.0.1:8000

# VWorld API
VWORLD_API_KEY=your-vworld-api-key
VWORLD_API_URL=https://api.vworld.kr

# HIRA API (건보공단)
HIRA_API_KEY=your-hira-api-key

# E-Gen API (응급의료)
EGEN_API_KEY=your-egen-api-key

# MFDS DUR API (식약처)
DUR_API_KEY=your-dur-api-key

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
mysql -u root -p < yame_create_tables.sql
```

#### LLM RAG 관련 테이블 수정 (필수)
```sql
-- SYMPTOM_LOGS 테이블에 LLM 관련 컬럼 추가
ALTER TABLE SYMPTOM_LOGS
  ADD COLUMN IF NOT EXISTS MEDICAL_TERMS TEXT NULL COMMENT 'LLM이 변환한 의학 용어들 (JSON 배열)',
  ADD COLUMN IF NOT EXISTS SUSPECTED_DISEASES JSON NULL COMMENT 'LLM이 추론한 의심 질병 목록 (JSON 배열)',
  ADD COLUMN IF NOT EXISTS LLM_ANALYSIS TEXT NULL COMMENT 'LLM의 전체 분석 내용',
  ADD COLUMN IF NOT EXISTS SEVERITY_SCORE INT NULL COMMENT '심각도 점수 (1-10, 높을수록 심각)',
  ADD COLUMN IF NOT EXISTS RECOMMENDED_DRUGS JSON NULL COMMENT '추천 약품 목록 (JSON 배열)',
  ADD COLUMN IF NOT EXISTS NEARBY_PHARMACIES JSON NULL COMMENT '주변 약국 정보 (JSON)',
  ADD COLUMN IF NOT EXISTS NEARBY_HOSPITALS JSON NULL COMMENT '주변 병원 정보 (JSON)',
  MODIFY COLUMN ITEM_SEQ VARCHAR(20) NULL COMMENT '품목 기준코드(DUR)',
  MODIFY COLUMN PREDICTED_DISEASE VARCHAR(500) NULL COMMENT 'LLM이 추정한 질병명';

CREATE INDEX IF NOT EXISTS IDX_LOGS_SEVERITY ON SYMPTOM_LOGS (SEVERITY_SCORE, CREATED_AT);
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

## 🤖 LLM RAG 증상 분석 워크플로우

### 1. 증상 입력 및 분석 (SymptomAnalysisService)
사용자가 자연어로 증상을 입력하면, GPT-4o가 다음을 수행합니다:
- 증상을 의학 용어로 변환 (예: "미열" → "low-grade fever")
- 가능한 질병 추론 및 확률 계산 (예: 감기 85%, 독감 60%)
- 심각도 점수 산정 (1-10, 높을수록 심각)
- **로깅**: 프롬프트, GPT-4o 응답, 파싱 결과 모두 기록

### 2. DUR 기반 약품 추천 (DrugRecommendationService)
- LLM이 추출한 의학 용어로 DUR 데이터베이스에서 OTC 약품 검색
- **로깅**: 검색 키워드, SQL 쿼리, 검색 결과 개수, 실제 약품 목록
- 검색 결과가 없을 경우 디버깅 힌트 제공:
  - ITEM_DUR_INFO 테이블 데이터 확인
  - ETC_OTC_CODE = '02' 조건 확인
  - 한글/영문 키워드 매칭 확인
- 검색된 약품을 LLM에 전달하여 최적의 약품 선택
- 사용자 정보(나이, 임신 여부 등)를 기반으로 DUR 금기사항 체크
- **로깅**: DUR 경고 사항, 추천 이유

### 3. 심각도 기반 안내
- **경증 (1-6점)**: OTC 약품 추천 및 주변 약국 안내
- **중등도 (7점)**: 약품 추천과 함께 병원 방문 권고
- **중증 (8-10점)**: 즉시 병원 방문 안내 (약품 추천 없음)

### 4. 위치 기반 시설 검색 (FacilitySearchService)
- GPS 좌표를 기반으로 주변 병원/약국 검색 (MariaDB SPATIAL INDEX 활용)
- 현재 시간 기준 운영 중인 시설만 필터링 (moment-timezone 사용)
- 거리순 정렬하여 제공 (기본 3km 반경, 최대 10개)
- **로깅**: 검색 좌표, 반경, 필터링 결과

### 5. 지도 및 주소 제공 (VWorldService)
- VWorld API를 통해 좌표를 주소로 변환
- 지도 표시 및 주소 복사 기능 제공
- **로깅**: API 호출 정보, 변환 결과

### 6. 로그 저장
모든 분석 결과를 SYMPTOM_LOGS 테이블에 저장:
- 원본 증상 텍스트 (SYMPTOM_TEXT)
- 변환된 의학 용어 (MEDICAL_TERMS, JSON)
- 추론된 질병 목록 (SUSPECTED_DISEASES, JSON)
- LLM 분석 내용 (LLM_ANALYSIS)
- 심각도 점수 (SEVERITY_SCORE)
- 추천 약품 (RECOMMENDED_DRUGS, JSON)
- GPS 위치 정보 (LATITUDE, LONGITUDE, GPS_ACCURACY_M)
- 주변 시설 정보 (NEARBY_PHARMACIES, NEARBY_HOSPITALS, JSON)

### 서비스 구조

```typescript
// 증상 분석 서비스
OpenAIService
  └─ chat(prompt): GPT-4o API 호출

SymptomAnalysisService
  ├─ analyzeSymptoms(): 증상 분석 총괄
  ├─ convertToMedicalTerms(): 의학 용어 변환
  ├─ inferDiseases(): 질병 추론
  └─ saveSymptomLog(): 로그 저장

DrugRecommendationService
  ├─ recommendDrugs(): 약품 추천
  ├─ getOTCDrugs(): DUR에서 OTC 약품 조회
  ├─ checkDURContraindications(): 금기사항 체크
  ├─ checkPregnancyContraindications(): 임신부 금기
  └─ checkElderlyContraindications(): 고령자 금기

FacilitySearchService
  ├─ searchNearbyPharmacies(): 주변 약국 검색
  ├─ searchNearbyHospitals(): 주변 병원 검색
  └─ isOperatingNow(): 운영시간 체크

VWorldService
  ├─ getAddressFromCoords(): 좌표 → 주소
  └─ getCoordsFromAddress(): 주소 → 좌표
```

## 📊 주요 엔드포인트

### 🤖 LLM 증상 분석
- `POST /api/symptom-logs/analyze` - LLM 기반 증상 분석 및 약품 추천

**요청 본문:**
```json
{
  "symptomText": "머리가 아프고 열이 나요",
  "subSymptoms": ["기침", "코막힘"],
  "latitude": 37.5665,
  "longitude": 126.9780,
  "gpsAccuracy": 10,
  "userAge": 35,
  "isPregnant": false
}
```

**응답 예시:**
```json
{
  "logId": 123,
  "medicalTerms": ["두통", "발열", "기침", "비충혈"],
  "suspectedDiseases": [
    { "disease": "감기", "confidence": 0.85 },
    { "disease": "독감", "confidence": 0.60 }
  ],
  "severityScore": 4,
  "severityLevel": "mild",
  "analysis": "증상으로 보아 일반적인 감기로 추정됩니다...",
  "recommendedDrugs": [
    {
      "itemSeq": "200001234",
      "itemName": "타이레놀정",
      "entpName": "한국존슨앤드존슨",
      "classNo": "[111]해열진통소염제",
      "reason": "두통과 발열 완화에 효과적"
    }
  ],
  "nearbyPharmacies": [
    {
      "name": "서울약국",
      "address": "서울시 종로구...",
      "distance": 0.5,
      "phone": "02-1234-5678",
      "isOpen": true
    }
  ],
  "guidanceMessage": "일반 의약품으로 증상 완화가 가능합니다. 가까운 약국을 방문하세요."
}
```

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
- `GET /data-collector/status` - 수집 상태 조회

### 🛠️ 시스템 관리
- `GET /` - API 정보
- `GET /health` - 헬스 체크
- `GET /api` - Swagger API 문서

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# 테스트 커버리지
npm run test:cov

# E2E 테스트
npm run test:e2e

# 특정 파일 테스트
npm run test -- symptom-analysis.service.spec.ts
```

### API 테스트 (test-symptom-analysis.http)
```http
### 증상 분석 테스트
POST http://localhost:3001/api/symptom-logs/analyze
Content-Type: application/json

{
  "symptomText": "머리가 아프고 열이 나요",
  "subSymptoms": ["기침", "코막힘"],
  "latitude": 37.5665,
  "longitude": 126.9780,
  "gpsAccuracy": 10,
  "userAge": 35,
  "isPregnant": false
}
```

### 로그 모니터링
증상 분석 실행 시 다음 로그를 확인할 수 있습니다:
```
[SymptomAnalysis] 증상 분석 시작: 머리가 아프고 열이 나요
[OpenAI] 증상 분석 프롬프트: ...
[OpenAI] GPT-4o 응답: {"medicalTerms": [...], ...}
[OpenAI] 파싱된 결과: ...
[DrugRecommendation] 검색 키워드: headache, fever
[DrugRecommendation] 실행 SQL: SELECT ... FROM ITEM_DUR_INFO ...
[DrugRecommendation] 검색 결과: 15개 약품 발견
[DrugRecommendation] 처음 5개 약품: ...
```

## 📁 프로젝트 구조

### 🏗️ 기능적 구조 (2024.12 리팩토링)

```
src/
├── 📄 app.module.ts                    # 🏠 루트 모듈
├── 📄 main.ts                          # 🚀 애플리케이션 진입점
│
├── 📁 controllers/                     # 🎯 REST API 라우터/컨트롤러
│   ├── app.controller.ts               # 메인 API 엔드포인트
│   ├── assessments.controller.ts       # 의료 평가 API
│   ├── data-collector.controller.ts    # 데이터 수집 관리 API
│   ├── symptom-logs.controller.ts      # LLM 증상 분석 API ⭐ NEW
│   └── users.controller.ts             # 사용자 관리 API
│
├── 📁 services/                        # 🔧 비즈니스 로직 서비스
│   ├── app.service.ts                  # 메인 앱 서비스
│   ├── assessments.service.ts          # 의료 평가 비즈니스 로직
│   ├── data-collector.service.ts       # 데이터 수집 스케줄링
│   ├── database.service.ts             # 데이터베이스 연결
│   ├── redis.service.ts               # Redis 캐시 관리
│   ├── session.service.ts             # 세션 관리
│   ├── users.service.ts               # 사용자 관리
│   ├── openai.service.ts              # OpenAI GPT-4o API ⭐ NEW
│   ├── symptom-analysis.service.ts    # LLM 증상 분석 ⭐ NEW
│   ├── drug-recommendation.service.ts # DUR 기반 약품 추천 ⭐ NEW
│   ├── facility-search.service.ts     # 위치 기반 시설 검색 ⭐ NEW
│   ├── vworld.service.ts              # VWorld 지도 API ⭐ NEW
│   ├── hira-hospital.service.ts       # HIRA 병원 데이터 수집
│   ├── hira-pharmacy.service.ts       # HIRA 약국 데이터 수집
│   ├── emergency-base.service.ts      # 응급의료기관 데이터 수집
│   ├── trauma-base.service.ts         # 외상센터 데이터 수집
│   ├── dur-ingredient.service.ts      # DUR 성분 데이터 수집
│   └── dur-item.service.ts            # DUR 품목 데이터 수집
│
├── 📁 models/                          # 🗄️ 데이터베이스 엔티티
│   ├── assessment.entity.ts           # 의료 평가 모델
│   ├── symptom-log.entity.ts         # 증상 로그 모델
│   └── user.entity.ts               # 사용자 모델
│
├── 📁 interfaces/                      # 📋 DTO 및 인터페이스
│   ├── create-assessment.dto.ts       # 평가 생성 DTO
│   ├── create-user.dto.ts            # 사용자 생성 DTO
│   ├── analyze-symptom.dto.ts        # 증상 분석 요청 DTO ⭐ NEW
│   ├── data-collection.interface.ts  # 데이터 수집 공통 인터페이스
│   ├── update-assessment.dto.ts      # 평가 수정 DTO
│   └── update-user.dto.ts           # 사용자 수정 DTO
│
├── 📁 config/                         # ⚙️ 모듈 설정
│   ├── assessments.module.ts         # 평가 모듈 설정
│   ├── data-collector.module.ts      # 데이터 수집 모듈
│   ├── database.module.ts           # 데이터베이스 모듈
│   ├── redis.module.ts             # Redis 모듈
│   ├── session.module.ts           # 세션 모듈
│   ├── symptom-logs.module.ts       # LLM 증상 분석 모듈 ⭐ NEW
│   └── users.module.ts             # 사용자 모듈
│
├── 📁 guards/                         # 🛡️ 인증 가드
│   ├── external-auth.guard.ts       # 외부 인증 가드
│   └── session-auth.guard.ts        # 세션 인증 가드
│
├── 📁 decorators/                     # 🎨 커스텀 데코레이터
│   └── session-user.decorator.ts    # 세션 사용자 데코레이터
│
└── 📁 scheduler/                      # ⏰ 스케줄러
    └── scheduler.module.ts          # 데이터 수집 스케줄링
```

## 🚀 성능 최적화

### 데이터베이스
- **커넥션 풀링**: 10개 연결 유지
- **인덱스 최적화**: 자주 조회되는 컬럼에 인덱스
- **쿼리 최적화**: JOIN 최소화, 필요한 컬럼만 SELECT

### Redis
- **연결 재사용**: 단일 클라이언트 인스턴스
- **파이프라인**: 여러 명령어 일괄 처리
- **TTL 관리**: 메모리 사용량 최적화

### LLM API
- **프롬프트 최적화**: 명확하고 구조화된 프롬프트 작성
- **에러 핸들링**: API 실패 시 상세한 에러 메시지
- **상세 로깅**: 
  - 전체 프롬프트 내용 (입력 증상, 시스템 메시지)
  - GPT-4o 응답 JSON (전체 내용)
  - 파싱된 결과 (의학 용어, 질병, 심각도)
  - SQL 쿼리 및 실행 결과
  - 검색 키워드 및 파라미터
  - 디버깅 힌트 (문제 발생 시)

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

## 📝 라이선스

Copyright © 2024 YAME Project
