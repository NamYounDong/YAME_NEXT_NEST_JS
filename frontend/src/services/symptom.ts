/**
 * 증상 관련 API 서비스
 * 백엔드의 증상 분석 API와 통신하는 서비스 함수들
 * 로딩 상태가 자동으로 관리되는 API 유틸리티를 사용합니다.
 */

import { symptomApi, api, handleApiError } from '../utils/api';
import {
  CreateSymptomLogRequest,
  SymptomAnalysisResult,
  CreateFeedbackRequest,
  Feedback,
  TokenUseResult,
} from '../types/symptom';

/**
 * 증상 분석 API 클라이언트
 */
export const symptomService = {
  /**
   * 증상을 분석하고 추천을 받습니다.
   * @param symptomData 증상 입력 데이터
   * @returns 분석 결과 및 추천 정보
   */
  async analyzeSymptom(symptomData: CreateSymptomLogRequest): Promise<SymptomAnalysisResult> {
    const response = await symptomApi.analyzeSymptom(symptomData);
    
    if (!response.success) {
      throw new Error(handleApiError(response, '증상 분석 중 오류가 발생했습니다.'));
    }

    return response.data;
  },

  /**
   * 추천 결과에 대한 피드백을 제출합니다.
   * @param feedbackData 피드백 데이터
   * @returns 저장된 피드백 정보
   */
  async submitFeedback(feedbackData: CreateFeedbackRequest): Promise<Feedback> {
    const response = await symptomApi.submitFeedback(feedbackData);
    
    if (!response.success) {
      throw new Error(handleApiError(response, '피드백 제출 중 오류가 발생했습니다.'));
    }

    return response.data;
  },

  /**
   * 병원 접수 토큰을 사용하여 증상 정보를 조회합니다.
   * @param token UUID 토큰 문자열
   * @returns 토큰 사용 결과
   */
  async useIntakeToken(token: string): Promise<TokenUseResult> {
    const response = await api.post(`/symptom-logs/intake-token/${token}`, {}, {
      loadingMessage: '접수 토큰을 확인하는 중입니다...'
    });
    
    if (!response.success) {
      throw new Error(handleApiError(response, '토큰 사용 중 오류가 발생했습니다.'));
    }

    return response.data;
  },

  /**
   * 피드백 통계를 조회합니다.
   * @param days 통계 기간 (일수)
   * @returns 피드백 통계 정보
   */
  async getFeedbackStats(days: number = 30): Promise<any> {
    const response = await api.get('/symptom-logs/feedback/stats', { days }, {
      loadingMessage: '피드백 통계를 불러오는 중입니다...'
    });
    
    if (!response.success) {
      throw new Error(handleApiError(response, '통계 조회 중 오류가 발생했습니다.'));
    }

    return response.data;
  },

  /**
   * 토큰 사용 통계를 조회합니다.
   * @param days 통계 기간 (일수)
   * @returns 토큰 통계 정보
   */
  async getTokenStats(days: number = 7): Promise<any> {
    const response = await api.get('/symptom-logs/tokens/stats', { days }, {
      loadingMessage: '토큰 통계를 불러오는 중입니다...'
    });
    
    if (!response.success) {
      throw new Error(handleApiError(response, '통계 조회 중 오류가 발생했습니다.'));
    }

    return response.data;
  },

  /**
   * 주변 병원을 검색합니다.
   * @param location 위치 정보
   * @returns 병원 목록
   */
  async findNearbyHospitals(location: { lat: number; lng: number }): Promise<any> {
    const response = await symptomApi.findNearbyHospitals(location);
    
    if (!response.success) {
      throw new Error(handleApiError(response, '주변 병원 검색 중 오류가 발생했습니다.'));
    }

    return response.data;
  },

  /**
   * 주변 약국을 검색합니다.
   * @param location 위치 정보
   * @returns 약국 목록
   */
  async findNearbyPharmacies(location: { lat: number; lng: number }): Promise<any> {
    const response = await symptomApi.findNearbyPharmacies(location);
    
    if (!response.success) {
      throw new Error(handleApiError(response, '주변 약국 검색 중 오류가 발생했습니다.'));
    }

    return response.data;
  },
};

/**
 * 위치 정보 관련 유틸리티 함수들
 */
export const locationService = {
  /**
   * 현재 위치를 가져옵니다.
   * @param options Geolocation API 옵션
   * @param showLoading 로딩 상태 표시 여부
   * @returns GPS 좌표 정보
   */
  async getCurrentPosition(
    options?: PositionOptions,
    showLoading: boolean = true
  ): Promise<{
    lat: number;
    lng: number;
    accuracy: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('이 브라우저는 위치 서비스를 지원하지 않습니다.'));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5분
        ...options,
      };

      // 로딩 시작 (수동으로 관리)
      if (showLoading) {
        // 위치 서비스는 API 유틸리티를 사용하지 않으므로 수동으로 로딩 상태 관리
        // 간단한 구현을 위해 여기서는 Promise 기반으로 처리
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let errorMessage = '위치 정보를 가져올 수 없습니다.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다.';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 정보 요청이 시간 초과되었습니다.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  },

  /**
   * 좌표를 주소로 변환합니다 (Reverse Geocoding)
   * @param lat 위도
   * @param lng 경도
   * @returns 주소 문자열
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      // VWorld API나 다른 역지오코딩 서비스 호출
      // 현재는 간단한 모킹 구현
      return this.mockReverseGeocode(lat, lng);
    } catch (error) {
      console.error('역지오코딩 오류:', error);
      return '주소 확인 불가';
    }
  },

  /**
   * 모킹 역지오코딩 (개발용)
   * @param lat 위도
   * @param lng 경도
   * @returns 모킹 주소
   */
  mockReverseGeocode(lat: number, lng: number): string {
    // 서울 지역 좌표 범위에 따른 대략적인 주소 반환
    if (lat >= 37.4 && lat <= 37.7 && lng >= 126.8 && lng <= 127.2) {
      const districts = [
        '강남구', '서초구', '종로구', '중구', '용산구', 
        '성동구', '광진구', '마포구', '영등포구', '강서구'
      ];
      const randomDistrict = districts[Math.floor(Math.random() * districts.length)];
      return `서울특별시 ${randomDistrict}`;
    }
    
    // 기타 지역
    if (lat >= 35 && lat <= 39 && lng >= 126 && lng <= 130) {
      return '대한민국';
    }
    
    return '위치 확인 불가';
  },

  /**
   * 두 좌표 간의 거리를 계산합니다 (미터 단위)
   * @param lat1 첫 번째 위치의 위도
   * @param lng1 첫 번째 위치의 경도
   * @param lat2 두 번째 위치의 위도
   * @param lng2 두 번째 위치의 경도
   * @returns 거리 (미터)
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  },
};
