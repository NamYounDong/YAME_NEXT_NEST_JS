/**
 * API 통신 유틸리티
 * 모든 API 요청에 로딩 상태를 자동으로 적용합니다.
 */

// 글로벌 로딩 함수들
let globalLoadingFunctions: {
  startLoading: (message?: string) => void;
  stopLoading: () => void;
} | null = null;

export const setGlobalLoadingFunctions = (functions: {
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}) => {
  globalLoadingFunctions = functions;
};

/**
 * API 요청 기본 설정
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

/**
 * HTTP 메서드 타입
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API 요청 옵션
 */
interface ApiRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  loadingMessage?: string;
  showLoading?: boolean;
  timeout?: number;
}

/**
 * API 응답 타입
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status: number;
}

/**
 * URL에 쿼리 파라미터 추가
 */
const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean>): string => {
  const url = new URL(endpoint, API_BASE_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  return url.toString();
};

/**
 * 메인 API 요청 함수
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> => {
  const {
    method = 'GET',
    headers = {},
    body,
    params,
    loadingMessage = '데이터를 가져오는 중입니다...',
    showLoading = true,
    timeout = 30000
  } = options;

  // 로딩 시작
  if (showLoading && globalLoadingFunctions) {
    globalLoadingFunctions.startLoading(loadingMessage);
  }

  try {
    // URL 구성
    const url = buildUrl(endpoint, params);
    
    // 요청 설정
    const config: RequestInit = {
      method,
      headers: {
        ...DEFAULT_HEADERS,
        ...headers,
      },
    };

    // Body 추가 (GET 요청이 아닌 경우)
    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    // 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    config.signal = controller.signal;

    // API 요청 실행
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    // 응답 처리
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // 성공 응답
    if (response.ok) {
      return {
        success: true,
        data: responseData,
        status: response.status,
      };
    } else {
      // 에러 응답
      return {
        success: false,
        error: responseData?.message || responseData || `HTTP ${response.status}`,
        status: response.status,
      };
    }

  } catch (error: any) {
    // 네트워크 에러 또는 기타 예외
    let errorMessage = '네트워크 오류가 발생했습니다.';
    
    if (error.name === 'AbortError') {
      errorMessage = '요청 시간이 초과되었습니다.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      status: 0,
    };

  } finally {
    // 로딩 종료
    if (showLoading && globalLoadingFunctions) {
      globalLoadingFunctions.stopLoading();
    }
  }
};

/**
 * 편의 메서드들
 */
export const api = {
  /**
   * GET 요청
   */
  get: <T = any>(endpoint: string, params?: Record<string, string | number | boolean>, options?: Omit<ApiRequestOptions, 'method' | 'params'>) => {
    return apiRequest<T>(endpoint, { 
      ...options, 
      method: 'GET', 
      params,
      loadingMessage: options?.loadingMessage || '데이터를 불러오는 중입니다...'
    });
  },

  /**
   * POST 요청
   */
  post: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => {
    return apiRequest<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body,
      loadingMessage: options?.loadingMessage || '데이터를 전송하는 중입니다...'
    });
  },

  /**
   * PUT 요청
   */
  put: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => {
    return apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body,
      loadingMessage: options?.loadingMessage || '데이터를 업데이트하는 중입니다...'
    });
  },

  /**
   * DELETE 요청
   */
  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) => {
    return apiRequest<T>(endpoint, { 
      ...options, 
      method: 'DELETE',
      loadingMessage: options?.loadingMessage || '데이터를 삭제하는 중입니다...'
    });
  },

  /**
   * PATCH 요청
   */
  patch: <T = any>(endpoint: string, body?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) => {
    return apiRequest<T>(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body,
      loadingMessage: options?.loadingMessage || '데이터를 수정하는 중입니다...'
    });
  },
};

/**
 * 에러 응답 처리 헬퍼
 */
export const handleApiError = (response: ApiResponse, defaultMessage: string = '오류가 발생했습니다.'): string => {
  if (!response.success) {
    const errorMessage = response.error || defaultMessage;
    console.error('API Error:', errorMessage);
    return errorMessage;
  }
  return defaultMessage;
};

/**
 * 특정 증상 분석 API 래퍼
 */
export const symptomApi = {
  /**
   * 증상 분석 요청
   */
  analyzeSymptom: (symptomData: any) => {
    // 프론트엔드 snake_case를 백엔드 camelCase로 변환
    const backendData = {
      symptomText: symptomData.symptom_text,
      subSymptoms: symptomData.sub_symptoms,
      latitude: symptomData.gps_point?.lat,
      longitude: symptomData.gps_point?.lng,
      gpsAccuracy: symptomData.gps_accuracy_m,
      userAge: symptomData.user_age,
      isPregnant: symptomData.is_pregnant,
    };
    
    return api.post('/api/symptom-logs/analyze', backendData, {
      loadingMessage: 'AI가 증상을 분석하고 있습니다...',
      timeout: 45000, // 증상 분석은 시간이 오래 걸릴 수 있음
    });
  },

  /**
   * 피드백 제출
   */
  submitFeedback: (feedbackData: any) => {
    return api.post('/api/symptom-logs/feedback', feedbackData, {
      loadingMessage: '피드백을 전송하는 중입니다...',
    });
  },

  /**
   * 주변 병원 검색
   */
  findNearbyHospitals: (location: { lat: number; lng: number }) => {
    return api.get('/api/symptom-logs/nearby-hospitals', location, {
      loadingMessage: '주변 병원을 검색하는 중입니다...',
    });
  },

  /**
   * 주변 약국 검색
   */
  findNearbyPharmacies: (location: { lat: number; lng: number }) => {
    return api.get('/api/symptom-logs/nearby-pharmacies', location, {
      loadingMessage: '주변 약국을 검색하는 중입니다...',
    });
  },
};

/**
 * 데이터 수집 API 래퍼
 */
export const dataCollectionApi = {
  /**
   * 전체 데이터 수집
   */
  collectAll: (forceUpdate: boolean = false) => {
    return api.post('/api/data-collector/collect-all', { forceUpdate }, {
      loadingMessage: '전체 데이터를 수집하는 중입니다...',
      timeout: 120000, // 데이터 수집은 시간이 오래 걸릴 수 있음
    });
  },

  /**
   * 병원 데이터 수집
   */
  collectHospitals: (forceUpdate: boolean = false) => {
    return api.post('/api/data-collector/collect-hospitals', { forceUpdate }, {
      loadingMessage: '병원 데이터를 수집하는 중입니다...',
      timeout: 60000,
    });
  },

  /**
   * 약국 데이터 수집
   */
  collectPharmacies: (forceUpdate: boolean = false) => {
    return api.post('/api/data-collector/collect-pharmacies', { forceUpdate }, {
      loadingMessage: '약국 데이터를 수집하는 중입니다...',
      timeout: 60000,
    });
  },

  /**
   * DUR 규칙 데이터 수집
   */
  collectDurRules: (forceUpdate: boolean = false) => {
    return api.post('/api/data-collector/collect-dur-data', { forceUpdate }, {
      loadingMessage: 'DUR 규칙을 수집하는 중입니다...',
      timeout: 90000,
    });
  },

  /**
   * 응급의료 데이터 수집
   */
  collectEmergency: (forceUpdate: boolean = false) => {
    return api.post('/api/data-collector/collect-emergency', { forceUpdate }, {
      loadingMessage: '응급의료 데이터를 수집하는 중입니다...',
      timeout: 60000,
    });
  },

  /**
   * 외상센터 데이터 수집
   */
  collectTrauma: (forceUpdate: boolean = false) => {
    return api.post('/api/data-collector/collect-trauma', { forceUpdate }, {
      loadingMessage: '외상센터 데이터를 수집하는 중입니다...',
      timeout: 60000,
    });
  },

  /**
   * 대시보드 데이터 조회
   */
  getDashboardData: () => {
    return api.get('/api/data-collector/dashboard', {}, {
      loadingMessage: '대시보드 데이터를 불러오는 중입니다...',
    });
  },

  /**
   * 데이터 수집 상태 확인
   */
  getStatus: () => {
    return api.get('/api/data-collector/status', {}, {
      showLoading: false, // 상태 확인은 로딩 표시 안함
    });
  },
};

export default api;