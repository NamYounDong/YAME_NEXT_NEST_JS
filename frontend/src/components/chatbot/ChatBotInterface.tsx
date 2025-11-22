/**
 * 챗봇 인터페이스 컴포넌트
 * 
 * WebSocket 기반 대화형 증상 분석 챗봇 UI를 제공합니다.
 * 메인 화면과 관리자 대시보드의 다크 테마 디자인을 적용했습니다.
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
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  MapPinIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useChatSocket, ChatMessage } from '../../hooks/useChatSocket';

/**
 * Props 인터페이스
 */
interface ChatBotInterfaceProps {
  location?: { latitude: number; longitude: number };
}

/**
 * 챗봇 인터페이스 컴포넌트
 */
export default function ChatBotInterface({
  location,
}: ChatBotInterfaceProps) {
  const router = useRouter();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket 훅 사용
  const {
    messages,
    isConnected,
    isTyping,
    sendMessage,
    selectDisease,
    closeSession,
  } = useChatSocket({
    location,
  });

  /**
   * 자동 스크롤 (새 메시지 시)
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /**
   * Recommendation 받으면 결과 페이지로 이동
   */
  useEffect(() => {
    // 마지막 메시지 확인
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.recommendation) {
      // 선택한 질환 찾기 (disease_options가 있던 메시지 중 마지막)
      const diseaseOptionsMessage = messages
        .slice()
        .reverse()
        .find((msg) => msg.diseaseOptions && msg.diseaseOptions.length > 0);
      
      if (diseaseOptionsMessage && diseaseOptionsMessage.diseaseOptions) {
        // 결과 데이터 준비
        const resultData = {
          selectedDisease: diseaseOptionsMessage.diseaseOptions.find(
            (d: any) => lastMessage.recommendation.disease === d.name
          ) || diseaseOptionsMessage.diseaseOptions[0],
          recommendation: lastMessage.recommendation,
        };

        // sessionStorage에 저장
        sessionStorage.setItem('symptom_result', JSON.stringify(resultData));

        // 소켓 종료 및 세션 정리
        closeSession();

        // 결과 페이지로 이동 (약간의 딜레이 후)
        setTimeout(() => {
          router.push('/symptom-chat/result');
        }, 500);
      }
    }
  }, [messages, router, closeSession]);

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

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900/50 via-black/50 to-purple-900/50">
      {/* 메시지 영역 - 스크롤 가능 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
      >
        {/* 메시지가 없을 때 - 중앙 정렬 */}
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
                <SparklesIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                안녕하세요! 야메 AI입니다
              </h3>
              <p className="text-white/60">
                어떤 증상이 있으신가요? 편하게 말씀해주세요.
              </p>
            </div>
          </div>
        ) : (
          /* 메시지가 있을 때 - 스크롤 가능한 메시지 리스트 */
          <div className="space-y-4 max-w-5xl mx-auto pb-4">
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
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 입력 영역 - 하단 고정 (bottom: 0) */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 bg-white/5 backdrop-blur-md border-t border-white/10">
        <div className="max-w-5xl mx-auto flex items-end space-x-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="증상을 입력하세요..."
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none backdrop-blur-sm max-h-32"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="flex-shrink-0 p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
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
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* 타임스탬프 - 메시지 위 (오른쪽 정렬) */}
        {isUser && (
          <div className="text-xs text-white/40 mb-1">
            {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </div>
        )}
        
        {/* 메시지 내용 */}
        <div
          className={`rounded-2xl px-4 py-3 max-w-2xl ${
            isUser
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
              : isError
              ? 'bg-red-500/20 text-red-200 border border-red-500/30 backdrop-blur-sm'
              : 'bg-white/10 text-white border border-white/20 backdrop-blur-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* 질환 선택 버튼 - 버튼 형태로 표시 */}
          {message.diseaseOptions && message.diseaseOptions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-purple-200 mb-3">
                해당하는 질환을 선택하세요:
              </p>
              <div className="space-y-2">
                {message.diseaseOptions.map((disease) => (
                  <button
                    key={disease.id}
                    onClick={() => onSelectDisease(disease.id)}
                    className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 rounded-xl transition-all border border-purple-400/30 backdrop-blur-sm transform hover:scale-[1.02]"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white text-base">
                        {disease.name}
                      </span>
                      <span className="text-sm font-medium px-2 py-1 bg-purple-500/30 rounded-lg text-purple-200">
                        {(disease.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {disease.symptoms && disease.symptoms.length > 0 && (
                      <div className="mt-2 text-xs text-white/70">
                        관련 증상: {disease.symptoms.join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/50 mt-3">
                💡 가장 가까운 증상을 선택하거나, 추가 증상이 있으면 말씀해주세요.
              </p>
            </div>
          )}

          {/* 추천 결과 */}
          {message.recommendation && (
            <RecommendationCard recommendation={message.recommendation} />
          )}
        </div>

        {/* 타임스탬프 - 봇 메시지는 메시지 아래 */}
        {!isUser && (
          <div className="mt-1 text-xs text-white/40">
            {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </div>
        )}
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
            <p className="text-sm font-semibold mb-2 flex items-center text-blue-200">
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              추천 약품
            </p>
            {recommendation.drugs.map((drug: any, index: number) => (
              <div
                key={index}
                className="mb-2 p-3 bg-blue-500/20 rounded-xl border border-blue-400/30 backdrop-blur-sm"
              >
                <p className="font-medium text-blue-200">{drug.item_name || drug.itemName}</p>
                <p className="text-xs text-blue-300 mt-1">
                  {drug.entp_name || drug.entpName}
                </p>
                {drug.recommendation_reason && (
                  <p className="text-xs text-blue-200 mt-1">
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
            <p className="text-sm font-semibold mb-2 text-green-200">🏥 가까운 약국</p>
            {recommendation.facilities.slice(0, 3).map((facility: any, index: number) => (
              <div
                key={index}
                className="mb-2 p-3 bg-green-500/20 rounded-xl border border-green-400/30 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-green-200">{facility.name}</p>
                    <p className="text-xs text-green-300 mt-1">{facility.address}</p>
                    {facility.phone && (
                      <p className="text-xs text-green-200 mt-1">☎ {facility.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-green-200 flex-shrink-0 ml-2">
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
        <div className="p-3 bg-red-500/20 rounded-xl border border-red-400/30 backdrop-blur-sm">
          <p className="text-sm font-semibold text-red-200">
            ⚠️ 병원 방문을 권장합니다
          </p>
          <p className="text-xs text-red-300 mt-1">
            심각도: {recommendation.severity_score}/10
          </p>
        </div>

        {/* 주변 병원 */}
        {recommendation.facilities && recommendation.facilities.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2 text-orange-200">🏥 가까운 병원</p>
            {recommendation.facilities.slice(0, 3).map((facility: any, index: number) => (
              <div
                key={index}
                className="mb-2 p-3 bg-orange-500/20 rounded-xl border border-orange-400/30 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-orange-200">{facility.name}</p>
                    <p className="text-xs text-orange-300 mt-1">{facility.address}</p>
                    {facility.phone && (
                      <p className="text-xs text-orange-200 mt-1">☎ {facility.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-orange-200 flex-shrink-0 ml-2">
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
