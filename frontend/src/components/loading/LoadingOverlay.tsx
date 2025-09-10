/**
 * 전체 화면 로딩 오버레이 컴포넌트
 * 
 * === 동작 원리 ===
 * 1. fixed position으로 전체 화면을 덮는 오버레이 생성
 * 2. 반투명 배경 + backdrop-blur로 현재 화면을 흐리게 처리
 * 3. 중앙에 HeartLoader 하트 애니메이션 표시
 * 4. 로딩 메시지와 점 애니메이션으로 시각적 피드백 제공
 * 
 * === 디자인 특징 ===
 * - 다크 테마 (#311432 색상 기반)
 * - 글라스모피즘 효과 (backdrop-blur)
 * - 하트 모양 물 차오르기 애니메이션
 * - 모바일 친화적 반응형 디자인
 * 
 * === Props ===
 * - isLoading: 로딩 표시 여부
 * - message: 로딩 메시지
 * - size: 하트 크기 (기본값: large)
 * - blur: 배경 흐림 효과 여부 (기본값: true)
 */

'use client';

import React from 'react';
import HeartLoader from './HeartLoader';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  blur?: boolean;
}

export default function LoadingOverlay({
  isLoading,
  message = '처리 중입니다...',
  size = 'large',
  blur = true
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className={`absolute inset-0 transition-all duration-300 ${
          blur ? 'backdrop-blur-md' : ''
        }`}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      />
      
      {/* 로딩 콘텐츠 - 흰 배경 제거 */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* 하트 로더 - 크기 증가 */}
        <div className="flex justify-center">
          <HeartLoader size="xl" color="#dc2626" />
        </div>
        
        {/* 로딩 메시지 */}
        <div className="text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-white drop-shadow-lg">
            야메 처방
          </h3>
          <p className="text-base sm:text-lg text-white/80 drop-shadow-md">
            {message}
          </p>
        </div>
        
        {/* 점 애니메이션 */}
        <div className="flex justify-center items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full animate-pulse bg-red-400"
            style={{ 
              animationDelay: '0s',
              animationDuration: '1.5s'
            }}
          />
          <div 
            className="w-3 h-3 rounded-full animate-pulse bg-red-400"
            style={{ 
              animationDelay: '0.3s',
              animationDuration: '1.5s'
            }}
          />
          <div 
            className="w-3 h-3 rounded-full animate-pulse bg-red-400"
            style={{ 
              animationDelay: '0.6s',
              animationDuration: '1.5s'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
