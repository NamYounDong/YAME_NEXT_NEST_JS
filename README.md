# YAME (Your Assessment for Medical Evaluation)

## 🏥 디지털 예진 시스템 - 자가증상입력 기반 의약품 추천 시스템

AI 기반 증상 분석을 통한 스마트 의료 서비스 플랫폼입니다. 사용자의 증상을 분석하여 약국 방문 또는 병원 진료의 적절한 의료 조치를 추천하고, 주변 의료기관 정보를 제공합니다.

## 📋 프로젝트 구조

```
YAME/
├── backend/                    # NestJS 백엔드 API
│   ├── src/
│   │   ├── symptom-logs/      # 증상 로그 및 분석 모듈
│   │   ├── auth/              # 인증 및 보안
│   │   ├── database/          # 데이터베이스 연결
│   │   └── redis/             # Redis 캐시
│   ├── config/                # 환경 설정
│   └── database_*.sql         # 데이터베이스 스키마
├── frontend/                  # Next.js 프론트엔드
│   ├── src/
│   │   ├── components/
│   │   │   ├── symptom/       # 증상 관련 컴포넌트
│   │   │   └── map/           # VWorld 지도 컴포넌트
│   │   ├── services/          # API 서비스
│   │   └── types/             # TypeScript 타입 정의
│   └── public/
└── README.md
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

### 🏥 의료기관 연동
- ✅ **병원 접수 토큰**: UUID 기반 일회용 토큰으로 병원 포털 연계
- ✅ **HIRA API 연동 준비**: 병원정보서비스 API 구조 구현
- ✅ **응급실 정보**: 실시간 응급실 가용성 체크 준비
- ✅ **VWorld 지도**: 국토교통부 지도 API 기반 위치 표시

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

## 빠른 시작

### 사전 요구사항
- Node.js 18+
- MariaDB 10.5+
- Redis 6.0+
- npm

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd YAME
   ```

2. **백엔드 설정**
   ```bash
   cd backend
   npm install
   
   # 환경변수 설정
   cp config/env.example .env
   # .env 파일에서 MariaDB, Redis 연결 정보 수정
   
   # 데이터베이스 스키마 생성
   mysql -u root -p < database/schema.sql
   
   # 개발 서버 시작
   npm run start:dev
   ```

3. **프론트엔드 설정**
   ```bash
   cd frontend
   npm install
   
   # 개발 서버 시작
   npm run dev
   ```

4. **접속**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api

## 환경 변수

### Backend (.env)
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

# 세션 설정
SESSION_PREFIX=spring:session:sessions:

# JWT (호환성을 위해 유지)
JWT_SECRET=your-super-secret-jwt-key

# 환경 설정
NODE_ENV=development
PORT=3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## API 엔드포인트

### 인증 관련
- `POST /auth/login` - 로그인 (JWT 방식)
- `POST /auth/register` - 회원가입

### 사용자 관리 (세션 인증 필요)
- `GET /users` - 사용자 목록
- `GET /users/me` - 현재 사용자 정보
- `GET /users/:id` - 사용자 상세
- `PATCH /users/:id` - 사용자 수정
- `DELETE /users/:id` - 사용자 삭제

### 건강 평가 (세션 인증 필요)
- `GET /assessments` - 평가 목록
- `POST /assessments` - 새 평가 생성
- `GET /assessments/:id` - 평가 상세
- `PATCH /assessments/:id` - 평가 수정
- `DELETE /assessments/:id` - 평가 삭제

### 기타
- `GET /` - API 정보
- `GET /health` - 헬스 체크

자세한 API 문서: http://localhost:3001/api

## 데이터베이스 스키마

### Users 테이블
- 사용자 정보 (환자, 의사, 관리자)
- 역할 기반 접근 제어

### Assessments 테이블
- 건강 평가 및 설문 데이터
- JSON 형태의 설문/응답 저장
- 환자-의사 관계 연결

## 🚀 빠른 시작 가이드

### 사전 요구사항
- **Node.js** 18+ 
- **MariaDB** 10.5+ (공간 데이터 지원)
- **Redis** 6.0+
- **npm** 또는 **yarn**

### 1. 프로젝트 클론 및 설치

```bash
# 프로젝트 클론
git clone https://github.com/your-org/yame.git
cd yame

# 백엔드 패키지 설치
cd backend
npm install

# 프론트엔드 패키지 설치  
cd ../frontend
npm install --legacy-peer-deps
```

### 2. 환경 설정

#### 백엔드 환경 변수 (.env)
```bash
cd backend
cp config/env.example .env
```

⚠️ **중요**: 모든 하드코딩된 데이터가 제거되었습니다. 시스템 운영을 위해서는 **반드시 외부 API 키들을 설정**해야 합니다.

`.env` 파일 수정:
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

# 🔑 필수 외부 API 키들 (운영을 위해 반드시 설정 필요)
VWORLD_API_KEY=your_vworld_api_key          # 지도 서비스
HIRA_API_KEY=your_hira_api_key              # 병원 정보 수집
MFDS_DUR_API_KEY=your_mfds_dur_api_key      # 의약품 안전성 체크
PHARMACY_API_KEY=your_pharmacy_api_key       # 약국 정보 수집
EGEN_API_KEY=your_egen_api_key              # 응급실 현황

# 🤖 ML 서비스 설정 (반드시 활성화 필요)
ML_SERVICE_ENABLED=true
ML_SERVICE_URL=http://localhost:5000

# 🔐 외부 인증 서비스 설정 (반드시 활성화 필요)
AUTH_SERVICE_ENABLED=true
AUTH_SERVICE_URL=http://localhost:8080
```

**⚠️ API 키 없이는 다음 기능들이 작동하지 않습니다:**
- 증상 분석 (ML 서비스 필요)
- 병원/약국 검색 (데이터 수집 API 필요)
- 의약품 안전성 체크 (DUR API 필요)
- 사용자 인증 (외부 인증 서비스 필요)

#### 프론트엔드 환경 변수
```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
echo "NEXT_PUBLIC_VWORLD_API_KEY=your_vworld_api_key" >> .env.local
```

### 3. 데이터베이스 설정

```sql
-- MariaDB에서 실행
CREATE DATABASE yame;
USE yame;

-- 테이블 생성
SOURCE backend/database_tables.sql;

-- 초기 데이터 (선택사항)
SOURCE backend/database_mng_datas.sql;
```

### 4. 서비스 실행

#### 개발 환경
```bash
# 터미널 1: 백엔드 실행
cd backend
npm run start:dev

# 터미널 2: 프론트엔드 실행  
cd frontend
npm run dev
```

#### 운영 환경
```bash
# 백엔드 빌드 및 실행
cd backend
npm run build
npm run start:prod

# 프론트엔드 빌드 및 실행
cd frontend
npm run build
npm run start
```

### 5. 접속 확인

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:3001
- **Swagger 문서**: http://localhost:3001/api

## 🔧 개발 가이드

### 새로운 증상 분석 API 추가
1. `src/symptom-logs/services/`에 새 서비스 생성
2. `symptom-logs.service.ts`에서 워크플로우 통합
3. Controller에 엔드포인트 추가

### 외부 API 연동
```typescript
// ML 예측 서비스 예시
async predictDisease(symptomText: string): Promise<MLResult> {
  if (this.mlServiceEnabled) {
    return await this.callExternalMLService(symptomText);
  }
  return this.mockPrediction(symptomText);
}
```

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

- [ ] **ML 모델 서버 연동** (ML_SERVICE_ENABLED=true 설정 필요)
- [ ] **HIRA API 실 연동** (병원 정보 수집을 위해 HIRA_API_KEY 필요)
- [ ] **식약처 DUR API 실 연동** (의약품 안전성 체크를 위해 MFDS_DUR_API_KEY 필요)
- [ ] **약국 정보 API 연동** (PHARMACY_API_KEY 필요)
- [ ] **외부 인증 서비스 연동** (AUTH_SERVICE_ENABLED=true 설정 필요)
- [ ] **의약품 정보 API 연동** (추천 약물 정보 제공을 위해 필요)
- [ ] **병원 포털 연계 테스트**
- [ ] **성능 최적화 및 로드 밸런싱**

### Phase 3 (중기)
- [ ] 의료진 포털 개발
- [ ] 실시간 응급실 현황 연동
- [ ] 다국어 지원 (영어, 중국어)
- [ ] 모바일 앱 개발 (React Native)
- [ ] 음성 인식 증상 입력

### Phase 4 (장기)
- [ ] AI 모델 자체 학습 및 개선
- [ ] 블록체인 기반 의료 기록 관리
- [ ] IoT 기기 연동 (웨어러블, 센서)
- [ ] 텔레메디슨 화상 상담 연동

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

#### 🔧 관리 API 엔드포인트

**데이터 수집 관리**
- `POST /data-collector/hospitals/collect` - 병원 데이터 수동 수집
- `POST /data-collector/pharmacies/collect` - 약국 데이터 수동 수집
- `POST /data-collector/dur/collect` - DUR 데이터 수동 수집
- `POST /data-collector/all/collect` - 전체 데이터 수집

**통계 및 모니터링**
- `GET /data-collector/stats` - 수집 통계 조회
- `GET /data-collector/dashboard` - 집계 대시보드
- `GET /data-collector/realtime/status` - 실시간 서비스 상태
- `GET /data-collector/scheduler/status` - 스케줄러 상태

**데이터 집계**
- `POST /data-collector/aggregation/run` - 일별 데이터 집계 실행
- `GET /data-collector/dur/stats` - DUR 데이터 통계

#### 🗄️ 데이터베이스 구조

**수집 관리 테이블**
- `data_collection_logs` - 수집 작업 실행 로그
- `data_collection_stats` - 일별 수집 통계
- `realtime_collection_status` - 실시간 서비스 상태
- `data_quality_metrics` - 데이터 품질 메트릭

**통계 집계 테이블**
- `agg_symptom_daily` - 일별 증상 통계
- `agg_region_daily` - 지역별 통계
- `agg_dur_daily` - DUR 위반 비율
- `agg_feedback_daily` - 피드백 통계

**DUR 데이터 테이블**
- `dur_raw_substance` / `dur_raw_product` - 원본 데이터
- `dim_dur_substance` / `dim_dur_product` - 차원 테이블
- `dur_rule_fact` - DUR 규칙 사실 테이블

#### 🚀 사용법

1. **환경 설정**
   ```bash
   # .env 파일에 API 키 설정
   MFDS_DUR_API_KEY=your_mfds_api_key
   HIRA_API_KEY=your_hira_api_key
   EGEN_API_KEY=your_egen_api_key
   ```

2. **데이터베이스 스키마 업데이트**
   ```sql
   SOURCE backend/database_tables.sql;
   ```

3. **자동 스케줄링 활성화**
   - 운영 환경에서 자동으로 스케줄링 시작
   - 개발 환경에서는 수동 API 호출로 테스트

4. **모니터링**
   ```bash
   # 수집 현황 확인
   curl http://localhost:3001/data-collector/stats
   
   # 대시보드 데이터 조회
   curl http://localhost:3001/data-collector/dashboard
   ```

#### 📊 성능 최적화

- **공간 인덱스**: GPS 좌표 기반 고성능 검색
- **배치 처리**: 대량 데이터 수집 시 배치 단위 처리
- **캐싱**: Redis를 통한 자주 조회되는 데이터 캐싱
- **연결 풀링**: 데이터베이스 연결 풀 관리

#### 🔍 데이터 품질 지표

- **완성도**: 필수 필드 누락 비율
- **정확도**: 좌표, 전화번호 유효성
- **최신성**: 데이터 업데이트 주기
- **일관성**: 중복 데이터 비율

---

## 📞 문의사항

프로젝트 관련 문의사항이나 버그 리포트는 Issues를 통해 남겨주세요.

**개발팀 연락처**: dev@yame.kr  
**서비스 문의**: support@yame.kr