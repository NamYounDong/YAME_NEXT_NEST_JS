/**
 * Agentend (FastAPI) 연동 서비스
 * 
 * NestJS에서 FastAPI로 HTTP 요청을 보내는 서비스입니다.
 * 
 * 사용 이유:
 * - AI 기능을 Python으로 분리하여 관리
 * - LangChain과 RAG는 Python 생태계가 더 성숙
 * - 마이크로서비스 아키텍처 구현
 * 
 * 연동 방식:
 * - HTTP REST API (localhost 내부 통신)
 * - JSON 데이터 교환
 * - 타임아웃 설정 (45초 - LLM 응답 대기)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * FastAPI 요청/응답 인터페이스
 */
interface AgentendChatRequest {
  session_id: string;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface AgentendChatResponse {
  session_id: string;
  message: string;
  message_type: string;
  disease_options?: Array<{
    id: string;
    name: string;
    confidence: number;
    symptoms: string[];
  }>;
  recommendation?: any;
  timestamp: string;
}

interface AgentendDiseaseSelectionRequest {
  session_id: string;
  selected_disease_id: string;
}

interface AgentendCloseSessionRequest {
  session_id: string;
}

@Injectable()
export class AgentendService {
  private readonly logger = new Logger(AgentendService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly agentendUrl: string;

  constructor(private readonly configService: ConfigService) {
    // FastAPI 서버 URL (환경 변수 또는 기본값)
    this.agentendUrl =
      this.configService.get<string>('AGENTEND_URL') ||
      'http://127.0.0.1:8000';

    // Axios 인스턴스 생성
    // 설정:
    // - baseURL: FastAPI 서버 주소
    // - timeout: 45초 (LLM 응답 대기)
    // - headers: JSON 전송
    this.axiosInstance = axios.create({
      baseURL: this.agentendUrl,
      timeout: 45000, // 45초
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Agentend 서비스 초기화: ${this.agentendUrl}`);
  }

  /**
   * 채팅 메시지 전송
   * 
   * FastAPI의 /api/chat/message 엔드포인트로 메시지를 전송합니다.
   * 
   * @param request - 메시지 요청 데이터
   * @returns FastAPI 응답 (챗봇 메시지)
   */
  async sendMessage(
    request: AgentendChatRequest,
  ): Promise<AgentendChatResponse> {
    try {
      this.logger.log(
        `[${request.session_id}] FastAPI 메시지 전송: ${request.message.substring(0, 50)}...`,
      );

      const response = await this.axiosInstance.post<AgentendChatResponse>(
        '/api/chat/message',
        request,
      );

      this.logger.log(
        `[${request.session_id}] FastAPI 응답 수신: type=${response.data.message_type}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `[${request.session_id}] FastAPI 메시지 전송 실패: ${error.message}`,
        error.stack,
      );

      // FastAPI 서버 오류 시 폴백 응답
      if (error.response) {
        // FastAPI가 응답했지만 에러 상태 코드
        this.logger.error(
          `FastAPI 에러 응답: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      } else if (error.request) {
        // 요청은 보냈지만 응답 없음
        this.logger.error('FastAPI 서버 응답 없음 (timeout or connection refused)');
      }

      throw new Error('AI 서버와 통신에 실패했습니다.');
    }
  }

  /**
   * 질환 선택
   * 
   * FastAPI의 /api/chat/select-disease 엔드포인트로 질환 선택 정보를 전송합니다.
   * 
   * @param request - 질환 선택 요청 데이터
   * @returns FastAPI 응답 (약품/병원 추천)
   */
  async selectDisease(
    request: AgentendDiseaseSelectionRequest,
  ): Promise<AgentendChatResponse> {
    try {
      this.logger.log(
        `[${request.session_id}] FastAPI 질환 선택: ${request.selected_disease_id}`,
      );

      const response = await this.axiosInstance.post<AgentendChatResponse>(
        '/api/chat/select-disease',
        request,
      );

      this.logger.log(
        `[${request.session_id}] FastAPI 추천 완료: type=${response.data.recommendation?.type}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `[${request.session_id}] FastAPI 질환 선택 실패: ${error.message}`,
        error.stack,
      );

      throw new Error('약품 추천 중 오류가 발생했습니다.');
    }
  }

  /**
   * 세션 종료
   * 
   * FastAPI의 /api/chat/close-session 엔드포인트로 세션 종료를 요청합니다.
   * Redis 메모리가 해제됩니다.
   * 
   * @param request - 세션 종료 요청 데이터
   */
  async closeSession(request: AgentendCloseSessionRequest): Promise<void> {
    try {
      this.logger.log(`[${request.session_id}] FastAPI 세션 종료 요청`);

      await this.axiosInstance.post('/api/chat/close-session', request);

      this.logger.log(`[${request.session_id}] FastAPI 세션 종료 완료`);
    } catch (error) {
      this.logger.error(
        `[${request.session_id}] FastAPI 세션 종료 실패: ${error.message}`,
        error.stack,
      );
      // 세션 종료 실패는 에러를 던지지 않음 (Redis TTL로 자동 정리됨)
    }
  }

  /**
   * FastAPI 서버 헬스 체크
   * 
   * FastAPI가 정상적으로 작동하는지 확인합니다.
   * 
   * @returns boolean - 정상 작동 시 true
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health', {
        timeout: 5000, // 5초
      });

      const isHealthy =
        response.data.status === 'ok' &&
        response.data.database === true &&
        response.data.redis === true;

      if (isHealthy) {
        this.logger.log('FastAPI 서버 정상 작동');
      } else {
        this.logger.warn('FastAPI 서버 일부 서비스 오류');
      }

      return isHealthy;
    } catch (error) {
      this.logger.error('FastAPI 서버 헬스 체크 실패');
      return false;
    }
  }
}

