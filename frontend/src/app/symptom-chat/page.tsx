/**
 * 증상 분석 챗봇 페이지
 * 
 * WebSocket 기반 실시간 대화형 증상 분석 페이지입니다.
 * 기존 폼 기반 입력 방식을 대체합니다.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, MapPinIcon } from '@heroicons/react/24/outline';
import ChatBotInterface from '../../components/chatbot/ChatBotInterface';
import { toast } from 'react-hot-toast';

export default function SymptomChatPage() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [userAge, setUserAge] = useState<number | undefined>();
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(true);

  /**
   * GPS 위치 요청
   */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('위치 정보를 가져왔습니다');
        },
        (error) => {
          console.error('위치 정보 오류:', error);
          toast.error('위치 정보를 가져올 수 없습니다');
        }
      );
    }
  }, []);

  /**
   * 채팅 시작 핸들러
   */
  const handleStartChat = () => {
    if (!userAge) {
      toast.error('나이를 입력해주세요');
      return;
    }
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>홈으로</span>
            </Link>

            <h1 className="text-xl font-bold text-gray-900">
              야메 AI 진단
            </h1>

            <div className="w-20"></div> {/* 균형을 위한 spacer */}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSettings ? (
          /* 설정 화면 */
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              시작하기 전에
            </h2>

            <div className="space-y-6">
              {/* 나이 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  나이 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={userAge || ''}
                  onChange={(e) => setUserAge(parseInt(e.target.value))}
                  placeholder="예: 35"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="0"
                  max="150"
                />
                <p className="mt-1 text-xs text-gray-500">
                  나이에 따라 적합한 약품을 추천합니다
                </p>
              </div>

              {/* 임신 여부 */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    임신 중입니다
                  </span>
                </label>
                <p className="mt-1 ml-8 text-xs text-gray-500">
                  임신부 금기 약품을 제외합니다
                </p>
              </div>

              {/* 위치 정보 */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <MapPinIcon className="w-5 h-5 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">
                    위치 정보
                  </label>
                </div>
                {userLocation ? (
                  <div className="text-sm text-green-600">
                    ✓ 위치 정보가 수집되었습니다
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    위치 정보를 수집 중입니다...
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  주변 약국/병원을 찾는데 사용됩니다
                </p>
              </div>

              {/* 시작 버튼 */}
              <button
                onClick={handleStartChat}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                채팅 시작하기
              </button>
            </div>
          </div>
        ) : (
          /* 챗봇 화면 */
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[calc(100vh-12rem)]">
            <ChatBotInterface
              userAge={userAge}
              isPregnant={isPregnant}
              location={userLocation || undefined}
              onClose={() => setShowSettings(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

