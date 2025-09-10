/**
 * 하트 모양 로딩 애니메이션 컴포넌트
 * 
 * === 동작 원리 ===
 * 1. SVG clipPath를 사용하여 하트 모양으로 마스킹
 * 2. 베이스 rect가 아래에서 위로 차오르며 하트를 채움
 * 3. 3층 물결 path가 서로 다른 타이밍으로 찰랑거림
 * 4. 붉은 그라데이션으로 깊이감과 생동감 표현
 * 
 * === 애니메이션 구조 ===
 * - heartFill: 전체적인 차오름/빠짐 (4초 주기)
 * - waveFloat: 개별 물결의 찰랑거림 (2.5초 주기, 각각 다른 딜레이)
 * 
 * === 시각적 효과 ===
 * - 하트 외곽선: 반투명 붉은 테두리 (strokeWidth: 1.5px)
 * - 베이스 채움: 붉은 그라데이션 (#ef4444 → #dc2626 → #b91c1c)
 * - 3층 물결: 투명도가 다른 3개 레이어로 입체감 구현
 * - 그림자 효과: drop-shadow로 하트가 떠있는 느낌
 * 
 * === 크기 옵션 ===
 * - small: 64x64px (w-16 h-16)
 * - medium: 96x96px (w-24 h-24) 
 * - large: 128x128px (w-32 h-32)
 * - xl: 160x160px (w-40 h-40)
 * 
 * === 커스터마이징 ===
 * - color: 기본 색상 변경 (기본값: #dc2626)
 * - size: 크기 선택
 * - className: 추가 CSS 클래스
 */

'use client';

import React from 'react';

interface HeartLoaderProps {
  size?: 'small' | 'medium' | 'large' | 'xl';
  color?: string;
  className?: string;
}

export default function HeartLoader({
  size = 'medium',
  color = '#dc2626',
  className = ''
}: HeartLoaderProps) {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  const heartPath = "M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5 C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z";
  
  // 고유한 ID 생성
  const uniqueId = Math.random().toString(36).substr(2, 9);

  return (
    <div className={`relative inline-block ${sizeClasses[size]} ${className}`}>
      {/* 
        === 하트 외곽선 레이어 ===
        - 하트의 테두리만 그리는 SVG
        - drop-shadow로 하트가 떠있는 듯한 효과
        - 반투명으로 설정하여 내부 애니메이션이 돋보이도록 함
      */}
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 w-full h-full"
        style={{ filter: 'drop-shadow(0 3px 12px rgba(220, 38, 38, 0.3))' }}
      >
        <path
          d={heartPath}
          fill="none"
          stroke="#dc2626"
          strokeWidth="1.5"
          className="opacity-50"
        />
      </svg>

      {/* 
        === 채워지는 하트 레이어 ===
        - 실제 애니메이션이 일어나는 SVG
        - clipPath로 하트 모양만 보이도록 마스킹
        - 베이스 채움 + 물결 효과로 구성
      */}
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* 물결 모양 마스크 */}
          <clipPath id={`heartClip-${uniqueId}`}>
            <path d={heartPath} />
          </clipPath>
          
          {/* 붉은 그라데이션 */}
          <linearGradient id={`heartGradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>

        {/* 채워지는 영역 */}
        <g clipPath={`url(#heartClip-${uniqueId})`}>
          {/* 베이스 채움 */}
          <rect
            x="0"
            y="0"
            width="24"
            height="24"
            fill={`url(#heartGradient-${uniqueId})`}
            className="heart-base-fill"
          />
          
          {/* 물결 효과 */}
          <g className="waves-container">
            <path
              d="M-5,20 Q6,17 12,20 T29,20 L29,30 L-5,30 Z"
              fill="#ef4444"
              opacity="0.8"
              className="wave-1"
            />
            <path
              d="M-5,20.5 Q8,18 14,20.5 T29,20.5 L29,30 L-5,30 Z"
              fill="#f87171"
              opacity="0.6"
              className="wave-2"
            />
            <path
              d="M-5,21 Q4,19 10,21 T29,21 L29,30 L-5,30 Z"
              fill="#fca5a5"
              opacity="0.4"
              className="wave-3"
            />
          </g>
        </g>
      </svg>

      <style jsx>{`
        /* 
          === 메인 차오름 애니메이션 ===
          베이스 채움과 물결 컨테이너가 동시에 아래에서 위로 차오름
          4초 주기로 100% → -5% → 100% 움직임 (완전히 가득 찰 때까지)
        */
        :global(.heart-base-fill) {
          animation: heartFill 4s ease-in-out infinite;
        }
        
        :global(.waves-container) {
          animation: heartFill 4s ease-in-out infinite;
        }
        
        /* 
          === 물결 찰랑거림 애니메이션 ===
          각 물결이 서로 다른 타이밍(0s, 0.4s, 0.8s)으로 미세하게 움직임
          2.5초 주기로 좌우 및 상하로 작은 움직임을 만들어 자연스러운 물결 효과
        */
        :global(.wave-1) {
          animation: waveFloat 2.5s ease-in-out infinite;
        }
        
        :global(.wave-2) {
          animation: waveFloat 2.5s ease-in-out infinite 0.4s;
        }
        
        :global(.wave-3) {
          animation: waveFloat 2.5s ease-in-out infinite 0.8s;
        }

        /* 
          메인 차오름 애니메이션 키프레임
          - 0%: 완전히 아래 (보이지 않음)
          - 50%: 하트 위쪽까지 가득 참 (최대 채움)
          - 100%: 다시 완전히 아래로 빠짐
        */
        @keyframes heartFill {
          0% {
            transform: translateY(100%);
          }
          50% {
            transform: translateY(-5%);
          }
          100% {
            transform: translateY(100%);
          }
        }

        /* 
          물결 찰랑거림 키프레임
          - 좌우로 -2px ~ 2px 미세한 움직임
          - 상하로 -1.5px ~ 0px 미세한 움직임
          - 25%, 50%, 75%에서 서로 다른 방향으로 움직여 자연스러운 물결 효과
        */
        @keyframes waveFloat {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-1px) translateX(2px);
          }
          50% {
            transform: translateY(-0.5px) translateX(-2px);
          }
          75% {
            transform: translateY(-1.5px) translateX(1px);
          }
        }
      `}</style>
    </div>
  );
}
