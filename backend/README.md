# YAME Backend

**NestJS 기반 백엔드 - WebSocket 메시지 라우팅 및 데이터 관리**

## 🎯 개요

YAME Backend는 프론트엔드와 AI 엔진(Agentend) 사이의 메시지 라우터이자 데이터 관리 서버입니다. WebSocket을 통한 실시간 채팅 중계, 외부 API 데이터 수집, 데이터베이스 관리를 담당합니다.

## 💻 기술 스택

### 프레임워크 & 라이브러리
- **NestJS** (엔터프라이즈급 Node.js 프레임워크)
- **Socket.IO (@nestjs/websockets)** (WebSocket)
- **TypeScript**
- **Express** (HTTP 서버)

### 데이터베이스 & 캐시
- **MariaDB** (Native Driver, Spatial Index)
- **Redis** (세션 저장 및 캐싱)
- **Connection Pooling** (효율적인 DB 연결)

### 외부 API
- **Agentend API** (FastAPI - LangChain + RAG)
- **HIRA API** (건강보험심사평가원 - 병원/약국)
- **E-Gen API** (응급의료정보센터 - 응급의료기관/외상센터)
- **MFDS DUR API** (식품의약품안전처 - 약품 금기사항)

### 인증 & 보안
- **Session-based Auth** (Spring Session 호환)
- **class-validator** (입력 검증)
- **CORS** (도메인 제한)

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── gateways/
│   │   └── symptom-chat.gateway.ts       # WebSocket Gateway
│   │
│   ├── services/
│   │   ├── agentend.service.ts           # FastAPI 통신
│   │   ├── data-collector.service.ts     # 데이터 수집
│   │   └── facility-search.service.ts    # 시설 검색
│   │
│   ├── controllers/
│   │   ├── users.controller.ts
│   │   └── data-collector.controller.ts
│   │
│   ├── config/
│   │   ├── symptom-chat.module.ts
│   │   └── database.config.ts
│   │
│   ├── scheduler/
│   │   └── data-scheduler.service.ts     # 자동 스케줄링
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── yame_create_tables.sql                # DB 스키마
├── tsconfig.json
├── nest-cli.json
└── package.json
```

## 🔧 핵심 기능 및 동작 원리

### 1. WebSocket 기반 실시간 채팅 중계

**목적**: 프론트엔드와 Agentend 사이의 메시지 라우팅

**메시지 플로우**:
```
Frontend (Socket.IO Client)
   │
   │ socket.emit('send_message', { message })
   ↓
Backend (SymptomChatGateway)
   │
   │ HTTP POST /api/chat/message
   ↓
Agentend (FastAPI)
   │
   │ LangChain 처리
   ↓
Backend (SymptomChatGateway)
   │
   │ socket.emit('receive_message', response)
   ↓
Frontend (Socket.IO Client)
```

**Gateway 구현**:
```typescript
@WebSocketGateway({ cors: { origin: 'http://localhost:3000' } })
export class SymptomChatGateway {
  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, payload: any) {
    // 1. Agentend로 HTTP 요청
    const response = await this.agentendService.sendMessage({
      session_id: client.id,
      message: payload.message,
      location: payload.location
    });
    
    // 2. 응답을 클라이언트로 전달
    client.emit('receive_message', response);
  }
  
  @SubscribeMessage('select_disease')
  async handleSelectDisease(client: Socket, payload: any) {
    const response = await this.agentendService.selectDisease(
      client.id,
      payload.disease_id
    );
    client.emit('receive_message', response);
  }
  
  handleDisconnect(client: Socket) {
    // 연결 종료 시 Agentend에 세션 종료 요청
    this.agentendService.closeSession(client.id);
  }
}
```

### 2. Agentend HTTP 통신

**목적**: FastAPI 서버와 HTTP 통신

**Agentend Service**:
```typescript
@Injectable()
export class AgentendService {
  private readonly baseUrl = 'http://127.0.0.1:8000';
  
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const { data } = await this.httpService.axiosRef.post(
      `${this.baseUrl}/api/chat/message`,
      request,
      { timeout: 45000 }  // LLM 처리 시간 고려
    );
    return data;
  }
  
  async selectDisease(session_id: string, disease_id: string) {
    const { data } = await this.httpService.axiosRef.post(
      `${this.baseUrl}/api/chat/select-disease`,
      { session_id, selected_disease_id: disease_id }
    );
    return data;
  }
  
  async closeSession(session_id: string) {
    await this.httpService.axiosRef.post(
      `${this.baseUrl}/api/chat/close-session`,
      { session_id }
    );
  }
}
```

### 3. 데이터 수집 시스템

**목적**: 공공 API를 통한 병원/약국/DUR 데이터 수집

**수집 대상**:
```
1. HIRA 병원 정보 → HOSPITALS 테이블
2. HIRA 약국 정보 → PHARMACIES 테이블
3. E-Gen 응급의료기관 → EMERGENCY_FACILITIES 테이블
4. E-Gen 외상센터 → TRAUMA_CENTERS 테이블
5. MFDS DUR 성분 금기사항 → DUR_INGREDIENT_CONTRAINDICATIONS 테이블
6. MFDS DUR 품목 금기사항 → ITEM_DUR_INFO 테이블
```

**배치 처리**:
```typescript
async collectHospitals() {
  const pageSize = 3000;
  let pageNo = 1;
  let totalCount = 0;
  
  do {
    const response = await this.callHiraAPI({
      pageNo,
      numOfRows: pageSize
    });
    
    const items = response.data.items;
    await this.saveToDatabase(items);
    
    totalCount = response.data.totalCount;
    pageNo++;
  } while ((pageNo - 1) * pageSize < totalCount);
}
```

**자동 스케줄링**:
```typescript
@Injectable()
export class DataSchedulerService {
  // 매일 새벽 2시
  @Cron('0 0 2 * * *')
  async collectDailyData() {
    await this.dataCollectorService.collectHospitals();
    await this.dataCollectorService.collectPharmacies();
  }
  
  // 매주 일요일 새벽 3시
  @Cron('0 0 3 * * 0')
  async collectWeeklyData() {
    await this.dataCollectorService.collectDURIngredient();
    await this.dataCollectorService.collectDURItem();
  }
}
```

### 4. 데이터베이스 관리

**주요 테이블**:

**병원/약국 정보**:
```sql
-- 공간 쿼리용 POINT 타입 사용
HOSPITALS (
  HOSPITAL_ID, NAME, ADDRESS, PHONE,
  LOCATION_POINT POINT,  -- Spatial Index
  DEPARTMENT_LIST JSON,
  CREATED_AT, UPDATED_AT
)

PHARMACIES (
  PHARMACY_ID, NAME, ADDRESS, PHONE,
  LOCATION_POINT POINT,  -- Spatial Index
  OPERATING_HOURS JSON,
  CREATED_AT, UPDATED_AT
)
```

**DUR 약품 정보**:
```sql
ITEM_DUR_INFO (
  ITEM_SEQ VARCHAR(20) PRIMARY KEY,
  ITEM_NAME VARCHAR(500),
  ENTP_NAME VARCHAR(200),
  MATERIAL_NAME TEXT,
  ETC_OTC_CODE CHAR(2),  -- '01': 전문, '02': OTC
  -- 효능, 용법, 주의사항 등
)
```

**증상 로그**:
```sql
SYMPTOM_LOGS (
  LOG_ID BIGINT AUTO_INCREMENT PRIMARY KEY,
  SYMPTOM_TEXT TEXT,
  PREDICTED_DISEASE VARCHAR(500),
  RECOMMENDATION ENUM('PHARMACY', 'HOSPITAL'),
  SUSPECTED_DISEASES JSON,      -- LLM 추론 질환
  RECOMMENDED_DRUGS JSON,        -- RAG 추천 약품
  NEARBY_PHARMACIES JSON,
  NEARBY_HOSPITALS JSON,
  SEVERITY_SCORE INT,
  LATITUDE VARCHAR(20),
  LONGITUDE VARCHAR(20),
  CREATED_AT TIMESTAMP
)
```

**Spatial Index 활용**:
```typescript
async findNearbyPharmacies(lat: number, lng: number, radius: number) {
  return await this.db.query(`
    SELECT *,
      ST_Distance_Sphere(
        POINT(?, ?),
        LOCATION_POINT
      ) / 1000 AS distance_km
    FROM PHARMACIES
    WHERE ST_Distance_Sphere(
      POINT(?, ?),
      LOCATION_POINT
    ) <= ? * 1000
    ORDER BY distance_km
    LIMIT 10
  `, [lng, lat, lng, lat, radius]);
}
```

### 5. 세션 관리 (Spring Session 호환)

```typescript
async validateSession(sessionId: string): Promise<User | null> {
  // Redis에서 Spring Session 형식으로 저장된 세션 조회
  const key = `spring:session:sessions:${sessionId}`;
  const sessionData = await redis.hgetall(key);
  
  if (!sessionData) return null;
  
  const user = this.decodeSessionData(sessionData);
  return user;
}
```

## 📡 API 엔드포인트

### WebSocket 이벤트

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `send_message` | Frontend → Backend | `{ message }` | 사용자 메시지 전송 |
| `receive_message` | Backend → Frontend | `{ message, message_type, ... }` | 챗봇 응답 수신 |
| `select_disease` | Frontend → Backend | `{ disease_id }` | 질환 선택 |
| `close_session` | Frontend → Backend | `{ session_id }` | 세션 종료 |
| `error` | Backend → Frontend | `{ message }` | 에러 알림 |

### REST API

**데이터 수집**:
- `GET /api/data-collector/collect-all` - 전체 데이터 수집
- `GET /api/data-collector/collect-hospitals` - 병원 데이터
- `GET /api/data-collector/collect-pharmacies` - 약국 데이터
- `GET /api/data-collector/collect-emergency` - 응급의료기관
- `GET /api/data-collector/collect-trauma` - 외상센터
- `GET /api/data-collector/collect-dur-ingredient` - DUR 성분
- `GET /api/data-collector/collect-dur-item` - DUR 품목
- `GET /api/data-collector/status` - 수집 상태 조회

**사용자 관리**:
- `GET /api/users` - 사용자 목록
- `GET /api/users/me` - 현재 사용자
- `GET /api/users/:id` - 사용자 상세

**시스템**:
- `GET /` - API 정보
- `GET /health` - 헬스 체크
- `GET /api` - Swagger 문서

## 🛠 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일 생성:
```env
# 서버
PORT=3001
NODE_ENV=development

# MariaDB
DB_HOST=localhost
DB_PORT=3306
DB_USER=yame
DB_PASSWORD=your_password
DB_NAME=yame_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Agentend
AGENTEND_URL=http://127.0.0.1:8000

# 외부 API
HIRA_API_KEY=your-hira-api-key
EGEN_API_KEY=your-egen-api-key
DUR_API_KEY=your-dur-api-key
VWORLD_API_KEY=your-vworld-api-key
```

### 3. 데이터베이스 설정
```bash
mysql -u root -p
CREATE DATABASE yame_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
source yame_create_tables.sql;
```

### 4. 실행
```bash
# 개발 모드
npm run start:dev

# 빌드
npm run build

# 운영 모드
npm run start:prod
```

**실행 순서**:
1. MariaDB, Redis 실행
2. **Agentend 실행** (http://127.0.0.1:8000)
3. Backend 실행 (http://localhost:3001)
4. Frontend 실행 (http://localhost:3000)

## 🔒 보안

- ✅ CORS (프론트엔드 도메인만 허용)
- ✅ Session-based Auth (Spring Session 호환)
- ✅ Input Validation (class-validator)
- ✅ SQL Injection 방지 (Prepared Statement)
- ✅ Rate Limiting (예정)

## 📝 라이선스

MIT License

---

**⚠️ 주의사항**: Agentend 서버가 먼저 실행되어 있어야 정상 작동합니다.
