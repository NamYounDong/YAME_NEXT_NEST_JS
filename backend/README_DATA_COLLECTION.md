# YAME 데이터 수집 시스템

YAME(Your Assessment for Medical Evaluation) 백엔드의 데이터 수집 시스템은 외부 공공 API에서 의료 관련 데이터를 수집하고 관리하는 기능을 제공합니다.

## 📋 목차

1. [개요](#개요)
2. [수집 대상 데이터](#수집-대상-데이터)
3. [API 엔드포인트](#api-엔드포인트)
4. [스케줄링](#스케줄링)
5. [설정](#설정)
6. [사용법](#사용법)
7. [모니터링](#모니터링)
8. [트러블슈팅](#트러블슈팅)

## 🎯 개요

데이터 수집 시스템은 다음과 같은 외부 API에서 데이터를 수집합니다:

- **HIRA API**: 병원 및 약국 기본정보
- **E-Gen API**: 응급실 실시간 현황 및 중증질환자 수용가능 정보
- **DUR API**: 약물 상호작용 규칙

## 📊 수집 대상 데이터

### 1. HIRA API (건강보험심사평가원)

#### 병원 정보
- 병원명, 주소, 전화번호
- 위경도 좌표
- 진료과목 코드
- 응급실 보유 여부

#### 약국 정보
- 약국명, 주소, 전화번호
- 위경도 좌표
- 영업시간 (24시간/심야 운영 여부)

### 2. E-Gen API (중앙응급의료정보센터)

#### 응급실 실시간 현황
- 가용 병상 수
- 총 병상 수
- 응급실 상태 (가용/불가/제한)

#### 중증질환자 수용가능 정보
- 뇌출혈, 뇌경색, 심근경색 등 10종 질환
- 시도별 수용가능 병원 정보

#### 응급의료기관 정보
- 응급의료기관 목록
- 외상센터 정보
- 진료과목 및 기관 분류

### 3. DUR API (식약처 약물이상반응)

#### 성분 기반 규칙 (8종)
- 병용금기
- 특정연령대금기
- 임부금기
- 용량주의
- 투여기간주의
- 노인주의
- 효능군중복

#### 품목 기반 규칙 (9종)
- 병용금기
- 노인주의
- 특정연령대금기
- 용량주의
- 투여기간주의
- 효능군중복
- 서방정분할주의
- 임부금기

## 🔌 API 엔드포인트

### 데이터 수집 실행

#### 전체 데이터 수집
```http
POST /api/data-collector/collect-all?forceUpdate=false
```

#### HIRA 병원 데이터 수집
```http
POST /api/data-collector/collect-hospitals?forceUpdate=false
```

#### HIRA 약국 데이터 수집
```http
POST /api/data-collector/collect-pharmacies?forceUpdate=false
```

#### HIRA 관련 데이터 수집 (병원 + 약국)
```http
POST /api/data-collector/collect-hira-data?forceUpdate=false
```

#### 응급의료기관 데이터 수집
```http
POST /api/data-collector/collect-emergency?forceUpdate=false
```

#### 외상센터 데이터 수집
```http
POST /api/data-collector/collect-trauma?forceUpdate=false
```

#### 응급의료 관련 데이터 수집 (응급의료기관 + 외상센터)
```http
POST /api/data-collector/collect-emergency-related?forceUpdate=false
```

#### DUR 성분 데이터 수집
```http
POST /api/data-collector/collect-dur-ingredient?forceUpdate=false
```

#### DUR 품목 데이터 수집
```http
POST /api/data-collector/collect-dur-item?forceUpdate=false
```

#### DUR 관련 데이터 수집 (성분 + 품목)
```http
POST /api/data-collector/collect-dur-data?forceUpdate=false
```

#### 데이터 수집 상태 확인
```http
GET /api/data-collector/status
```

## ⏰ 스케줄링

### 자동 스케줄러

- **HIRA 데이터 수집**: 매일 새벽 2시
- **DUR 데이터 수집**: 매일 새벽 3시  
- **응급의료 데이터 수집**: 3분마다
- **전체 데이터 수집**: 매주 일요일 새벽 1시

### 배치 크기 설정

- **HIRA API**: 3000개씩 배치 처리
- **DUR API**: 100개씩 배치 처리

## ⚙️ 설정

### 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수를 설정하세요:

```bash
# HIRA API 설정
HIRA_API_KEY=your_hira_api_key_here
HIRA_API_URL=https://apis.data.go.kr/B551182

# DUR API 설정 (식약처)
DUR_API_KEY=your_dur_api_key_here
DUR_API_URL=https://apis.data.go.kr/1471000

# 응급의료기관 API 설정 (E-Gen)
EGEN_API_KEY=your_egen_api_key_here
EGEN_API_URL=https://apis.data.go.kr/B552657

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_PASSWORD=password
DB_NAME=yame

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 애플리케이션 설정
NODE_ENV=development
PORT=3000

# 스케줄러 설정
SCHEDULER_ENABLED=true
HIRA_COLLECTION_CRON=0 2 * * *  # 매일 새벽 2시
DUR_COLLECTION_CRON=0 3 * * *   # 매일 새벽 3시
EGEN_COLLECTION_CRON=0 */3 * * * *  # 3분마다

# 배치 처리 설정
HIRA_BATCH_SIZE=3000    # HIRA API 배치 크기
DUR_BATCH_SIZE=100      # DUR API 배치 크기
```

### API 키 발급

1. **HIRA API**: 건강보험심사평가원 공공데이터 포털에서 발급
2. **DUR API**: 식약처 공공데이터 포털에서 발급
3. **E-Gen API**: 중앙응급의료정보센터에서 발급

## 🚀 사용법

### 1. 환경변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 API 키와 설정값 입력
```

### 2. 애플리케이션 실행
```bash
npm run start:dev
```

### 3. 수동 데이터 수집 실행
```bash
# 전체 데이터 수집
curl -X POST http://localhost:3000/api/data-collector/collect-all

# HIRA 병원 데이터만 수집
curl -X POST http://localhost:3000/api/data-collector/collect-hospitals

# DUR 데이터만 수집
curl -X POST http://localhost:3000/api/data-collector/collect-dur-data
```

### 4. 강제 업데이트
```bash
# 기존 데이터를 무시하고 새로 수집
curl -X POST "http://localhost:3000/api/data-collector/collect-all?forceUpdate=true"
```

## 📈 모니터링

### 로그 확인
```bash
# 애플리케이션 로그에서 데이터 수집 상태 확인
npm run start:dev
```

### 상태 확인
```bash
# 데이터 수집 서비스 상태 확인
curl http://localhost:3000/api/data-collector/status
```

### 데이터베이스 확인
```sql
-- HIRA 병원 정보 통계
SELECT COUNT(*) as total_count, 
       MAX(updated_at) as last_updated 
FROM hira_hospital_info;

-- DUR 성분 정보 통계
SELECT COUNT(*) as total_count, 
       MAX(updated_at) as last_updated 
FROM dur_mix_contraindication;
```

## 🔧 트러블슈팅

### 일반적인 문제들

#### 1. API 키 오류
```
Error: HIRA API 키가 설정되지 않았습니다.
```
**해결방법**: `.env` 파일에 올바른 API 키를 설정하세요.

#### 2. 데이터베이스 연결 오류
```
Error: MariaDB 연결 실패
```
**해결방법**: 데이터베이스 서버가 실행 중인지 확인하고 연결 정보를 점검하세요.

#### 3. API 호출 제한
```
Error: HTTP 429 Too Many Requests
```
**해결방법**: API 호출 빈도를 줄이거나 배치 크기를 조정하세요.

#### 4. 메모리 부족
```
Error: JavaScript heap out of memory
```
**해결방법**: 배치 크기를 줄이거나 Node.js 메모리 제한을 늘리세요.

### 성능 최적화

1. **배치 크기 조정**: API 응답 시간에 따라 배치 크기 조정
2. **병렬 처리**: 여러 API를 동시에 호출하여 전체 처리 시간 단축
3. **캐싱**: Redis를 활용하여 자주 사용되는 데이터 캐싱
4. **로깅 최적화**: 프로덕션 환경에서는 로그 레벨 조정

## 📚 추가 정보

### API 문서
- [HIRA API 문서](https://www.data.go.kr/data/15000561/openapi.do)
- [DUR API 문서](https://www.data.go.kr/data/15000561/openapi.do)
- [E-Gen API 문서](https://www.gen.or.kr/)

### 기술 스택
- **Backend**: NestJS, TypeScript
- **Database**: MariaDB
- **Cache**: Redis
- **Scheduler**: @nestjs/schedule
- **HTTP Client**: Axios

### 라이선스
이 프로젝트는 MIT 라이선스 하에 배포됩니다.
