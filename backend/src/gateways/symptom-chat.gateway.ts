/**
 * 증상 분석 챗봇 WebSocket Gateway
 * 
 * 프론트엔드와 WebSocket 연결을 관리하고, FastAPI (agentend)와 통신합니다.
 * 
 * 사용 이유:
 * - 실시간 양방향 통신 (채팅에 적합)
 * - 클라이언트 연결 상태 관리
 * - 세션별 독립적인 채팅 룸 생성
 * 
 * Socket.IO를 사용하는 이유:
 * - WebSocket 연결 실패 시 폴링으로 자동 전환
 * - 재연결 자동 처리
 * - 브라우저 호환성 우수
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AgentendService } from '../services/agentend.service';

/**
 * WebSocket Gateway 설정
 * 
 * cors: 프론트엔드(localhost:3000)에서 접근 허용
 * namespace: '/chat' 네임스페이스 사용
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
  namespace: '/chat',
})
export class SymptomChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SymptomChatGateway.name);

  // 연결된 클라이언트 추적 (세션 ID -> Socket ID 매핑)
  private readonly connectedClients = new Map<string, string>();

  constructor(private readonly agentendService: AgentendService) {}

  /**
   * 클라이언트 연결 시 호출
   * 
   * 연결된 클라이언트를 추적하여 세션별 메시지 전송을 가능하게 합니다.
   * 
   * @param client - Socket.IO 클라이언트 객체
   */
  handleConnection(client: Socket) {
    this.logger.log(`클라이언트 연결: ${client.id}`);
    
    // 쿼리 파라미터에서 세션 ID 추출
    const sessionId = client.handshake.query.sessionId as string;
    
    if (sessionId) {
      this.connectedClients.set(sessionId, client.id);
      this.logger.log(`세션 매핑: ${sessionId} -> ${client.id}`);
      
      // 클라이언트에게 연결 성공 알림
      client.emit('connected', {
        message: '챗봇에 연결되었습니다.',
        sessionId,
      });
    } else {
      this.logger.warn(`세션 ID 없이 연결 시도: ${client.id}`);
    }
  }

  /**
   * 클라이언트 연결 해제 시 호출
   * 
   * 연결이 끊긴 클라이언트를 추적 목록에서 제거합니다.
   * (Redis의 세션 데이터는 유지되어 재연결 시 복구 가능)
   * 
   * @param client - Socket.IO 클라이언트 객체
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`클라이언트 연결 해제: ${client.id}`);
    
    // 세션 매핑 제거
    for (const [sessionId, socketId] of this.connectedClients.entries()) {
      if (socketId === client.id) {
        this.connectedClients.delete(sessionId);
        this.logger.log(`세션 매핑 제거: ${sessionId}`);
        break;
      }
    }
  }

  /**
   * 'send_message' 이벤트 핸들러
   * 
   * 클라이언트가 메시지를 보내면:
   * 1. FastAPI (agentend)로 전달
   * 2. 응답을 클라이언트에게 전송
   * 
   * @param client - Socket.IO 클라이언트
   * @param payload - 메시지 데이터
   */
  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      sessionId: string;
      message: string;
      location?: { latitude: number; longitude: number };
    },
  ) {
    try {
      this.logger.log(
        `[${payload.sessionId}] 메시지 수신: ${payload.message.substring(0, 50)}...`,
      );

      // 클라이언트에게 "입력 중..." 표시
      client.emit('bot_typing', { sessionId: payload.sessionId });

      // FastAPI (agentend)로 메시지 전달 (나이/임신 정보는 제외, 필요 시 챗봇이 물어봄)
      const response = await this.agentendService.sendMessage({
        session_id: payload.sessionId,
        message: payload.message,
        location: payload.location,
      });

      this.logger.log(
        `[${payload.sessionId}] 응답 수신: type=${response.message_type}`,
      );

      // 클라이언트에게 응답 전송
      client.emit('bot_message', {
        sessionId: payload.sessionId,
        message: response.message,
        messageType: response.message_type,
        diseaseOptions: response.disease_options,
        recommendation: response.recommendation,
        timestamp: response.timestamp,
      });
    } catch (error) {
      this.logger.error(
        `[${payload.sessionId}] 메시지 처리 실패: ${error.message}`,
        error.stack,
      );

      // 에러 메시지 전송
      client.emit('bot_error', {
        sessionId: payload.sessionId,
        message: '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  }

  /**
   * 'select_disease' 이벤트 핸들러
   * 
   * 사용자가 질환을 선택하면:
   * 1. FastAPI (agentend)로 선택 정보 전달
   * 2. 약품/병원 추천 결과를 클라이언트에게 전송
   * 
   * @param client - Socket.IO 클라이언트
   * @param payload - 질환 선택 데이터
   */
  @SubscribeMessage('select_disease')
  async handleDiseaseSelection(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      sessionId: string;
      selectedDiseaseId: string;
    },
  ) {
    try {
      this.logger.log(
        `[${payload.sessionId}] 질환 선택: ${payload.selectedDiseaseId}`,
      );

      // 클라이언트에게 "분석 중..." 표시
      client.emit('bot_typing', { sessionId: payload.sessionId });

      // FastAPI (agentend)로 질환 선택 정보 전달
      const response = await this.agentendService.selectDisease({
        session_id: payload.sessionId,
        selected_disease_id: payload.selectedDiseaseId,
      });

      this.logger.log(
        `[${payload.sessionId}] 추천 완료: type=${response.recommendation?.type}`,
      );

      // 클라이언트에게 추천 결과 전송
      client.emit('bot_message', {
        sessionId: payload.sessionId,
        message: response.message,
        messageType: response.message_type,
        recommendation: response.recommendation,
        timestamp: response.timestamp,
      });
    } catch (error) {
      this.logger.error(
        `[${payload.sessionId}] 질환 선택 처리 실패: ${error.message}`,
        error.stack,
      );

      // 에러 메시지 전송
      client.emit('bot_error', {
        sessionId: payload.sessionId,
        message: '추천 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  }

  /**
   * 'close_session' 이벤트 핸들러
   * 
   * 사용자가 채팅을 종료하면:
   * 1. FastAPI (agentend)에 세션 종료 요청
   * 2. Redis 메모리 해제
   * 3. 클라이언트 연결 종료
   * 
   * @param client - Socket.IO 클라이언트
   * @param payload - 세션 종료 데이터
   */
  @SubscribeMessage('close_session')
  async handleCloseSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    try {
      this.logger.log(`[${payload.sessionId}] 세션 종료 요청`);

      // FastAPI (agentend)에 세션 종료 요청 (Redis 메모리 해제)
      await this.agentendService.closeSession({
        session_id: payload.sessionId,
      });

      this.logger.log(`[${payload.sessionId}] 세션 종료 완료`);

      // 클라이언트에게 종료 확인 전송
      client.emit('session_closed', {
        sessionId: payload.sessionId,
        message: '채팅이 종료되었습니다. 감사합니다!',
      });

      // 연결 매핑 제거
      this.connectedClients.delete(payload.sessionId);
    } catch (error) {
      this.logger.error(
        `[${payload.sessionId}] 세션 종료 실패: ${error.message}`,
        error.stack,
      );
    }
  }
}

