/**
 * VWorld 지도 서비스
 * VWorld API를 사용한 지도 및 주소 변환
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface AddressInfo {
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
  dong: string;
  zipcode: string;
}

@Injectable()
export class VWorldService {
  private readonly logger = new Logger(VWorldService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('VWORLD_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('VWORLD_API_URL') || 'https://api.vworld.kr';
  }

  /**
   * 좌표를 주소로 변환 (Reverse Geocoding)
   * @param longitude 경도
   * @param latitude 위도
   * @returns 주소 정보
   */
  async coordinateToAddress(longitude: number, latitude: number): Promise<AddressInfo | null> {
    try {
      const url = `${this.apiUrl}/req/address`;
      const params = {
        service: 'address',
        request: 'getAddress',
        version: '2.0',
        crs: 'epsg:4326',
        point: `${longitude},${latitude}`,
        format: 'json',
        type: 'both',
        zipcode: 'true',
        simple: 'false',
        key: this.apiKey,
      };

      const response = await axios.get(url, { params, timeout: 10000 });

      if (response.data.response.status === 'OK') {
        const result = response.data.response.result[0];
        
        return {
          roadAddress: result.text || '',
          jibunAddress: result.structure?.level4A || '',
          sido: result.structure?.level1 || '',
          sigungu: result.structure?.level2 || '',
          dong: result.structure?.level4L || '',
          zipcode: result.zipcode || '',
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`좌표를 주소로 변환 실패: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 주소를 좌표로 변환 (Geocoding)
   * @param address 주소
   * @returns 좌표 정보
   */
  async addressToCoordinate(address: string): Promise<{ longitude: number; latitude: number } | null> {
    try {
      const url = `${this.apiUrl}/req/address`;
      const params = {
        service: 'address',
        request: 'getCoord',
        version: '2.0',
        crs: 'epsg:4326',
        address: address,
        format: 'json',
        type: 'ROAD',
        key: this.apiKey,
      };

      const response = await axios.get(url, { params, timeout: 10000 });

      if (response.data.response.status === 'OK') {
        const result = response.data.response.result.point;
        
        return {
          longitude: parseFloat(result.x),
          latitude: parseFloat(result.y),
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`주소를 좌표로 변환 실패: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 지도 타일 URL 생성
   * @param zoom 줌 레벨
   * @param x X 타일 좌표
   * @param y Y 타일 좌표
   * @returns 타일 URL
   */
  getMapTileUrl(zoom: number, x: number, y: number): string {
    return `${this.apiUrl}/req/wmts/1.0.0/${this.apiKey}/Base/${zoom}/${y}/${x}.png`;
  }

  /**
   * 정적 지도 이미지 URL 생성
   * @param longitude 중심 경도
   * @param latitude 중심 위도
   * @param width 이미지 너비
   * @param height 이미지 높이
   * @param zoom 줌 레벨
   * @returns 정적 지도 URL
   */
  getStaticMapUrl(
    longitude: number,
    latitude: number,
    width: number = 600,
    height: number = 400,
    zoom: number = 15,
  ): string {
    return `${this.apiUrl}/req/wms` +
      `?service=WMS` +
      `&request=GetMap` +
      `&version=1.3.0` +
      `&layers=lt_c_aisroadrefer` +
      `&styles=lt_c_aisroadrefer` +
      `&crs=EPSG:4326` +
      `&bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}` +
      `&width=${width}` +
      `&height=${height}` +
      `&format=image/png` +
      `&transparent=true` +
      `&key=${this.apiKey}`;
  }
}

