# YAME (Your Assessment for Medical Evaluation)

## 🏥 디지털 예진 시스템 - 자가증상입력 기반 의약품 추천 시스템

AI 기반 증상 분석을 통한 스마트 의료 서비스 플랫폼입니다. 사용자의 증상을 분석하여 약국 방문 또는 병원 진료의 적절한 의료 조치를 추천하고, 주변 의료기관 정보를 제공합니다.

## 📋 프로젝트 구조

```
YAME/
├── backend/                           # NestJS 백엔드 API
│   ├── src/
│   │   ├── config/                    # 모듈 설정
│   │   │   ├── assessments.module.ts  # 평가 모듈 설정
│   │   │   ├── data-collector.module.ts # 데이터 수집 모듈
│   │   │   ├── data-ml.module.ts      # ML 모듈 설정
│   │   │   ├── database.module.ts     # 데이터베이스 설정
│   │   │   ├── redis.module.ts        # Redis 설정
│   │   │   ├── session.module.ts      # 세션 관리 설정
│   │   │   ├── symptom-logs.module.ts # 증상 로그 모듈
│   │   │   └── users.module.ts        # 사용자 모듈
│   │   ├── controllers/               # API 컨트롤러
│   │   │   ├── app.controller.ts      # 메인 앱 컨트롤러
│   │   │   ├── assessments.controller.ts # 평가 컨트롤러
│   │   │   ├── data-collector.controller.ts # 데이터 수집 컨트롤러
│   │   │   ├── data-ml.controller.ts  # ML 컨트롤러
│   │   │   └── users.controller.ts    # 사용자 컨트롤러
│   │   ├── database/                  # 데이터베이스 매퍼
│   │   │   ├── base.mapper.ts         # 기본 매퍼
│   │   │   ├── data-crawler.mapper.ts # 데이터 크롤러 매퍼
│   │   │   ├── dur-ingredient.mapper.ts # DUR 성분 매퍼
│   │   │   ├── dur-item.mapper.ts     # DUR 품목 매퍼
│   │   │   ├── emergency.mapper.ts    # 응급실 매퍼
│   │   │   ├── hospital.mapper.ts     # 병원 매퍼
│   │   │   ├── pharmacy.mapper.ts     # 약국 매퍼
│   │   │   └── trauma.mapper.ts       # 외상 매퍼
│   │   ├── decorators/                # 커스텀 데코레이터
│   │   │   └── session-user.decorator.ts # 세션 사용자 데코레이터
│   │   ├── guards/                    # 인증 가드
│   │   │   ├── external-auth.guard.ts # 외부 인증 가드
│   │   │   └── session-auth.guard.ts  # 세션 인증 가드
│   │   ├── Interfaces/                # DTO 및 인터페이스
│   │   │   ├── create-assessment.dto.ts
│   │   │   ├── create-user.dto.ts
│   │   │   ├── data-collection.interface.ts
│   │   │   ├── response-base.dto.ts
│   │   │   ├── update-assessment.dto.ts
│   │   │   └── update-user.dto.ts
│   │   ├── ml_src/                    # Python ML 소스
│   │   │   ├── config/                # ML 설정
│   │   │   └── svrc/                  # ML 서비스
│   │   │       └── disease/           # 질병 분석 모듈
│   │   ├── models/                    # 데이터 모델
│   │   │   ├── assessment.entity.ts   # 평가 엔티티
│   │   │   └── user.entity.ts         # 사용자 엔티티
│   │   ├── scheduler/                 # 스케줄러
│   │   │   ├── dur-collection.scheduler.ts # DUR 수집 스케줄러
│   │   │   ├── emergency-collection.scheduler.ts # 응급실 수집
│   │   │   ├── full-collection.scheduler.ts # 전체 수집
│   │   │   ├── hira-collection.scheduler.ts # HIRA 수집
│   │   │   └── scheduler.module.ts    # 스케줄러 모듈
│   │   ├── services/                  # 비즈니스 로직
│   │   │   ├── app.service.ts         # 메인 서비스
│   │   │   ├── assessments.service.ts # 평가 서비스
│   │   │   ├── data-collector.service.ts # 데이터 수집 서비스
│   │   │   ├── data-ml.service.ts     # ML 서비스
│   │   │   ├── database.service.ts    # 데이터베이스 서비스
│   │   │   ├── disease-crawler.service.ts # 질병 크롤러
│   │   │   ├── dur-ingredient.service.ts # DUR 성분 서비스
│   │   │   ├── dur-item.service.ts    # DUR 품목 서비스
│   │   │   ├── emergency-base.service.ts # 응급실 서비스
│   │   │   ├── hira-hospital.service.ts # HIRA 병원 서비스
│   │   │   ├── hira-pharmacy.service.ts # HIRA 약국 서비스
│   │   │   ├── redis.service.ts       # Redis 서비스
│   │   │   ├── session.service.ts     # 세션 서비스
│   │   │   ├── trauma-base.service.ts # 외상 서비스
│   │   │   └── users.service.ts       # 사용자 서비스
│   │   ├── utils/                     # 유틸리티
│   │   │   ├── api-collector.util.ts  # API 수집 유틸
│   │   │   ├── case-converter.util.ts # 케이스 변환 유틸
│   │   │   └── python-script.util.ts  # Python 스크립트 유틸
│   │   ├── app.module.ts              # 메인 앱 모듈
│   │   └── main.ts                    # 앱 진입점
│   ├── config/                        # 환경 설정
│   ├── database/                      # 데이터베이스 파일
│   ├── dist/                          # 빌드 결과물
│   ├── logs/                          # 로그 파일
│   ├── ml_models/                     # ML 모델 파일
│   ├── venv/                          # Python 가상환경
│   ├── package.json                   # Node.js 의존성
│   └── yame_create_tables.sql         # DB 스키마
├── frontend/                          # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/                       # App Router 페이지
│   │   │   ├── admin/                 # 관리자 페이지
│   │   │   │   └── scheduler/         # 스케줄러 관리
│   │   │   ├── symptom-analysis/      # 증상 분석 페이지
│   │   │   ├── globals.css            # 전역 스타일
│   │   │   ├── layout.tsx             # 레이아웃
│   │   │   └── page.tsx               # 메인 페이지
│   │   ├── components/                # React 컴포넌트
│   │   │   ├── admin/                 # 관리자 컴포넌트
│   │   │   │   └── DataCollectionPanel.tsx
│   │   │   ├── loading/               # 로딩 컴포넌트
│   │   │   │   ├── HeartLoader.tsx
│   │   │   │   └── LoadingOverlay.tsx
│   │   │   ├── map/                   # 지도 컴포넌트
│   │   │   │   └── VWorldMap.tsx
│   │   │   ├── providers/             # 컨텍스트 프로바이더
│   │   │   │   └── LoadingProvider.tsx
│   │   │   ├── symptom/               # 증상 관련 컴포넌트
│   │   │   │   ├── AnalysisResult.tsx
│   │   │   │   └── SymptomInputForm.tsx
│   │   │   ├── providers.tsx          # 프로바이더 설정
│   │   │   └── YameLogo.tsx           # 로고 컴포넌트
│   │   ├── services/                  # API 서비스
│   │   │   └── symptom.ts             # 증상 서비스
│   │   ├── types/                     # TypeScript 타입
│   │   │   └── symptom.ts             # 증상 타입
│   │   └── utils/                     # 유틸리티
│   │       └── api.ts                 # API 유틸
│   ├── public/                        # 정적 파일
│   ├── package.json                   # Node.js 의존성
│   └── next.config.js                 # Next.js 설정
├── .gitignore                         # Git 무시 파일
└── README.md                          # 프로젝트 문서
```

## 🛠 기술 스택

### Backend (NestJS)
- **Framework**: NestJS
- **Database**: MariaDB (Native Driver) - 공간 데이터 지원
- **Cache/Session**: Redis - 세션 관리 및 캐싱
- **Authentication**: 외부 Spring Security 서비스 연동
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer
- **외부 API**: HIRA, 식약처 DUR, VWorld 지도

### Frontend (Next.js)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Forms**: React Hook Form
- **Map**: Leaflet + VWorld API
- **UI Components**: Heroicons
- **Notifications**: React Hot Toast

## 🚀 구현된 주요 기능

### 💊 증상 분석 시스템
- ✅ **AI 기반 증상 분석**: 사용자 입력 증상을 ML로 분석하여 질병 예측
- ✅ **약국/병원 분기 추천**: 증상 심각도에 따른 적절한 의료 조치 추천
- ✅ **DUR 체크**: 의약품 안전성 및 금기사항 확인
- ✅ **GPS 기반 위치 서비스**: 주변 의료기관 검색 및 거리 계산
- ✅ **실시간 피드백**: 추천 결과에 대한 만족도 수집

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

### 증상 분석 워크플로우
```
1. 사용자 위치 수집 (GPS)
   ↓
2. 증상 입력 (자유 텍스트 + 보조 증상)
   ↓  
3. AI 증상 분석 (ML 예측 서비스)
   ↓
4. 추천 분기 결정 (약국 vs 병원)
   ↓
5-A. 약국 추천 경로:
   - 추천 의약품 생성
   - DUR 안전성 체크
   - 주변 약국 검색
   ↓
5-B. 병원 추천 경로:  
   - 병원 접수 토큰 생성
   - 주변 병원 검색 (응급실 우선)
   - 응급도 평가
   ↓
6. 결과 표시 및 지도 제공
   ↓
7. 사용자 피드백 수집
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
- `POST /symptom-logs/analyze` - 증상 분석 및 추천
- `POST /symptom-logs/feedback` - 피드백 제출
- `POST /symptom-logs/intake-token/:token` - 병원 접수 토큰 사용
- `GET /symptom-logs/feedback/stats` - 피드백 통계
- `GET /symptom-logs/tokens/stats` - 토큰 사용 통계

## 🔮 향후 계획

### Phase 2 (단기) - 필수 구성
⚠️ **시스템 운영을 위해 다음 외부 서비스들의 실제 연동이 필요합니다:**

- [ ] **HIRA API 실 연동** (병원 정보 수집을 위해 HIRA_API_KEY 필요)
- [ ] **식약처 DUR API 실 연동** (의약품 안전성 체크를 위해 MFDS_DUR_API_KEY 필요)
- [ ] **약국 정보 API 연동** (PHARMACY_API_KEY 필요)
- [ ] **외부 인증 서비스 연동** (AUTH_SERVICE_ENABLED=true 설정 필요)
- [ ] **의약품 정보 API 연동** (추천 약물 정보 제공을 위해 필요)
- [ ] **성능 최적화**

### Phase 3 (중기)
- [ ] 실시간 응급실 현황 연동
- [ ] 다국어 지원 (영어, 중국어)
- [ ] 모바일 앱 개발 (React Native)
- [ ] 음성 인식 증상 입력

### Phase 4 (장기)
- [ ] AI 모델 자체 학습 및 개선

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
