# YAME Frontend

Next.js 기반의 의료 평가 시스템 프론트엔드

> 🤖 **2024.12 LLM RAG 증상 분석**: GPT-4o와 DUR 데이터를 활용한 지능형 증상 분석 및 약품 추천 시스템
> 🔄 **2025.01 API 통신 최적화**: camelCase/snake_case 자동 변환으로 프론트엔드-백엔드 데이터 호환성 개선

## 🚀 구현된 주요 기능

### 🤖 LLM 기반 증상 분석 (핵심 기능)
- ✅ **자연어 증상 입력**: 사용자가 일상 언어로 증상 설명
- ✅ **AI 증상 분석**: GPT-4o가 증상을 의학 용어로 변환하고 질병 추론
- ✅ **약품 추천**: DUR 데이터 기반 안전한 OTC 약품 추천
- ✅ **금기사항 체크**: 임신부, 고령자 등 사용자별 맞춤 추천
- ✅ **심각도 판단**: AI가 증상의 심각도를 평가하여 병원/약국 안내
- ✅ **위치 기반 시설 안내**: GPS 기반 가까운 약국/병원 추천
- ✅ **지도 연동**: VWorld API를 통한 지도 표시 및 길찾기
- ✅ **주소 복사**: 원클릭 주소 복사 기능

### UI/UX
- ✅ **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- ✅ **모던 UI**: Tailwind CSS 기반 깔끔한 디자인
- ✅ **직관적인 증상 입력**: 자동완성 및 부가 증상 선택
- ✅ **실시간 피드백**: 로딩 상태 및 진행 표시
- ✅ **접근성**: WCAG 가이드라인 준수
- ✅ **GPS 권한 관리**: 위치 권한 요청 및 fallback 처리

### 인증 시스템
- ✅ **세션 기반 인증**: 백엔드 세션과 연동
- ✅ **JWT 지원**: 토큰 기반 로그인/로그아웃
- ✅ **자동 로그인**: 세션 저장 및 자동 인증 상태 유지
- ✅ **역할별 접근**: 환자, 의사, 관리자 권한 관리
- ✅ **보안 쿠키**: HttpOnly 쿠키로 세션 저장

### 상태 관리
- ✅ **React Query**: 서버 상태 캐싱 및 동기화
- ✅ **Context API**: 전역 상태 관리 (인증, 테마 등)
- ✅ **캐시 최적화**: 불필요한 API 호출 최소화
- ✅ **낙관적 업데이트**: 빠른 사용자 경험

### 폼 관리
- ✅ **React Hook Form**: 고성능 폼 라이브러리
- ✅ **Zod Validation**: 타입 안전한 폼 검증
- ✅ **실시간 검증**: 사용자 입력 중 즉시 피드백
- ✅ **에러 처리**: 친화적인 에러 메시지 표시

### 페이지 구성
- ✅ **홈페이지**: 서비스 소개 및 기능 안내
- ✅ **증상 분석**: LLM 기반 증상 입력 및 분석 결과 ⭐ NEW
- ✅ **약품 추천**: AI 추천 약품 상세 정보 표시 ⭐ NEW
- ✅ **시설 안내**: 지도 및 주변 약국/병원 정보 ⭐ NEW
- ✅ **인증 페이지**: 로그인/회원가입 폼
- ✅ **대시보드**: 사용자별 맞춤 인터페이스
- ✅ **이력 조회**: 과거 증상 분석 이력 확인

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Maps**: VWorld API, Leaflet (예정)
- **Geolocation**: Browser Geolocation API
- **Icons**: Heroicons
- **Notifications**: React Hot Toast
- **Authentication**: Session + JWT

## 설치 및 실행

### 사전 요구사항
- Node.js 18+
- npm

### 설치
```bash
npm install
```

### 환경 변수 설정
`.env.local` 파일을 생성하고 다음과 같이 설정:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# VWorld API (지도 표시용, 선택사항)
NEXT_PUBLIC_VWORLD_API_KEY=your-vworld-api-key
```

### 실행
```bash
# 개발 모드
npm run dev

# 빌드
npm run build

# 운영 모드
npm run start

# 린트 검사
npm run lint
```

## 📱 증상 분석 워크플로우

### 1. 증상 입력 화면
```
┌─────────────────────────────────┐
│ 어떤 증상이 있으신가요?          │
│ ┌────────────────────────────┐  │
│ │ 머리가 아프고 열이 나요...  │  │
│ └────────────────────────────┘  │
│                                  │
│ 추가 증상이 있나요? (선택)      │
│ ☑ 기침  ☑ 코막힘  ☐ 설사      │
│                                  │
│ 나이: [35]  ☐ 임신 중           │
│                                  │
│ [위치 정보 사용 동의] ✓          │
│                                  │
│        [분석하기]                │
└─────────────────────────────────┘
```

### 2. 분석 중 화면
```
┌─────────────────────────────────┐
│  🤖 AI가 증상을 분석 중...      │
│                                  │
│  ⏳ 의학 용어로 변환 중...       │
│  ⏳ 질병 추론 중...              │
│  ⏳ 약품 검색 중...              │
│  ⏳ 주변 시설 검색 중...         │
│                                  │
│  [━━━━━━━━━━] 80%              │
└─────────────────────────────────┘
```

### 3. 분석 결과 화면
```
┌─────────────────────────────────┐
│ 📋 분석 결과                     │
│                                  │
│ 의학 용어: 두통, 발열, 기침      │
│ 추정 질병: 감기 (85%), 독감 (60%)│
│ 심각도: 경증 (4/10)              │
│                                  │
│ 💊 추천 약품                     │
│ ┌────────────────────────────┐  │
│ │ 타이레놀정 500mg            │  │
│ │ 제조: 한국존슨앤드존슨       │  │
│ │ 효과: 두통, 발열 완화        │  │
│ └────────────────────────────┘  │
│                                  │
│ 🏥 가까운 약국                   │
│ ┌────────────────────────────┐  │
│ │ 📍 서울약국 (500m)          │  │
│ │ 서울시 종로구...             │  │
│ │ ☎ 02-1234-5678              │  │
│ │ 🕐 운영 중 (09:00-22:00)    │  │
│ │ [지도보기] [길찾기]          │  │
│ └────────────────────────────┘  │
│                                  │
│ 💬 안내 메시지                   │
│ 일반 의약품으로 증상 완화가      │
│ 가능합니다. 가까운 약국을        │
│ 방문하세요.                      │
└─────────────────────────────────┘
```

## 📁 프로젝트 구조

```
src/
├── app/                          # App Router 페이지
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 홈 페이지
│   ├── globals.css              # 글로벌 스타일
│   ├── auth/                    # 인증 페이지
│   │   ├── login/
│   │   │   └── page.tsx         # 로그인 페이지
│   │   └── register/
│   │       └── page.tsx         # 회원가입 페이지
│   ├── symptom-check/           # 증상 분석 ⭐ NEW
│   │   ├── page.tsx             # 증상 입력 페이지
│   │   ├── result/
│   │   │   └── page.tsx         # 분석 결과 페이지
│   │   └── history/
│   │       └── page.tsx         # 분석 이력 페이지
│   └── dashboard/               # 대시보드
│       └── page.tsx             # 사용자 대시보드
│
├── components/                  # 재사용 가능한 컴포넌트
│   ├── providers.tsx            # 컨텍스트 프로바이더
│   ├── ui/                      # UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── LoadingSpinner.tsx
│   ├── symptom/                 # 증상 분석 컴포넌트 ⭐ NEW
│   │   ├── SymptomInput.tsx     # 증상 입력 폼
│   │   ├── AnalysisResult.tsx   # 분석 결과 표시
│   │   ├── DrugCard.tsx         # 약품 카드
│   │   ├── FacilityCard.tsx     # 시설 카드
│   │   └── MapView.tsx          # 지도 뷰
│   ├── forms/                   # 폼 컴포넌트
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   └── layout/                  # 레이아웃 컴포넌트
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Navigation.tsx
│
├── contexts/                    # React Context
│   ├── auth-context.tsx         # 인증 컨텍스트
│   └── symptom-context.tsx      # 증상 분석 컨텍스트 ⭐ NEW
│
├── services/                    # API 서비스
│   ├── api.ts                   # Axios 인스턴스
│   ├── auth.ts                  # 인증 서비스
│   ├── users.ts                 # 사용자 API
│   ├── symptom-analysis.ts      # 증상 분석 API ⭐ NEW
│   └── assessments.ts           # 평가 API
│
├── types/                       # TypeScript 타입 정의
│   ├── user.ts
│   ├── symptom.ts               # 증상 관련 타입 ⭐ NEW
│   ├── drug.ts                  # 약품 관련 타입 ⭐ NEW
│   ├── facility.ts              # 시설 관련 타입 ⭐ NEW
│   ├── assessment.ts
│   └── common.ts
│
├── hooks/                       # 커스텀 훅
│   ├── useAuth.ts
│   ├── useGeolocation.ts        # GPS 위치 훅 ⭐ NEW
│   ├── useSymptomAnalysis.ts    # 증상 분석 훅 ⭐ NEW
│   └── useApi.ts
│
└── utils/                       # 유틸리티 함수
    ├── api.ts
    ├── validation.ts
    ├── geolocation.ts           # 위치 계산 ⭐ NEW
    ├── dateFormatter.ts
    └── constants.ts
```

## 🎨 UI/UX 설계

### 증상 분석 페이지 디자인

#### 컬러 코딩
```css
/* Severity Colors */
--severity-low: #10b981;      /* 경증: 녹색 */
--severity-medium: #f59e0b;   /* 중등도: 주황 */
--severity-high: #ef4444;     /* 중증: 빨강 */

/* Status Colors */
--open: #10b981;              /* 운영 중: 녹색 */
--closed: #6b7280;            /* 마감: 회색 */
```

#### 반응형 레이아웃
- **Mobile**: 세로 스크롤, 전체 화면 지도
- **Tablet**: 2열 그리드, 사이드 지도
- **Desktop**: 3열 그리드, 고정 사이드바 지도

## 🔐 인증 및 권한

### 세션 기반 인증
```typescript
// 인증 컨텍스트 사용
const { user, login, logout, loading } = useAuth();

// 증상 분석 (비회원 가능)
<SymptomCheckPage /> // 로그인 불필요

// 이력 조회 (회원 전용)
<SymptomHistoryPage /> // 로그인 필요
```

## 📊 API 연동

### 증상 분석 API 호출
```typescript
// utils/api.ts - camelCase/snake_case 자동 변환
export const symptomApi = {
  analyzeSymptom: (symptomData: any) => {
    // 프론트엔드 snake_case → 백엔드 camelCase 변환
    const backendData = {
      symptomText: symptomData.symptom_text,
      subSymptoms: symptomData.sub_symptoms,
      latitude: symptomData.gps_point?.lat,
      longitude: symptomData.gps_point?.lng,
      gpsAccuracy: symptomData.gps_accuracy_m,
      userAge: symptomData.user_age,
      isPregnant: symptomData.is_pregnant,
    };
    
    return api.post('/api/symptom-logs/analyze', backendData, {
      loadingMessage: 'AI가 증상을 분석하고 있습니다...',
      timeout: 45000, // 45초 타임아웃
    });
  },
};

// 컴포넌트에서 사용
const handleAnalyze = async (formData) => {
  try {
    // 프론트엔드 형식으로 데이터 준비 (snake_case)
    const requestData = {
      symptom_text: formData.symptoms,
      sub_symptoms: formData.additionalSymptoms,
      gps_point: { 
        lat: location.latitude, 
        lng: location.longitude 
      },
      gps_accuracy_m: location.accuracy,
      user_age: formData.age,
      is_pregnant: formData.isPregnant,
    };
    
    // API 호출 (자동으로 camelCase로 변환됨)
    const result = await symptomApi.analyzeSymptom(requestData);
    toast.success('증상 분석이 완료되었습니다!');
  } catch (error) {
    toast.error('증상 분석에 실패했습니다.');
  }
};
```

## 🗺️ 위치 기반 기능

### GPS 권한 요청
```typescript
// hooks/useGeolocation.ts
export function useGeolocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('위치 서비스를 사용할 수 없습니다.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (error) => {
        setError('위치 정보를 가져올 수 없습니다.');
        setLoading(false);
      }
    );
  }, []);

  return { location, error, loading, requestLocation };
}
```

### 지도 표시
```typescript
// components/symptom/MapView.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export function MapView({ facilities }: { facilities: Facility[] }) {
  return (
    <MapContainer center={[37.5665, 126.9780]} zoom={15}>
      <TileLayer
        url="https://api.vworld.kr/req/wmts/1.0.0/{apikey}/Base/{z}/{y}/{x}.png"
        attribution="&copy; VWorld"
      />
      {facilities.map((facility) => (
        <Marker key={facility.id} position={[facility.lat, facility.lng]}>
          <Popup>
            <strong>{facility.name}</strong>
            <p>{facility.address}</p>
            <button onClick={() => copyAddress(facility.address)}>
              주소 복사
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

## 🚀 성능 최적화

### 코드 스플리팅
```typescript
// 지도 컴포넌트 동적 로드 (용량 절감)
const MapView = dynamic(() => import('@/components/symptom/MapView'), {
  loading: () => <MapSkeleton />,
  ssr: false, // 클라이언트 전용
});
```

### 이미지 최적화
```typescript
import Image from 'next/image';

<Image
  src="/drug-icon.png"
  alt="약품 아이콘"
  width={64}
  height={64}
  priority={false}
  loading="lazy"
/>
```

### API 호출 최적화
- **자동 변환**: snake_case ↔ camelCase 자동 변환으로 수동 변환 불필요
- **타임아웃 설정**: LLM 분석은 45초, 일반 API는 10초
- **로딩 상태**: 전역 로딩 오버레이로 사용자 경험 개선
- **에러 핸들링**: 친화적인 에러 메시지 표시

## 🧪 테스트

### 증상 분석 플로우 테스트
```typescript
// __tests__/symptom-check.test.tsx
describe('증상 분석 플로우', () => {
  it('증상 입력 후 분석 결과 표시', async () => {
    render(<SymptomCheckPage />);
    
    // 증상 입력
    fireEvent.change(screen.getByPlaceholderText('증상을 입력하세요'), {
      target: { value: '머리가 아프고 열이 나요' }
    });
    
    // 분석 버튼 클릭
    fireEvent.click(screen.getByText('분석하기'));
    
    // 결과 대기
    await waitFor(() => {
      expect(screen.getByText('분석 결과')).toBeInTheDocument();
    });
    
    // 추천 약품 확인
    expect(screen.getByText(/타이레놀/)).toBeInTheDocument();
  });
});
```

## 🚀 배포

### Vercel 배포 (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 배포
vercel

# 환경 변수 설정
vercel env add NEXT_PUBLIC_API_URL
```

### 환경별 설정
- **개발**: `NODE_ENV=development`
- **스테이징**: `NODE_ENV=staging`
- **운영**: `NODE_ENV=production`

## 🤝 기여 가이드

1. **코딩 스타일**: ESLint + Prettier 규칙 준수
2. **컴포넌트**: 재사용 가능한 작은 단위로 작성
3. **타입 안정성**: TypeScript 엄격 모드 사용
4. **테스트**: 중요한 컴포넌트는 테스트 코드 작성
5. **문서화**: JSDoc 주석 및 README 업데이트
6. **API 통신**: utils/api.ts의 변환 로직 사용 (수동 변환 금지)

## 🐛 문제 해결

### API 400 Bad Request 에러
**증상**: 증상 분석 API 호출 시 400 에러 발생

**원인**: 프론트엔드의 snake_case 필드명과 백엔드의 camelCase 필드명 불일치

**해결**: `utils/api.ts`의 `symptomApi.analyzeSymptom` 메서드가 자동으로 변환합니다.

```typescript
// ❌ 잘못된 방법 (직접 호출)
api.post('/api/symptom-logs/analyze', {
  symptom_text: '머리 아파요', // 백엔드는 symptomText를 기대
  gps_point: { lat: 37.5, lng: 126.9 } // 백엔드는 latitude, longitude를 기대
});

// ✅ 올바른 방법 (변환 함수 사용)
symptomApi.analyzeSymptom({
  symptom_text: '머리 아파요',
  gps_point: { lat: 37.5, lng: 126.9 }
});
// → 자동으로 { symptomText: '...', latitude: 37.5, longitude: 126.9 }로 변환됨
```

## 📝 라이선스

Copyright © 2024 YAME Project
