'use client';

/**
 * VWorld 기반 지도 컴포넌트
 * 국토교통부 VWorld API를 활용한 지도 표시 및 의료기관 위치 표시 컴포넌트
 */

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  MapPinIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  XMarkIcon,
  PhoneIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

import { GpsPoint, RecommendedHospital } from '../../types/symptom';

/**
 * 지도 마커 타입
 */
interface MapMarker {
  id: string;
  position: GpsPoint;
  type: 'user' | 'hospital' | 'pharmacy';
  title: string;
  description?: string;
  phone?: string;
  distance?: number;
}

/**
 * 컴포넌트 props 인터페이스
 */
interface VWorldMapProps {
  center: GpsPoint;                      // 지도 중심 좌표
  zoom?: number;                         // 확대/축소 레벨 (기본 15)
  hospitals?: RecommendedHospital[];     // 병원 목록
  pharmacies?: any[];                    // 약국 목록 (차후 타입 정의)
  showUserLocation?: boolean;            // 사용자 위치 표시 여부 (기본 true)
  onMarkerClick?: (marker: MapMarker) => void; // 마커 클릭 콜백
  className?: string;                    // CSS 클래스
  analysisResult?: any;                  // 분석 결과 (선택사항)
}

/**
 * VWorld 지도 컴포넌트
 */
export default function VWorldMap({
  center,
  zoom = 15,
  hospitals = [],
  pharmacies = [],
  showUserLocation = true,
  onMarkerClick,
  className = '',
}: VWorldMapProps) {
  // 지도 관련 참조
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 컴포넌트 상태
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  /**
   * VWorld API 스크립트 로드
   */
  useEffect(() => {
    const loadVWorldAPI = () => {
      return new Promise<void>((resolve, reject) => {
        // 이미 로드된 경우
        if (window.vworld) {
          resolve();
          return;
        }

        // VWorld API 스크립트 추가
        const script = document.createElement('script');
        script.src = `https://map.vworld.kr/js/vworldMapInit.js.do?version=2.0&apiKey=${process.env.NEXT_PUBLIC_VWORLD_API_KEY || 'YOUR_API_KEY'}`;
        script.async = true;
        
        script.onload = () => {
          // VWorld API 초기화 대기
          const checkVWorld = () => {
            if (window.vworld && window.vworld.init) {
              resolve();
            } else {
              setTimeout(checkVWorld, 100);
            }
          };
          checkVWorld();
        };
        
        script.onerror = () => {
          reject(new Error('VWorld API 로드에 실패했습니다.'));
        };

        document.head.appendChild(script);
      });
    };

    loadVWorldAPI()
      .then(() => {
        initializeMap();
      })
      .catch((error) => {
        console.error('VWorld API 로드 오류:', error);
        setMapError('지도 서비스를 불러올 수 없습니다. Leaflet으로 대체합니다.');
        initializeLeafletMap();
      });
  }, []);

  /**
   * VWorld 지도 초기화
   */
  const initializeMap = () => {
    if (!mapContainer.current) return;

    try {
      // VWorld 지도 생성
      const map = new window.vworld.VMap({
        container: mapContainer.current,
        center: [center.lng, center.lat],
        zoom: zoom,
        basemap: 'Base', // 기본 지도
      });

      mapInstance.current = map;
      setIsMapLoaded(true);

      // 지도 이벤트 리스너 추가
      map.on('click', handleMapClick);

    } catch (error) {
      console.error('VWorld 지도 초기화 오류:', error);
      setMapError('지도 초기화에 실패했습니다. Leaflet으로 대체합니다.');
      initializeLeafletMap();
    }
  };

  /**
   * Leaflet 지도 초기화 (VWorld 실패 시 대체)
   */
  const initializeLeafletMap = async () => {
    try {
      // 동적으로 Leaflet 로드
      const L = await import('leaflet');
      require('leaflet/dist/leaflet.css');

      if (!mapContainer.current) return;

      // Leaflet 지도 생성
      const map = L.map(mapContainer.current).setView([center.lat, center.lng], zoom);

      // OpenStreetMap 타일 레이어 추가
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      mapInstance.current = map;
      setIsMapLoaded(true);
      setMapError(null);

    } catch (error) {
      console.error('Leaflet 지도 초기화 오류:', error);
      setMapError('지도를 불러올 수 없습니다.');
    }
  };

  /**
   * 지도 클릭 이벤트 처리
   */
  const handleMapClick = (event: any) => {
    setSelectedMarker(null);
  };

  /**
   * 마커 추가/업데이트
   */
  useEffect(() => {
    if (!isMapLoaded || !mapInstance.current) return;

    // 기존 마커 제거
    clearMarkers();

    const markers: MapMarker[] = [];

    // 사용자 위치 마커
    if (showUserLocation) {
      markers.push({
        id: 'user-location',
        position: center,
        type: 'user',
        title: '현재 위치',
        description: '귀하의 현재 위치입니다.',
      });
    }

    // 병원 마커
    hospitals.forEach((hospital, index) => {
      markers.push({
        id: `hospital-${index}`,
        position: { lat: 0, lng: 0 }, // 실제 병원 좌표 (현재는 더미)
        type: 'hospital',
        title: hospital.name,
        description: hospital.address,
        phone: hospital.phone,
        distance: hospital.distance_m,
      });
    });

    // 약국 마커
    pharmacies.forEach((pharmacy, index) => {
      markers.push({
        id: `pharmacy-${index}`,
        position: { lat: 0, lng: 0 }, // 실제 약국 좌표 (현재는 더미)
        type: 'pharmacy',
        title: pharmacy.name,
        description: pharmacy.address,
        phone: pharmacy.phone,
        distance: pharmacy.distance_m,
      });
    });

    // 마커 렌더링
    renderMarkers(markers);
  }, [isMapLoaded, center, hospitals, pharmacies, showUserLocation]);

  /**
   * 기존 마커 제거
   */
  const clearMarkers = () => {
    markersRef.current.forEach(marker => {
      try {
        if (mapInstance.current && marker.remove) {
          marker.remove();
        }
      } catch (error) {
        console.error('마커 제거 오류:', error);
      }
    });
    markersRef.current = [];
  };

  /**
   * 마커 렌더링
   */
  const renderMarkers = (markers: MapMarker[]) => {
    if (!mapInstance.current) return;

    markers.forEach(marker => {
      try {
        let mapMarker;

        if (window.vworld && mapInstance.current.addMarker) {
          // VWorld 마커
          mapMarker = mapInstance.current.addMarker({
            position: [marker.position.lng, marker.position.lat],
            icon: getMarkerIcon(marker.type),
            title: marker.title,
          });
        } else if (mapInstance.current.addTo) {
          // Leaflet 마커
          const L = require('leaflet');
          mapMarker = L.marker([marker.position.lat, marker.position.lng], {
            icon: getLeafletIcon(marker.type),
            title: marker.title,
          }).addTo(mapInstance.current);
        }

        if (mapMarker) {
          // 마커 클릭 이벤트
          mapMarker.on('click', () => {
            setSelectedMarker(marker);
            onMarkerClick?.(marker);
          });

          markersRef.current.push(mapMarker);
        }
      } catch (error) {
        console.error('마커 생성 오류:', error);
      }
    });
  };

  /**
   * VWorld 마커 아이콘 가져오기
   */
  const getMarkerIcon = (type: 'user' | 'hospital' | 'pharmacy') => {
    const iconMap = {
      user: 'user-location',
      hospital: 'hospital',
      pharmacy: 'pharmacy',
    };
    return iconMap[type];
  };

  /**
   * Leaflet 마커 아이콘 가져오기
   */
  const getLeafletIcon = (type: 'user' | 'hospital' | 'pharmacy') => {
    const L = require('leaflet');
    
    const iconMap = {
      user: '🔵',
      hospital: '🏥',
      pharmacy: '💊',
    };

    return L.divIcon({
      html: `<div style="font-size: 24px;">${iconMap[type]}</div>`,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  /**
   * 전화 연결
   */
  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  /**
   * 길찾기
   */
  const handleNavigation = (position: GpsPoint) => {
    const url = `https://map.kakao.com/link/to/목적지,${position.lat},${position.lng}`;
    window.open(url, '_blank');
  };

  /**
   * 거리 포맷팅
   */
  const formatDistance = (meters?: number): string => {
    if (!meters) return '';
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 지도 컨테이너 */}
      <div
        ref={mapContainer}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />

      {/* 로딩 상태 */}
      {!isMapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">지도를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 오류 상태 */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center p-4">
            <XMarkIcon className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-2">{mapError}</p>
            <button
              onClick={() => {
                setMapError(null);
                initializeMap();
              }}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 선택된 마커 정보 팝업 */}
      {selectedMarker && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-start space-x-2">
              {selectedMarker.type === 'hospital' && (
                <BuildingOffice2Icon className="w-6 h-6 text-blue-600 mt-1" />
              )}
              {selectedMarker.type === 'pharmacy' && (
                <BuildingStorefrontIcon className="w-6 h-6 text-green-600 mt-1" />
              )}
              {selectedMarker.type === 'user' && (
                <MapPinIcon className="w-6 h-6 text-gray-600 mt-1" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{selectedMarker.title}</h3>
                {selectedMarker.description && (
                  <p className="text-sm text-gray-600">{selectedMarker.description}</p>
                )}
                {selectedMarker.distance && (
                  <p className="text-sm text-gray-500">
                    거리: {formatDistance(selectedMarker.distance)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedMarker(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 액션 버튼 */}
          {selectedMarker.type !== 'user' && (
            <div className="flex space-x-2 mt-3">
              {selectedMarker.phone && (
                <button
                  onClick={() => handleCall(selectedMarker.phone!)}
                  className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition duration-200"
                >
                  <PhoneIcon className="w-4 h-4" />
                  <span>전화</span>
                </button>
              )}
              <button
                onClick={() => handleNavigation(selectedMarker.position)}
                className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition duration-200"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                <span>길찾기</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 범례 */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 text-sm">
        <h4 className="font-medium text-gray-900 mb-2">범례</h4>
        <div className="space-y-1">
          {showUserLocation && (
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">🔵</span>
              <span className="text-gray-700">현재 위치</span>
            </div>
          )}
          {hospitals.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">🏥</span>
              <span className="text-gray-700">병원</span>
            </div>
          )}
          {pharmacies.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-green-600">💊</span>
              <span className="text-gray-700">약국</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Window 객체에 vworld 타입 추가
declare global {
  interface Window {
    vworld: any;
  }
}
