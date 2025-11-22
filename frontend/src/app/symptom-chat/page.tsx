/**
 * 증상 분석 챗봇 페이지
 * 
 * WebSocket 기반 실시간 대화형 증상 분석 페이지입니다.
 * 메인 화면의 다크 테마를 적용하여 일관된 디자인을 제공합니다.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ChatBotInterface from '../../components/chatbot/ChatBotInterface';
import { toast } from 'react-hot-toast';

export default function SymptomChatPage() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  /**
   * GPS 위치 요청 (백그라운드에서 자동 수집)
   */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('위치 정보 오류:', error);
          // 위치 정보는 선택사항이므로 에러 토스트는 표시하지 않음
        }
      );
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-black via-gray-900 to-purple-950">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>홈으로</span>
            </Link>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">
                야메 AI 진단
              </h1>
            </div>

            <div className="w-20"></div> {/* 균형을 위한 spacer */}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 남은 공간 모두 차지 */}
      <div className="flex-1 min-h-0">
        <ChatBotInterface location={userLocation || undefined} />
      </div>
    </div>
  );
}
