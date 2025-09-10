/**
 * 전역 로딩 상태 관리 Provider
 * 
 * === 동작 원리 ===
 * 1. React Context API를 사용하여 앱 전체에서 로딩 상태 공유
 * 2. requestCount로 중첩된 요청들을 추적 (요청이 여러 개일 때 모두 완료될 때까지 로딩 유지)
 * 3. API 유틸리티(utils/api.ts)와 연동하여 자동으로 로딩 상태 관리
 * 4. 컴포넌트에서 useLoading() 훅으로 수동 제어 가능
 * 
 * === 사용 방법 ===
 * - 자동: api.get(), api.post() 등 API 호출시 자동으로 로딩 표시
 * - 수동: const { startLoading, stopLoading } = useLoading()
 * 
 * === 주의사항 ===
 * - startLoading과 stopLoading 호출 횟수가 일치해야 함
 * - requestCount가 0이 되어야 로딩이 완전히 종료됨
 */

'use client';

import React, { createContext, useContext, useState } from 'react';
import LoadingOverlay from '../loading/LoadingOverlay';

interface LoadingContextType {
  isLoading: boolean;        // 현재 로딩 상태
  message: string;           // 로딩 메시지
  startLoading: (message?: string) => void;  // 로딩 시작
  stopLoading: () => void;   // 로딩 종료
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  // === 상태 관리 ===
  const [isLoading, setIsLoading] = useState(false);     // 로딩 표시 여부
  const [message, setMessage] = useState('로딩 중...');   // 로딩 메시지
  const [requestCount, setRequestCount] = useState(0);   // 활성 요청 수 (중첩 요청 추적용)

  /**
   * 로딩 시작 함수
   * @param loadingMessage 표시할 로딩 메시지
   * 
   * 동작 원리:
   * 1. requestCount를 1 증가 (중첩 요청 추적)
   * 2. 메시지 업데이트
   * 3. 로딩 상태를 true로 설정
   */
  const startLoading = (loadingMessage = '로딩 중...') => {
    setRequestCount(prev => prev + 1);  // 요청 수 증가
    setMessage(loadingMessage);          // 메시지 업데이트
    setIsLoading(true);                  // 로딩 표시
  };

  /**
   * 로딩 종료 함수
   * 
   * 동작 원리:
   * 1. requestCount를 1 감소
   * 2. requestCount가 0이 되면 로딩 완전 종료
   * 3. 0보다 크면 다른 요청이 아직 진행중이므로 로딩 유지
   */
  const stopLoading = () => {
    setRequestCount(prev => {
      const newCount = prev - 1;
      if (newCount <= 0) {
        setIsLoading(false);  // 모든 요청 완료시 로딩 종료
        return 0;             // 음수 방지
      }
      return newCount;        // 아직 진행중인 요청이 있으면 로딩 유지
    });
  };

  return (
    <LoadingContext.Provider value={{ isLoading, message, startLoading, stopLoading }}>
      {children}
      {isLoading && <LoadingOverlay isLoading={isLoading} message={message} />}
    </LoadingContext.Provider>
  );
};

export default LoadingProvider;