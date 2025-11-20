/**
 * WebSocket 채팅 커스텀 훅
 * 
 * Socket.IO를 사용하여 NestJS 백엔드와 실시간 통신합니다.
 * 
 * 사용 이유:
 * - 채팅 UI에서 간편하게 WebSocket 사용
 * - 연결 상태 자동 관리
 * - 메시지 히스토리 관리
 * - 재연결 자동 처리
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * 메시지 타입 정의
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  messageType?: string;
  diseaseOptions?: Array<{
    id: string;
    name: string;
    confidence: number;
    symptoms: string[];
  }>;
  recommendation?: any;
}

/**
 * 훅 옵션
 */
interface UseChatSocketOptions {
  backendUrl?: string;
  sessionId?: string;
  userAge?: number;
  isPregnant?: boolean;
  location?: { latitude: number; longitude: number };
}

/**
 * 훅 반환 타입
 */
interface UseChatSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  sendMessage: (message: string) => void;
  selectDisease: (diseaseId: string) => void;
  closeSession: () => void;
  clearMessages: () => void;
}

/**
 * WebSocket 채팅 훅
 * 
 * @param options - 훅 옵션
 * @returns 채팅 상태 및 함수들
 */
export function useChatSocket(
  options: UseChatSocketOptions = {}
): UseChatSocketReturn {
  const {
    backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    sessionId: providedSessionId,
    userAge,
    isPregnant,
    location,
  } = options;

  // 상태 관리
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Socket 참조 (재렌더링 시에도 유지)
  const socketRef = useRef<Socket | null>(null);
  
  // 세션 ID (한 번 생성되면 변경되지 않음)
  const sessionIdRef = useRef<string>(
    providedSessionId || uuidv4()
  );

  /**
   * WebSocket 연결 초기화
   */
  useEffect(() => {
    // Socket.IO 클라이언트 생성
    // - namespace: '/chat' (백엔드 Gateway와 일치)
    // - query: sessionId 전달
    const socket = io(`${backendUrl}/chat`, {
      query: {
        sessionId: sessionIdRef.current,
      },
      transports: ['websocket', 'polling'], // WebSocket 우선, 실패 시 폴링
      reconnection: true, // 자동 재연결
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // 이벤트 리스너 등록

    // 연결 성공
    socket.on('connected', (data: any) => {
      console.log('[Socket] 연결 성공:', data);
      setIsConnected(true);
    });

    // 연결 끊김
    socket.on('disconnect', (reason: string) => {
      console.log('[Socket] 연결 끊김:', reason);
      setIsConnected(false);
      setIsTyping(false);
    });

    // 챗봇 입력 중
    socket.on('bot_typing', () => {
      setIsTyping(true);
    });

    // 챗봇 메시지 수신
    socket.on('bot_message', (data: any) => {
      console.log('[Socket] 봇 메시지:', data);
      setIsTyping(false);

      // 메시지 추가
      const newMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        messageType: data.messageType,
        diseaseOptions: data.diseaseOptions,
        recommendation: data.recommendation,
      };

      setMessages((prev) => [...prev, newMessage]);
    });

    // 에러 수신
    socket.on('bot_error', (data: any) => {
      console.error('[Socket] 봇 에러:', data);
      setIsTyping(false);

      // 에러 메시지 추가
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.message || '오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
        messageType: 'error',
      };

      setMessages((prev) => [...prev, errorMessage]);
    });

    // 세션 종료 확인
    socket.on('session_closed', (data: any) => {
      console.log('[Socket] 세션 종료:', data);
      setIsConnected(false);
    });

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      socket.disconnect();
    };
  }, [backendUrl]);

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback(
    (message: string) => {
      if (!socketRef.current || !isConnected) {
        console.error('[Socket] 연결되지 않음');
        return;
      }

      // 사용자 메시지를 UI에 추가
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // 백엔드로 메시지 전송
      socketRef.current.emit('send_message', {
        sessionId: sessionIdRef.current,
        message,
        userAge,
        isPregnant,
        location,
      });

      console.log('[Socket] 메시지 전송:', message);
    },
    [isConnected, userAge, isPregnant, location]
  );

  /**
   * 질환 선택
   */
  const selectDisease = useCallback(
    (diseaseId: string) => {
      if (!socketRef.current || !isConnected) {
        console.error('[Socket] 연결되지 않음');
        return;
      }

      // 선택 메시지를 UI에 추가 (선택사항)
      const selectionMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: `질환 선택: ${diseaseId}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, selectionMessage]);

      // 백엔드로 선택 정보 전송
      socketRef.current.emit('select_disease', {
        sessionId: sessionIdRef.current,
        selectedDiseaseId: diseaseId,
      });

      console.log('[Socket] 질환 선택:', diseaseId);
    },
    [isConnected]
  );

  /**
   * 세션 종료
   */
  const closeSession = useCallback(() => {
    if (!socketRef.current) {
      return;
    }

    // 백엔드로 세션 종료 요청
    socketRef.current.emit('close_session', {
      sessionId: sessionIdRef.current,
    });

    console.log('[Socket] 세션 종료 요청');
  }, []);

  /**
   * 메시지 기록 초기화
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    isTyping,
    sendMessage,
    selectDisease,
    closeSession,
    clearMessages,
  };
}

