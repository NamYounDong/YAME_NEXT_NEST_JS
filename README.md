# YAME (Your Assessment for Medical Evaluation)

## 🏥 디지털 예진 시스템 - LLM RAG 기반 의약품 추천 시스템

**GPT-4o**와 **DUR 데이터**를 활용한 RAG(Retrieval-Augmented Generation) 기반 스마트 의료 서비스 플랫폼입니다. 사용자의 자연어 증상을 분석하여 안전한 OTC 약품을 추천하거나 병원 진료를 안내하며, GPS 기반 주변 의료기관 정보를 제공합니다.

### 🌟 주요 특징
- 🤖 **OpenAI GPT-4o**: 자연어 증상을 의학 용어로 변환하고 질병 추론
- 💊 **DUR RAG**: 식약처 DUR 데이터를 활용한 안전한 약품 추천
- 🔍 **상세 로깅**: 모든 LLM 호출, SQL 쿼리, 검색 결과 실시간 모니터링
- 📍 **위치 기반**: GPS 기반 주변 약국/병원 검색 (운영시간 고려)
- 🗺️ **VWorld 연동**: 지도 표시 및 주소 복사 기능

## 📋 프로젝트 구조

```
YAME/
├── backend/                           # NestJS 백엔드 API (LLM RAG 기반)
│   ├── src/
│   │   ├── config/                    # 모듈 설정
│   │   │   ├── assessments.module.ts  # 평가 모듈
│   │   │   ├── data-collector.module.ts # 데이터 수집 모듈
│   │   │   ├── database.module.ts     # 데이터베이스 모듈
│   │   │   ├── redis.module.ts        # Redis 모듈
│   │   │   ├── session.module.ts      # 세션 관리 모듈
│   │   │   ├── symptom-logs.module.ts # LLM RAG 증상 분석 모듈 ⭐
│   │   │   └── users.module.ts        # 사용자 모듈
│   │   ├── controllers/               # API 컨트롤러
│   │   │   ├── app.controller.ts      # 메인 앱 컨트롤러
│   │   │   ├── assessments.controller.ts # 평가 컨트롤러
│   │   │   ├── data-collector.controller.ts # 데이터 수집 컨트롤러
│   │   │   ├── symptom-logs.controller.ts # 증상 분석 API ⭐
│   │   │   └── users.controller.ts    # 사용자 컨트롤러
│   │   ├── database/                  # 데이터베이스 매퍼
│   │   │   ├── base.mapper.ts         # 기본 매퍼
│   │   │   ├── dur-ingredient.mapper.ts # DUR 성분 매퍼
│   │   │   ├── dur-item.mapper.ts     # DUR 품목 매퍼
│   │   │   ├── emergency.mapper.ts    # 응급의료기관 매퍼
│   │   │   ├── hospital.mapper.ts     # 병원 매퍼
│   │   │   ├── pharmacy.mapper.ts     # 약국 매퍼
│   │   │   └── trauma.mapper.ts       # 외상센터 매퍼
│   │   ├── decorators/                # 커스텀 데코레이터
│   │   │   └── session-user.decorator.ts # 세션 사용자 데코레이터
│   │   ├── guards/                    # 인증 가드
│   │   │   ├── external-auth.guard.ts # 외부 인증 가드
│   │   │   └── session-auth.guard.ts  # 세션 인증 가드
│   │   ├── interfaces/                # DTO 및 인터페이스
│   │   │   ├── analyze-symptom.dto.ts # 증상 분석 요청 DTO ⭐
│   │   │   ├── create-assessment.dto.ts
│   │   │   ├── create-user.dto.ts
│   │   │   ├── data-collection.interface.ts
│   │   │   ├── response-base.dto.ts
│   │   │   ├── update-assessment.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── models/                    # 데이터 모델
│   │   │   ├── assessment.entity.ts   # 평가 엔티티
│   │   │   └── user.entity.ts         # 사용자 엔티티
│   │   ├── scheduler/                 # 데이터 수집 스케줄러
│   │   │   ├── dur-collection.scheduler.ts # DUR 수집 스케줄러
│   │   │   ├── emergency-collection.scheduler.ts # 응급실 수집
│   │   │   ├── full-collection.scheduler.ts # 전체 수집
│   │   │   ├── hira-collection.scheduler.ts # HIRA 수집
│   │   │   └── scheduler.module.ts    # 스케줄러 모듈
│   │   ├── services/                  # 비즈니스 로직
│   │   │   ├── app.service.ts         # 메인 서비스
│   │   │   ├── assessments.service.ts # 평가 서비스
│   │   │   ├── data-collector.service.ts # 데이터 수집 서비스
│   │   │   ├── database.service.ts    # 데이터베이스 서비스
│   │   │   ├── redis.service.ts       # Redis 서비스
│   │   │   ├── session.service.ts     # 세션 서비스
│   │   │   ├── users.service.ts       # 사용자 서비스
│   │   │   │
│   │   │   ├── # 📍 LLM RAG 증상 분석 서비스 (NEW)
│   │   │   ├── openai.service.ts      # OpenAI GPT-4o API ⭐
│   │   │   ├── symptom-analysis.service.ts # 증상 분석 ⭐
│   │   │   ├── drug-recommendation.service.ts # 약품 추천 ⭐
│   │   │   ├── facility-search.service.ts # 시설 검색 ⭐
│   │   │   ├── vworld.service.ts      # VWorld 지도 API ⭐
│   │   │   │
│   │   │   ├── # 📍 데이터 수집 서비스
│   │   │   ├── dur-ingredient.service.ts # DUR 성분 수집
│   │   │   ├── dur-item.service.ts    # DUR 품목 수집
│   │   │   ├── emergency-base.service.ts # 응급의료기관 수집
│   │   │   ├── hira-hospital.service.ts # HIRA 병원 수집
│   │   │   ├── hira-pharmacy.service.ts # HIRA 약국 수집
│   │   │   └── trauma-base.service.ts # 외상센터 수집
│   │   ├── utils/                     # 유틸리티
│   │   │   ├── api-collector.util.ts  # API 수집 유틸
│   │   │   └── case-converter.util.ts # camelCase 변환 유틸
│   │   ├── app.module.ts              # 메인 앱 모듈
│   │   └── main.ts                    # 앱 진입점
│   ├── config/                        # 환경 설정
│   ├── database/                      # 데이터베이스 파일
│   ├── dist/                          # 빌드 결과물
│   ├── logs/                          # 로그 파일
│   ├── package.json                   # Node.js 의존성
│   └── yame_create_tables.sql         # DB 스키마
├── frontend/                          # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/                       # App Router 페이지
│   │   │   ├── admin/                 # 관리자 페이지
│   │   │   │   └── scheduler/         # 스케줄러 관리
│   │   │   ├── symptom-analysis/      # LLM 증상 분석 페이지 ⭐
│   │   │   ├── globals.css            # 전역 스타일
│   │   │   ├── layout.tsx             # 루트 레이아웃
│   │   │   └── page.tsx               # 메인 페이지
│   │   ├── components/                # React 컴포넌트
│   │   │   ├── admin/                 # 관리자 컴포넌트
│   │   │   │   └── DataCollectionPanel.tsx # 데이터 수집 패널
│   │   │   ├── loading/               # 로딩 컴포넌트
│   │   │   │   ├── HeartLoader.tsx    # 하트 로더 애니메이션
│   │   │   │   └── LoadingOverlay.tsx # 전역 로딩 오버레이
│   │   │   ├── map/                   # 지도 컴포넌트
│   │   │   │   └── VWorldMap.tsx      # VWorld 지도 ⭐
│   │   │   ├── providers/             # 컨텍스트 프로바이더
│   │   │   │   └── LoadingProvider.tsx # 로딩 상태 프로바이더
│   │   │   ├── symptom/               # 증상 분석 컴포넌트 ⭐
│   │   │   │   ├── AnalysisResult.tsx # 분석 결과 표시
│   │   │   │   └── SymptomInputForm.tsx # 증상 입력 폼
│   │   │   ├── providers.tsx          # 프로바이더 통합
│   │   │   └── YameLogo.tsx           # YAME 로고
│   │   ├── services/                  # API 서비스 레이어
│   │   │   └── symptom.ts             # 증상 분석 서비스
│   │   ├── types/                     # TypeScript 타입 정의
│   │   │   └── symptom.ts             # 증상 관련 타입
│   │   └── utils/                     # 유틸리티 함수
│   │       └── api.ts                 # API 통신 유틸 (snake_case ↔ camelCase 변환) ⭐
│   ├── public/                        # 정적 파일
│   ├── package.json                   # Node.js 의존성
│   └── next.config.js                 # Next.js 설정
├── .gitignore                         # Git 무시 파일
└── README.md                          # 프로젝트 문서
```

## 🛠 기술 스택

### Backend (NestJS)
- **Framework**: NestJS
- **AI/ML**: OpenAI GPT-4o (RAG)
- **Database**: MariaDB (Native Driver) - 공간 데이터 및 SPATIAL INDEX
- **Cache/Session**: Redis - 세션 관리 및 캐싱
- **Authentication**: 외부 Spring Security 서비스 연동
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer
- **Logging**: 상세한 디버깅 로그 시스템 (LLM, SQL, 검색 결과)
- **외부 API**: OpenAI, HIRA, 식약처 DUR, VWorld 지도, E-Gen 응급의료

### Frontend (Next.js)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Forms**: React Hook Form
- **Map**: Leaflet + VWorld API
- **UI Components**: Heroicons
- **Notifications**: React Hot Toast
- **API Communication**: snake_case ↔ camelCase 자동 변환

## 🚀 구현된 주요 기능

### 💊 LLM RAG 증상 분석 시스템
- ✅ **LLM 기반 증상 분석**: GPT-4o로 자연어 증상을 의학 용어로 변환하고 질병 추론
- ✅ **RAG 기반 약품 추천**: DUR 데이터베이스 검색 후 LLM이 최적 OTC 약품 선택
- ✅ **DUR 체크**: 임신부, 고령자, 연령별 금기사항 자동 검증
- ✅ **심각도 평가**: LLM이 1-10점 심각도 점수 산출하여 약국/병원 분기
- ✅ **GPS 기반 위치 서비스**: 주변 약국/병원 검색 (MariaDB SPATIAL INDEX 활용)
- ✅ **실시간 로깅**: 프롬프트, SQL 쿼리, 검색 결과 등 모든 프로세스 모니터링
- ✅ **VWorld 지도**: 지도 표시 및 주소 복사 기능

### 🔒 보안 및 인증
- ✅ **외부 인증 연동**: Spring Security 기반 별도 인증 서비스 연동
- ✅ **세션 관리**: Redis 기반 세션 공유 (다중 프로젝트 호환)
- ⚠️ **내부 인증 제거**: JWT/로컬 인증 시스템 완전 제거
- ✅ **권한 관리**: 역할 기반 접근 제어 (환자, 의사, 관리자)

### 📊 데이터 관리
- ✅ **MariaDB 공간 데이터**: SPATIAL INDEX 활용한 고성능 위치 검색
- ✅ **실시간 집계**: 증상, 지역, 피드백 통계 자동 집계
- ✅ **익명화 처리**: 개인정보 보호를 위한 익명 데이터 수집
- ✅ **확장 가능한 스키마**: 대용량 데이터 처리 최적화

### 🎨 사용자 인터페이스
- ✅ **단계별 UI**: 위치 수집 → 증상 입력 → 분석 → 결과 표시
- ✅ **반응형 디자인**: 모바일 친화적 인터페이스
- ✅ **실시간 지도**: Leaflet + VWorld 기반 의료기관 위치 표시
- ✅ **접근성**: WCAG 가이드라인 준수한 UI/UX
- ⚠️ **인증 UI 제거**: 로그인/회원가입/대시보드 페이지 완전 제거

## 인증 시스템

### 세션 기반 인증 (메인)
- Redis에 저장된 Spring Session 데이터 활용
- 다른 프로젝트(FastAPI 등)와 세션 공유 가능
- 쿠키: `SESSION`, `JSESSIONID` 또는 헤더: `x-session-id`

### 세션 공유 방식
```typescript
// FastAPI와 동일한 로직으로 구현
async getUserFromSession(sessionId: string) {
  const realId = decodeSpringSessionId(sessionId);
  const redisKey = `spring:session:sessions:${realId}`;
  const userData = await redis.hget(redisKey, 'sessionAttr:USER');
  return JSON.parse(userData);
}
```



### 사전 요구사항
- Node.js 18+
- MariaDB 10.5+
- Redis 6.0+
- npm


1. **프론트엔드 설정**
   ```bash
   cd frontend
   npm install
   
   # 개발 서버 시작
   npm run dev
   ```

2. **접속**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api

## 환경 변수

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```


## 🚀 빠른 시작 가이드

### 사전 요구사항
- **Node.js** 18+ 
- **MariaDB** 10.5+ (공간 데이터 지원)
- **Redis** 6.0+
- **npm** 또는 **yarn**

### 1. 프로젝트 클론 및 설치

### 지도 커스터마이징
```typescript
// VWorld 지도 컴포넌트 사용 예시
<VWorldMap
  center={{ lat: 37.5665, lng: 126.9780 }}
  hospitals={nearbyHospitals}
  pharmacies={nearbyPharmacies}
  onMarkerClick={handleMarkerClick}
/>
```

## 보안 기능

- ✅ CORS 설정
- ✅ 세션 기반 인증
- ✅ SQL 인젝션 방지 (Prepared Statement)
- ✅ 입력값 검증 (class-validator)
- ✅ 비밀번호 해싱 (bcryptjs)

## 배포

### 개발 환경
```bash
# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && npm run dev
```

### 운영 환경
```bash
# Backend
cd backend && npm run build && npm run start:prod

# Frontend
cd frontend && npm run build && npm run start
```

## 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📊 시스템 흐름도

### LLM RAG 증상 분석 워크플로우
```
1. 사용자 위치 수집 (GPS)
   ↓
2. 증상 입력 (자유 텍스트 + 보조 증상)
   ↓  
3. GPT-4o 증상 분석 (SymptomAnalysisService)
   - 증상 → 의학 용어 변환 (예: "미열" → "low-grade fever")
   - 질병 추론 및 확률 계산
   - 심각도 점수 산정 (1-10)
   - 로그: 프롬프트, GPT-4o 응답, 파싱 결과
   ↓
4. 심각도 기반 분기 결정
   - 1-6점: 약국 (PHARMACY)
   - 7점: 약국 + 병원 권고
   - 8-10점: 병원 (HOSPITAL)
   ↓
5-A. 약국 추천 경로 (DrugRecommendationService):
   - DUR 데이터베이스에서 OTC 약품 검색 (의학 용어 기반)
   - 로그: 검색 키워드, SQL 쿼리, 검색 결과
   - GPT-4o에게 검색된 약품 전달 → 최적 약품 선택
   - DUR 금기사항 체크 (임신부, 고령자, 연령)
   - 주변 약국 검색 (운영시간 필터링)
   ↓
5-B. 병원 추천 경로 (FacilitySearchService):
   - 주변 병원 검색 (MariaDB SPATIAL INDEX)
   - 운영시간 필터링 (moment-timezone)
   - 거리순 정렬
   ↓
6. VWorld 지도 연동 (VWorldService)
   - 좌표 → 주소 변환
   - 지도 표시 + 주소 복사
   ↓
7. 결과 저장 (SYMPTOM_LOGS 테이블)
   - 원본 증상, 의학 용어, 질병, 심각도
   - 추천 약품, GPS 위치, 주변 시설
   ↓
8. 결과 표시 및 사용자 피드백 수집
```

### 데이터 흐름
```
Frontend (Next.js)
    ↕ HTTP/REST API
Backend (NestJS)
    ↕ SQL Queries
MariaDB (공간 데이터)
    ↕ Session Storage  
Redis (캐시/세션)
    ↕ External APIs
외부 서비스 (HIRA, DUR, VWorld)
```

### 주요 API 엔드포인트
- `POST /api/symptom-logs/analyze` - LLM RAG 기반 증상 분석 및 약품 추천
- `GET /api/data-collector/status` - 데이터 수집 상태 조회
- `GET /api/data-collector/collect-all` - 전체 데이터 수집 실행
- `GET /api/data-collector/collect-hospitals` - HIRA 병원 데이터 수집
- `GET /api/data-collector/collect-pharmacies` - HIRA 약국 데이터 수집
- `GET /api/data-collector/collect-dur-item` - DUR 품목 데이터 수집

### 로그 모니터링
증상 분석 시 다음 로그를 통해 전체 프로세스를 모니터링할 수 있습니다:
```
[SymptomAnalysis] 증상 분석 시작: 머리가 아프고 열이 나요
[OpenAI] 증상 분석 프롬프트: ...
[OpenAI] GPT-4o 응답: {"medicalTerms": [...], ...}
[SymptomAnalysis] LLM 분석 결과: 의학 용어=headache, fever / 심각도=4/10
[DrugRecommendation] 검색 키워드: headache, fever
[DrugRecommendation] 실행 SQL: SELECT ... FROM ITEM_DUR_INFO WHERE ...
[DrugRecommendation] 검색 결과: 15개 약품 발견
[DrugRecommendation] 처음 5개 약품: 1. 타이레놀 (200001234), ...
[OpenAI] 약품 추천 GPT-4o 응답: ...
[DrugRecommendation] 최종 추천 약품 3개
```

## 🔮 향후 계획

### Phase 2 (단기) - 현재 진행 중 ✅
- [x] **LLM RAG 시스템 구축** - GPT-4o + DUR 데이터 기반 약품 추천
- [x] **상세 로깅 시스템** - 모든 LLM 호출, SQL 쿼리, 검색 결과 로깅
- [x] **VWorld 지도 연동** - 위치 기반 서비스 및 주소 변환
- [x] **DUR 데이터 수집** - 식약처 API 연동 및 자동 스케줄링
- [ ] **데이터베이스 튜닝** - OTC 약품 검색 최적화 (한글/영문 키워드)
- [ ] **프롬프트 엔지니어링** - GPT-4o 의학 용어 변환 정확도 향상
- [ ] **캐싱 시스템** - LLM 응답 캐싱으로 비용 절감

### Phase 3 (중기)
- [ ] **RAG 고도화** - 벡터 DB (Pinecone, Weaviate) 도입으로 검색 정확도 향상
- [ ] **실시간 응급실 현황 연동** - E-Gen API 실시간 데이터 수집
- [ ] **다국어 지원** (영어, 중국어) - GPT-4o 다국어 프롬프트
- [ ] **모바일 앱 개발** (React Native)
- [ ] **음성 인식 증상 입력** - Whisper API 연동

### Phase 4 (장기)
- [ ] **Fine-tuning** - GPT-4o 의료 도메인 파인튜닝
- [ ] **멀티모달** - 증상 사진 분석 (GPT-4V)
- [ ] **개인화** - 사용자별 증상 이력 기반 맞춤 추천

## 📊 데이터 수집 시스템

### 🔄 자동화된 데이터 수집 및 관리

YAME 시스템은 외부 공공 API를 통해 의료기관 정보와 의약품 안전성 데이터를 자동으로 수집하고 관리합니다.

#### 📋 수집 데이터 종류

1. **병원 정보** (HIRA API)
   - 병원명, 주소, 전화번호, 좌표
   - 진료과목, 응급실 보유 여부
   - 실시간 응급실 현황 (2분마다 업데이트)

2. **약국 정보** (공공데이터포털 API)
   - 약국명, 주소, 전화번호, 좌표
   - 영업시간, 24시간 운영 여부
   - 야간 운영 여부

3. **DUR 데이터** (식약처 API)
   - 의약품 금기사항 (8종 규칙)
   - 성분 기반: 병용금기, 연령금기, 임부금기, 용량주의, 투여기간주의, 노인주의
   - 품목 기반: 효능군중복, 서방정분할주의

#### ⏰ 스케줄링 구조

```
매일 02:00 - 병원/약국 데이터 수집
매일 03:00 - DUR 데이터 수집  
매일 04:00 - 일별 데이터 집계
매 2분마다 - 응급실 현황 실시간 수집
```

#### 📈 데이터 품질 관리

- **자동 품질 검증**: 중복, 누락, 무효 데이터 감지
- **품질 점수 산출**: 0-100점 자동 계산
- **통계 대시보드**: 수집 현황 및 품질 모니터링
