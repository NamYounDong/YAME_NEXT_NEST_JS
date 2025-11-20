"""
YAME Agentend - FastAPI + LangChain 기반 AI 에이전트 서비스

이 패키지는 다음 기능을 제공합니다:
- LangChain을 활용한 대화형 증상 분석 에이전트
- DUR 데이터 기반 RAG (Retrieval-Augmented Generation) 시스템
- Redis를 활용한 채팅 세션 관리
- MariaDB 연동을 통한 약품/병원 정보 조회

구조:
    api/        - REST API 엔드포인트 정의
    services/   - 비즈니스 로직 (에이전트, 추론 등)
    rag/        - RAG 시스템 (벡터 스토어, 검색)
    database/   - MariaDB 연결 및 쿼리
    models/     - Pydantic 모델 정의
    config.py   - 환경 설정 관리
"""

__version__ = "1.0.0"
__author__ = "YAME Team"

