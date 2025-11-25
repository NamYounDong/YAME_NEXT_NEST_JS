# FastAPI + Uvicorn용 Python 베이스 이미지
FROM python:3.11-slim

# 컨테이너 내부 작업 디렉터리
WORKDIR /app

# 시스템 패키지 설치 (빌드 툴 등)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 후 의존성 설치
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 애플리케이션 소스 복사
COPY . /app

# FastAPI 포트
EXPOSE 8000

# FastAPI 앱 엔트리포인트
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
