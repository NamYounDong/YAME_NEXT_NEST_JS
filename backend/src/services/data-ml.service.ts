/**
 * 인공지능 관련 서비스
 * 
 * 이 서비스는 YAME 시스템의 인공지능 관련 기능을 제공합니다.
 */


// NestJS 의존성 주입 및 로깅을 위한 모듈 가져오기
import { Injectable, Logger } from '@nestjs/common';
import { ResponseBaseDto } from 'src/Interfaces/response-base.dto';
import { executePythonScript } from 'src/utils/python-script.util';
import * as path from 'path';



// NestJS 서비스로 등록하여 의존성 주입 가능하도록 설정
@Injectable()
export class DataMLService {
  // 이 서비스의 로거 인스턴스 생성 (클래스명으로 구분)
  private readonly logger = new Logger(DataMLService.name);



  // ML 스크립트 경로들
  private readonly diseaseTrainScriptPath = path.resolve(process.cwd(), 'src/ml_src/svrc/disease/train.py');
  private readonly embedCacheScriptPath = path.resolve(process.cwd(), 'src/ml_src/svrc/disease/embed_cache.py');

  /**
   * DataMLService 생성자
   * NestJS 의존성 주입(DI) 시스템을 통해 DatabaseService 인스턴스를 자동으로 주입받음
   * @param databaseService - 데이터베이스 연결 및 쿼리 실행 서비스 (의존성 주입으로 자동 생성)
   */
  constructor() {}

  /**
   * 질병 분류 모델 훈련 실행
   * 
   * Python 스크립트를 실행하여 질병 분류 모델을 훈련합니다.
   * 공통 PythonScriptUtil을 사용하여 안정적인 스크립트 실행을 보장합니다.
   * 
   * @param epochs - 훈련 에포크 수 (기본값: 10)
   * @param batchSize - 배치 크기 (기본값: 64)
   * @param learningRate - 학습률 (기본값: 2e-4)
   * @returns Promise<ResponseBaseDto> - 훈련 결과
   */
  async diseaseTrain(epochs: number = 10, batchSize: number = 64, learningRate: number = 2e-4): Promise<ResponseBaseDto> {
    try {
      this.logger.log('질병 분류 모델 훈련을 시작합니다...');
      
      // 공통 executePythonScript 함수를 사용하여 ML 훈련 스크립트 실행
      const result = await executePythonScript({
        scriptPath: this.diseaseTrainScriptPath,
        args: [
          '--epochs', epochs.toString(),
          '--batch-size', batchSize.toString(),
          '--learning-rate', learningRate.toString()
        ],
        cwd: process.cwd(),
        env: process.env,
        expectJsonResponse: true,
        enableLogging: true
      }, this.logger);

      if (result.jsonResponse.success) {
        // 모델 훈련 성공 결과 반환
        return {
          success: true,
          message: '질병 분류 모델 훈련이 성공적으로 완료되었습니다.',
          data: {
            exitCode: result.exitCode,
            scriptResponse: result.jsonResponse
          }
        };
      }else{
        // 모델 훈련 실패 결과 반환
        return {
          success: false,
          message: '질병 분류 모델 훈련이 실패하였습니다.',
          data: {
            exitCode: result.exitCode,
            scriptResponse: result.jsonResponse
          }
        };
      }

      
    } catch (error) {
      this.logger.error(`질병 분류 모델 훈련 실패: ${error.message}`);
      throw new Error(`질병 분류 모델 훈련 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 임베딩 캐시 생성/업데이트
   * 
   * 질병 증상 데이터의 임베딩을 미리 계산하여 캐시에 저장합니다.
   * 
   * @returns Promise<ResponseBaseDto> - 캐시 생성 결과
   */
  async generateEmbeddingCache(): Promise<ResponseBaseDto> {
    try {
      this.logger.log('임베딩 캐시 생성을 시작합니다...');
      
      // 공통 executePythonScript 함수를 사용하여 데이터 처리 스크립트 실행
      const result = await executePythonScript({
        scriptPath: this.embedCacheScriptPath,
        cwd: process.cwd(),
        env: process.env,
        expectJsonResponse: true,
        enableLogging: true
      }, this.logger);
      
      // 실행 결과 검증
      if (!result.success) {
        throw new Error(`임베딩 캐시 생성 실패 (종료 코드: ${result.exitCode})`);
      }
      
      this.logger.log('임베딩 캐시 생성이 성공적으로 완료되었습니다.');
      
      return {
        success: true,
        message: '임베딩 캐시가 성공적으로 생성되었습니다.',
        data: {
          exitCode: result.exitCode,
          scriptResponse: result.jsonResponse
        }
      };
      
    } catch (error) {
      this.logger.error(`임베딩 캐시 생성 실패: ${error.message}`);
      throw new Error(`임베딩 캐시 생성 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 사용자 정의 Python 스크립트 실행
   * 
   * 경로와 파라미터를 받아서 Python 스크립트를 실행합니다.
   * 
   * @param scriptPath - 실행할 Python 스크립트 경로
   * @param args - 스크립트에 전달할 인수들
   * @param expectJsonResponse - JSON 응답을 기대하는지 여부 (기본값: true)
   * @returns Promise<ResponseBaseDto> - 실행 결과
   */
  async executeCustomScript(
    scriptPath: string, 
    args: string[] = [], 
    expectJsonResponse: boolean = true
  ): Promise<ResponseBaseDto> {
    try {
      this.logger.log(`사용자 정의 스크립트 실행을 시작합니다: ${scriptPath}`);
      
      // 공통 executePythonScript 함수를 사용하여 스크립트 실행
      const result = await executePythonScript({
        scriptPath,
        args,
        expectJsonResponse,
        enableLogging: true,
        cwd: process.cwd(),
        env: process.env
      }, this.logger);
      
      // 실행 결과 검증
      if (!result.success) {
        throw new Error(`스크립트 실행 실패 (종료 코드: ${result.exitCode})`);
      }
      
      // JSON 응답이 필요한 경우 검증
      if (expectJsonResponse && !result.jsonResponse) {
        throw new Error('스크립트가 예상된 JSON 응답을 반환하지 않았습니다.');
      }
      
      this.logger.log('사용자 정의 스크립트 실행이 성공적으로 완료되었습니다.');
      
      return {
        success: true,
        message: '스크립트가 성공적으로 실행되었습니다.',
        data: {
          exitCode: result.exitCode,
          scriptResponse: result.jsonResponse,
          stdout: result.stdout,
          stderr: result.stderr
        }
      };
      
    } catch (error) {
      this.logger.error(`사용자 정의 스크립트 실행 실패: ${error.message}`);
      throw new Error(`스크립트 실행 중 오류가 발생했습니다: ${error.message}`);
    }
  }
}