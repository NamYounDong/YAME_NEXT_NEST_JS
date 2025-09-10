'use client';

/**
 * 증상 입력 폼 컴포넌트
 * 사용자의 증상을 입력받고 위치 정보를 수집하는 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { 
  MapPinIcon, 
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ClockIcon,
  PaperAirplaneIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import { 
  CreateSymptomLogRequest, 
  SymptomAnalysisResult,
  GpsPoint,
  AnalysisStep 
} from '../../types/symptom';
import { symptomService, locationService } from '../../services/symptom';

/**
 * 폼 데이터 인터페이스
 */
interface SymptomFormData {
  symptom_text: string;      // 주요 증상 텍스트
  sub_symptoms?: string;     // 보조 증상 (쉼표로 구분)
}

/**
 * 컴포넌트 Props 인터페이스
 */
interface SymptomInputFormProps {
  onAnalysisComplete?: (result: SymptomAnalysisResult) => void;
  onAnalysisStart?: () => void;
  userLocation?: GpsPoint | null;
}

/**
 * 증상 입력 폼 컴포넌트
 */
export const SymptomInputForm: React.FC<SymptomInputFormProps> = ({
  onAnalysisComplete,
  onAnalysisStart,
  userLocation
}) => {
  // Form 상태 관리
  const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm<SymptomFormData>();
  
  // 컴포넌트 상태
  const [currentStep, setCurrentStep] = useState<AnalysisStep>(AnalysisStep.LOCATION);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [location, setLocation] = useState<GpsPoint | null>(userLocation || null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | undefined>();
  const [regionLabel, setRegionLabel] = useState<string | undefined>();



  // 폼 입력 값 실시간 감시
  const symptomText = watch('symptom_text', '');
  
  // 버튼 활성화 조건: 증상 텍스트가 5자 이상 입력되었을 때
  const isFormValid = symptomText.trim().length >= 5;

  // userLocation이 변경되면 location 상태 업데이트
  useEffect(() => {
    if (userLocation) {
      setLocation(userLocation);
      setCurrentStep(AnalysisStep.SYMPTOM_INPUT);
    }
  }, [userLocation]);

  /**
   * 위치 정보 요청 함수
   */
  const requestLocation = async () => {
    setIsLocationLoading(true);
    setCurrentStep(AnalysisStep.LOCATION);

    try {
      const locationData = await locationService.getCurrentPosition();
      
      setLocation({ lat: locationData.lat, lng: locationData.lng });
      setLocationAccuracy(locationData.accuracy);
      
      // 주소 정보 가져오기
      const address = await locationService.reverseGeocode(locationData.lat, locationData.lng);
      setRegionLabel(address);
      
      setCurrentStep(AnalysisStep.SYMPTOM_INPUT);
      
      toast.success('위치 정보를 확인했습니다.');
      
    } catch (error: any) {
      console.error('위치 정보 오류:', error);
      toast.error(error.message || '위치 정보를 가져올 수 없습니다.');
      
      // 위치 정보 실패 시에도 증상 입력은 가능하도록 설정
      setCurrentStep(AnalysisStep.SYMPTOM_INPUT);
    } finally {
      setIsLocationLoading(false);
    }
  };

  /**
   * 폼 제출 처리 함수
   */
  const onSubmit = async (data: SymptomFormData) => {
    if (!location) {
      toast.error('위치 정보가 필요합니다. 위치 권한을 허용해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep(AnalysisStep.ANALYZING);
    onAnalysisStart?.();

    try {
      // 보조 증상을 배열로 변환 (쉼표로 구분된 문자열을 분리)
      const subSymptomsArray = data.sub_symptoms
        ? data.sub_symptoms.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : undefined;

      // API 요청 데이터 구성
      const requestData: CreateSymptomLogRequest = {
        symptom_text: data.symptom_text,
        sub_symptoms: subSymptomsArray,
        gps_point: location,
        gps_accuracy_m: locationAccuracy,
        region_label: regionLabel || undefined,
      };

      // 증상 분석 API 호출
      const result = await symptomService.analyzeSymptom(requestData);

      setCurrentStep(AnalysisStep.RESULT);
      onAnalysisComplete?.(result);
      
      toast.success('증상 분석이 완료되었습니다.');
      
    } catch (error: any) {
      console.error('증상 분석 오류:', error);
      toast.error(error.message || '증상 분석 중 오류가 발생했습니다.');
      setCurrentStep(AnalysisStep.SYMPTOM_INPUT);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 위치 확인 단계 렌더링
   */
  const renderLocationStep = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
        <MapPinIcon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-4">위치 정보 확인</h3>
      <p className="text-white/60 text-sm mb-6 leading-relaxed">
        주변 병원과 약국을 찾기 위해<br />
        위치 정보 접근을 허용해주세요
      </p>
      
      <button
        onClick={requestLocation}
        disabled={isLocationLoading}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLocationLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
            위치 확인 중...
          </>
        ) : (
          <>
            <MapPinIcon className="w-4 h-4 mr-2" />
            위치 권한 허용
          </>
        )}
      </button>

      {currentStep === AnalysisStep.SYMPTOM_INPUT && !location && (
        <div className="mt-4">
          <button
            onClick={() => setCurrentStep(AnalysisStep.SYMPTOM_INPUT)}
            className="text-white/60 text-sm hover:text-white/80 transition-colors"
          >
            위치 정보 없이 계속하기
          </button>
        </div>
      )}
    </div>
  );

  /**
   * 증상 입력 단계 렌더링
   */
  const renderSymptomInputStep = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 위치 정보 표시 */}
      {location && regionLabel && (
        <div className="bg-green-500/10 backdrop-blur-md rounded-xl p-4 border border-green-400/20">
          <div className="flex items-center space-x-3">
            <MapPinIcon className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-300 text-sm font-medium">위치 확인 완료</p>
              <p className="text-green-200/80 text-xs">{regionLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* 주요 증상 입력 */}
      <div>
        <label className="block text-white font-medium text-sm mb-3">
          어떤 증상이 있으신지 자세히 알려주세요 *
        </label>
        <div className="relative">
          <textarea
            {...register('symptom_text', { 
              required: '증상을 입력해주세요.',
              minLength: { value: 5, message: '증상을 5자 이상 자세히 설명해주세요.' }
            })}
            placeholder="예: 어제 저녁부터 목이 아프고 기침이 나며, 미열이 있습니다. 침을 삼킬 때 특히 아프고..."
            className="w-full h-32 p-4 bg-white/5 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 resize-none focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
          />
          <div className="absolute bottom-3 right-3 text-white/40 text-xs">
            {symptomText.length}/500
          </div>
        </div>
        
        {errors.symptom_text && (
          <p className="mt-2 text-red-400 text-sm flex items-center">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            {errors.symptom_text.message}
          </p>
        )}
        
        {/* 실시간 피드백 */}
        {symptomText.length > 0 && !errors.symptom_text && (
          <div className="mt-2 flex items-center space-x-2">
            {isFormValid ? (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-green-400 text-sm">좋습니다! 진단을 시작할 수 있습니다.</p>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                <p className="text-amber-400 text-sm">
                  {5 - symptomText.trim().length}자 더 입력해주세요.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 보조 증상 입력 */}
      <div>
        <label className="block text-white font-medium text-sm mb-3">
          기타 동반 증상이 있다면 알려주세요 (선택사항)
        </label>
        <input
          {...register('sub_symptoms')}
          placeholder="예: 두통, 콧물, 근육통 등"
          className="w-full p-4 bg-white/5 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all"
        />
      </div>

      {/* 주의사항 */}
      <div className="bg-amber-500/10 backdrop-blur-md rounded-xl p-4 border border-amber-400/20">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-amber-300 font-medium text-lg mb-1">중요 안내</h4>
            <p className="text-amber-200/80 text-medium leading-relaxed">
              응급상황이나 심각한 증상의 경우 즉시 119에 신고하거나 응급실로 가시기 바랍니다. 
              이 서비스는 보조적인 참고용입니다.
            </p>
          </div>
        </div>
      </div>

      {/* 진단 버튼 */}
      <div className="space-y-2">
        <button
          type="submit"
          disabled={!isFormValid || isAnalyzing}
          className={`w-full py-4 px-8 rounded-2xl font-semibold transition-all duration-300 transform ${
            isFormValid && !isAnalyzing
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/25 hover:scale-105'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center">
              <PaperAirplaneIcon className="w-6 h-6 mr-3 animate-pulse" />
              분석 중...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 mr-3" />
              야메 진단 시작
            </span>
          )}
        </button>
        
        {/* 버튼 상태 안내 */}
        {!isFormValid && symptomText.length > 0 && (
          <p className="text-amber-400 text-sm text-center">
            증상을 5자 이상 입력해주세요 ({symptomText.trim().length}/5)
          </p>
        )}
        
        {isFormValid && (
          <p className="text-green-400 text-sm text-center flex items-center justify-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            진단 준비 완료
          </p>
        )}
      </div>
    </form>
  );

  /**
   * 분석 중 단계 렌더링
   */
  const renderAnalyzingStep = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse">
        <SparklesIcon className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">YAME 약사가 증상을 분석하고 있습니다</h3>
      <p className="text-white/60 text-sm mb-6">
        AI 알고리즘으로 최적의 처방을 찾고 있습니다...
      </p>
      
      {/* 프로그레스 애니메이션 */}
      <div className="flex justify-center space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
    </div>
  );

  // 단계별 렌더링
  if (currentStep === AnalysisStep.LOCATION && !location) {
    return renderLocationStep();
  }

  if (currentStep === AnalysisStep.ANALYZING) {
    return renderAnalyzingStep();
  }

  return renderSymptomInputStep();
};