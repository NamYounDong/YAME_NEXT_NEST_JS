'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  MapPinIcon, 
  HeartIcon, 
  SparklesIcon, 
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  PaperAirplaneIcon 
} from '@heroicons/react/24/outline';
import VWorldMap from '../../components/map/VWorldMap';
import { SymptomInputForm } from '../../components/symptom/SymptomInputForm';
import AnalysisResult from '../../components/symptom/AnalysisResult';
import { SymptomAnalysisResult } from '../../types/symptom';

type PageState = 'input' | 'analyzing' | 'result' | 'map';

export default function SymptomAnalysis() {
  const [pageState, setPageState] = useState<PageState>('input');
  const [analysisResult, setAnalysisResult] = useState<SymptomAnalysisResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // 위치 정보 요청
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('위치 정보를 가져올 수 없습니다:', error);
        }
      );
    }
  }, []);

  const handleAnalysisComplete = (result: SymptomAnalysisResult) => {
    setAnalysisResult(result);
    setPageState('result');
  };

  const handleGoBack = () => {
    if (pageState === 'result' || pageState === 'map') {
      setPageState('input');
    }
  };

  const handleShowMap = () => {
    setPageState('map');
  };

  const renderHeader = () => (
    <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {pageState !== 'input' && (
              <button
                onClick={handleGoBack}
                className="p-2 transition duration-200 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                title="뒤로가기"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  야메 진단
                </h1>
                <p className="text-xs sm:text-sm text-white/60 hidden sm:block">
                  AI 기반 익명 건강 진단 시스템
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {pageState === 'result' && analysisResult && (
              <button
                onClick={handleShowMap}
                className="p-2 transition duration-200 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                title="주변 병원/약국 보기"
              >
                <MapPinIcon className="w-5 h-5" />
              </button>
            )}
            <Link
              href="/"
              className="p-2 transition duration-200 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              title="홈으로"
            >
              <HeartIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInputPage = () => (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* 메인 컨텐츠 */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* 페이지 제목 */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              어떤 증상이 있으신가요?
            </h2>
            <p className="text-white/60 text-sm sm:text-base">
              YAME 약사가 간단한 처방을 안내해드립니다
            </p>
          </div>

          {/* 증상 입력 폼 */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <SymptomInputForm
              onAnalysisComplete={handleAnalysisComplete}
              onAnalysisStart={() => setPageState('analyzing')}
              userLocation={userLocation}
            />
          </div>

          {/* 도움말 */}
          <div className="mt-6 bg-blue-500/10 backdrop-blur-md rounded-xl p-4 border border-blue-400/20">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-blue-300 font-medium text-sm mb-1">도움말</h4>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  증상을 자세히 설명해주세요. 언제부터, 어떤 상황에서, 어떤 느낌인지 구체적으로 적어주시면 더 정확한 분석이 가능합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 사이드바 (데스크톱에서만) */}
      <div className="hidden lg:block lg:w-80 bg-black/10 backdrop-blur-md border-l border-white/10">
        <div className="p-6">
          <h3 className="text-white font-semibold text-lg mb-4">서비스 안내</h3>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h4 className="text-white font-medium text-sm">AI 분석</h4>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">
                머신러닝 기반으로 증상을 분석하여 의료 조치를 추천합니다.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <MapPinIcon className="w-4 h-4 text-green-400" />
                </div>
                <h4 className="text-white font-medium text-sm">위치 기반 추천</h4>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">
                주변 병원과 약국을 실시간으로 찾아 최적의 경로를 안내합니다.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="text-white font-medium text-sm">실시간 정보</h4>
              </div>
              <p className="text-white/60 text-xs leading-relaxed">
                응급실 대기시간, 진료 가능 여부 등 실시간 정보를 제공합니다.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-400/20">
            <h4 className="text-amber-300 font-medium text-sm mb-2">주의사항</h4>
            <p className="text-amber-200/80 text-xs leading-relaxed">
              이 서비스는 참고용이며, 응급상황이나 심각한 증상의 경우 즉시 119에 신고하거나 응급실로 가시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyzingPage = () => (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse">
          <SparklesIcon className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">AI가 증상을 분석하고 있습니다</h2>
        <p className="text-white/60 text-sm">잠시만 기다려주세요...</p>
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResultPage = () => (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {analysisResult && (
          <AnalysisResult 
            result={analysisResult} 
            onShowMap={handleShowMap}
          />
        )}
      </div>
    </div>
  );

  const renderMapPage = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 relative">
        {userLocation && (
          <VWorldMap
            center={userLocation}
            analysisResult={analysisResult}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-950 flex flex-col">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-gray-900/80 to-purple-950/60"></div>
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/5 rounded-3xl transform rotate-12 backdrop-blur-sm"></div>
      <div className="absolute top-40 right-8 w-16 h-16 bg-purple-400/10 rounded-2xl transform -rotate-12 backdrop-blur-sm"></div>
      <div className="absolute bottom-32 left-6 w-24 h-24 bg-violet-400/10 rounded-3xl transform rotate-45 backdrop-blur-sm"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {renderHeader()}

        {pageState === 'input' && renderInputPage()}
        {pageState === 'analyzing' && renderAnalyzingPage()}
        {pageState === 'result' && renderResultPage()}
        {pageState === 'map' && renderMapPage()}

        {/* Bottom Navigation - Simplified */}
        <div className="bg-black/20 backdrop-blur-md border-t border-white/10">
          <div className="flex items-center justify-center py-4 px-4">
            <Link href="/" className="flex items-center space-x-2 px-6 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
              <HeartIcon className="w-5 h-5 text-white/70" />
              <span className="text-white/70 text-sm">홈으로 돌아가기</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}