'use client';

import { useState } from 'react';
import {
  SparklesIcon,
  BuildingOfficeIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface DataCollectionPanelProps {
  isCollecting: string | null;
  onDataCollection: (type: 'all' | 'hospitals' | 'pharmacies' | 'dur-rules') => Promise<void>;
}

/**
 * 데이터 수집 패널 컴포넌트
 * 
 * 이 컴포넌트는 전체 데이터 수집 및 개별 데이터 수집 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 전체 데이터 수집 버튼 (메인)
 * - 개별 데이터 수집 버튼들 (토글 가능)
 * - 수집 상태에 따른 UI 반응
 * - 반응형 디자인 지원
 * 
 * @param isCollecting - 현재 수집 중인 데이터 타입
 * @param onDataCollection - 데이터 수집 실행 함수
 * 
 * @example
 * <DataCollectionPanel
 *   isCollecting={isCollecting}
 *   onDataCollection={handleDataCollection}
 * />
 */
export default function DataCollectionPanel({ 
  isCollecting, 
  onDataCollection 
}: DataCollectionPanelProps) {
  const [showIndividualButtons, setShowIndividualButtons] = useState(false);

  return (
    <div className="relative">
      {/* 데스크톱 버전 - 두 번째 이미지와 동일 */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 text-right">
          <DataCollectionButton
            type="all"
            label="전체 데이터 수집"
            icon={SparklesIcon}
            color="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            description=""
            isCollecting={isCollecting === 'all'}
            onDataCollection={onDataCollection}
          />
        </div>
        
        {/* 개별 수집 버튼 토글 컨테이너 */}
        <div className="relative">
          <button
            onClick={() => setShowIndividualButtons(!showIndividualButtons)}
            className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200"
            title="개별 수집 버튼 토글"
          >
            <EyeIcon className="w-4 h-4 text-white" />
          </button>
          
          {/* 개별 수집 버튼들을 셀렉트 박스처럼 오버레이로 표시 */}
          {showIndividualButtons && (
            <div 
              className="absolute top-full right-0 mt-2 backdrop-blur-md rounded-lg border border-white/20 p-3 space-y-2 lg:min-w-[20vw] min-w-[calc(100vw-1rem)] shadow-lg transform-gpu bg-[#0c121c]"
              style={{
                zIndex: 99999,
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem'
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <DataCollectionButton
                  type="hospitals"
                  label="병원 데이터"
                  icon={BuildingOfficeIcon}
                  color="hover:bg-blue-500/20"
                  description="HIRA 병원 정보"
                  isCollecting={isCollecting === 'hospitals'}
                  onDataCollection={onDataCollection}
                />
                <DataCollectionButton
                  type="pharmacies"
                  label="약국 데이터"
                  icon={ShoppingBagIcon}
                  color="hover:bg-green-500/20"
                  description="HIRA 약국 정보"
                  isCollecting={isCollecting === 'pharmacies'}
                  onDataCollection={onDataCollection}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <DataCollectionButton
                  type="dur-rules"
                  label="DUR 규칙"
                  icon={WrenchScrewdriverIcon}
                  color="hover:bg-yellow-500/20"
                  description="약물 상호작용 규칙"
                  isCollecting={isCollecting === 'dur-rules'}
                  onDataCollection={onDataCollection}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 데이터 수집 버튼 컴포넌트
 * 
 * 개별 데이터 수집 기능을 위한 버튼 컴포넌트입니다.
 * 
 * @param type - 수집할 데이터 타입
 * @param label - 버튼에 표시될 라벨
 * @param icon - 버튼에 표시될 아이콘
 * @param color - 버튼 색상 클래스
 * @param description - 버튼 설명
 * @param isCollecting - 현재 수집 중인지 여부
 * @param onDataCollection - 데이터 수집 실행 함수
 */
interface DataCollectionButtonProps {
  type: 'all' | 'hospitals' | 'pharmacies' | 'dur-rules';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  isCollecting: boolean;
  onDataCollection: (type: 'all' | 'hospitals' | 'pharmacies' | 'dur-rules') => Promise<void>;
}

function DataCollectionButton({
  type,
  label,
  icon: Icon,
  color,
  description,
  isCollecting,
  onDataCollection
}: DataCollectionButtonProps) {
  const handleClick = () => {
    if (!isCollecting) {
      onDataCollection(type);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isCollecting}
      className={`
        w-full p-3 rounded-lg transition-all duration-200 text-white font-medium border border-white/10
        ${color}
        ${isCollecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
        flex items-center justify-center space-x-2
      `}
      title={description}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
      {isCollecting && (
        <div className="w-4 h-4 border-t-transparent rounded-full animate-spin" />
      )}
    </button>
  );
}
