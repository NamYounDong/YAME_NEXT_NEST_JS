# YAME - Your Assessment for Medical Evaluation

**AI 기반 익명 건강 진단 서비스**

사용자와의 대화를 통해 증상을 분석하고 안전한 약품을 추천하거나 병원 방문을 안내하는 웹 서비스입니다.

## 🎯 주요 특징

- 🤖 **AI 챗봇 진단**: LangChain + GPT-4o 기반 대화형 증상 분석
- 💊 **약품 추천**: RAG 기술을 활용한 DUR 데이터 기반 안전한 약품 추천
- 🏥 **병원/약국 안내**: GPS 기반 주변 의료 시설 검색 (MariaDB Spatial Index)
- 🔒 **개인정보 보호**: 로그인 불필요, 익명 사용
- 🎨 **다크 테마 UI**: 모던하고 세련된 사용자 인터페이스
- 🔄 **스마트 정보 수집**: 필요한 정보만 대화 중에 수집 (나이/임신 여부)

## 🏗 시스템 아키텍처

```
┌─────────────┐
│  사용자     │
└──────┬──────┘
       │ WebSocket
       ↓
┌─────────────────────────┐
│  Frontend (Next.js)     │
│  - 챗봇 UI (다크 테마)   │
│  - Socket.IO Client     │
└──────┬──────────────────┘
       │ WebSocket
       ↓
┌─────────────────────────┐
│  Backend (NestJS)       │
│  - WebSocket Gateway    │
│  - 데이터 수집 스케줄러  │
│  - Redis 세션 관리      │
└──────┬──────────────────┘
       │ HTTP (localhost)
       ↓
┌─────────────────────────┐
│  Agentend (FastAPI)     │
│  - LangChain Agent      │
│  - RAG (Chroma)         │
│  - GPT-4o 증상 분석     │
│  - DUR 금기사항 확인    │
└──────┬──────────────────┘
       │
   ┌───┴───┬───────┬───────┐
   ↓       ↓       ↓       ↓
MariaDB  Redis  OpenAI  공공API
(DUR 등) (세션) (GPT-4o) (병원/약국)
```

## 💻 기술 스택

### Frontend
- **Next.js 14** (App Router)
- **Socket.IO Client** (WebSocket)
- **Tailwind CSS** (다크 테마)
- **TypeScript**

### Backend
- **NestJS** (WebSocket Gateway)
- **Socket.IO** (실시간 통신)
- **MariaDB** (Native Driver)
- **Redis** (세션 관리)
- **TypeScript**

### Agentend (AI)
- **FastAPI** (Python 웹 프레임워크)
- **LangChain** (대화형 AI 에이전트)
- **OpenAI GPT-4o** (LLM)
- **Chroma DB** (벡터 스토어)
- **SQLAlchemy** (ORM)
- **Redis** (대화 히스토리)

### 데이터베이스
- **MariaDB 10.5+** (메인 DB, Spatial Index)
- **Redis 6.0+** (세션, 캐시, 대화 히스토리)

## 📦 프로젝트 구조

```
YAME/
├── frontend/              # Next.js 프론트엔드
│   ├── src/app/
│   │   ├── page.tsx                 # 메인 페이지
│   │   ├── symptom-chat/           # 챗봇 페이지
│   │   │   ├── page.tsx
│   │   │   └── result/page.tsx     # 결과 페이지
│   │   └── admin/                   # 관리자 대시보드
│   ├── src/components/chatbot/
│   │   └── ChatBotInterface.tsx    # 챗봇 UI
│   └── src/hooks/
│       └── useChatSocket.ts         # WebSocket 훅
│
├── backend/               # NestJS 백엔드
│   └── src/
│       ├── gateways/
│       │   └── symptom-chat.gateway.ts  # WebSocket Gateway
│       ├── services/
│       │   ├── agentend.service.ts      # FastAPI 연동
│       │   └── data-collector.service.ts # 데이터 수집
│       └── scheduler/
│           └── data-scheduler.service.ts # 자동 스케줄링
│
├── agentend/              # FastAPI + LangChain
│   ├── app/
│   │   ├── api/chat.py                  # 채팅 API
│   │   ├── services/
│   │   │   ├── symptom_agent.py         # LangChain 에이전트
│   │   │   └── drug_recommender.py      # 약품 추천
│   │   ├── rag/
│   │   │   ├── vector_store.py          # Chroma 벡터 스토어
│   │   │   └── retriever.py             # RAG 검색
│   │   └── database/
│   │       ├── connection.py            # MariaDB 연결
│   │       ├── redis_manager.py         # Redis 세션
│   │       ├── queries.py               # SQL 쿼리
│   │       └── symptom_log.py           # 진단 로그 저장
│   ├── scripts/
│   │   └── build_vector_store.py        # 벡터 스토어 구축
│   └── main.py
│
└── backend/
    └── yame_create_tables.sql          # DB 스키마
```

## 🚀 빠른 시작

### 1. 사전 요구사항

- Node.js 18+
- Python 3.10+
- MariaDB 10.5+
- Redis 6.0+
- OpenAI API Key

### 2. 데이터베이스 설정

```bash
# MariaDB 접속 및 스키마 생성
mysql -u root -p
CREATE DATABASE yame_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
source backend/yame_create_tables.sql;
```

### 3. Agentend 설정 및 실행

```bash
cd agentend

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 패키지 설치
pip install -r requirements.txt

# .env 파일 생성 (아래 환경 변수 참고)
# ...

# 벡터 스토어 구축 (최초 1회)
python scripts/build_vector_store.py

# 서버 실행
python main.py
```

✅ http://127.0.0.1:8000 에서 실행됩니다.

### 4. Backend 설정 및 실행

```bash
cd backend

# 패키지 설치
npm install

# .env 파일 생성 (아래 환경 변수 참고)
# ...

# 서버 실행
npm run start:dev
```

✅ http://localhost:3001 에서 실행됩니다.

### 5. Frontend 설정 및 실행

```bash
cd frontend

# 패키지 설치
npm install

# .env.local 파일 생성
# NEXT_PUBLIC_API_URL=http://localhost:3001

# 개발 서버 실행
npm run dev
```

✅ http://localhost:3000 에서 실행됩니다.

## ⚙️ 환경 변수 설정

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend `.env`
```env
PORT=3001
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=yame
DATABASE_PASSWORD=your_password
DATABASE_NAME=yame_db

REDIS_HOST=localhost
REDIS_PORT=6379

AGENTEND_URL=http://127.0.0.1:8000

# 공공 API 키 (데이터 수집용)
HIRA_API_KEY=your-hira-api-key
EGEN_API_KEY=your-egen-api-key
DUR_API_KEY=your-dur-api-key
```

### Agentend `.env`
```env
HOST=127.0.0.1
PORT=8000

OPENAI_API_KEY=sk-your-openai-api-key

DB_HOST=localhost
DB_PORT=3306
DB_USER=yame
DB_PASSWORD=your_password
DB_NAME=yame_db

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
REDIS_SESSION_TTL=3600
```

## 🔑 핵심 기능

### 1. 대화형 증상 분석
- LangChain Conversational Agent가 자연스러운 대화로 증상 정보 수집
- GPT-4o 기반 질환 추론 (confidence 점수 포함)
- 충분한 정보 수집 후 의심 질환 2-3개 제시

### 2. 스마트 정보 수집 ⭐
- **초기 화면에서 나이/임신 여부 입력 제거**
- 약품 추천 시 금기사항이 있는 약품만 확인 필요
- 필요한 경우에만 대화 중에 질문
- awaiting_info 상태로 대화 흐름 관리

### 3. RAG 기반 약품 추천
- Chroma 벡터 스토어에 OTC 약품 4790개 저장
- OpenAI Embeddings로 의미론적 검색
- DUR 금기사항 자동 필터링 (나이/임신)
- GPT-4o가 최적의 약품 3개 선택

### 4. 심각도 평가 및 병원 안내
- 1-5점: 약국 추천
- 6-7점: 약품 + 병원 권고
- 8-10점: 즉시 병원 (약품 추천 금지)
- 외상/응급 증상 자동 감지

### 5. 주변 시설 검색
- MariaDB Spatial Index 활용
- GPS 기반 거리순 정렬
- 약국/병원 주소, 전화번호, 거리 정보 제공

### 6. 세션 관리
- Redis에 대화 히스토리 저장
- TTL 1시간 (자동 만료)
- 채팅 종료 시 즉시 메모리 해제

### 7. 진단 로그 수집
- `SYMPTOM_LOGS` 테이블에 자동 저장
- 대시보드 통계용 데이터 수집
- 추후 ML 학습 데이터로 활용 가능

## 🔒 보안

- ✅ 로그인 불필요 (익명 사용)
- ✅ 개인정보 미수집
- ✅ 세션 데이터 자동 삭제 (TTL 1시간)
- ✅ Agentend는 localhost 전용 (외부 접근 차단)
- ✅ CORS 제한 (프론트엔드 도메인만 허용)

## 📊 데이터 수집

관리자 대시보드 (http://localhost:3000/admin)에서 다음 데이터를 수집할 수 있습니다:

- **병원 정보**: 건강보험심사평가원 API
- **약국 정보**: 건강보험심사평가원 API
- **DUR 금기사항**: 의약품안전나라 API

## 📄 상세 문서

각 프로젝트의 상세 문서는 해당 디렉터리의 README를 참고하세요:

- [Frontend README](./frontend/README.md): Next.js 프론트엔드
- [Backend README](./backend/README.md): NestJS 백엔드
- [Agentend README](./agentend/README.md): FastAPI AI 엔진

## 📝 라이선스

MIT License

---

**⚠️ 주의사항**: 이 서비스는 의료 전문가의 진단을 대체할 수 없습니다. 증상이 심각하거나 지속되면 반드시 의료기관을 방문하세요.
