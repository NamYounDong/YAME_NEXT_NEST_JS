'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhoneIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Disease {
  id: string;
  name: string;
  confidence: number;
  symptoms: string[];
}

interface Drug {
  item_seq: string;
  item_name: string;
  entp_name: string;
  efcy_qesitm?: string;
  use_method_qesitm?: string;
  recommendation_reason?: string;
}

interface Facility {
  name: string;
  address: string;
  distance: number;
  phone?: string;
  operating_hours?: string;
}

interface Recommendation {
  type: 'PHARMACY' | 'HOSPITAL';
  severity_score: number;
  disease: string;
  reason?: string;
  drugs?: Drug[];
  facilities?: Facility[];
}

interface ResultData {
  selectedDisease: Disease;
  recommendation: Recommendation;
}

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // URL에서 결과 데이터 가져오기 (또는 sessionStorage)
    const data = sessionStorage.getItem('symptom_result');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setResultData(parsed);
        // 사용 후 삭제
        sessionStorage.removeItem('symptom_result');
      } catch (error) {
        console.error('결과 데이터 파싱 실패:', error);
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-950 flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">결과 데이터를 찾을 수 없습니다.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const { selectedDisease, recommendation } = resultData;
  const isPharmacy = recommendation.type === 'PHARMACY';
  const isEmergency = recommendation.severity_score >= 9;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-950">
      <div className="relative overflow-hidden">
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-gray-900/80 to-purple-950/60"></div>
        
        {/* Floating background elements */}
        <div className="absolute top-32 right-12 w-16 h-16 bg-white/3 rounded-2xl transform rotate-12 backdrop-blur-sm"></div>
        <div className="absolute bottom-40 left-8 w-20 h-20 bg-purple-400/5 rounded-3xl transform -rotate-12 backdrop-blur-sm"></div>

        <div className="relative z-10 px-6 py-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>홈으로</span>
            </Link>
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold text-white">진단 결과</h1>
            </div>
          </div>

          {/* 선택한 질환 정보 */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedDisease.name}
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 bg-purple-500/30 rounded-lg">
                    <span className="text-sm font-medium text-purple-200">
                      신뢰도: {(selectedDisease.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg ${
                    isEmergency 
                      ? 'bg-red-500/30' 
                      : recommendation.severity_score >= 8 
                      ? 'bg-orange-500/30' 
                      : recommendation.severity_score >= 6
                      ? 'bg-yellow-500/30'
                      : 'bg-green-500/30'
                  }`}>
                    <span className={`text-sm font-medium ${
                      isEmergency 
                        ? 'text-red-200' 
                        : recommendation.severity_score >= 8 
                        ? 'text-orange-200' 
                        : recommendation.severity_score >= 6
                        ? 'text-yellow-200'
                        : 'text-green-200'
                    }`}>
                      심각도: {recommendation.severity_score}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 관련 증상 */}
            {selectedDisease.symptoms && selectedDisease.symptoms.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-white/60 mb-2">관련 증상:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDisease.symptoms.map((symptom, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white/10 rounded-lg text-sm text-white/80"
                    >
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 판단 이유 */}
            {recommendation.reason && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-white/80">{recommendation.reason}</p>
              </div>
            )}
          </div>

          {/* 응급 경고 */}
          {isEmergency && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6 mb-6 backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-red-200 mb-2">
                    ⚠️ 응급 상황입니다!
                  </h3>
                  <p className="text-red-200/80">
                    즉시 119에 전화하거나 가까운 응급실을 방문하세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 약품 추천 (PHARMACY) */}
          {isPharmacy && recommendation.drugs && recommendation.drugs.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <BuildingStorefrontIcon className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-bold text-white">추천 약품</h3>
              </div>
              <div className="space-y-3">
                {recommendation.drugs.map((drug, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{drug.item_name}</h4>
                      <span className="text-xs px-2 py-1 bg-purple-500/30 rounded text-purple-200">
                        #{idx + 1}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mb-2">{drug.entp_name}</p>
                    {drug.recommendation_reason && (
                      <p className="text-sm text-white/80 mb-2">
                        💡 {drug.recommendation_reason}
                      </p>
                    )}
                    {drug.efcy_qesitm && (
                      <div className="mt-2 text-xs text-white/60">
                        <span className="font-medium">효능:</span> {drug.efcy_qesitm.substring(0, 100)}
                        {drug.efcy_qesitm.length > 100 && '...'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-sm text-blue-200">
                  💊 약품 구매 전 약사와 상담을 권장합니다.
                </p>
              </div>
            </div>
          )}

          {/* 주변 시설 (약국/병원) */}
          {recommendation.facilities && recommendation.facilities.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                {isPharmacy ? (
                  <>
                    <BuildingStorefrontIcon className="w-6 h-6 text-green-400" />
                    <h3 className="text-xl font-bold text-white">가까운 약국</h3>
                  </>
                ) : (
                  <>
                    <BuildingOffice2Icon className="w-6 h-6 text-red-400" />
                    <h3 className="text-xl font-bold text-white">가까운 병원</h3>
                  </>
                )}
              </div>
              <div className="space-y-3">
                {recommendation.facilities.slice(0, 5).map((facility, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{facility.name}</h4>
                      <span className="text-xs px-2 py-1 bg-green-500/30 rounded text-green-200">
                        {facility.distance}km
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-white/60">
                      <div className="flex items-start space-x-2">
                        <MapPinIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{facility.address}</span>
                      </div>
                      {facility.phone && (
                        <div className="flex items-center space-x-2">
                          <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{facility.phone}</span>
                        </div>
                      )}
                      {facility.operating_hours && (
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{facility.operating_hours}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 하단 액션 버튼 */}
          <div className="mt-8 flex gap-4">
            <Link
              href="/symptom-chat"
              className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all text-center font-medium border border-white/20"
            >
              다시 진단하기
            </Link>
            <Link
              href="/"
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition-all text-center font-medium"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

