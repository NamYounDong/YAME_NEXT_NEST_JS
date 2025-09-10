# =============================================================================
# 로깅 유틸리티 모듈
# =============================================================================
# 이 모듈은 Python 표준 라이브러리의 logging 모듈을 기반으로 한 커스텀 로깅 시스템입니다.
# 주로 ML 파이프라인과 데이터 처리 과정에서 발생하는 로그를 체계적으로 관리합니다.

# Python 표준 라이브러리에서 가져온 모듈들
import logging  # Python 내장 로깅 시스템 - 로그 메시지 생성, 포맷팅, 출력 담당
import time     # Python 내장 시간 모듈 - 로컬 시간 변환을 위해 사용
from pathlib import Path  # Python 3.4+ 내장 경로 처리 모듈 - 파일/디렉토리 경로 조작


# =============================================================================
# 로거 초기화 함수
# =============================================================================
def init_logger(path: str = None, level: int = logging.INFO):
    """
    로깅 시스템을 초기화하는 함수
    
    Args:
        path (str): 로그 파일이 저장될 경로 (기본값: None - 자동으로 backend/logs/py_log.log 설정)
        level (int): 로그 레벨 (기본값: logging.INFO)
                    - DEBUG: 상세한 디버깅 정보
                    - INFO: 일반적인 정보 메시지
                    - WARNING: 경고 메시지
                    - ERROR: 에러 메시지
                    - CRITICAL: 심각한 에러 메시지
    
    처리 과정:
    1. 로그 파일 경로 자동 설정
    2. 로그 파일 디렉토리 생성
    3. 로그 레벨 설정
    4. 로그 포맷터 생성
    5. 파일 핸들러 생성 및 설정
    6. 루트 로거에 핸들러 등록
    """
    
    # 1단계: 로그 파일 경로 자동 설정
    if path is None:
        # 현재 스크립트의 위치를 기준으로 backend/logs/py_log.log 경로 생성
        current_file = Path(__file__).resolve()
        # src/ml_src/config/util.py -> backend/logs/py_log.log
        backend_root = current_file.parent.parent.parent.parent  # src의 상위 디렉토리 (backend)
        path = backend_root / "logs" / "py_log.log"
    
    # 디버깅을 위해 로그 파일 경로 출력
    print(f"[util.py] Log file path: {path}")
    print(f"[util.py] Log directory: {Path(path).parent}")
    
    # 2단계: 로그 파일이 저장될 디렉토리 생성
    # Path(path).parent: 로그 파일의 부모 디렉토리 경로 추출
    # mkdir(parents=True, exist_ok=True): 
    #   - parents=True: 중간 디렉토리들도 함께 생성 (예: logs/ 폴더가 없으면 생성)
    #   - exist_ok=True: 이미 존재하는 디렉토리여도 에러 발생하지 않음
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    
    # 3단계: 로그 레벨 설정
    # getattr(logging, str(level).upper(), logging.INFO):
    #   - level을 문자열로 변환 후 대문자로 변경 (예: 20 -> "INFO")
    #   - logging 모듈에서 해당 레벨 상수를 가져옴 (예: logging.INFO = 20)
    #   - 만약 해당 레벨이 없으면 기본값 logging.INFO 사용
    lvl = getattr(logging, str(level).upper(), logging.INFO)
    
    # 4단계: 로그 메시지 포맷터 생성
    # logging.Formatter: 로그 메시지의 출력 형식을 정의
    # "%(asctime)s - %(name)s - %(levelname)s - %(message)s":
    #   - %(asctime)s: 로그가 기록된 시간
    #   - %(name)s: 로거의 이름 (보통 모듈명)
    #   - %(levelname)s: 로그 레벨 (INFO, ERROR 등)
    #   - %(message)s: 실제 로그 메시지
    # datefmt="%Y-%m-%d %H:%M:%S": 시간 형식을 "2024-01-15 14:30:25" 형태로 설정
    fmt = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s", 
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # 5단계: 시간대 설정
    # fmt.converter = time.localtime: 
    #   - 기본적으로 logging은 UTC 시간을 사용
    #   - time.localtime을 설정하여 로컬 시간(한국 시간)으로 변경
    #   - 이렇게 하면 로그 시간이 한국 시간으로 표시됨
    fmt.converter = time.localtime
    
    # 6단계: 파일 핸들러 생성
    # logging.FileHandler: 로그 메시지를 파일에 저장하는 핸들러
    # encoding="utf-8": 한글 로그 메시지를 올바르게 저장하기 위해 UTF-8 인코딩 사용
    file_handler = logging.FileHandler(path, encoding="utf-8")
    
    # 7단계: 핸들러 설정
    # setLevel(): 이 핸들러가 처리할 최소 로그 레벨 설정
    # setFormatter(): 로그 메시지 포맷터 연결
    file_handler.setLevel(lvl)
    file_handler.setFormatter(fmt)
    
    # 8단계: 루트 로거 설정
    # logging.getLogger(): 루트 로거 인스턴스 가져오기
    # 루트 로거는 모든 로거의 최상위 부모로, 여기에 핸들러를 등록하면
    # 모든 하위 로거들이 이 핸들러를 사용하게 됨
    root = logging.getLogger()
    
    # 9단계: 기존 핸들러 제거 및 새 핸들러 등록
    # clear(): 기존에 등록된 모든 핸들러 제거 (중복 방지)
    # setLevel(): 루트 로거의 레벨 설정
    # addHandler(): 파일 핸들러를 루트 로거에 등록
    root.handlers.clear()
    root.setLevel(lvl)
    root.addHandler(file_handler)


# =============================================================================
# 로거 인스턴스 반환 함수
# =============================================================================
def get_logger(name: str | None = None) -> logging.Logger:
    """
    설정된 로거 인스턴스를 반환하는 함수
    
    Args:
        name (str | None): 로거 이름 (기본값: None)
                          - None이면 루트 로거 반환
                          - 문자열이면 해당 이름의 로거 반환
    
    Returns:
        logging.Logger: 로거 인스턴스
    
    사용 예시:
        logger = get_logger("my_module")  # "my_module" 이름의 로거
        logger.info("정보 메시지")        # 로그 메시지 출력
        logger.error("에러 메시지")       # 에러 로그 출력
    
    처리 과정:
    1. logging.getLogger(name) 호출
    2. 이미 존재하는 로거면 기존 인스턴스 반환
    3. 존재하지 않으면 새 로거 생성 후 반환
    4. 모든 로거는 루트 로거의 설정을 상속받음
    """
    # logging.getLogger(name):
    #   - name이 None이면 루트 로거 반환
    #   - name이 문자열이면 해당 이름의 로거 반환
    #   - 같은 이름의 로거는 항상 같은 인스턴스를 반환 (싱글톤 패턴)
    #   - 이 로거는 init_logger()에서 설정한 파일 핸들러를 자동으로 상속받음
    return logging.getLogger(name)