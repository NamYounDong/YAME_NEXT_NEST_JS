# YAME Agent End - FastAPI + LangChain

LangChain과 RAG를 활용한 의료 증상 분석 챗봇 서비스입니다.

## 🚀 주요 기능

- **대화형 증상 분석**: LangChain Conversational Agent
- **DUR RAG 검색**: Chroma 벡터 스토어 기반 약품 검색
- **금기사항 확인**: 임신부, 노인 주의사항 자동 필터링
- **Redis 세션 관리**: 대화 히스토리 저장 및 자동 메모리 해제
- **병원/약국 추천**: GPS 기반 주변 시설 검색

## 📁 프로젝트 구조

```
agentend/
├── app/
│   ├── api/                  # REST API 엔드포인트
│   │   └── chat.py          # 채팅 API
│   ├── database/            # MariaDB + Redis 연결
│   │   ├── connection.py    # MariaDB 커넥션 풀
│   │   ├── redis_manager.py # Redis 세션 관리
│   │   └── queries.py       # SQL 쿼리
│   ├── models/              # Pydantic 모델
│   │   └── chat.py          # 요청/응답 모델
│   ├── rag/                 # RAG 시스템
│   │   ├── vector_store.py  # Chroma 벡터 스토어
│   │   └── retriever.py     # DUR 검색
│   ├── services/            # 비즈니스 로직
│   │   ├── symptom_agent.py      # 증상 분석 에이전트
│   │   └── drug_recommender.py   # 약품 추천
│   └── config.py            # 환경 설정
├── scripts/
│   └── build_vector_store.py # 벡터 스토어 구축 스크립트
├── main.py                  # FastAPI 앱
├── requirements.txt         # Python 패키지
└── .env                     # 환경 변수

## 🛠 설치 및 실행

### 1. 환경 설정

```bash
# Python 가상환경 생성
python -m venv venv

# 가상환경 활성화 (Windows)
venv\Scripts\activate

# 가상환경 활성화 (Linux/Mac)
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 값을 설정합니다:

```env
# OpenAI API Key (필수)
OPENAI_API_KEY=sk-your-api-key

# MariaDB (필수)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=yame

# Redis (필수)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
```

### 3. 벡터 스토어 구축

DUR 데이터를 벡터화하여 Chroma DB에 저장합니다:

```bash
python scripts/build_vector_store.py
```

**주의:** 
- MariaDB에 DUR 데이터가 미리 입력되어 있어야 합니다
- OpenAI API 비용 발생 (약 $0.02 per 1M tokens)
- 약 1-2분 소요

### 4. 서버 실행

```bash
python main.py
```

서버가 실행되면:
- API: http://127.0.0.1:8000
- 문서: http://127.0.0.1:8000/docs

## 📡 API 엔드포인트

### POST /api/chat/message

채팅 메시지를 전송합니다.

**요청:**
```json
{
  "session_id": "unique-session-id",
  "message": "머리가 아프고 열이 나요",
  "user_age": 35,
  "is_pregnant": false,
  "location": {
    "latitude": 37.5665,
    "longitude": 126.9780
  }
}
```

**응답:**
```json
{
  "session_id": "unique-session-id",
  "message": "언제부터 증상이 시작되었나요?",
  "message_type": "text",
  "timestamp": "2024-01-01T12:00:00"
}
```

### POST /api/chat/select-disease

질환을 선택하여 약품/병원 추천을 받습니다.

**요청:**
```json
{
  "session_id": "unique-session-id",
  "selected_disease_id": "disease_1"
}
```

### POST /api/chat/close-session

세션을 종료하고 Redis 메모리를 해제합니다.

**요청:**
```json
{
  "session_id": "unique-session-id"
}
```

## 🔧 아키텍처

```
┌─────────────────────────────────────────┐
│        Frontend (Next.js)               │
│            WebSocket                    │
└─────────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────────┐
│      Backend (NestJS)                   │
│      WebSocket Gateway                  │
└─────────────────────────────────────────┘
                  ↕ HTTP
┌─────────────────────────────────────────┐
│   Agentend (FastAPI + LangChain)        │
│   ┌─────────────────────────────────┐   │
│   │  LangChain Agent                │   │
│   │  - 증상 수집                     │   │
│   │  - 질환 추론                     │   │
│   │  - 약품 추천                     │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │  RAG System (Chroma)            │   │
│   │  - DUR 벡터 스토어               │   │
│   │  - 의미론적 검색                 │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────────┐
│          MariaDB (DUR 데이터)            │
│          Redis (세션 관리)               │
└─────────────────────────────────────────┘
```

## 📝 대화 플로우

1. **초기 증상 수집**
   - 사용자: "머리가 아프고 열이 나요"
   - 챗봇: "언제부터 증상이 시작되었나요?"

2. **추가 정보 수집**
   - 사용자: "어제부터요"
   - 챗봇: "다른 증상도 있으신가요?"

3. **질환 추론**
   - 챗봇: "다음 질환이 의심됩니다: 1) 감기 (85%), 2) 독감 (60%)"

4. **질환 선택**
   - 사용자: "1번" (버튼 클릭)
   
5. **약품 추천 또는 병원 안내**
   - 경증: 약품 + 약국 정보
   - 중증: 병원 정보

## 🔒 보안

- **localhost 전용**: 127.0.0.1에서만 접근 가능
- **NestJS에서만 호출**: CORS 제한
- **Redis TTL**: 1시간 후 자동 세션 삭제
- **Prepared Statement**: SQL 인젝션 방지

## 📊 로그

모든 작업이 상세히 로깅됩니다:

```
[2024-01-01 12:00:00] INFO [SymptomAgent] 메시지 처리: 머리가 아프고...
[2024-01-01 12:00:01] INFO [DURRetriever] 약품 검색: query='두통 발열', k=20
[2024-01-01 12:00:02] INFO [DURRetriever] 검색 완료: 15개 약품
```

## 🐛 문제 해결

### 벡터 스토어 로드 실패
```
벡터 스토어가 존재하지 않습니다. 먼저 구축해야 합니다.
```

**해결:** `python scripts/build_vector_store.py` 실행

### Redis 연결 실패
```
Redis 연결 실패: Connection refused
```

**해결:** Redis 서버가 실행 중인지 확인
```bash
redis-cli ping  # PONG 응답 확인
```

### MariaDB 연결 실패
```
데이터베이스 연결 실패
```

**해결:** .env 파일의 DB 정보 확인

## 📚 참고 자료

- [LangChain Documentation](https://python.langchain.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Chroma DB](https://www.trychroma.com/)

## 📄 라이선스

Copyright © 2024 YAME Project

