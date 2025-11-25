# 1단계: 빌드 스테이지
FROM node:20-alpine AS builder

# 컨테이너 작업 디렉터리 설정
WORKDIR /app

# 패키지 정보만 먼저 복사 (npm 사용 기준)
COPY package*.json ./

# 의존성 설치
RUN npm install

# 나머지 소스 전체 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 2단계: 런타임 스테이지
FROM node:20-alpine

WORKDIR /app

# 빌드 산출물 + node_modules 복사
COPY --from=builder /app ./

EXPOSE 3000

# 프로덕션 서버 실행
CMD ["npm", "run", "start"]
