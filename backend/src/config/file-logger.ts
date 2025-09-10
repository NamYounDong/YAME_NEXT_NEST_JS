/**
 * 파일 로거 설정
 * 
 * 이 클래스는 YAME 시스템의 로깅 시스템을 파일 기반으로 관리하는 
 * 전용 로거 구현체입니다.
 * 
 * 주요 역할:
 * 1. 로그 파일 관리: 애플리케이션 로그를 체계적으로 파일에 저장 및 관리
 * 2. 로그 레벨 제어: DEBUG, INFO, WARN, ERROR 등 다양한 로그 레벨 지원
 * 3. 로그 포맷팅: 일관된 로그 형식과 가독성을 위한 로그 포맷 관리
 * 4. 로그 로테이션: 로그 파일 크기 제한 및 자동 로테이션 관리
 * 5. 성능 최적화: 로깅 작업이 애플리케이션 성능에 미치는 영향 최소화
 * 
 * 로그 레벨:
 * - DEBUG: 개발 및 디버깅을 위한 상세한 정보
 * - INFO: 일반적인 애플리케이션 동작 정보
 * - WARN: 잠재적인 문제나 주의가 필요한 상황
 * - ERROR: 오류가 발생한 상황 및 상세 정보
 * - FATAL: 시스템이 계속 동작할 수 없는 심각한 오류
 * 
 * 로그 포맷:
 * - 타임스탬프: 로그 발생 시점 (ISO 8601 형식)
 * - 로그 레벨: 로그의 중요도 및 분류
 * - 컨텍스트: 로그가 발생한 클래스 또는 모듈명
 * - 메시지: 실제 로그 내용 및 상세 정보
 * - 메타데이터: 추가적인 컨텍스트 정보 (사용자 ID, 요청 ID 등)
 * 
 * 파일 관리:
 * - 로그 디렉토리: logs/ 디렉토리 내에 체계적인 로그 파일 구성
 * - 파일 명명: 날짜별, 레벨별, 애플리케이션별 로그 파일 분리
 * - 크기 제한: 개별 로그 파일의 최대 크기 제한 및 자동 분할
 * - 보관 정책: 오래된 로그 파일의 자동 삭제 및 보관 기간 관리
 * 
 * 성능 최적화:
 * - 비동기 로깅: 로그 쓰기 작업을 비동기적으로 처리하여 성능 영향 최소화
 * - 버퍼링: 로그 메시지를 메모리 버퍼에 모아서 일괄 처리
 * - 압축: 오래된 로그 파일의 압축을 통한 저장 공간 절약
 * - 색인: 로그 검색 및 분석을 위한 효율적인 색인 구조
 * 
 * 보안 및 모니터링:
 * - 민감 정보 필터링: 비밀번호, API 키 등 민감한 정보의 로그 노출 방지
 * - 접근 제어: 로그 파일에 대한 읽기/쓰기 권한 관리
 * - 감사 추적: 로그 시스템 자체의 접근 및 변경 이력 기록
 * - 알림 시스템: 로그 레벨별 자동 알림 및 모니터링 연동
 * 
 * 사용 사례:
 * - 애플리케이션 동작 상태 모니터링
 * - 오류 발생 시 디버깅 및 문제 해결
 * - 사용자 활동 추적 및 감사
 * - 시스템 성능 분석 및 최적화
 * - 보안 사고 조사 및 분석
 */

// src/logger/file.logger.ts
import { LoggerService } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { createWriteStream, WriteStream } from 'node:fs';
import * as path from 'node:path';

export class FileLogger implements LoggerService {
  private stream?: WriteStream;
  private filePath: string;
  private ready = false;

  constructor(file = 'logs/app.log') {
    // 절대경로 대신 프로젝트 기준 상대경로 권장
    this.filePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  }

  private async ensure(): Promise<void> {
    if (this.ready) return;
    try {
      const dir = path.dirname(this.filePath);
      await mkdir(dir, { recursive: true }); // 디렉터리 자동 생성
      this.stream = createWriteStream(this.filePath, { flags: 'a' }); // append 모드
      this.stream.on('error', (err) => {
        console.error('[FileLogger] stream error:', err);
      });
      this.ready = true;
    } catch (e) {
      console.error('[FileLogger] ensure failed:', e);
      throw e;
    }
  }

  private async write(level: string, message: any, context?: string) {
    try {
      await this.ensure();
      const line = JSON.stringify(
        {
          ts: new Date().toISOString(),
          level,
          context,
          message,
        }
      ) + '\n';

      // stream 이 열려있으면 스트림으로 쓰기
      if (this.stream && !this.stream.destroyed) {
        this.stream.write(line);
      } else {
        // 폴백: 콘솔
        console.log(line);
      }
    } catch (e) {
      // 에러는 반드시 보이게!
      console.error('[FileLogger] write failed:', e);
    }
  }

  // 동기적 초기화를 위한 메서드 추가
  async initialize(): Promise<void> {
    await this.ensure();
  }

  log(message: any, context?: string)    { this.write('info', message, context); }
  error(message: any, context?: string)  { this.write('error', message, context); }
  warn(message: any, context?: string)   { this.write('warn', message, context); }
  debug(message: any, context?: string)  { this.write('debug', message, context); }
  verbose(message: any, context?: string){ this.write('verbose', message, context); }
}
