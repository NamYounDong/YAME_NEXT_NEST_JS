/**
 * Python 스크립트 실행을 위한 공통 함수
 * 
 * 기존 data-ml.service.ts의 패턴을 참조하여 Python 스크립트를 실행하는 단순한 함수입니다.
 */

// Node.js 내장 모듈들
import { spawn } from 'child_process';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';

// Python 스크립트 실행 옵션 인터페이스
export interface PythonScriptOptions {
  /** Python 스크립트 파일 경로 */
  scriptPath: string;
  /** 스크립트 실행 시 전달할 인수들 */
  args?: string[];
  /** 작업 디렉토리 (기본값: process.cwd()) */
  cwd?: string;
  /** 환경 변수 (기본값: process.env) */
  env?: NodeJS.ProcessEnv;
  /** Python 실행 파일 경로 (기본값: 환경변수 PYTHON_BIN 또는 'python'/'python3') */
  pythonBin?: string;
  /** JSON 응답을 기대하는지 여부 (기본값: true) */
  expectJsonResponse?: boolean;
  /** 로그 출력 여부 (기본값: true) */
  enableLogging?: boolean;
}

// Python 스크립트 실행 결과 인터페이스
export interface PythonScriptResult {
  /** 실행 성공 여부 */
  success: boolean;
  /** 종료 코드 */
  exitCode: number;
  /** JSON 응답 데이터 (expectJsonResponse가 true인 경우) */
  jsonResponse?: any;
  /** 표준 출력 내용 */
  stdout?: string;
  /** 표준 에러 출력 내용 */
  stderr?: string;
}

/**
 * Python 스크립트를 실행하는 공통 함수
 * 
 * 기존 data-ml.service.ts의 패턴을 참조하여 구현했습니다.
 * 
 * @param options - 스크립트 실행 옵션
 * @param logger - 로거 인스턴스 (선택사항)
 * @returns Promise<PythonScriptResult> - 실행 결과
 * 
 * 사용 예시:
 * ```typescript
 * // 기본 사용
 * const result = await executePythonScript({
 *   scriptPath: 'path/to/script.py',
 *   args: ['arg1', 'arg2']
 * }, logger);
 * 
 * // JSON 응답 기대하지 않는 경우
 * const result = await executePythonScript({
 *   scriptPath: 'path/to/script.py',
 *   expectJsonResponse: false
 * }, logger);
 * ```
 */
export async function executePythonScript(
  options: PythonScriptOptions,
  logger?: any
): Promise<PythonScriptResult> {
  // 1단계: Python 실행 파일 경로 결정 (크로스 플랫폼 지원)
  const pythonBin = options.pythonBin || 
    process.env.PYTHON_BIN || 
    getDefaultPythonCommand();
  
  // 2단계: 스크립트 실행 옵션 설정
  const scriptArgs = options.args || [];
  const cwd = options.cwd || process.cwd();
  const env = { ...process.env, ...options.env };
  const expectJsonResponse = options.expectJsonResponse !== false;
  const enableLogging = options.enableLogging !== false;
  
  // 3단계: Python 경로 설정 (크로스 플랫폼 지원)
  setupPythonPath(env, cwd);
  
  // 4단계: 스크립트 경로 검증 및 정규화
  const fullScriptPath = normalizeScriptPath(options.scriptPath, cwd);
  
  // Python 실행 파일 존재 여부 확인
  if (!isPythonExecutable(pythonBin)) {
    throw new Error(`Python executable not found: ${pythonBin}`);
  }
  
  // 스크립트 파일 존재 여부 확인
  if (!fs.existsSync(fullScriptPath)) {
    throw new Error(`Python script not found: ${fullScriptPath}`);
  }
  
  if (enableLogging && logger) {
    logger.log(`[PythonScript] Platform: ${process.platform}`);
    logger.log(`[PythonScript] Executing: ${pythonBin} ${fullScriptPath} ${scriptArgs.join(' ')}`);
    logger.log(`[PythonScript] Working directory: ${cwd}`);
    logger.log(`[PythonScript] PYTHONPATH: ${env.PYTHONPATH}`);
  }
  
  // 5단계: ChildProcess로 Python 스크립트 실행
  // 기존 data-ml.service.ts 패턴과 동일하게 구현
  const proc = spawn(pythonBin, [fullScriptPath, ...scriptArgs], {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // 6단계: 결과 수집을 위한 변수들
  let jsonResponse: any = null;
  let stdoutContent = '';
  let stderrContent = '';
  
  // 7단계: stdout 처리 (JSON 응답 및 일반 출력)
  // 기존 data-ml.service.ts의 패턴과 동일
  const rlOut = readline.createInterface({ input: proc.stdout });
  rlOut.on('line', (line: string) => {
    stdoutContent += line + '\n';
    
    if (expectJsonResponse) {
      try {
        const obj = JSON.parse(line);
        jsonResponse = obj;
        if (enableLogging && logger) {
          logger.log(`[PythonScript] JSON Response: ${JSON.stringify(obj)}`);
        }
      } catch {
        // JSON이 아니면 무시 (일반 로그 출력으로 처리)
        if (enableLogging && logger) {
          logger.log(`[PythonScript] stdout: ${line}`);
        }
      }
    } else {
      if (enableLogging && logger) {
        logger.log(`[PythonScript] stdout: ${line}`);
      }
    }
  });
  
  // 8단계: stderr 처리 (진행 로그)
  // 기존 data-ml.service.ts의 패턴과 동일
  const rlErr = readline.createInterface({ input: proc.stderr });
  rlErr.on('line', (line: string) => {
    stderrContent += line + '\n';
    if (enableLogging && logger) {
      logger.log(`[PythonScript] stderr: ${line}`);
    }
  });
  
  // 9단계: 실행 완료 대기 및 결과 반환
  // 기존 data-ml.service.ts의 패턴과 동일
  const exitCode: number = await new Promise((resolve, reject) => {
    proc.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
    
    proc.on('close', (code) => {
      resolve(code ?? -1);
    });
  });
  
  const success = exitCode === 0;
  
  // 10단계: 결과 검증 및 반환
  if (expectJsonResponse && !jsonResponse) {
    throw new Error('Python script finished without expected JSON response');
  }
  
  if (enableLogging && logger) {
    logger.log(`[PythonScript] Script execution completed. Exit code: ${exitCode}`);
  }
  
  return {
    success,
    exitCode,
    jsonResponse,
    stdout: stdoutContent.trim(),
    stderr: stderrContent.trim()
  };
}

/**
 * 플랫폼별 기본 Python 명령어 결정
 * 
 * @returns string - Python 실행 명령어
 */
function getDefaultPythonCommand(): string {
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      // Windows: python 또는 python3 시도
      return 'python';
    case 'darwin':
      // macOS: python3 우선, python 폴백
      return 'python3';
    case 'linux':
    case 'freebsd':
    case 'openbsd':
    case 'aix':
    case 'sunos':
      // Unix 계열: python3 우선, python 폴백
      return 'python3';
    default:
      // 알 수 없는 플랫폼: python3 시도
      return 'python3';
  }
}

/**
 * Python 경로 설정 (크로스 플랫폼 지원)
 * 
 * @param env - 환경 변수 객체
 * @param cwd - 현재 작업 디렉토리
 */
function setupPythonPath(env: NodeJS.ProcessEnv, cwd: string): void {
  // src 디렉토리 경로
  const srcPath = path.resolve(cwd, 'src');
  
  // 플랫폼별 경로 구분자 결정
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  
  // PYTHONPATH 설정
  if (env.PYTHONPATH) {
    // 기존 PYTHONPATH가 있는 경우 추가
    env.PYTHONPATH = `${env.PYTHONPATH}${pathSeparator}${srcPath}`;
  } else {
    // PYTHONPATH가 없는 경우 새로 설정
    env.PYTHONPATH = srcPath;
  }
  
  // 추가 Python 경로들 (필요한 경우)
  const additionalPaths = [
    path.resolve(cwd, 'venv', 'Lib', 'site-packages'), // Windows venv
    path.resolve(cwd, 'venv', 'lib', 'python3', 'site-packages'), // Unix venv
    path.resolve(cwd, '.venv', 'Lib', 'site-packages'), // Windows .venv
    path.resolve(cwd, '.venv', 'lib', 'python3', 'site-packages'), // Unix .venv
  ];
  
  // 존재하는 경로들만 추가
  for (const additionalPath of additionalPaths) {
    if (fs.existsSync(additionalPath)) {
      env.PYTHONPATH = `${env.PYTHONPATH}${pathSeparator}${additionalPath}`;
    }
  }
}

/**
 * Python 실행 파일 존재 여부 확인
 * 
 * @param pythonBin - Python 실행 파일 경로
 * @returns boolean - 존재 여부
 */
function isPythonExecutable(pythonBin: string): boolean {
  try {
    // 절대 경로인 경우 파일 존재 여부 확인
    if (path.isAbsolute(pythonBin)) {
      return fs.existsSync(pythonBin);
    }
    
    // 상대 경로인 경우 PATH에서 찾기 (spawn이 처리)
    return true;
  } catch {
    return false;
  }
}

/**
 * 플랫폼별 스크립트 경로 정규화
 * 
 * @param scriptPath - 스크립트 경로
 * @param cwd - 현재 작업 디렉토리
 * @returns string - 정규화된 경로
 */
function normalizeScriptPath(scriptPath: string, cwd: string): string {
  // 절대 경로인 경우 그대로 사용
  if (path.isAbsolute(scriptPath)) {
    return scriptPath;
  }
  
  // 상대 경로인 경우 cwd 기준으로 정규화
  return path.resolve(cwd, scriptPath);
}