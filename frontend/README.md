# YAME Frontend

**Next.js 14 기반 프론트엔드 - 대화형 증상 분석 챗봇 UI**

## 🎯 개요

YAME Frontend는 사용자가 AI 챗봇과 실시간으로 대화하며 증상을 분석하고 약품 추천을 받을 수 있는 다크 테마 기반의 웹 인터페이스입니다.

## 💻 기술 스택

### 프레임워크 & 라이브러리
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**

### 스타일링
- **Tailwind CSS** (유틸리티 우선 CSS)
- **다크 테마**: 그라데이션 배경 + 반투명 블러 효과
- **Heroicons** (아이콘)

### 통신
- **Socket.IO Client** (WebSocket 실시간 통신)
- **Axios** (선택적 HTTP 요청)

### 상태 관리
- **React Hooks** (useState, useEffect, useCallback, useRef)
- **Custom Hook**: `useChatSocket` (챗봇 로직 캡슐화)

### UI/UX
- **React Hot Toast** (알림)
- **자동 스크롤** (메시지 추가 시)
- **타이핑 애니메이션**

## 📁 프로젝트 구조

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # 메인 페이지
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   ├── globals.css               # 글로벌 스타일
│   │   ├── symptom-chat/            # 챗봇 페이지
│   │   │   ├── page.tsx              # 챗봇 인터페이스
│   │   │   └── result/               # 결과 페이지
│   │   │       └── page.tsx
│   │   └── admin/                    # 관리자 대시보드
│   │
│   ├── components/
│   │   ├── chatbot/
│   │   │   └── ChatBotInterface.tsx  # 챗봇 UI 컴포넌트
│   │   └── admin/
│   │
│   ├── hooks/
│   │   └── useChatSocket.ts          # WebSocket 통신 훅
│   │
│   └── types/
│       └── chat.ts                   # 타입 정의
│
├── public/
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```

## 🔧 핵심 기능 및 동작 원리

### 1. WebSocket 통신 (`useChatSocket` Hook)

**목적**: Socket.IO 연결 관리, 메시지 송수신, 상태 관리

**주요 기능**:
```typescript
const {
  messages,        // 채팅 메시지 배열
  isConnected,     // 연결 상태
  isTyping,        // 챗봇 입력 중
  sendMessage,     // 메시지 전송
  selectDisease,   // 질환 선택
  closeSession,    // 세션 종료
} = useChatSocket({
  location: { latitude, longitude }
});
```

**동작 흐름**:
```
1. Socket.IO 연결 (useEffect)
   → Backend WebSocket Gateway 연결
   
2. 이벤트 리스너 등록
   - connect: 연결 성공
   - receive_message: 챗봇 응답 수신
   - disconnect: 연결 종료
   
3. 메시지 전송 (sendMessage)
   → socket.emit('send_message', { message })
   → Backend → Agentend → Backend
   → socket.on('receive_message', response)
   
4. 질환 선택 (selectDisease)
   → socket.emit('select_disease', { disease_id })
   → 약품/병원 추천 수신
   
5. 세션 종료 (closeSession)
   → socket.emit('close_session')
   → Redis 메모리 해제
```

### 2. 챗봇 UI (`ChatBotInterface`)

**레이아웃 구조**:
```tsx
<div className="h-full flex flex-col">
  {/* 환영 메시지 (메시지 없을 때만) */}
  {messages.length === 0 && <WelcomeMessage />}
  
  {/* 메시지 영역 (스크롤 가능) */}
  <div className="flex-1 overflow-y-auto">
    {messages.map(message => (
      <MessageBubble message={message} />
    ))}
    <div ref={messagesEndRef} />
  </div>
  
  {/* 입력 영역 (고정) */}
  <div className="flex-shrink-0">
    <InputArea />
  </div>
</div>
```

**다크 테마 스타일**:
```css
/* 배경 */
background: linear-gradient(to-br, 
  rgba(17, 24, 39, 0.5),   /* gray-900/50 */
  rgba(0, 0, 0, 0.5),       /* black/50 */
  rgba(88, 28, 135, 0.5)    /* purple-900/50 */
);
backdrop-filter: blur(8px);

/* 사용자 메시지 */
background: linear-gradient(to-right, #9333ea, #3b82f6);
box-shadow: 0 0 25px rgba(147, 51, 234, 0.25);

/* 챗봇 메시지 */
background: rgba(255, 255, 255, 0.1);
border: 1px solid rgba(255, 255, 255, 0.2);
backdrop-filter: blur(4px);
```

### 3. 메시지 타입별 렌더링

**텍스트 메시지**:
```tsx
{message.messageType === 'text' && (
  <p className="whitespace-pre-wrap">
    {message.content}
  </p>
)}
```

**질환 선택 버튼**:
```tsx
{message.diseaseOptions && (
  <div className="space-y-2">
    {options.map(disease => (
      <button onClick={() => selectDisease(disease.id)}>
        <span>{disease.name}</span>
        <span>{(disease.confidence * 100).toFixed(0)}%</span>
        <span>관련 증상: {disease.symptoms.join(', ')}</span>
      </button>
    ))}
  </div>
)}
```

**약품/병원 추천 카드**:
```tsx
{message.recommendation && (
  <RecommendationCard>
    {/* 약품 리스트 */}
    {recommendation.drugs?.map(drug => (
      <DrugCard drug={drug} />
    ))}
    
    {/* 약국/병원 리스트 */}
    {recommendation.facilities?.map(facility => (
      <FacilityCard facility={facility} />
    ))}
  </RecommendationCard>
)}
```

### 4. 자동 스크롤

```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

// 새 메시지 추가 시 자동 스크롤
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isTyping]);
```

### 5. 결과 페이지 (`symptom-chat/result/page.tsx`)

**데이터 전달**:
```typescript
// ChatBotInterface에서 recommendation 수신 시
useEffect(() => {
  if (lastMessage?.recommendation) {
    // sessionStorage에 결과 저장
    sessionStorage.setItem('symptom_result', JSON.stringify({
      selectedDisease,
      recommendation,
    }));
    
    // 세션 종료
    closeSession();
    
    // 결과 페이지로 이동
    router.push('/symptom-chat/result');
  }
}, [messages]);

// result/page.tsx에서 데이터 로드
useEffect(() => {
  const storedResult = sessionStorage.getItem('symptom_result');
  if (storedResult) {
    setResult(JSON.parse(storedResult));
    sessionStorage.removeItem('symptom_result');
  }
}, []);
```

## 📡 Backend 연동

### WebSocket 이벤트

| 이벤트 | 방향 | 데이터 | 설명 |
|--------|------|--------|------|
| `connect` | Client → Server | - | 연결 시작 |
| `send_message` | Client → Server | `{ message }` | 사용자 메시지 전송 |
| `receive_message` | Server → Client | `{ message, message_type, ... }` | 챗봇 응답 수신 |
| `select_disease` | Client → Server | `{ disease_id }` | 질환 선택 |
| `close_session` | Client → Server | `{ session_id }` | 세션 종료 |
| `disconnect` | Client → Server | - | 연결 종료 |

### 메시지 응답 형식

**텍스트 메시지**:
```json
{
  "message": "언제부터 증상이 시작되었나요?",
  "message_type": "text",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**질환 선택지**:
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

**추천 결과**:
```json
{
  "message": "**감기** 추천 약품:\n...",
  "message_type": "recommendation",
  "recommendation": {
    "type": "PHARMACY",
    "severity_score": 4,
    "disease": "감기",
    "drugs": [...],
    "facilities": [...]
  }
}
```

## 🛠 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일 생성:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. 실행
```bash
# 개발 모드
npm run dev

# 빌드
npm run build

# 운영 모드
npm run start

# 린트
npm run lint
```

### 4. 접속
http://localhost:3000

**실행 순서**:
1. MariaDB, Redis 실행
2. Agentend 실행 (http://127.0.0.1:8000)
3. Backend 실행 (http://localhost:3001)
4. **Frontend 실행** (http://localhost:3000)

## 🎨 UI/UX 특징

### 다크 테마 컬러
- **배경**: `from-gray-900/50 via-black/50 to-purple-900/50`
- **사용자 메시지**: `from-purple-600 to-blue-600`
- **챗봇 메시지**: `bg-white/10 border-white/20`
- **버튼**: `from-purple-500/20 to-blue-500/20`

### 반응형 디자인
- **Mobile** (< 640px): 전체 너비
- **Tablet** (640-1024px): 중앙 정렬
- **Desktop** (> 1024px): 최대 너비 제한

### 애니메이션
- 메시지 추가: Fade in
- 버튼 호버: Scale + Gradient
- 타이핑 중: Pulse animation

## 🔒 보안

- ✅ WebSocket Only (REST API 최소 사용)
- ✅ XSS 방지 (React 자동 이스케이프)
- ✅ CORS (Backend에서 도메인 제한)
- ✅ sessionStorage (임시 데이터 저장)

## 📝 라이선스

MIT License

---

**💡 사용 팁**:
- 구체적으로 증상을 설명하세요
- 챗봇의 질문에 자세히 답변하세요
- 의심 질환 중 가장 가까운 것을 선택하세요
- 증상이 심각하면 즉시 병원을 방문하세요
