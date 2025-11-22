'use client';

import Link from 'next/link';
import { 
  HeartIcon, 
  Cog6ToothIcon, 
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function Home() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-950">
      {/* Mobile-first design with minimal elements */}
      <div className="relative overflow-hidden">
        {/* Darker background overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-gray-900/80 to-purple-950/60"></div>
        
        {/* Minimal floating background elements */}
        <div className="absolute top-32 right-12 w-16 h-16 bg-white/3 rounded-2xl transform rotate-12 backdrop-blur-sm"></div>
        <div className="absolute bottom-40 left-8 w-20 h-20 bg-purple-400/5 rounded-3xl transform -rotate-12 backdrop-blur-sm"></div>

        <div className="relative z-10 px-6 py-12 flex flex-col min-h-screen">
          {/* Simple Header */}
          <div className="flex justify-between items-center mb-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                <HeartIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">YAME</h1>
            </div>
            <Link
              href="/admin"
              className="p-3 bg-white/5 rounded-xl backdrop-blur-sm transition-all duration-200 hover:bg-white/10 border border-white/10"
            >
              <Cog6ToothIcon className="w-5 h-5 text-white/70" />
            </Link>
          </div>

          {/* Main Content - Centered */}
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
            
            {/* Title Section */}
            <div className="space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10">
                <SparklesIcon className="w-12 h-12 text-white" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  YAME
                </h2>
                <p className="text-white/60 text-sm font-medium tracking-wider">
                  Your Assessment for Medical Evaluation
                </p>
              </div>
            </div>

            {/* Simple Description */}
            <div className="max-w-md space-y-4">
              <p className="text-white/80 text-lg leading-relaxed">
                AI 기반 익명 건강 진단 서비스
              </p>
              <p className="text-white/50 text-sm leading-relaxed">
                개인정보 수집 없이 증상을 분석하여<br />
                적절한 의료 조치를 안내합니다
              </p>
            </div>

            {/* Main Action Button */}
            <div className="w-full max-w-sm space-y-4">
              <Link
                href="/symptom-chat"
                className="block w-full py-4 px-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
              >
                <div className="flex items-center justify-center space-x-3">
                  <SparklesIcon className="w-6 h-6" />
                  <span className="text-lg">야메 진단 시작</span>
                </div>
              </Link>
              
              <p className="text-white/40 text-xs">
                익명으로 이용 가능 • 개인정보 수집 안함
              </p>
            </div>


          </div>

          {/* Simple Footer */}
          <div className="text-center pt-8">
            <p className="text-white/30 text-xs">
              응급상황 시 즉시 119로 연락하세요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}