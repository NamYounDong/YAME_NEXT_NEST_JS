# YAME Agentend

**FastAPI + LangChain + RAG 기반 AI 증상 분석 엔진**

## 🎯 개요

Agentend는 YAME 프로젝트의 핵심 AI 엔진으로, 사용자와 자연스러운 대화를 통해 증상을 수집하고 안전한 약품을 추천합니다. NestJS 백엔드에서만 접근 가능한 localhost 전용 서비스입니다.

## 💻 기술 스택

### 프레임워크 & 라이브러리
- **FastAPI** (고성능 비동기 웹 프레임워크)
- **LangChain 0.1.16** (LLM 애플리케이션 프레임워크)
- **Pydantic** (데이터 검증 및 설정 관리)
- **Uvicorn** (ASGI 서버)

### AI & RAG
- **OpenAI GPT-4o** (증상 분석 및 대화 생성)
- **OpenAI Embeddings** (text-embedding-3-small, 512차원)
- **Chroma DB** (벡터 스토어, embedded 모드)
- **LangChain Community** (벡터 스토어 통합)

### 데이터베이스 & 캐시
- **MariaDB** (DUR 약품 정보, 병원/약국 정보)
- **SQLAlchemy 2.0.36** (ORM 및 쿼리 빌더)
- **PyMySQL** (MariaDB 드라이버)
- **Redis** (세션 및 대화 히스토리, TTL 1시간)

### 개발 도구
- **Python 3.10+**
- **python-dotenv** (환경 변수 관리)
- **pydantic-settings** (타입 안전한 설정)

## 📁 프로젝트 구조

```
agentend/
├── app/
│   ├── api/
│   │   └── chat.py                    # 채팅 API 엔드포인트
│   │
│   ├── services/
│   │   ├── symptom_agent.py           # LangChain 대화 에이전트
│   │   └── drug_recommender.py        # 약품 추천 (RAG + DUR)
│   │
│   ├── rag/
│   │   ├── vector_store.py            # Chroma 벡터 스토어 관리
│   │   └── retriever.py               # RAG 검색 로직
│   │
│   ├── database/
│   │   ├── connection.py              # MariaDB 연결 풀
│   │   ├── redis_manager.py           # Redis 세션 관리
│   │   ├── queries.py                 # SQL 쿼리
│   │   └── symptom_log.py             # 진단 로그 저장
│   │
│   ├── models/
│   │   └── chat.py                    # Pydantic 모델
│   │
│   └── config.py                      # 설정 관리
│
├── scripts/
│   └── build_vector_store.py          # 벡터 스토어 구축 스크립트
│
├── data/
│   └── chroma_db/                     # 벡터 스토어 데이터
│
├── main.py                            # FastAPI 앱 진입점
├── requirements.txt
└── .env
```

## 🔧 핵심 기능 및 동작 원리

### 1. 대화형 증상 분석 (Symptom Agent)

**목적**: LangChain 기반 대화형 AI 에이전트로 증상 정보 수집

**대화 단계**:
```
1. initial (초기)
   - 사용자 첫 메시지 수신
   - 간단한 인사 + 1-2개 질문

2. collecting (수집)
   - 추가 정보 수집
   - 충분한 정보 확인 → inferring 전환
   - 최근 3개 메시지만 컨텍스트로 사용

3. inferring (추론)
   - GPT-4o로 질환 추론
   - Confidence 점수 계산 (0.0-1.0)
   - 의심 질환 2-3개 반환
```

**대화 단계 판단 로직**:
```python
def _determine_stage(self, chat_history, user_context):
    # 첫 메시지
    if len(chat_history) == 0:
        return "initial"
    
    # 충분한 정보 확인
    user_messages = [msg for msg in chat_history if msg['role'] == 'user']
    
    if len(user_messages) >= 2:
        total_length = sum(len(msg) for msg in user_messages)
        if total_length > 30:  # 충분한 정보량
            return "inferring"
    
    # 3회 이상 대화했으면 무조건 추론
    if len(chat_history) >= 6:
        return "inferring"
    
    return "collecting"
```

**간결한 응답 생성**:
```python
# 시스템 프롬프트
system_prompt = """
당신은 의료 증상 분석 챗봇입니다.

**대화 규칙:**
- 사용자가 이미 말한 증상을 반복하지 마세요.
- 간결하게 핵심만 전달하세요 (2-3문장).
- 한 번에 1-2개의 질문만 합니다.
"""
```

### 2. RAG 기반 약품 검색

**벡터 스토어 구축** (`scripts/build_vector_store.py`):
```python
# 1. MariaDB에서 OTC 약품 조회
drugs = query("SELECT * FROM ITEM_DUR_INFO WHERE ETC_OTC_CODE = '02'")
# → 4790개 약품

# 2. Document 변환
documents = [
    Document(
        page_content=f"{drug['ITEM_NAME']} {drug['ENTP_NAME']} {drug['EFCY_QESITM']}",
        metadata={
            "item_seq": drug["ITEM_SEQ"],
            "item_name": drug["ITEM_NAME"],
            "entp_name": drug["ENTP_NAME"],
            "is_otc": True
        }
    )
    for drug in drugs
]

# 3. Embeddings 생성 및 저장
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = Chroma.from_documents(
    documents,
    embeddings,
    persist_directory="./data/chroma_db"
)
```

**검색 과정** (`rag/retriever.py`):
```python
def search_drugs(symptoms: List[str], k: int = 20):
    # 1. 증상을 쿼리 문자열로 변환
    query = " ".join(symptoms)
    
    # 2. 벡터 유사도 검색
    results = vector_store.similarity_search(
        query,
        k=k,
        filter={"is_otc": True}  # OTC만
    )
    
    # 3. 메타데이터 추출
    drugs = [
        {
            "item_seq": doc.metadata["item_seq"],
            "item_name": doc.metadata["item_name"],
            "entp_name": doc.metadata["entp_name"]
        }
        for doc in results
    ]
    
    return drugs
```

### 3. 스마트 정보 수집 (Dynamic Info Collection)

**목적**: 약품 추천 시 필요한 경우에만 나이/임신 여부 질문

**정보 필요성 판단**:
```python
def _check_contraindications_needed(drugs, user_context):
    # 사용자 정보 확인
    has_age = user_context.get("user_age") is not None
    has_pregnancy = user_context.get("is_pregnant") is not None
    
    # 약품 금기사항 확인 (DUR 데이터)
    for drug in drugs:
        contraindications = query_dur_contraindications(drug["item_seq"])
        
        # 임신부 금기사항 있는데 임신 여부 모르면
        if contraindications["pregnancy"] and not has_pregnancy:
            return {"needed": "is_pregnant"}
        
        # 고령자 주의사항 있는데 나이 모르면
        if contraindications["elderly"] and not has_age:
            return {"needed": "user_age"}
    
    return {"needed": None}  # 정보 충분
```

**동적 질문 생성**:
```python
async def _generate_info_request_message(needed_info):
    if needed_info == "user_age":
        return "안전한 약품 추천을 위해 나이를 알려주시겠어요?"
    elif needed_info == "is_pregnant":
        return "안전한 약품 추천을 위해 임신 중이신가요?"
```

**awaiting_info 상태 관리**:
```python
# 정보 요청 시 상태 저장
redis_manager.save_context(session_id, {
    "awaiting_info": "user_age",
    "disease_options": diseases,
    "selected_disease": disease
})

# 사용자 응답 처리
if user_context.get("awaiting_info") == "user_age":
    age = extract_age_from_message(user_message)
    user_context["user_age"] = age
    user_context["awaiting_info"] = None
    # 약품 추천 재실행
```

### 4. 심각도 평가 (Severity Assessment)

**목적**: 약국 추천 vs 병원 안내 결정

**평가 프롬프트**:
```python
prompt = """
다음 질환의 심각도를 평가하세요:

**질환 정보:**
- 질환명: {disease['name']}
- 증상: {', '.join(disease['symptoms'])}

**평가 기준:**
1-5점: 일반의약품(OTC)으로 치료 가능
  - 감기 증상 (37.5도 미만 미열, 콧물, 가벼운 기침)은 3-4점
6-7점: 약품 추천 + 병원 방문 권고
8-10점: 즉시 병원 방문 필요 (약품 추천 금지)
  - 외상: 골절, 탈구, 심한 출혈
  - 응급: 호흡곤란, 의식 저하, 경련

JSON 형식으로 응답:
{
  "severity_score": 5,
  "recommendation": "PHARMACY" or "HOSPITAL",
  "reason": "판단 이유"
}
"""

response = await llm.ainvoke(prompt)
severity = json.loads(response.content)
```

**안전 우선 원칙**:
```python
try:
    severity = json.loads(response.content)
except json.JSONDecodeError:
    # 파싱 실패 시 경증으로 기본 설정
    severity = {
        "severity_score": 4,
        "recommendation": "PHARMACY",
        "reason": "일반적인 증상으로 판단됩니다."
    }
```

### 5. 금기사항 확인 (DUR Contraindications)

**DUR 데이터 조회**:
```python
def filter_safe_drugs(drugs, user_age, is_pregnant):
    safe_drugs = []
    
    for drug in drugs:
        # DUR 금기사항 조회
        contraindications = query("""
            SELECT * FROM DUR_INGREDIENT_CONTRAINDICATIONS
            WHERE ITEM_SEQ = ?
        """, drug['item_seq'])
        
        # 임신부 금기사항 확인
        if is_pregnant and contraindications['pregnant_warning']:
            continue
        
        # 고령자 주의사항 확인
        if user_age >= 65 and contraindications['elderly_warning']:
            continue
        
        safe_drugs.append(drug)
    
    return safe_drugs
```

### 6. 주변 시설 검색 (Spatial Query)

**MariaDB Spatial Index 활용**:
```python
def search_nearby_pharmacies(latitude, longitude, radius_km=3.0):
    query = """
        SELECT 
            YKIHO,
            YADM_NM AS name,
            ADDR AS address,
            TELNO AS phone,
            ST_Distance_Sphere(
                POINT(X_POS, Y_POS),
                POINT(?, ?)
            ) / 1000 AS distance_km
        FROM HIRA_PHARMACY_INFO
        WHERE ST_Distance_Sphere(
            POINT(X_POS, Y_POS),
            POINT(?, ?)
        ) / 1000 <= ?
        ORDER BY distance_km
        LIMIT 10
    """
    
    return execute(query, [longitude, latitude, longitude, latitude, radius_km])
```

### 7. 진단 로그 저장

**목적**: 대시보드 통계 및 ML 학습 데이터 수집

**로그 저장 시점**:
```python
# 약품 추천 완료 시
save_symptom_log(
    session_id=session_id,
    symptom_data={"symptom_text": " / ".join(disease["symptoms"])},
    selected_disease=disease,
    severity=severity,
    recommendation_type="PHARMACY",
    recommended_drugs=recommended_drugs,
    nearby_pharmacies=nearby_pharmacies,
    location=user_context.get("location"),
    suspected_diseases=user_context.get("disease_options")
)

# 병원 안내 완료 시
save_symptom_log(
    ...,
    recommendation_type="HOSPITAL",
    nearby_hospitals=nearby_hospitals,
    ...
)
```

### 8. Redis 세션 관리

**대화 히스토리 저장**:
```python
def save_message(session_id, role, content):
    key = f"chat:{session_id}:messages"
    redis.rpush(key, json.dumps({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    }))
    redis.expire(key, 3600)  # TTL 1시간
```

**사용자 컨텍스트 저장**:
```python
def save_context(session_id, context):
    key = f"chat:{session_id}:context"
    redis.set(key, json.dumps(context))
    redis.expire(key, 3600)
```

**세션 삭제**:
```python
def clear_session(session_id):
    redis.delete(f"chat:{session_id}:messages")
    redis.delete(f"chat:{session_id}:context")
```

## 📡 API 엔드포인트

### `POST /api/chat/message`

**요청**:
```json
{
  "session_id": "uuid-session-id",
  "message": "머리가 아프고 열이 나요",
  "user_age": 35,          // Optional
  "is_pregnant": false,    // Optional
  "location": {            // Optional
    "latitude": 37.5665,
    "longitude": 126.9780
  }
}
```

**응답 (텍스트)**:
```json
{
  "session_id": "uuid-session-id",
  "message": "언제부터 증상이 시작되었나요?",
  "message_type": "text",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**응답 (질환 추론)**:
```json
{
  "message": "증상을 분석한 결과입니다.",
  "message_type": "disease_options",
  "disease_options": [
    {
      "id": "disease_1",
      "name": "감기",
      "confidence": 0.85,
      "symptoms": ["두통", "발열"]
    }
  ]
}
```

### `POST /api/chat/select-disease`

**요청**:
```json
{
  "session_id": "uuid-session-id",
  "selected_disease_id": "disease_1"
}
```

**응답 (약품 추천)**:
```json
{
  "message": "**감기** 추천 약품:\n...",
  "message_type": "recommendation",
  "recommendation": {
    "type": "PHARMACY",
    "severity_score": 4,
    "disease": "감기",
    "drugs": [
      {
        "item_seq": "200001234",
        "item_name": "타이레놀정 500mg",
        "entp_name": "한국존슨앤드존슨",
        "efcy_qesitm": "두통, 발열 완화"
      }
    ],
    "facilities": [
      {
        "name": "서울약국",
        "address": "서울시 종로구...",
        "distance": 0.5,
        "phone": "02-1234-5678"
      }
    ]
  }
}
```

**응답 (병원 추천)**:
```json
{
  "message": "**골절**은 즉시 병원 진료가 필요합니다...",
  "message_type": "recommendation",
  "recommendation": {
    "type": "HOSPITAL",
    "severity_score": 9,
    "disease": "골절",
    "reason": "외상으로 인한 골절은 전문 진료 필요",
    "facilities": [...]
  }
}
```

### `POST /api/chat/close-session`

**요청**:
```json
{
  "session_id": "uuid-session-id"
}
```

**응답**:
```json
{
  "success": true,
  "message": "세션이 종료되었습니다."
}
```

### `GET /health`

**응답**:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "vector_store": "loaded",
  "vector_count": 4790
}
```

## 🛠 설치 및 실행

### 1. 가상환경 설정
```bash
# 가상환경 생성
python -m venv venv

# 활성화 (Windows)
venv\Scripts\activate

# 활성화 (Linux/Mac)
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt
```

### 2. 환경 변수 설정
`.env` 파일 생성:
```env
# FastAPI
HOST=127.0.0.1
PORT=8000

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

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
REDIS_DB=1
REDIS_SESSION_TTL=3600

# RAG
VECTOR_STORE_PATH=./data/chroma_db
EMBEDDING_MODEL=text-embedding-3-small
RAG_TOP_K=20
```

### 3. 벡터 스토어 구축 (최초 1회)
```bash
python scripts/build_vector_store.py
```

**출력 예시**:
```
============================================================
DUR 벡터 스토어 구축 시작
============================================================
1. 데이터베이스 연결 확인...
[OK] 데이터베이스 연결 성공
2. OTC 약품 데이터 조회...
[OK] OTC 약품 조회 완료: 4790개
3. 벡터 스토어 구축 중...
[OK] 벡터 스토어 구축 완료: 4790개 문서
============================================================
```

### 4. 서버 실행
```bash
python main.py
```

**출력 예시**:
```
============================================================
YAME Agentend 서비스 시작
============================================================
[OK] MariaDB 연결 성공
[OK] Redis 연결 성공
[OK] 벡터 스토어 로드 성공: 4790개 문서
서버 주소: http://127.0.0.1:8000
문서: http://127.0.0.1:8000/docs
============================================================
```

**실행 순서**:
1. MariaDB, Redis 실행
2. **Agentend 실행** (http://127.0.0.1:8000)
3. Backend 실행 (http://localhost:3001)
4. Frontend 실행 (http://localhost:3000)

## 🔒 보안

- ✅ **localhost 전용**: `HOST=127.0.0.1`로 외부 접근 차단
- ✅ **CORS 제한**: NestJS 백엔드에서만 호출 가능
- ✅ **Redis TTL**: 1시간 후 세션 자동 삭제
- ✅ **Prepared Statement**: SQL 인젝션 방지
- ✅ **환경 변수**: API 키 등 민감 정보 보호

## 📝 라이선스

MIT License

---

**⚠️ 주의사항**: 이 서비스는 의료 전문가의 진단을 대체할 수 없습니다. 증상이 심각하거나 지속되면 반드시 의료기관을 방문하세요.
