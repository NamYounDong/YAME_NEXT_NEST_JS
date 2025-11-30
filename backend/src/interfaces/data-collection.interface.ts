/**
 * 데이터 수집 관련 인터페이스 정의 파일
 * 
 * 이 파일은 YAME 시스템에서 사용하는 모든 데이터 수집 관련
 * 인터페이스와 타입을 정의합니다.
 * 
 * 주요 인터페이스:
 * - EmergencyBaseInfo: 응급의료기관 기본정보
 * - TraumaBaseInfo: 외상센터 기본정보  
 * - HiraHospitalInfo: HIRA 병원 정보
 * - HiraPharmacyInfo: HIRA 약국 정보
 * - ItemBaseInfo: DUR 품목 기본정보
 * - 기타 DUR 관련 인터페이스들
 * 
 * 모든 인터페이스는 카멜케이스 네이밍 컨벤션을 따르며,
 * 데이터베이스의 스네이크 케이스 컬럼명과 자동으로 매핑됩니다.
 * 
 * @author YAME Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * 응급의료기관 기본정보 인터페이스
 * 
 * NEMC(National Emergency Medical Center) API에서 제공하는
 * 응급의료기관의 상세 정보를 담는 인터페이스입니다.
 * 
 * 주요 정보:
 * - 기관 식별 정보 (HPID, 기관명, 주소, 연락처)
 * - 위치 정보 (경도, 위도, POINT 형식)
 * - 진료 정보 (진료시간, 특수진료센터, 병상 수)
 * - HIRA 연계 정보
 * 
 * 데이터베이스 테이블: NEMC_EMERGENCY_BASE
 * 컬럼명: UPPER_SNAKE_CASE (예: DUTY_NAME, WGS84_LON)
 * 인터페이스 속성: camelCase (예: dutyName, wgs84Lon)
 */
export interface EmergencyBaseInfo {
  /** 응급의료기관 고유 ID (Hospital ID) */
  hpid: string;
  /** 기관명 */
  dutyName: string;
  /** 기관 주소 */
  dutyAddr: string;
  /** 대표전화번호 */
  dutyTel1: string;
  /** 응급실 전화번호 */
  dutyTel3: string;
  /** 우편번호 앞자리 */
  postCdn1: string;
  /** 우편번호 뒷자리 */
  postCdn2: string;
  /** 경도 (WGS84 좌표계) */
  wgs84Lon: number;
  /** 위도 (WGS84 좌표계) */
  wgs84Lat: number;
  /** 위치 정보 (POINT 형식, MySQL GEOMETRY 타입) */
  location?: string;
  /** 기관 안내/소개 정보 */
  dutyInf: string;
  /** 지도 이미지 URL */
  dutyMapimg: string;
  /** 응급실 운영 여부 (1: 운영, 0: 미운영) */
  dutyEryn: number;
  /** 입원실 운영 여부 (1: 운영, 0: 미운영) */
  dutyHayn: number;
  /** 총 병상 수 */
  dutyHano: number;
  /** 뇌혈관센터 가용 병상 수 */
  hvec: number;
  /** 심혈관센터 가용 병상 수 */
  hvoc: number;
  /** 화상센터 가용 병상 수 */
  hvcc: number;
  /** 신경과 가용 병상 수 */
  hvncc: number;
  /** 중증소아센터 가용 병상 수 */
  hvccc: number;
  /** 중환자실 가용 병상 수 */
  hvicc: number;
  /** 외상센터 가용 병상 수 */
  hvgc: number;
  /** 월요일 진료시작시간 (HHMM 형식) */
  dutyTime1s: string;
  /** 월요일 진료종료시간 (HHMM 형식) */
  dutyTime1c: string;
  /** 화요일 진료시작시간 (HHMM 형식) */
  dutyTime2s: string;
  /** 화요일 진료종료시간 (HHMM 형식) */
  dutyTime2c: string;
  /** 수요일 진료시작시간 (HHMM 형식) */
  dutyTime3s: string;
  /** 수요일 진료종료시간 (HHMM 형식) */
  dutyTime3c: string;
  /** 목요일 진료시작시간 (HHMM 형식) */
  dutyTime4s: string;
  /** 목요일 진료종료시간 (HHMM 형식) */
  dutyTime4c: string;
  /** 금요일 진료시작시간 (HHMM 형식) */
  dutyTime5s: string;
  /** 금요일 진료종료시간 (HHMM 형식) */
  dutyTime5c: string;
  /** 토요일 진료시작시간 (HHMM 형식) */
  dutyTime6s: string;
  /** 토요일 진료종료시간 (HHMM 형식) */
  dutyTime6c: string;
  /** 일요일 진료시작시간 (HHMM 형식) */
  dutyTime7s: string;
  /** 일요일 진료종료시간 (HHMM 형식) */
  dutyTime7c: string;
  /** 공휴일 진료시작시간 (HHMM 형식) */
  dutyTime8s: string;
  /** 공휴일 진료종료시간 (HHMM 형식) */
  dutyTime8c: string;
  /** 소아응급 구분 (Y: 운영, N: 미운영) */
  MKioskTy25: string;
  /** 뇌출혈 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy1: string;
  /** 뇌경색 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy2: string;
  /** 심근경색 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy3: string;
  /** 중증외상 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy4: string;
  /** 화상 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy5: string;
  /** 정신과 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy6: string;
  /** 중증환자 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy7: string;
  /** 소아 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy8: string;
  /** 분만 진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy9: string;
  /** 고압산소치료 여부 (Y: 치료, N: 미치료) */
  MKioskTy10: string;
  /** 기타 특수진료 여부 (Y: 진료, N: 미진료) */
  MKioskTy11: string;
  /** 진료과/센터 상세 정보 */
  dgidIdName: string;
  /** 분만실 병상 수 */
  hpbdn: number;
  /** 흉부외과 중환자실 병상 수 */
  hpccuyn: number;
  /** 중환자실 병상 수 */
  hpcuyn: number;
  /** 응급실 운영 여부 (1: 운영, 0: 미운영) */
  hperyn: number;
  /** 입원실 운영 여부 (1: 운영, 0: 미운영) */
  hpgryn: number;
  /** 신생아중환자실 병상 수 */
  hpicuyn: number;
  /** 소아중환자실 병상 수 */
  hpnicuyn: number;
  /** 수술실 운영 여부 (1: 운영, 0: 미운영) */
  hpopyn: number;
  /** HIRA 요양기관 기호 (연계용) */
  hira_ykiho?: string;
}

/**
 * 외상센터 기본정보 인터페이스
 * 
 * NEMC(National Emergency Medical Center) API에서 제공하는
 * 외상센터의 상세 정보를 담는 인터페이스입니다.
 * 
 * 외상센터는 중증외상 환자를 전문적으로 치료하는 의료기관으로,
 * 응급의료기관과 유사한 구조를 가지고 있지만 외상 치료에 특화되어 있습니다.
 * 
 * 데이터베이스 테이블: NEMC_TRAUMA_BASE
 * 컬럼명: UPPER_SNAKE_CASE (예: DUTY_NAME, WGS84_LON)
 * 인터페이스 속성: camelCase (예: dutyName, wgs84Lon)
 */
export interface TraumaBaseInfo extends EmergencyBaseInfo {
  // EmergencyBaseInfo를 상속받아 동일한 구조를 가집니다.
  // 외상센터 전용 필드가 필요한 경우 여기에 추가할 수 있습니다.
}

/**
 * HIRA 병원 정보 인터페이스
 * 
 * HIRA(Health Insurance Review & Assessment Service)에서 제공하는
 * 병원의 상세 정보를 담는 인터페이스입니다.
 * 
 * HIRA는 건강보험심사평가원으로, 전국의 모든 의료기관 정보를
 * 표준화된 형태로 제공하는 공식 기관입니다.
 * 
 * 주요 정보:
 * - 기관 식별 정보 (YKIHO, 기관명, 주소, 연락처)
 * - 위치 정보 (경도, 위도, POINT 형식)
 * - 의료진 정보 (의사 수, 간호사 수 등)
 * - 진료과별 전문의 수
 * - 행정구역 정보 (시도, 시군구, 읍면동)
 * 
 * 데이터베이스 테이블: HIRA_HOSPITAL_INFO
 * 컬럼명: UPPER_SNAKE_CASE (예: YADM_NM, X_POS)
 * 인터페이스 속성: camelCase (예: yadmNm, xPos)
 */
export interface HiraHospitalInfo {
  /** HIRA 요양기관 기호 (암호화된 식별자) */
  ykiho: string;
  /** 기관명 */
  yadmNm: string;
  /** 전화번호 */
  telno: string;
  /** 홈페이지 URL */
  hospUrl: string;
  /** 종별 코드 (의료기관 분류 코드) */
  clCd: string;
  /** 종별 명칭 (의료기관 분류명) */
  clCdNm: string;
  /** 시도 코드 */
  sidoCd: string;
  /** 시도 명칭 (예: 서울특별시, 경기도) */
  sidoCdNm: string;
  /** 시군구 코드 */
  sgguCd: string;
  /** 시군구 명칭 (예: 강남구, 수원시) */
  sgguCdNm: string;
  /** 주소 */
  addr: string;
  /** 읍면동명 */
  emdongNm: string;
  /** 우편번호 */
  postNo: string;
  /** 경도 (X 좌표) */
  xPos: number;
  /** 위도 (Y 좌표) */
  yPos: number;
  /** 위치 정보 (POINT 형식, MySQL GEOMETRY 타입) */
  location?: string;
  /** 의사 총원 수 */
  drTotCnt: number;
  /** 내과 전문의 수 */
  mdeptGdrCnt: number;
  /** 내과 인턴 수 */
  mdeptIntnCnt: number;
  /** 내과 레지던트 수 */
  mdeptResdntCnt: number;
  /** 내과 기타 의사 수 */
  mdeptSdrCnt: number;
  /** 치과의사 수 */
  detyGdrCnt: number;
  /** 치과 인턴 수 */
  detyIntnCnt: number;
  /** 치과 레지던트 수 */
  detyResdntCnt: number;
  /** 치과 기타 의사 수 */
  detySdrCnt: number;
  /** 한의사 수 */
  cmdcGdrCnt: number;
  /** 한방 인턴 수 */
  cmdcIntnCnt: number;
  /** 한방 레지던트 수 */
  cmdcResdntCnt: number;
  /** 한방 기타 의사 수 */
  cmdcSdrCnt: number;
  /** 간호사 수 */
  pnursCnt: number;
  /** 개설일자 (YYYYMMDD 형식) */
  estbDd: string;
}

/**
 * HIRA 약국 정보 인터페이스
 * 
 * HIRA(Health Insurance Review & Assessment Service)에서 제공하는
 * 약국의 상세 정보를 담는 인터페이스입니다.
 * 
 * 약국은 의약품 조제 및 판매를 전문으로 하는 의료기관으로,
 * 일반의약품과 전문의약품을 구분하여 취급합니다.
 * 
 * 주요 정보:
 * - 기관 식별 정보 (YKIHO, 약국명, 주소, 연락처)
 * - 위치 정보 (경도, 위도, POINT 형식)
 * - 분류 정보 (종별코드, 종별명)
 * - 행정구역 정보 (시도, 시군구, 읍면동)
 * - 허가 정보 (개설일자, 사업자등록번호)
 * 
 * 데이터베이스 테이블: HIRA_PHARMACY_INFO
 * 컬럼명: UPPER_SNAKE_CASE (예: YADM_NM, X_POS)
 * 인터페이스 속성: camelCase (예: yadmNm, xPos)
 */
export interface HiraPharmacyInfo {
  /** HIRA 요양기관 기호 (암호화된 식별자) */
  ykiho: string;
  /** 약국명/기관명 */
  yadmNm: string;
  /** 종별코드 (예: 81-약국) */
  clCd: string;
  /** 종별 코드명 */
  clCdNm: string;
  /** 시도코드 */
  sidoCd: string;
  /** 시도명 (예: 서울특별시, 경기도) */
  sidoCdNm: string;
  /** 시군구코드 */
  sgguCd: string;
  /** 시군구명 (예: 강남구, 수원시) */
  sgguCdNm: string;
  /** 읍면동명 */
  emdongNm: string;
  /** 우편번호 */
  postNo: string;
  /** 주소 */
  addr: string;
  /** 전화번호 */
  telno: string;
  /** 개설일자 (YYYYMMDD 형식) */
  estbDd: string;
  /** 경도 (X 좌표, 소수 13자리) */
  xPos: number;
  /** 위도 (Y 좌표, 소수 13자리) */
  yPos: number;
  /** 위치 정보 (POINT 형식, MySQL GEOMETRY 타입) */
  location?: string;
}

/**
 * DUR 품목 기본정보 인터페이스
 * 
 * DUR(Drug Utilization Review) 시스템에서 사용하는
 * 의약품 품목의 기본 정보를 담는 인터페이스입니다.
 * 
 * DUR은 약물 상호작용, 복용금기, 용량주의 등을
 * 검토하여 안전한 약물 사용을 도모하는 시스템입니다.
 * 
 * 주요 정보:
 * - 품목 식별 정보 (품목코드, 품목명)
 * - 제조/수입사 정보
 * - 제형 및 분류 정보
 * - 허가 및 변경 정보
 */
export interface ItemBaseInfo {
  /** 품목 기준코드 (DUR 시스템 식별자) */
  itemSeq: string;
  /** 품목명 */
  itemName: string;
  /** 제조/수입사명 */
  entpName: string;
  /** 성상 (약물의 물리적 특성) */
  chart: string;
  /** 제형 코드 */
  formCode: string;
  /** 전문/일반 코드 (전문의약품/일반의약품 구분) */
  etcOtcCode: string;
  /** 분류 코드 (약물 분류 체계) */
  classCode: string;
  /** 제형명 */
  formName: string;
  /** 전문/일반 구분명 */
  etcOtcName: string;
  /** 분류명 */
  className: string;
  /** 주성분 원문 */
  mainIngr: string;
  /** 품목 허가일 (원문) */
  itemPermitDate: string;
  /** 변경일 (원문) */
  changeDate: string;
  /** 사업자등록번호 */
  bizrno: string;
}

/**
 * DUR 품목 병용금기 인터페이스
 * 
 * 두 개 이상의 의약품을 함께 사용할 때 발생할 수 있는
 * 상호작용이나 금기사항을 정의하는 인터페이스입니다.
 * 
 * 병용금기는 약물 간의 부작용을 방지하고
 * 안전한 약물 치료를 보장하는 중요한 정보입니다.
 */
export interface ItemMixContraindication extends ItemBaseInfo {
  /** DUR 일련번호 */
  durSeq: string;
  /** 유형 코드 (예: A-병용금기) */
  typeCode: string;
  /** 유형명 */
  typeName: string;
  /** 혼합 유형 (단일/복합) */
  mix: string;
  /** 성분 코드 */
  ingrCode: string;
  /** 성분명 (한글) */
  ingrKorName: string;
  /** 성분명 (영문) */
  ingrEngName: string;
  /** 혼합 성분 정보 */
  mixIngr: string;
  /** 상대 품목 DUR 일련번호 */
  mixtureDurSeq: string;
  /** 상대 혼합 유형 */
  mixtureMix: string;
  /** 상대 성분 코드 */
  mixtureIngrCode: string;
  /** 상대 성분명 (한글) */
  mixtureIngrKorName: string;
  /** 상대 성분명 (영문) */
  mixtureIngrEngName: string;
  /** 상대 품목 기준코드 */
  mixtureItemSeq: string;
  /** 상대 품목명 */
  mixtureItemName: string;
  /** 상대 제조/수입사명 */
  mixtureEntpName: string;
  /** 상대 제형 코드 */
  mixtureFormCode: string;
  /** 상대 전문/일반 코드 */
  mixtureEtcOtcCode: string;
  /** 상대 분류 코드 */
  mixtureClassCode: string;
  /** 상대 제형명 */
  mixtureFormName: string;
  /** 상대 전문/일반 구분명 */
  mixtureEtcOtcName: string;
  /** 상대 분류명 */
  mixtureClassName: string;
  /** 상대 주성분 원문 */
  mixtureMainIngr: string;
  /** 고시일자 (YYYYMMDD 형식) */
  notificationDate: string;
  /** 금기/주의 내용 */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 상대 품목 허가일 (원문) */
  mixtureItemPermitDate: string;
  /** 상대 성상 */
  mixtureChart: string;
  /** 변경일 (원문) */
  changeDate: string;
  /** 상대 변경일 (원문) */
  mixtureChangeDate: string;
}

/**
 * DUR 품목 노인주의 인터페이스
 * 
 * 노인 환자에게 특별한 주의가 필요한 의약품의
 * 정보를 정의하는 인터페이스입니다.
 * 
 * 노인은 신체 기능의 저하로 인해 약물의 부작용이
 * 더 쉽게 발생할 수 있어 특별한 주의가 필요합니다.
 */
export interface ItemElderlyCaution extends ItemBaseInfo {
  /** 유형명 */
  typeName: string;
  /** 혼합 유형 */
  mixType: string;
  /** 성분 코드 */
  ingrCode: string;
  /** 성분명 (영문) */
  ingrEngName: string;
  /** 성분명 (한글) */
  ingrName: string;
  /** 혼합 성분 정보 */
  mixIngr: string;
  /** 제형명 */
  formName: string;
  /** 분류 코드 */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 전문/일반 구분명 */
  etcOtcName: string;
  /** 주성분 원문 */
  mainIngr: string;
  /** 고시일자 (YYYYMMDD 형식) */
  notificationDate: string;
  /** 주의 내용 */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 성분명 (영문+국문) */
  ingrEngNameFull: string;
  /** 변경일 (원문) */
  changeDate: string;
}

/**
 * DUR 품목 메타정보 인터페이스
 * 
 * DUR 시스템에서 사용하는 의약품 품목의
 * 메타데이터를 담는 인터페이스입니다.
 * 
 * 이 인터페이스는 품목의 기본 정보와 함께
 * 효능효과, 용법용량, 주의사항 등의 문서 링크를 포함합니다.
 */
export interface ItemDurInfo extends ItemBaseInfo {
  /** 품목 허가일 (원문, 예: 1957April26th) */
  itemPermitDate: string;
  /** 전문/일반 코드 또는 명 */
  etcOtcCode: string;
  /** 분류번호 (예: [222]진해거담제) */
  classNo: string;
  /** 바코드 */
  barCode: string;
  /** 원료성분/규격 */
  materialName: string;
  /** 효능효과 문서 링크 */
  eeDocId: string;
  /** 용법용량 문서 링크 */
  udDocId: string;
  /** 주의사항 문서 링크 */
  nbDocId: string;
  /** 첨부문서 링크 */
  insertFile: string;
  /** 보관방법 */
  storageMethod: string;
  /** 유효기간 */
  validTerm: string;
  /** 재심사 대상 */
  reexamTarget: string;
  /** 재심사 기간/일자 (원문) */
  reexamDate: string;
  /** 포장단위 */
  packUnit: string;
  /** EDI 코드 */
  ediCode: string;
  /** 허가취소일 (원문) */
  cancelDate: string;
  /** 허가상태 (정상/취소 등) */
  cancelName: string;
  /** DUR 유형 코드 (예: C) */
  typeCode: string;
  /** DUR 유형명 (예: 임부금기) */
  typeName: string;
  /** 변경일 (원문, 예: 2018June14th) */
  changeDate: string;
}

/**
 * DUR 품목 특정연령대금기 인터페이스
 * 
 * 특정 연령대에 사용이 금기되거나 주의가 필요한
 * 의약품의 정보를 정의하는 인터페이스입니다.
 * 
 * 연령별 금기는 성장기 아동, 노인 등 특정 연령대에서
 * 약물의 부작용이 더 쉽게 발생할 수 있는 경우를 다룹니다.
 */
export interface ItemAgeContraindication extends ItemBaseInfo {
  /** 유형명 */
  typeName: string;
  /** 혼합 유형 */
  mixType: string;
  /** 성분 코드 */
  ingrCode: string;
  /** 성분명 (영문) */
  ingrEngName: string;
  /** 성분명 (한글) */
  ingrName: string;
  /** 혼합 성분 정보 */
  mixIngr: string;
  /** 제형명 */
  formName: string;
  /** 분류 코드 */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 전문/일반 구분명 */
  etcOtcName: string;
  /** 주성분 원문 */
  mainIngr: string;
  /** 고시일자 (YYYYMMDD 형식) */
  notificationDate: string;
  /** 금기/주의 내용 */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 성분명 (영문+국문) */
  ingrEngNameFull: string;
  /** 변경일 (원문) */
  changeDate: string;
}

/**
 * DUR 품목 용량주의 인터페이스
 * 
 * 특정 용량 이상 사용 시 주의가 필요한
 * 의약품의 정보를 정의하는 인터페이스입니다.
 * 
 * 용량주의는 약물의 과다 사용으로 인한 부작용을
 * 방지하고 적절한 용량 사용을 유도합니다.
 */
export interface ItemDoseCaution extends ItemBaseInfo {
  /** 유형명 */
  typeName: string;
  /** 혼합 유형 */
  mixType: string;
  /** 성분 코드 */
  ingrCode: string;
  /** 성분명 (영문) */
  ingrEngName: string;
  /** 성분명 (한글) */
  ingrName: string;
  /** 혼합 성분 정보 */
  mixIngr: string;
  /** 제형명 */
  formName: string;
  /** 분류 코드 */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 전문/일반 구분명 */
  etcOtcName: string;
  /** 주성분 원문 */
  mainIngr: string;
  /** 고시일자 (YYYYMMDD 형식) */
  notificationDate: string;
  /** 주의 내용 (최대 허용량 등) */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 성분명 (영문+국문) */
  ingrEngNameFull: string;
  /** 변경일 (원문) */
  changeDate: string;
}

/**
 * DUR 품목 투여기간주의 인터페이스
 * 
 * 특정 기간 이상 사용 시 주의가 필요한
 * 의약품의 정보를 정의하는 인터페이스입니다.
 * 
 * 투여기간주의는 장기간 약물 사용으로 인한
 * 내성, 의존성 등의 부작용을 방지합니다.
 */
export interface ItemDurationCaution extends ItemBaseInfo {
  /** 유형명 */
  typeName: string;
  /** 혼합 유형 */
  mixType: string;
  /** 성분 코드 */
  ingrCode: string;
  /** 성분명 (영문) */
  ingrEngName: string;
  /** 성분명 (한글) */
  ingrName: string;
  /** 혼합 성분 정보 */
  mixIngr: string;
  /** 제형명 */
  formName: string;
  /** 분류 코드 */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 전문/일반 구분명 */
  etcOtcName: string;
  /** 주성분 원문 */
  mainIngr: string;
  /** 고시일자 (YYYYMMDD 형식) */
  notificationDate: string;
  /** 주의 내용 (최대 투여기간 등) */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 성분명 (영문+국문) */
  ingrEngNameFull: string;
  /** 변경일 (원문) */
  changeDate: string;
}

/**
 * DUR 품목 효능군중복 인터페이스
 * 
 * 동일한 효능을 가진 여러 의약품을
 * 동시에 사용할 때 주의가 필요한 경우를 정의하는 인터페이스입니다.
 * 
 * 효능군중복은 약물의 과다 사용을 방지하고
 * 적절한 약물 선택을 유도합니다.
 */
export interface ItemTherapeuticDuplication extends ItemBaseInfo {
  /** DUR 일련번호 */
  durSeq: string;
  /** 효능군명 */
  effectName: string;
  /** 유형명 */
  typeName: string;
  /** 성분 코드 */
  ingrCode: string;
  /** 성분명 (한글) */
  ingrName: string;
  /** 성분명 (영문) */
  ingrEngName: string;
  /** 제형 코드명 */
  formCodeName: string;
  /** 혼합 유형 */
  mix: string;
  /** 혼합 성분 정보 */
  mixIngr: string;
  /** 분류 코드 */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 주성분 원문 */
  mainIngr: string;
  /** 고시일자 (YYYYMMDD 형식) */
  notificationDate: string;
  /** 금기/주의 내용 */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 성분명 (영문+국문) */
  ingrEngNameFull: string;
  /** 변경일 (원문) */
  changeDate: string;
  /** 사업자등록번호 */
  bizrno: string;
  /** 상세 계열/군 명칭 */
  sersName: string;
}

/**
 * DUR 품목 서방정 분할주의 인터페이스
 * 
 * 서방정(지속성 정제)을 분할하여 사용할 때
 * 주의가 필요한 경우를 정의하는 인터페이스입니다.
 * 
 * 서방정은 특별한 제형으로 설계되어 분할 시
 * 약물의 방출 패턴이 달라질 수 있습니다.
 */
export interface ItemSustainedReleaseSplitCaution extends ItemBaseInfo {
  /** 유형명 */
  typeName: string;
  /** 제형 코드명 (예: 장용성필름코팅정) */
  formCodeName: string;
  /** 분류 코드 */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 전문/일반 구분명 */
  etcOtcName: string;
  /** 혼합 유형: 복합/단일 */
  mix: string;
  /** 주성분 원문 (복합 가능) */
  mainIngr: string;
  /** 주의 내용 (예: 분할불가) */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 변경일 (원문) */
  changeDate: string;
  /** 사업자등록번호 */
  bizrno: string;
}

/**
 * DUR 품목 임부금기 인터페이스
 * 
 * 임신부에게 사용이 금기되거나 주의가 필요한
 * 의약품의 정보를 정의하는 인터페이스입니다.
 * 
 * 임부금기는 태아의 발달에 영향을 줄 수 있는
 * 약물 사용을 제한하여 안전한 임신을 보장합니다.
 */
export interface ItemPregnancyContraindication extends ItemBaseInfo {
  /** 유형명 */
  typeName: string;
  /** 혼합 유형 */
  mixType: string;
  /** 성분 코드 */
  ingrCode: string;
  /** 성분명 (영문) */
  ingrEngName: string;
  /** 성분명 (한글) */
  ingrName: string;
  /** 혼합 성분 정보 */
  mixIngr: string;
  /** 제형명 */
  formName: string;
  /** 분류 코드 */
  classCode: string;
  /** 분류명 */
  className: string;
  /** 전문/일반 구분명 */
  etcOtcName: string;
  /** 주성분 원문 */
  mainIngr: string;
  /** 고시일자 (YYYYMMDD 형식) */
  notificationDate: string;
  /** 금기 내용 */
  prohbtContent: string;
  /** 비고 */
  remark: string;
  /** 성분명 (영문+국문) */
  ingrEngNameFull: string;
  /** 변경일 (원문) */
  changeDate: string;
}

/**
 * 데이터 수집 결과 인터페이스
 * 
 * 데이터 수집 작업의 결과를 담는 인터페이스입니다.
 * 수집된 데이터, 총 개수, 페이지 정보 등을 포함합니다.
 */
export interface CollectionResult<T> {
  /** 수집 성공 여부 */
  success: boolean;
  /** 수집된 데이터 배열 */
  data: T[];
  /** 전체 데이터 개수 */
  totalCount: number;
  /** 총 페이지 수 */
  pageCount: number;
  /** 현재 페이지 번호 */
  currentPage: number;
  /** 오류 메시지 (실패 시) */
  error?: string;
  /** 처리 시간 (밀리초) */
  processingTime: number;
}

/**
 * 데이터 저장 결과 인터페이스
 * 
 * 데이터베이스 저장 작업의 결과를 담는 인터페이스입니다.
 * 저장된 개수, 업데이트된 개수, 오류 개수 등을 포함합니다.
 */
export interface SaveResult {
  /** 전체 데이터 개수 */
  totalCount: number;
  /** 새로 저장된 데이터 개수 */
  savedCount: number;
  /** 업데이트된 데이터 개수 */
  updatedCount: number;
  /** 오류 발생한 데이터 개수 */
  errorCount: number;
  /** 건너뛴 데이터 개수 */
  skippedCount: number;
  /** 처리 시간 (밀리초) */
  processingTime: number;
}

/**
 * API 응답 인터페이스
 * 
 * 외부 API 호출 시 받는 응답의 구조를 정의하는 인터페이스입니다.
 * HIRA, NEMC 등의 공공데이터 API 응답 형식을 따릅니다.
 */
export interface ApiResponse<T> {
  /** API 응답 구조 */
  response: {
    /** 응답 헤더 정보 */
    header: {
      /** 결과 코드 */
      resultCode: string;
      /** 결과 메시지 */
      resultMsg: string;
    };
    /** 응답 본문 */
    body: {
      /** 데이터 항목들 */
      items: {
        /** 실제 데이터 (단일 또는 배열) */
        item: T | T[];
      };
      /** 페이지당 행 수 */
      numOfRows: number;
      /** 페이지 번호 */
      pageNo: number;
      /** 전체 데이터 개수 */
      totalCount: number;
    };
  };
}

/**
 * 페이지네이션 매개변수 인터페이스
 * 
 * 데이터 수집 시 페이지 단위로 데이터를 가져오기 위한
 * 매개변수를 정의하는 인터페이스입니다.
 */
export interface PaginationParams {
  /** 페이지 번호 */
  pageNo: number;
  /** 페이지당 행 수 */
  numOfRows: number;
}

/**
 * 데이터 수집 통계 인터페이스
 * 
 * 데이터 수집 작업의 전체적인 통계 정보를 담는 인터페이스입니다.
 * 수집된 레코드 수, 처리 시간, 마지막 업데이트 시각 등을 포함합니다.
 */
export interface CollectionStats {
  /** 전체 레코드 수 */
  totalRecords: number;
  /** 저장된 레코드 수 */
  savedRecords: number;
  /** 업데이트된 레코드 수 */
  updatedRecords: number;
  /** 오류 발생한 레코드 수 */
  errorRecords: number;
  /** 처리 시간 (밀리초) */
  processingTime: number;
  /** 마지막 업데이트 시각 */
  lastUpdated: Date;
}
