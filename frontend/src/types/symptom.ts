/**
 * 증상 관련 타입 정의
 * 증상 분석 및 추천 시스템과 관련된 TypeScript 인터페이스들
 */

/**
 * GPS 좌표 타입
 */
export interface GpsPoint {
  lat: number;  // 위도
  lng: number;  // 경도
}

/**
 * 증상 로그 생성 요청 타입
 */
export interface CreateSymptomLogRequest {
  symptom_text: string;           // 사용자 입력 증상 텍스트
  sub_symptoms?: string[];        // 보조 증상 배열 (선택사항)
  gps_point: GpsPoint;           // GPS 좌표
  gps_accuracy_m?: number;       // GPS 정확도 (미터)
  region_label?: string;         // 지역 라벨 (선택사항)
}

/**
 * 권유 분기 타입
 */
export enum RecommendationType {
  PHARMACY = 'PHARMACY',  // 약국 방문 권유
  HOSPITAL = 'HOSPITAL',  // 병원 방문 권유
}

/**
 * 추천 약품 정보 타입
 */
export interface RecommendedDrug {
  name: string;         // 약품명
  ingredient: string;   // 성분명
  dosage: string;       // 용법/용량
  warning?: string;     // 주의사항 (선택사항)
}

/**
 * 추천 병원 정보 타입
 */
export interface RecommendedHospital {
  name: string;         // 병원명
  address: string;      // 주소
  phone: string;        // 전화번호
  distance_m: number;   // 거리 (미터)
  has_emergency: boolean; // 응급실 보유 여부
}

/**
 * 증상 분석 결과 타입
 */
export interface SymptomAnalysisResult {
  log_id: number;                              // 생성된 로그 ID
  predicted_disease?: string;                  // 예측된 질병명
  confidence?: number;                         // 예측 신뢰도 (0-1)
  recommendation: RecommendationType;          // 권유 분기 결과
  recommended_drugs?: RecommendedDrug[];       // 추천 약품 목록
  nearby_hospitals?: RecommendedHospital[];    // 주변 병원 목록
  dur_warnings?: string[];                     // DUR 경고 메시지
  intake_token?: string;                       // 병원 접수 토큰 (병원 권유 시)
  processing_time_ms: number;                  // 처리 시간 (밀리초)
}

/**
 * 피드백 생성 요청 타입
 */
export interface CreateFeedbackRequest {
  log_id: number;       // 대상 증상 로그 ID
  helpful: boolean;     // 도움 여부
  comment?: string;     // 자유 의견 (선택사항)
}

/**
 * 피드백 응답 타입
 */
export interface Feedback {
  log_id: number;       // 증상 로그 ID
  helpful: boolean;     // 도움 여부
  comment?: string;     // 의견
  created_at: string;   // 생성 시각
}

/**
 * 토큰 사용 결과 타입
 */
export interface TokenUseResult {
  success: boolean;     // 성공 여부
  message: string;      // 결과 메시지
  symptom_info?: {      // 증상 정보 (성공 시)
    symptom_text: string;
    predicted_disease: string;
    created_at: string;
  };
}

/**
 * 지역 정보 타입
 */
export interface LocationInfo {
  address: string;      // 주소
  coordinates: GpsPoint; // 좌표
  accuracy?: number;    // 정확도
}

/**
 * 증상 분석 단계 상태 타입
 */
export enum AnalysisStep {
  LOCATION = 'LOCATION',        // 위치 정보 수집
  SYMPTOM_INPUT = 'SYMPTOM_INPUT', // 증상 입력
  ANALYZING = 'ANALYZING',      // 분석 중
  RESULT = 'RESULT',           // 결과 표시
  FEEDBACK = 'FEEDBACK',       // 피드백 수집
}

/**
 * 분석 진행 상태 타입
 */
export interface AnalysisProgress {
  current_step: AnalysisStep;   // 현재 단계
  total_steps: number;          // 전체 단계 수
  completed_steps: number;      // 완료된 단계 수
  is_loading: boolean;          // 로딩 상태
  error_message?: string;       // 오류 메시지 (있는 경우)
}
