/**
 * 데이터 수집 모듈
 * 
 * 이 모듈은 YAME 시스템의 다양한 의료 데이터를 외부 API로부터 수집하는 
 * 기능들을 통합 관리하는 NestJS 모듈입니다.
 * 
 * 주요 역할:
 * 1. 데이터 수집 서비스 통합: HIRA, DUR, E-Gen 등 다양한 데이터 소스의 수집 서비스 통합
 * 2. 의존성 주입 관리: 데이터 수집에 필요한 서비스들의 의존성 및 생명주기 관리
 * 3. 모듈 간 통신: 다른 모듈들과의 데이터 교환 및 이벤트 처리
 * 4. 설정 관리: 데이터 수집 관련 환경 변수 및 설정 값 관리
 * 5. 확장성 지원: 새로운 데이터 소스 추가 시 모듈 확장 지원
 * 
 * 포함하는 서비스:
 * - DataCollectorService: 통합 데이터 수집 엔진
 * - DiseaseCrawlerService: 질병 정보 크롤링 서비스
 * - DurItemService: DUR 품목 정보 수집 서비스
 * - DurIngredientService: DUR 성분 정보 수집 서비스
 * - HiraHospitalService: HIRA 병원 정보 수집 서비스
 * - HiraPharmacyService: HIRA 약국 정보 수집 서비스
 * - EmergencyBaseService: 응급의료기관 정보 수집 서비스
 * - TraumaBaseService: 외상센터 정보 수집 서비스
 * 
 * 데이터 소스별 특징:
 * - HIRA (건강보험심사평가원): 병원, 약국 등 의료기관 정보
 * - DUR (Drug Utilization Review): 약물 상호작용, 금기 정보
 * - E-Gen (응급의료정보): 응급의료기관, 외상센터 정보
 * - 질병 정보: 질병 분류, 증상, 치료법 정보
 * 
 * 모듈 구성:
 * - Imports: 외부 모듈 및 의존성 가져오기
 * - Controllers: HTTP API 엔드포인트 제공
 * - Providers: 비즈니스 로직 서비스 제공
 * - Exports: 다른 모듈에서 사용할 수 있는 서비스 노출
 * 
 * 기술적 특징:
 * - 모듈화 설계: 각 데이터 소스별로 독립적인 서비스 구성
 * - 의존성 주입: NestJS의 DI 컨테이너를 활용한 느슨한 결합
 * - 비동기 처리: 대용량 데이터 수집을 위한 비동기 처리 지원
 * - 에러 처리: 각 서비스별 독립적인 에러 처리 및 복구
 * - 확장성: 새로운 데이터 소스 추가 시 기존 코드 영향 최소화
 * 
 * 설정 관리:
 * - 환경 변수: API 키, URL, 타임아웃 등 외부 설정 값
 * - 동적 설정: 런타임 중 설정 변경 및 적용
 * - 설정 검증: 필수 설정 값의 존재 여부 및 유효성 검증
 * - 기본값 제공: 설정 값이 없을 때의 안전한 기본값 제공
 * 
 * 사용 사례:
 * - 시스템 관리자가 데이터 수집 작업을 설정할 때
 * - 개발자가 새로운 데이터 소스를 추가할 때
 * - 운영팀이 데이터 수집 시스템을 모니터링할 때
 * - 데이터 품질 관리팀이 수집된 데이터를 검증할 때
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // 스케줄링 기능 (자동 데이터 수집)
import { DataCollectorController } from '../controllers/data-collector.controller'; // 데이터 수집 API 엔드포인트
import { DataCollectorService } from '../services/data-collector.service'; // 전체 데이터 수집 조율 서비스
import { HiraHospitalService } from '../services/hira-hospital.service'; // HIRA 병원 정보 수집 서비스
import { HiraPharmacyService } from '../services/hira-pharmacy.service'; // HIRA 약국 정보 수집 서비스
import { EmergencyBaseService } from '../services/emergency-base.service'; // 응급의료기관 정보 수집 서비스
import { TraumaBaseService } from '../services/trauma-base.service'; // 외상센터 정보 수집 서비스
import { DurIngredientService } from '../services/dur-ingredient.service'; // DUR 성분 기반 규칙 수집 서비스
import { DurItemService } from '../services/dur-item.service'; // DUR 품목 기반 규칙 수집 서비스
import { ApiCollectorUtil } from '../utils/api-collector.util'; // API 통신 공통 유틸리티
import { DatabaseModule } from './database.module'; // 데이터베이스 연결 모듈
import { EmergencyMapper } from '../database/emergency.mapper'; // 응급의료기관 데이터베이스 매퍼
import { TraumaMapper } from '../database/trauma.mapper'; // 외상센터 데이터베이스 매퍼
import { HospitalMapper } from '../database/hospital.mapper'; // 병원 데이터베이스 매퍼
import { PharmacyMapper } from '../database/pharmacy.mapper'; // 약국 데이터베이스 매퍼
import { DurIngredientMapper } from '../database/dur-ingredient.mapper'; // DUR 성분 데이터베이스 매퍼
import { DurItemMapper } from '../database/dur-item.mapper'; // DUR 품목 데이터베이스 매퍼

@Module({
  imports: [
    ScheduleModule.forRoot(), // 스케줄러 활성화 (매일 자동 데이터 수집)
    DatabaseModule // 데이터베이스 연결 및 쿼리 실행 기능
  ],
  controllers: [
    DataCollectorController // 데이터 수집 관련 HTTP API 엔드포인트 제공
  ],
  providers: [
    // 메인 데이터 수집 조율 서비스
    DataCollectorService, // 전체 데이터 수집 프로세스 관리 및 통합
    
    // HIRA(건강보험심사평가원) 데이터 수집 서비스들
    HiraHospitalService, // 병원 기본정보 수집 (병원명, 주소, 전화번호, 좌표, 진료과목 등)
    HiraPharmacyService, // 약국 기본정보 수집 (약국명, 주소, 전화번호, 좌표, 영업시간 등)
    
    // E-Gen(중앙응급의료정보센터) 데이터 수집 서비스들
    EmergencyBaseService, // 응급의료기관 실시간 현황 수집 (가용병상, 응급실 상태 등)
    TraumaBaseService, // 외상센터 정보 수집 (외상센터 목록, 위치, 진료과목 등)
    
    // DUR(약물이상반응) 데이터 수집 서비스들
    DurIngredientService, // 성분 기반 DUR 규칙 수집 (병용금기, 연령금기, 임부금기 등)
    DurItemService, // 품목 기반 DUR 규칙 수집 (효능군중복, 서방정분할주의 등)
    
    // 공통 유틸리티
    ApiCollectorUtil, // 외부 API 통신, 페이지네이션, 데이터 처리 공통 기능
    
    // 데이터베이스 매퍼들
    EmergencyMapper, // 응급의료기관 데이터베이스 CRUD 작업
    TraumaMapper, // 외상센터 데이터베이스 CRUD 작업
    HospitalMapper, // 병원 데이터베이스 CRUD 작업
    PharmacyMapper, // 약국 데이터베이스 CRUD 작업
    DurIngredientMapper, // DUR 성분 데이터베이스 CRUD 작업
    DurItemMapper // DUR 품목 데이터베이스 CRUD 작업
  ],
  exports: [
    // 다른 모듈에서 사용할 수 있도록 서비스들을 외부로 노출
    
    // 메인 서비스
    DataCollectorService, // 전체 데이터 수집 기능을 다른 모듈에서 사용 가능
    
    // HIRA 데이터 수집 서비스들
    HiraHospitalService, // 병원 데이터 수집 기능을 다른 모듈에서 사용 가능
    HiraPharmacyService, // 약국 데이터 수집 기능을 다른 모듈에서 사용 가능
    
    // E-Gen 데이터 수집 서비스들
    EmergencyBaseService, // 응급의료기관 데이터 수집 기능을 다른 모듈에서 사용 가능
    TraumaBaseService, // 외상센터 데이터 수집 기능을 다른 모듈에서 사용 가능
    
    // DUR 데이터 수집 서비스들
    DurIngredientService, // DUR 성분 규칙 수집 기능을 다른 모듈에서 사용 가능
    DurItemService // DUR 품목 규칙 수집 기능을 다른 모듈에서 사용 가능
  ]
})
export class DataCollectorModule {}
