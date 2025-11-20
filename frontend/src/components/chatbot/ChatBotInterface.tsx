/**
 * 챗봇 인터페이스 컴포넌트
 * 
 * WebSocket 기반 대화형 증상 분석 챗봇 UI를 제공합니다.
 * 
 * 주요 기능:
 * - 실시간 채팅 UI
 * - 질환 선택 버튼
 * - 약품/병원 추천 결과 표시
 * - 자동 스크롤
 * - 로딩 상태 표시
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  XMarkIcon,
  SparklesIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { useChatSocket, ChatMessage } from '../../hooks/useChatSocket';

/**
 * Props 인터페이스
 */
interface ChatBotInterfaceProps {
  userAge?: number;
  isPregnant?: boolean;
  location?: { latitude: number; longitude: number };
  onClose?: () => void;
}

/**
 * 챗봇 인터페이스 컴포넌트
 */
export default function ChatBotInterface({
  userAge,
  isPregnant,
  location,
  onClose,
}: ChatBotInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket 훅 사용
  const {
    messages,
    isConnected,
    isTyping,
    sendMessage,
    selectDisease,
    closeSession,
  } = useChatSocket({
    userAge,
    isPregnant,
    location,
  });

  /**
   * 자동 스크롤 (새 메시지 시)
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /**
   * 메시지 전송 핸들러
   */
  const handleSendMessage = () => {
    if (!inputMessage.trim()) {
      return;
    }

    if (!isConnected) {
      toast.error('채팅 서버에 연결되지 않았습니다.');
      return;
    }

    sendMessage(inputMessage);
    setInputMessage('');
  };

  /**
   * Enter 키 전송
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * 질환 선택 핸들러
   */
  const handleSelectDisease = (diseaseId: string) => {
    selectDisease(diseaseId);
  };

  /**
   * 채팅 종료 핸들러
   */
  const handleClose = () => {
    closeSession();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-indigo-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">야메 AI 어시스턴트</h2>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600">온라인</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-xs text-gray-600">연결 중...</span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="채팅 종료"
        >
          <XMarkIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <SparklesIcon className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              안녕하세요! 야메 AI입니다
            </h3>
            <p className="text-gray-500">
              증상을 자유롭게 말씀해주세요.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSelectDisease={handleSelectDisease}
          />
        ))}

        {/* 입력 중 표시 */}
        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-t border-indigo-100">
        <div className="flex items-end space-x-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="증상을 입력하세요..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 메시지 버블 컴포넌트
 */
function MessageBubble({
  message,
  onSelectDisease,
}: {
  message: ChatMessage;
  onSelectDisease: (id: string) => void;
}) {
  const isUser = message.role === 'user';
  const isError = message.messageType === 'error';

  return (
    <div
      className={`flex items-start space-x-3 ${
        isUser ? 'flex-row-reverse space-x-reverse' : ''
      }`}
    >
      {/* 아바타 */}
      {!isUser && (
        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        {/* 메시지 내용 */}
        <div
          className={`rounded-2xl px-4 py-3 max-w-md ${
            isUser
              ? 'bg-indigo-600 text-white'
              : isError
              ? 'bg-red-100 text-red-900 border border-red-200'
              : 'bg-white text-gray-900 shadow-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* 질환 선택 버튼 */}
          {message.diseaseOptions && message.diseaseOptions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">해당하는 질환을 선택하세요:</p>
              {message.diseaseOptions.map((disease) => (
                <button
                  key={disease.id}
                  onClick={() => onSelectDisease(disease.id)}
                  className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-indigo-900">
                      {disease.name}
                    </span>
                    <span className="text-sm text-indigo-600">
                      {(disease.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {disease.symptoms && disease.symptoms.length > 0 && (
                    <div className="mt-1 text-xs text-indigo-700">
                      증상: {disease.symptoms.join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* 추천 결과 */}
          {message.recommendation && (
            <RecommendationCard recommendation={message.recommendation} />
          )}
        </div>

        {/* 타임스탬프 */}
        <div className={`mt-1 text-xs text-gray-500 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 추천 결과 카드 컴포넌트
 */
function RecommendationCard({ recommendation }: { recommendation: any }) {
  if (recommendation.type === 'PHARMACY') {
    return (
      <div className="mt-4 space-y-3">
        {/* 약품 목록 */}
        {recommendation.drugs && recommendation.drugs.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">💊 추천 약품</p>
            {recommendation.drugs.map((drug: any, index: number) => (
              <div
                key={index}
                className="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <p className="font-medium text-blue-900">{drug.item_name || drug.itemName}</p>
                <p className="text-xs text-blue-700 mt-1">
                  {drug.entp_name || drug.entpName}
                </p>
                {drug.recommendation_reason && (
                  <p className="text-xs text-blue-600 mt-1">
                    {drug.recommendation_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 주변 약국 */}
        {recommendation.facilities && recommendation.facilities.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">🏥 가까운 약국</p>
            {recommendation.facilities.slice(0, 3).map((facility: any, index: number) => (
              <div
                key={index}
                className="mb-2 p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-green-900">{facility.name}</p>
                    <p className="text-xs text-green-700 mt-1">{facility.address}</p>
                    {facility.phone && (
                      <p className="text-xs text-green-600 mt-1">☎ {facility.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-green-600">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    {facility.distance_km?.toFixed(1)}km
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 병원 추천
  if (recommendation.type === 'HOSPITAL') {
    return (
      <div className="mt-4 space-y-3">
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm font-semibold text-red-900">
            ⚠️ 병원 방문을 권장합니다
          </p>
          <p className="text-xs text-red-700 mt-1">
            심각도: {recommendation.severity_score}/10
          </p>
        </div>

        {/* 주변 병원 */}
        {recommendation.facilities && recommendation.facilities.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">🏥 가까운 병원</p>
            {recommendation.facilities.slice(0, 3).map((facility: any, index: number) => (
              <div
                key={index}
                className="mb-2 p-3 bg-orange-50 rounded-lg border border-orange-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-orange-900">{facility.name}</p>
                    <p className="text-xs text-orange-700 mt-1">{facility.address}</p>
                    {facility.phone && (
                      <p className="text-xs text-orange-600 mt-1">☎ {facility.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-orange-600">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    {facility.distance_km?.toFixed(1)}km
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

