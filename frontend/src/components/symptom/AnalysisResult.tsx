'use client';

/**
 * 증상 분석 결과 표시 컴포넌트
 * AI 분석 결과와 추천 정보를 사용자에게 표시하는 컴포넌트
 */

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  BuildingStorefrontIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  ClockIcon,
  PhoneIcon,
  MapPinIcon,
  DocumentDuplicateIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

import {
  SymptomAnalysisResult,
  RecommendationType,
  CreateFeedbackRequest,
} from '../../types/symptom';
import { symptomService } from '../../services/symptom';

/**
 * 컴포넌트 props 인터페이스
 */
interface AnalysisResultProps {
  result: SymptomAnalysisResult;          // 분석 결과 데이터
  onFeedbackSubmitted?: () => void;       // 피드백 제출 완료 콜백
  onNewAnalysis?: () => void;             // 새로운 분석 시작 콜백
  onShowMap?: () => void;                 // 지도 표시 콜백
}

/**
 * 증상 분석 결과 컴포넌트
 */
export default function AnalysisResult({
  result,
  onFeedbackSubmitted,
  onNewAnalysis,
}: AnalysisResultProps) {
  // 피드백 관련 상태
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');

  /**
   * 토큰 복사 함수
   */
  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success('접수 토큰이 클립보드에 복사되었습니다.');
    } catch (error) {
      toast.error('토큰 복사에 실패했습니다.');
    }
  };

  /**
   * 전화 연결 함수
   */
  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  /**
   * 피드백 제출 함수
   */
  const handleSubmitFeedback = async (helpful: boolean) => {
    setIsSubmittingFeedback(true);

    try {
      const feedbackData: CreateFeedbackRequest = {
        log_id: result.log_id,
        helpful,
        comment: feedbackComment.trim() || undefined,
      };

      await symptomService.submitFeedback(feedbackData);
      
      setFeedbackSubmitted(true);
      setShowFeedback(false);
      toast.success('피드백이 제출되었습니다. 감사합니다!');
      
      onFeedbackSubmitted?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '피드백 제출 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  /**
   * 거리 포맷팅 함수
   */
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  /**
   * 처리 시간 포맷팅 함수
   */
  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}초`;
  };

  /**
   * 약국 추천 결과 렌더링
   */
  const renderPharmacyRecommendation = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-start space-x-3 mb-4">
        <BuildingStorefrontIcon className="w-8 h-8 text-green-600 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-green-900">약국 방문 권유</h3>
          <p className="text-green-700 mt-1">
            일반의약품으로 증상 완화가 가능할 것으로 판단됩니다.
          </p>
        </div>
      </div>

      {/* 추천 의약품 */}
      {result.recommended_drugs && result.recommended_drugs.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">추천 의약품</h4>
          <div className="space-y-3">
            {result.recommended_drugs.map((drug, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <h5 className="font-medium text-gray-900">{drug.name}</h5>
                <p className="text-sm text-gray-600 mt-1">성분: {drug.ingredient}</p>
                <p className="text-sm text-gray-600">용법: {drug.dosage}</p>
                {drug.warning && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800 flex items-start">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                      {drug.warning}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DUR 경고 */}
      {result.dur_warnings && result.dur_warnings.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">주의사항</h4>
          <div className="space-y-2">
            {result.dur_warnings.map((warning, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 flex items-start">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  {warning}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-green-700 bg-green-100 rounded-lg p-3">
        <p>💡 약사와 상담 후 복용하시기 바랍니다.</p>
      </div>
    </div>
  );

  /**
   * 병원 추천 결과 렌더링
   */
  const renderHospitalRecommendation = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start space-x-3 mb-4">
        <BuildingOffice2Icon className="w-8 h-8 text-blue-600 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-blue-900">병원 방문 권유</h3>
          <p className="text-blue-700 mt-1">
            전문의의 정확한 진단이 필요할 것으로 판단됩니다.
          </p>
        </div>
      </div>

      {/* 접수 토큰 */}
      {result.intake_token && (
        <div className="mb-6 p-4 bg-white border border-blue-200 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-2">병원 접수 토큰</h4>
          <div className="flex items-center space-x-2">
            <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm font-mono">
              {result.intake_token}
            </code>
            <button
              onClick={() => handleCopyToken(result.intake_token!)}
              className="p-2 text-gray-500 hover:text-gray-700 transition duration-200"
              title="토큰 복사"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            이 토큰을 병원 접수 시 제시하면 빠른 진료가 가능합니다.
          </p>
        </div>
      )}

      {/* 주변 병원 목록 */}
      {result.nearby_hospitals && result.nearby_hospitals.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">주변 의료기관</h4>
          <div className="space-y-3">
            {result.nearby_hospitals.map((hospital, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-medium text-gray-900 flex items-center">
                      {hospital.name}
                      {hospital.has_emergency && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          응급실
                        </span>
                      )}
                    </h5>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      {hospital.address}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDistance(hospital.distance_m)}
                  </span>
                </div>
                
                {hospital.phone && (
                  <button
                    onClick={() => handleCall(hospital.phone)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition duration-200"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    <span>{hospital.phone}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-blue-700 bg-blue-100 rounded-lg p-3">
        <p>⚕️ 증상이 악화되거나 지속되면 즉시 병원을 방문하세요.</p>
      </div>
    </div>
  );

  /**
   * 피드백 섹션 렌더링
   */
  const renderFeedbackSection = () => {
    if (feedbackSubmitted) {
      return (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-gray-600">피드백이 제출되었습니다. 감사합니다! 🙏</p>
        </div>
      );
    }

    if (!showFeedback) {
      return (
        <div className="text-center">
          <p className="text-gray-600 mb-4">이 추천이 도움이 되셨나요?</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => handleSubmitFeedback(true)}
              disabled={isSubmittingFeedback}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition duration-200"
            >
              <HandThumbUpIcon className="w-5 h-5" />
              <span>도움됨</span>
            </button>
            <button
              onClick={() => setShowFeedback(true)}
              disabled={isSubmittingFeedback}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition duration-200"
            >
              <HandThumbDownIcon className="w-5 h-5" />
              <span>도움 안됨</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">피드백을 남겨주세요</h4>
        <textarea
          value={feedbackComment}
          onChange={(e) => setFeedbackComment(e.target.value)}
          placeholder="개선할 점이나 의견을 자유롭게 남겨주세요..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          maxLength={500}
        />
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-gray-500">
            {feedbackComment.length}/500
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFeedback(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition duration-200"
            >
              취소
            </button>
            <button
              onClick={() => handleSubmitFeedback(false)}
              disabled={isSubmittingFeedback}
              className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition duration-200"
            >
              {isSubmittingFeedback ? '제출 중...' : '제출'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">분석 결과</h1>
          <p className="text-gray-600">
            AI가 분석한 결과를 바탕으로 한 추천입니다.
          </p>
        </div>

        {/* 예측 질병 정보 */}
        {result.predicted_disease && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">예측 결과</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-gray-900">{result.predicted_disease}</p>
                {result.confidence && (
                  <p className="text-sm text-gray-600">
                    신뢰도: {Math.round(result.confidence * 100)}%
                  </p>
                )}
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>처리 시간: {formatProcessingTime(result.processing_time_ms)}</p>
                <p>로그 ID: #{result.log_id}</p>
              </div>
            </div>
          </div>
        )}

        {/* 추천 결과 */}
        <div className="mb-8">
          {result.recommendation === RecommendationType.PHARMACY 
            ? renderPharmacyRecommendation()
            : renderHospitalRecommendation()
          }
        </div>

        {/* 피드백 섹션 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">피드백</h3>
          </div>
          {renderFeedbackSection()}
        </div>

        {/* 액션 버튼 */}
        <div className="text-center">
          <button
            onClick={onNewAnalysis}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            새로운 증상 분석하기
          </button>
        </div>

        {/* 면책 조항 */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            ⚠️ 이 결과는 참고용이며, 전문의의 진단을 대체할 수 없습니다. 
            증상이 지속되거나 악화되면 반드시 의료기관을 방문하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
