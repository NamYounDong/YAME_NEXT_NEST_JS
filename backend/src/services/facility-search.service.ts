/**
 * 의료 시설 검색 서비스
 * 병원/약국 검색 및 운영시간 체크
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import * as moment from 'moment-timezone';

export interface FacilityInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number;
  longitude: number;
  latitude: number;
  isOpen: boolean;
  openingHours?: string;
  type: 'HOSPITAL' | 'PHARMACY';
}

@Injectable()
export class FacilitySearchService {
  private readonly logger = new Logger(FacilitySearchService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * 주변 약국 검색
   * @param latitude 위도
   * @param longitude 경도
   * @param radiusKm 반경 (km)
   * @param limit 최대 개수
   * @returns 약국 목록
   */
  async searchNearbyPharmacies(
    latitude: number,
    longitude: number,
    radiusKm: number = 3,
    limit: number = 10,
  ): Promise<FacilityInfo[]> {
    try {
      const query = `
        SELECT 
          YKIHO as id,
          YADM_NM as name,
          ADDR as address,
          TELNO as phone,
          X_POS as longitude,
          Y_POS as latitude,
          ST_Distance_Sphere(
            POINT(X_POS, Y_POS),
            POINT(?, ?)
          ) / 1000 as distance
        FROM HIRA_PHARMACY_INFO
        WHERE X_POS IS NOT NULL 
          AND Y_POS IS NOT NULL
          AND ST_Distance_Sphere(
            POINT(X_POS, Y_POS),
            POINT(?, ?)
          ) / 1000 <= ?
        ORDER BY distance ASC
        LIMIT ?
      `;

      const results = await this.databaseService.query(query, [
        longitude, latitude,
        longitude, latitude,
        radiusKm,
        limit,
      ]);

      // 운영 시간 체크
      const currentTime = moment().tz('Asia/Seoul');
      const enhancedResults = results.map(pharmacy => ({
        id: pharmacy.id,
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        distance: parseFloat(pharmacy.distance),
        longitude: parseFloat(pharmacy.longitude),
        latitude: parseFloat(pharmacy.latitude),
        isOpen: this.isPharmacyOpen(currentTime),
        type: 'PHARMACY' as const,
      }));

      return enhancedResults;
    } catch (error) {
      this.logger.error(`약국 검색 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 주변 병원 검색
   * @param latitude 위도
   * @param longitude 경도
   * @param radiusKm 반경 (km)
   * @param limit 최대 개수
   * @returns 병원 목록
   */
  async searchNearbyHospitals(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 10,
  ): Promise<FacilityInfo[]> {
    try {
      const query = `
        SELECT 
          YKIHO as id,
          YADM_NM as name,
          ADDR as address,
          TELNO as phone,
          X_POS as longitude,
          Y_POS as latitude,
          CL_CD_NM as type_name,
          ST_Distance_Sphere(
            POINT(X_POS, Y_POS),
            POINT(?, ?)
          ) / 1000 as distance
        FROM HIRA_HOSPITAL_INFO
        WHERE X_POS IS NOT NULL 
          AND Y_POS IS NOT NULL
          AND ST_Distance_Sphere(
            POINT(X_POS, Y_POS),
            POINT(?, ?)
          ) / 1000 <= ?
        ORDER BY 
          CASE 
            WHEN CL_CD_NM LIKE '%상급종합%' THEN 1
            WHEN CL_CD_NM LIKE '%종합병원%' THEN 2
            WHEN CL_CD_NM LIKE '%병원%' THEN 3
            ELSE 4
          END,
          distance ASC
        LIMIT ?
      `;

      const results = await this.databaseService.query(query, [
        longitude, latitude,
        longitude, latitude,
        radiusKm,
        limit,
      ]);

      // 운영 시간 체크
      const currentTime = moment().tz('Asia/Seoul');
      const enhancedResults = results.map(hospital => ({
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        phone: hospital.phone,
        distance: parseFloat(hospital.distance),
        longitude: parseFloat(hospital.longitude),
        latitude: parseFloat(hospital.latitude),
        isOpen: this.isHospitalOpen(currentTime),
        type: 'HOSPITAL' as const,
      }));

      return enhancedResults;
    } catch (error) {
      this.logger.error(`병원 검색 실패: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 약국 운영 시간 체크
   * 일반적인 약국 운영 시간: 평일 09:00-19:00, 토요일 09:00-13:00, 일요일 휴무
   */
  private isPharmacyOpen(currentTime: moment.Moment): boolean {
    const dayOfWeek = currentTime.day(); // 0=일요일, 6=토요일
    const hour = currentTime.hour();
    const minute = currentTime.minute();

    // 일요일
    if (dayOfWeek === 0) {
      return false;
    }

    // 토요일
    if (dayOfWeek === 6) {
      return hour >= 9 && (hour < 13 || (hour === 13 && minute === 0));
    }

    // 평일
    return hour >= 9 && hour < 19;
  }

  /**
   * 병원 운영 시간 체크
   * 일반적인 병원 운영 시간: 평일 09:00-18:00, 토요일 09:00-13:00, 일요일 휴무
   * 응급실은 24시간
   */
  private isHospitalOpen(currentTime: moment.Moment): boolean {
    const dayOfWeek = currentTime.day();
    const hour = currentTime.hour();
    const minute = currentTime.minute();

    // 일요일
    if (dayOfWeek === 0) {
      // 응급실이 있는 병원은 24시간 운영으로 간주
      return true;
    }

    // 토요일
    if (dayOfWeek === 6) {
      return hour >= 9 && (hour < 13 || (hour === 13 && minute === 0));
    }

    // 평일
    return hour >= 9 && hour < 18;
  }

  /**
   * 가장 가까운 운영 중인 시설 찾기
   * @param facilities 시설 목록
   * @returns 운영 중인 시설 목록
   */
  filterOpenFacilities(facilities: FacilityInfo[]): FacilityInfo[] {
    const openFacilities = facilities.filter(f => f.isOpen);
    
    if (openFacilities.length > 0) {
      return openFacilities;
    }

    // 운영 중인 시설이 없으면 가장 가까운 시설 반환
    return facilities.slice(0, 3);
  }
}

