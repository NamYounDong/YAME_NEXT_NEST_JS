# YAME (Your Assessment for Medical Evaluation)

## 🏥 WebSocket 기반 대화형 의료 증상 분석 시스템

**LangChain RAG**와 **DUR 데이터**를 활용한 실시간 채팅 기반 스마트 의료 서비스 플랫폼입니다.

### 🌟 주요 특징

- 🤖 **대화형 AI 챗봇**: LangChain Conversational Agent를 통한 자연스러운 증상 수집
- 💬 **WebSocket 실시간 통신**: Socket.IO 기반 양방향 통신
- 💊 **DUR RAG**: Chroma 벡터 스토어를 활용한 의미론적 약품 검색
- 🔍 **상세 로깅**: 모든 LLM 호출, SQL 쿼리, 검색 결과 실시간 모니터링
- 📍 **위치 기반**: GPS 기반 주변 약국/병원 검색
- 🗺️ **VWorld 연동**: 지도 표시 및 주소 복사 기능
- 🔄 **자동 메모리 해제**: Redis TTL 기반 세션 자동 정리

## 📋 시스템 아키텍처

```
┌─────────────────────────────────────────┐
│      Frontend (Next.js)                 │
│      - React 19                         │
│      - Socket.IO Client                 │
│      - 채팅 UI                           │
└─────────────────────────────────────────┘
                  ↕ WebSocket
┌─────────────────────────────────────────┐
│      Backend (NestJS)                   │
│      - WebSocket Gateway                │
│      - 연결 관리                         │
│      - 데이터 수집                       │
└─────────────────────────────────────────┘
                  ↕ HTTP REST
┌─────────────────────────────────────────┐
│   Agentend (FastAPI + LangChain)        │
│   ┌─────────────────────────────────┐   │
│   │  LangChain Agent                │   │
│   │  - 대화 관리                     │   │
│   │  - 증상 추출                     │   │
│   │  - 질환 추론                     │   │
│   │  - 약품 추천                     │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │  RAG System                     │   │
│   │  - Chroma 벡터 스토어            │   │
│   │  - OpenAI Embeddings            │   │
│   │  - 의미론적 검색                 │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────────┐
│  MariaDB (DUR 데이터)                    │
│  Redis (세션 관리)                       │
└─────────────────────────────────────────┘
```

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 18+
- Python 3.10+
- MariaDB 10.5+
- Redis 6.0+

### 1. Agentend (FastAPI + LangChain) 설정

```bash
cd agentend

# 가상환경 생성
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 패키지 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 OPENAI_API_KEY, DB 정보 등 설정

# 벡터 스토어 구축 (최초 1회)
python scripts/build_vector_store.py

# 서버 실행
python main.py
```

**Agentend API**: http://127.0.0.1:8000

### 2. Backend (NestJS) 설정

```bash
cd backend

# 패키지 설치
npm install

# 환경 변수 설정 (config/env.example 참고)
# AGENTEND_URL=http://127.0.0.1:8000 추가

# 서버 실행
npm run start:dev
```

**Backend API**: http://localhost:3001

### 3. Frontend (Next.js) 설정

```bash
cd frontend

# 패키지 설치
npm install

# 환경 변수 설정
# NEXT_PUBLIC_API_URL=http://localhost:3001

# 서버 실행
npm run dev
```

**Frontend**: http://localhost:3000

## 📱 사용 방법

### 1. 증상 분석 페이지 접속
http://localhost:3000/symptom-chat

### 2. 사용자 정보 입력
- 나이 (필수)
- 임신 여부 (선택)
- GPS 위치 허용

### 3. 챗봇과 대화
```
[사용자] 머리가 아프고 열이 나요
[챗봇] 언제부터 증상이 시작되었나요?
[사용자] 어제부터요
[챗봇] 다른 증상도 있으신가요?
[사용자] 기침도 나요
[챗봇] 증상을 분석한 결과:
        1️⃣ 감기 (85%)
        2️⃣ 독감 (60%)
        선택해주세요.
[사용자] (1번 버튼 클릭)
[챗봇] 💊 추천 약품:
        - 타이레놀정 500mg
        - 판피린티정
        
        🏥 가까운 약국:
        - 서울약국 (500m)
        - 온누리약국 (800m)
```

### 4. 세션 종료
- "완료" 버튼 클릭 시 Redis 메모리 자동 해제

## 🔧 주요 기능

### 대화형 증상 분석
- LangChain Conversational Agent가 자연스럽게 증상 정보 수집
- 대화 히스토리를 바탕으로 추가 질문
- 충분한 정보 수집 후 질환 추론

### RAG 기반 약품 검색
- Chroma 벡터 스토어에 DUR 데이터 임베딩 저장
- 의미론적 검색으로 증상과 관련된 약품 검색
- LLM이 최적의 약품 2-3개 선택

### 금기사항 자동 필터링
- 임신부 금기 약품 제외
- 노인 주의 약품 경고
- 연령별 금기사항 확인

### Redis 세션 관리
- 대화 히스토리 저장
- TTL 1시간 (자동 만료)
- 채팅 종료 시 수동 해제

### 주변 시설 검색
- MariaDB SPATIAL INDEX 활용
- 거리순 정렬
- 운영 시간 필터링

## 📚 프로젝트 구조

```
YAME/
├── agentend/                   # FastAPI + LangChain
│   ├── app/
│   │   ├── api/               # REST API
│   │   ├── database/          # MariaDB + Redis
│   │   ├── models/            # Pydantic 모델
│   │   ├── rag/               # RAG 시스템
│   │   ├── services/          # 비즈니스 로직
│   │   └── config.py          # 환경 설정
│   ├── scripts/               # 유틸리티
│   ├── main.py                # FastAPI 앱
│   └── README.md              # Agentend 문서
│
├── backend/                    # NestJS
│   ├── src/
│   │   ├── gateways/          # WebSocket Gateway
│   │   ├── services/          # Agentend 연동
│   │   ├── controllers/       # 데이터 수집 API
│   │   └── ...
│   └── README.md              # Backend 문서
│
├── frontend/                   # Next.js
│   ├── src/
│   │   ├── components/
│   │   │   └── chatbot/       # 챗봇 UI
│   │   ├── hooks/             # WebSocket 훅
│   │   └── app/
│   │       └── symptom-chat/  # 챗봇 페이지
│   └── README.md              # Frontend 문서
│
└── README.md                   # 메인 문서 (이 파일)
```

## 🔒 보안

- **Agentend**: localhost(127.0.0.1)만 접근 가능
- **WebSocket**: CORS 제한 (localhost:3000만)
- **Redis**: TTL 기반 자동 메모리 해제
- **SQL**: Prepared Statement 사용

## 📊 API 엔드포인트

### Agentend (FastAPI)
- `POST /api/chat/message` - 메시지 전송
- `POST /api/chat/select-disease` - 질환 선택
- `POST /api/chat/close-session` - 세션 종료
- `GET /health` - 헬스 체크

### Backend (NestJS)
- WebSocket `/chat` namespace
  - `send_message` - 메시지 전송
  - `select_disease` - 질환 선택
  - `close_session` - 세션 종료

## 🐛 문제 해결

### Agentend 연결 실패
```
Error: AI 서버와 통신에 실패했습니다
```
**해결**: Agentend가 실행 중인지 확인 (http://127.0.0.1:8000/health)

### WebSocket 연결 실패
```
WebSocket connection failed
```
**해결**: Backend가 실행 중인지 확인 (http://localhost:3001)

### 벡터 스토어 로드 실패
```
벡터 스토어가 존재하지 않습니다
```
**해결**: `python scripts/build_vector_store.py` 실행

## 📝 환경 변수

### Agentend (.env)
```env
OPENAI_API_KEY=sk-your-api-key
DB_HOST=localhost
DB_PASSWORD=your_password
REDIS_HOST=localhost
```

### Backend (config/.env)
```env
AGENTEND_URL=http://127.0.0.1:8000
DB_PASSWORD=your_password
REDIS_PASSWORD=
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🎓 학습 포인트

이 프로젝트에서 배울 수 있는 기술:
- ✅ LangChain Conversational Agent
- ✅ RAG (Retrieval-Augmented Generation)
- ✅ Chroma 벡터 스토어
- ✅ WebSocket 실시간 통신 (Socket.IO)
- ✅ 마이크로서비스 아키텍처
- ✅ Redis 세션 관리
- ✅ MariaDB 공간 쿼리

## 📄 라이선스

Copyright © 2024 YAME Project
