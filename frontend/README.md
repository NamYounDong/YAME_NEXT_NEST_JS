# YAME Frontend

Next.js 기반의 의료 평가 시스템 프론트엔드

## 🚀 구현된 주요 기능

### UI/UX
- ✅ **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- ✅ **모던 UI**: Tailwind CSS 기반 깔끔한 디자인
- ✅ **다크 모드**: 사용자 환경에 따른 테마 적용 준비
- ✅ **접근성**: WCAG 가이드라인 준수
- ✅ **로딩 상태**: 사용자 피드백을 위한 로딩 인디케이터

### 인증 시스템
- ✅ **JWT 기반 인증**: 토큰 기반 로그인/로그아웃
- ✅ **자동 로그인**: 토큰 저장 및 자동 인증 상태 유지
- ✅ **역할별 접근**: 환자, 의사, 관리자 권한 관리
- ✅ **보안 쿠키**: HttpOnly 쿠키로 토큰 저장
- ✅ **세션 관리**: 자동 토큰 갱신 및 만료 처리

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
- ✅ **인증 페이지**: 로그인/회원가입 폼
- ✅ **대시보드**: 사용자별 맞춤 인터페이스
- ✅ **사용자 관리**: 프로필 수정 및 계정 관리 준비
- ✅ **평가 시스템**: 건강 평가 인터페이스 준비

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Icons**: Heroicons
- **Notifications**: React Hot Toast
- **Authentication**: JWT + Cookies

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
NEXT_PUBLIC_API_URL=http://localhost:3001
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

## 📁 프로젝트 구조

```
src/
├── app/                       # App Router 페이지
│   ├── layout.tsx            # 루트 레이아웃
│   ├── page.tsx              # 홈 페이지
│   ├── globals.css           # 글로벌 스타일
│   ├── auth/                 # 인증 페이지
│   │   ├── login/
│   │   │   └── page.tsx      # 로그인 페이지
│   │   └── register/
│   │       └── page.tsx      # 회원가입 페이지
│   └── dashboard/            # 대시보드
│       └── page.tsx          # 사용자 대시보드
├── components/               # 재사용 가능한 컴포넌트
│   ├── providers.tsx         # 컨텍스트 프로바이더
│   ├── ui/                   # UI 컴포넌트
│   ├── forms/                # 폼 컴포넌트
│   └── layout/               # 레이아웃 컴포넌트
├── contexts/                 # React Context
│   └── auth-context.tsx      # 인증 컨텍스트
├── services/                 # API 서비스
│   ├── auth.ts              # 인증 서비스
│   ├── users.ts             # 사용자 API
│   └── assessments.ts       # 평가 API
├── types/                   # TypeScript 타입 정의
│   ├── user.ts
│   ├── assessment.ts
│   └── common.ts
├── hooks/                   # 커스텀 훅
│   ├── useAuth.ts
│   └── useApi.ts
└── utils/                   # 유틸리티 함수
    ├── api.ts
    ├── validation.ts
    └── constants.ts
```

## 🎨 UI/UX 설계

### 디자인 시스템

#### 컬러 팔레트
```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Semantic Colors */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #06b6d4;
```

#### 타이포그래피
- **Font Family**: Inter (Google Fonts)
- **Headings**: 24px - 48px
- **Body**: 14px - 16px
- **Small**: 12px - 14px

#### 컴포넌트 스타일
```typescript
// 버튼 스타일 예시
const buttonVariants = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  outline: "border border-primary-600 text-primary-600 hover:bg-primary-50"
};
```

### 반응형 브레이크포인트
```css
/* Mobile */
@media (max-width: 640px) { /* sm */ }

/* Tablet */
@media (min-width: 768px) { /* md */ }

/* Desktop */
@media (min-width: 1024px) { /* lg */ }

/* Large Desktop */
@media (min-width: 1280px) { /* xl */ }
```

## 🔐 인증 시스템

### Context 기반 인증 관리

```typescript
// 인증 컨텍스트 사용
const { user, login, logout, loading } = useAuth();

// 로그인 상태 확인
if (loading) return <LoadingSpinner />;
if (!user) return <LoginForm />;

// 사용자 정보 접근
return <Dashboard user={user} />;
```

### 자동 토큰 관리
- **토큰 저장**: HttpOnly 쿠키 (보안)
- **자동 갱신**: Axios 인터셉터
- **만료 처리**: 자동 로그아웃 및 리다이렉트

```typescript
// Axios 인터셉터 설정
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.removeToken();
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
```

### 라우트 보호
```typescript
// 보호된 라우트 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingPage />;
  if (!user) redirect('/auth/login');
  
  return <>{children}</>;
}
```

## 📝 폼 관리

### React Hook Form + Zod 스키마

```typescript
// Zod 스키마 정의
const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
});

// 폼 컴포넌트
function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      toast.success('로그인 성공!');
    } catch (error) {
      toast.error('로그인에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email')}
        type="email"
        placeholder="이메일"
        className="w-full px-3 py-2 border rounded-md"
      />
      {errors.email && (
        <p className="text-red-500 text-sm">{errors.email.message}</p>
      )}
      {/* 비밀번호 필드... */}
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md">
        로그인
      </button>
    </form>
  );
}
```

## 🚀 상태 관리

### React Query 사용

```typescript
// API 훅 정의
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getAll(),
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// 컴포넌트에서 사용
function UsersList() {
  const { data: users, isLoading, error } = useUsers();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div>
      {users?.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

### 낙관적 업데이트
```typescript
// 사용자 정보 수정
const updateUserMutation = useMutation({
  mutationFn: usersService.update,
  onMutate: async (newUser) => {
    // 낙관적 업데이트
    await queryClient.cancelQueries(['users']);
    const previousUsers = queryClient.getQueryData(['users']);
    queryClient.setQueryData(['users'], old => 
      old.map(user => user.id === newUser.id ? newUser : user)
    );
    return { previousUsers };
  },
  onError: (err, newUser, context) => {
    // 에러 시 롤백
    queryClient.setQueryData(['users'], context.previousUsers);
  },
  onSettled: () => {
    // 완료 후 재검증
    queryClient.invalidateQueries(['users']);
  },
});
```

## 🎯 성능 최적화

### Code Splitting
```typescript
// 동적 임포트로 코드 분할
const DashboardPage = dynamic(() => import('./dashboard/page'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

### 이미지 최적화
```typescript
// Next.js Image 컴포넌트 사용
import Image from 'next/image';

<Image
  src="/hero-image.jpg"
  alt="YAME 서비스"
  width={800}
  height={600}
  priority
  className="rounded-lg"
/>
```

### 메모이제이션
```typescript
// React.memo로 불필요한 리렌더링 방지
const UserCard = React.memo(({ user }: { user: User }) => {
  return (
    <div className="p-4 border rounded-lg">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
});

// useMemo로 비싼 계산 캐싱
const sortedUsers = useMemo(() => 
  users?.sort((a, b) => a.name.localeCompare(b.name)),
  [users]
);
```

## 🔍 에러 처리

### 전역 에러 바운더리
```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

### API 에러 처리
```typescript
// 서비스 레벨 에러 처리
export const usersService = {
  async getAll() {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('사용자를 찾을 수 없습니다');
      }
      throw new Error('사용자 목록을 가져오는데 실패했습니다');
    }
  }
};
```

## 🧪 테스트

### 컴포넌트 테스트
```typescript
// Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from './LoginForm';

test('로그인 폼 제출', async () => {
  render(<LoginForm />);
  
  fireEvent.change(screen.getByPlaceholderText('이메일'), {
    target: { value: 'test@example.com' }
  });
  
  fireEvent.change(screen.getByPlaceholderText('비밀번호'), {
    target: { value: 'password123' }
  });
  
  fireEvent.click(screen.getByText('로그인'));
  
  expect(await screen.findByText('로그인 성공!')).toBeInTheDocument();
});
```

### E2E 테스트 (Cypress 준비)
```typescript
// cypress/e2e/auth.cy.ts
describe('인증 플로우', () => {
  it('사용자 로그인', () => {
    cy.visit('/auth/login');
    cy.get('[data-testid=email]').type('test@example.com');
    cy.get('[data-testid=password]').type('password123');
    cy.get('[data-testid=login-button]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

## 📱 접근성 (Accessibility)

### ARIA 속성
```typescript
// 적절한 ARIA 라벨링
<button
  aria-label="사용자 메뉴 열기"
  aria-expanded={isMenuOpen}
  aria-haspopup="true"
>
  <UserIcon />
</button>

// 폼 접근성
<label htmlFor="email" className="sr-only">
  이메일 주소
</label>
<input
  id="email"
  type="email"
  aria-describedby="email-error"
  aria-invalid={!!errors.email}
/>
{errors.email && (
  <p id="email-error" role="alert" className="text-red-500">
    {errors.email.message}
  </p>
)}
```

### 키보드 네비게이션
```typescript
// 키보드 이벤트 처리
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeModal();
  }
  if (event.key === 'Enter' && event.metaKey) {
    submitForm();
  }
};
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

### Docker 배포
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

### 환경별 설정
```typescript
// next.config.js
const nextConfig = {
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },
};
```

## 📈 성능 모니터링

### Web Vitals 측정
```typescript
// pages/_app.tsx
export function reportWebVitals(metric) {
  console.log(metric);
  // Analytics 서비스로 전송
}
```

### Lighthouse 최적화 체크리스트
- ✅ 이미지 최적화 (Next.js Image)
- ✅ 폰트 최적화 (Google Fonts)
- ✅ 코드 스플리팅 (Dynamic Imports)
- ✅ 메타 태그 설정 (SEO)
- ✅ 서비스 워커 (PWA 준비)

## 🔧 개발 도구

### ESLint + Prettier 설정
```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "@typescript-eslint/recommended"],
  "rules": {
    "no-unused-vars": "warn",
    "prefer-const": "error"
  }
}
```

### VS Code 추천 확장
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript Importer
- Auto Rename Tag
- Prettier - Code formatter

## 🤝 기여 가이드

1. **코딩 스타일**: ESLint + Prettier 규칙 준수
2. **컴포넌트**: 재사용 가능한 작은 단위로 작성
3. **타입 안정성**: TypeScript 엄격 모드 사용
4. **테스트**: 중요한 컴포넌트는 테스트 코드 작성
5. **문서화**: JSDoc 주석 및 README 업데이트