# 1단계: 빌드 스테이지
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 정보 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 전체 복사
COPY . .

# NestJS 빌드
RUN npm run build

# 2단계: 런타임 스테이지
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
