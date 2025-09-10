'use client';

import React from 'react';

interface YameLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function YameLogo({ className = '', size = 'md' }: YameLogoProps) {
  const sizeClasses = {
    sm: 'w-16 h-8',   // 64x32px
    md: 'w-24 h-12',  // 96x48px  
    lg: 'w-32 h-16',  // 128x64px
    xl: 'w-48 h-24',  // 192x96px
  };

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center space-x-2`}>
      {/* 의료 십자 아이콘 부분 */}
      <div className="relative flex-shrink-0">
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          style={{ aspectRatio: '1' }}
        >
          {/* 배경 십자가 */}
          <defs>
            <linearGradient id="yameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          
          {/* 둥근 십자가 모양 */}
          <path
            d="M20 35 L35 35 L35 20 Q35 15 40 15 L60 15 Q65 15 65 20 L65 35 L80 35 Q85 35 85 40 L85 60 Q85 65 80 65 L65 65 L65 80 Q65 85 60 85 L40 85 Q35 85 35 80 L35 65 L20 65 Q15 65 15 60 L15 40 Q15 35 20 35 Z"
            fill="url(#yameGradient)"
          />
          
          {/* 사람 실루엣 */}
          <g fill="white" fillOpacity="0.9">
            {/* 머리 */}
            <circle cx="50" cy="35" r="8" />
            {/* 몸통 */}
            <rect x="45" y="43" width="10" height="15" rx="2" />
            {/* 심전도 라인 */}
            <path
              d="M30 50 L35 50 L37 45 L39 55 L41 45 L43 50 L70 50"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
      
      {/* YAME 텍스트 */}
      <div className="flex-1">
        <div 
          className="font-black text-gray-800 dark:text-white tracking-tight"
          style={{ 
            fontSize: size === 'sm' ? '1.5rem' : 
                     size === 'md' ? '2rem' : 
                     size === 'lg' ? '2.5rem' : '3rem',
            lineHeight: '1'
          }}
        >
          YAME
        </div>
      </div>
    </div>
  );
}

// 아이콘만 필요한 경우를 위한 별도 컴포넌트
export function YameIcon({ className = '', size = 'md' }: YameLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
      >
        {/* 배경 십자가 */}
        <defs>
          <linearGradient id="yameIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        
        {/* 둥근 십자가 모양 */}
        <path
          d="M20 35 L35 35 L35 20 Q35 15 40 15 L60 15 Q65 15 65 20 L65 35 L80 35 Q85 35 85 40 L85 60 Q85 65 80 65 L65 65 L65 80 Q65 85 60 85 L40 85 Q35 85 35 80 L35 65 L20 65 Q15 65 15 60 L15 40 Q15 35 20 35 Z"
          fill="url(#yameIconGradient)"
        />
        
        {/* 사람 실루엣 */}
        <g fill="white" fillOpacity="0.9">
          {/* 머리 */}
          <circle cx="50" cy="35" r="8" />
          {/* 몸통 */}
          <rect x="45" y="43" width="10" height="15" rx="2" />
          {/* 심전도 라인 */}
          <path
            d="M30 50 L35 50 L37 45 L39 55 L41 45 L43 50 L70 50"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
