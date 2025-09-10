'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CogIcon,
  ChartBarIcon,
  GlobeAltIcon,
  ClockIcon,
  ServerIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import DataCollectionPanel from '@/components/admin/DataCollectionPanel';
import { dataCollectionApi } from '@/utils/api';

interface CollectionStats {
  hospitals?: { total: number; lastUpdated: string | null };
  pharmacies?: { total: number; lastUpdated: string | null };
  durRules?: { total: number; lastUpdated: string | null };
  egenData?: { total: number; lastUpdated: string | null };
}

interface CollectionStatus {
  recentLogs?: Array<{
    collection_type: string;
    status: string;
    created_at: string;
    records_total?: number;
    records_success?: number;
  }>;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'system'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus | null>(null);
  const [isCollecting, setIsCollecting] = useState<string | null>(null);
  const [mapLayers, setMapLayers] = useState({
    hospitals: true,
    pharmacies: true,
    diseases: true
  });

  const systemStatus = {
    database: 'healthy' as const,
    redis: 'healthy' as const,
    externalApis: 'healthy' as const,
    scheduler: 'healthy' as const,
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await dataCollectionApi.getDashboardData();
      
      if (response.success) {
        setCollectionStats(response.data?.stats || {});
        setCollectionStatus(response.data?.status || {});
      } else {
        console.error('데이터 로드 실패:', response.error);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataCollection = async (type: 'all' | 'hospitals' | 'pharmacies' | 'dur-rules') => {
    if (isCollecting) return;

    setIsCollecting(type);
    try {
      let response;
      
      // 공통 API 함수 사용
      switch (type) {
        case 'all':
          response = await dataCollectionApi.collectAll();
          break;
        case 'hospitals':
          response = await dataCollectionApi.collectHospitals();
          break;
        case 'pharmacies':
          response = await dataCollectionApi.collectPharmacies();
          break;
        case 'dur-rules':
          response = await dataCollectionApi.collectDurRules();
          break;
        default:
          throw new Error('알 수 없는 데이터 수집 타입입니다.');
      }
      
      if (response.success) {
        console.log(`${getCollectionTypeName(type)} 수집 완료:`, response.data);
        
        // 성공 시 대시보드 데이터 새로고침
        await loadDashboardData();
        
        // 성공 메시지 표시
        if (response.data?.message) {
          console.log(response.data.message);
        }
      } else {
        console.error(`${getCollectionTypeName(type)} 수집 실패:`, response.error);
      }
    } catch (error) {
      console.error(`${getCollectionTypeName(type)} 수집 오류:`, error);
    } finally {
      setIsCollecting(null);
    }
  };

  const getCollectionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'all': '전체 데이터',
      'hospitals': '병원 데이터',
      'pharmacies': '약국 데이터',
      'dur-rules': 'DUR 규칙'
    };
    return typeMap[type] || type;
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
    }
  };

  const getCollectionStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircleIcon className="w-4 h-4 text-red-400" />;
      default:
        return <ArrowPathIcon className="w-4 h-4 text-yellow-400 animate-spin" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '업데이트 없음';
    return new Date(dateString).toLocaleString('ko-KR');
  };



  const EmptyState = ({ 
    title, 
    description, 
    icon: Icon 
  }: {
    title: string;
    description: string;
    icon: any;
  }) => (
    <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6 text-center">
      <Icon className="w-12 h-12 text-white/40 mx-auto mb-3" />
      <h3 className="text-white font-medium mb-1">{title}</h3>
      <p className="text-white/60 text-sm">{description}</p>
    </div>
  );

  const MapView = ({ 
    mapLayers, 
    setMapLayers, 
    collectionStats 
  }: {
    mapLayers: any;
    setMapLayers: any;
    collectionStats: any;
  }) => (
    <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setMapLayers({ ...mapLayers, hospitals: !mapLayers.hospitals })}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mapLayers.hospitals 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'bg-white/5 text-white/60 border border-white/10'
            }`}
          >
            병원
          </button>
          <button
            onClick={() => setMapLayers({ ...mapLayers, pharmacies: !mapLayers.pharmacies })}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mapLayers.pharmacies 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-white/5 text-white/60 border border-white/10'
            }`}
          >
            약국
          </button>
          <button
            onClick={() => setMapLayers({ ...mapLayers, diseases: !mapLayers.diseases })}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mapLayers.diseases 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : 'bg-white/5 text-white/60 border border-white/10'
            }`}
          >
            질병
          </button>
        </div>
      </div>
      
      <div className="bg-white/5 rounded-lg border border-white/10 h-64 flex items-center justify-center">
        <div className="text-center">
          <GlobeAltIcon className="w-12 h-12 text-white/40 mx-auto mb-2" />
          <p className="text-white/60 text-sm">VWorld 지도 연동 준비 중</p>
          <p className="text-white/40 text-xs mt-1">
            병원: {collectionStats?.hospitals?.total || 0}개 | 
            약국: {collectionStats?.pharmacies?.total || 0}개 | 
            오늘 증상: {collectionStats?.symptoms?.todayCount || 0}건
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-950">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-gray-900/80 to-purple-950/60"></div>
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/5 rounded-3xl transform rotate-12 backdrop-blur-sm"></div>
      <div className="absolute top-40 right-8 w-16 h-16 bg-purple-400/10 rounded-2xl transform -rotate-12 backdrop-blur-sm"></div>

      <div className="relative z-10">
        {/* 헤더 */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="w-full px-2 sm:px-4">
            <div className="flex justify-between items-center h-12 sm:h-16">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link
                  href="/"
                  className="p-1 sm:p-2 transition duration-200 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                  title="메인 페이지로"
                >
                  <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <CogIcon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm sm:text-xl font-bold text-white">
                      관리자 대시보드
                    </h1>
                    <p className="text-xs sm:text-sm text-white/60 hidden sm:block">
                      {activeTab === 'dashboard' ? '데이터 수집 현황 및 시스템 관리' : '시스템 상태 및 관리'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={loadDashboardData}
                disabled={isLoading}
                className="p-1 sm:p-2 rounded-lg transition-all duration-200 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50"
                title="새로고침"
              >
                <ArrowPathIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* 탭 네비게이션 */}
        <nav className="bg-black/10 backdrop-blur-md border-b border-white/5 relative z-50">
          <div className="w-full px-2 sm:px-4">
            <div className="flex space-x-1 justify-between a py-2">
              <div>
              <button
                onClick={() => setActiveTab('dashboard')}
                  className={`h-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}>대시보드</button>
              <button
                onClick={() => setActiveTab('system')}
                  className={`h-full px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === 'system'
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}>시스템</button>
              </div>

              <div className="lg:block hidden w-fit relative z-50">
                <DataCollectionPanel isCollecting={isCollecting} onDataCollection={handleDataCollection}/>
              </div>


            </div>
          </div>
        </nav>

        {/* 메인 콘텐츠 */}
        <main className="w-full px-2 sm:px-4 py-4">
          {activeTab === 'dashboard' ? (
            <>
              {/* 상단 데이터 수집 버튼들 */}
              <div className="w-full mb-2 sm:block lg:hidden relative z-50">
                <DataCollectionPanel isCollecting={isCollecting} onDataCollection={handleDataCollection}/>
              </div>

              {/* 이미지와 동일한 레이아웃: 왼쪽 지도, 오른쪽 여러 패널 */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 왼쪽: 큰 지도 패널 (모바일에서는 전체, 데스크톱에서는 2/4) */}
                <div className="lg:col-span-2">
                  <h3 className="text-sm font-semibold text-white flex items-center mb-3">
                    <GlobeAltIcon className="w-4 h-4 mr-1" />
                    지도
                  </h3>
                  
                  <MapView 
                    mapLayers={mapLayers}
                    setMapLayers={setMapLayers}
                    collectionStats={collectionStats}
                  />
                </div>

                {/* 오른쪽: 여러 작은 패널들 (모바일에서는 전체, 데스크톱에서는 2/4) */}
                <div className="lg:col-span-2 space-y-4">
                  {/* 상단 줄: 데이터 현황과 통계 요약 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 데이터 현황 */}
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center mb-3">
                        <ChartBarIcon className="w-4 h-4 mr-1" />
                        데이터 현황
                      </h3>
                      
                      {!collectionStats ? (
                        <EmptyState
                          title="데이터를 로드하고 있습니다"
                          description="잠시만 기다려주세요..."
                          icon={ChartBarIcon}
                        />
                      ) : (
                        ((!collectionStats.hospitals || collectionStats.hospitals?.total === 0) && 
                         (!collectionStats.pharmacies || collectionStats.pharmacies?.total === 0) && 
                         (!collectionStats.durRules || collectionStats.durRules?.total === 0) && 
                         (!collectionStats.egenData || collectionStats.egenData?.total === 0)) ? (
                          <EmptyState
                            title="수집된 데이터가 없습니다"
                            description="위의 데이터 수집 버튼을 클릭하여 데이터를 수집해주세요"
                            icon={ChartBarIcon}
                          />
                        ) : (
                          <div className="space-y-2">
                            {collectionStats?.hospitals?.total && collectionStats.hospitals.total > 0 && (
                              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white/60 text-xs">병원</p>
                                    <p className="text-sm font-bold text-white">{collectionStats.hospitals.total.toLocaleString()}</p>
                                    <p className="text-white/40 text-xs">마지막 업데이트: {formatDate(collectionStats.hospitals.lastUpdated)}</p>
                                  </div>
                                  <div className="p-2 bg-blue-500/20 rounded">
                                    <BuildingOfficeIcon className="w-4 h-4 text-blue-400" />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {collectionStats?.pharmacies?.total && collectionStats.pharmacies.total > 0 && (
                              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white/60 text-xs">약국</p>
                                    <p className="text-sm font-bold text-white">{collectionStats.pharmacies.total.toLocaleString()}</p>
                                    <p className="text-white/40 text-xs">마지막 업데이트: {formatDate(collectionStats.pharmacies.lastUpdated)}</p>
                                  </div>
                                  <div className="p-2 bg-green-500/20 rounded">
                                    <ShoppingBagIcon className="w-4 h-4 text-green-400" />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {collectionStats?.durRules?.total && collectionStats.durRules.total > 0 && (
                              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white/60 text-xs">DUR 규칙</p>
                                    <p className="text-sm font-bold text-white">{collectionStats.durRules.total.toLocaleString()}</p>
                                    <p className="text-white/40 text-xs">마지막 업데이트: {formatDate(collectionStats.durRules.lastUpdated)}</p>
                                  </div>
                                  <div className="p-2 bg-yellow-500/20 rounded">
                                    <WrenchScrewdriverIcon className="w-4 h-4 text-yellow-400" />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {collectionStats?.egenData?.total && collectionStats.egenData.total > 0 && (
                              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white/60 text-xs">E-Gen 데이터</p>
                                    <p className="text-sm font-bold text-white">{collectionStats?.egenData?.total.toLocaleString()}</p>
                                    <p className="text-white/40 text-xs">마지막 업데이트: {formatDate(collectionStats?.egenData?.lastUpdated)}</p>
                                  </div>
                                  <div className="p-2 bg-red-500/20 rounded">
                                    <TruckIcon className="w-4 h-4 text-red-400" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    {/* 통계 요약 */}
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center mb-3">
                        <ChartBarIcon className="w-4 h-4 mr-1" />
                        통계 요약
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3 text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {collectionStats?.hospitals?.total || 0}
                          </div>
                          <div className="text-white/60 text-xs">병원</div>
                        </div>
                        
                        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3 text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {collectionStats?.pharmacies?.total || 0}
                          </div>
                          <div className="text-white/60 text-xs">약국</div>
                        </div>
                        
                        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3 text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            {collectionStats?.durRules?.total || 0}
                          </div>
                          <div className="text-white/60 text-xs">DUR 규칙</div>
                        </div>
                        
                        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3 text-center">
                          <div className="text-2xl font-bold text-red-400">
                            {collectionStats?.egenData?.total || 0}
                          </div>
                          <div className="text-white/60 text-xs">E-Gen 데이터</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 하단 줄: 최근 수집 로그 */}
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center mb-3">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      최근 수집 로그
                    </h3>
                    
                    {!collectionStatus || !collectionStatus.recentLogs || collectionStatus.recentLogs.length === 0 ? (
                      <EmptyState
                        title="수집 로그가 없습니다"
                        description="데이터 수집을 실행하면 로그가 표시됩니다"
                        icon={ClockIcon}
                      />
                    ) : (
                      <div className="space-y-2">
                        {collectionStatus.recentLogs.slice(0, 3).map((log, index) => (
                          <div key={index} className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/80 text-xs font-medium">{log.collection_type}</span>
                              {getCollectionStatusIcon(log.status)}
                            </div>
                            <p className="text-white/60 text-xs">
                              {log.records_total ? `${log.records_success}/${log.records_total} 성공` : '처리 중...'}
                            </p>
                            <p className="text-white/40 text-xs">
                              {formatDate(log.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* 시스템 상태 */}
              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <ServerIcon className="w-5 h-5 mr-2" />
                  시스템 상태
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white/60 text-sm">데이터베이스</p>
                        <p className="text-lg font-bold text-white">MariaDB</p>
                      </div>
                      {getStatusIcon(systemStatus.database)}
                    </div>
                    <p className="text-white/40 text-xs">의료기관 및 약물 데이터 저장소</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white/60 text-sm">캐시</p>
                        <p className="text-lg font-bold text-white">Redis</p>
                      </div>
                      {getStatusIcon(systemStatus.redis)}
                    </div>
                    <p className="text-white/40 text-xs">세션 및 임시 데이터 저장소</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white/60 text-sm">외부 API</p>
                        <p className="text-lg font-bold text-white">HIRA, E-Gen, DUR</p>
                      </div>
                      {getStatusIcon(systemStatus.externalApis)}
                    </div>
                    <p className="text-white/40 text-xs">공공데이터 포털 API 연동</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white/60 text-sm">스케줄러</p>
                        <p className="text-lg font-bold text-white">Cron Jobs</p>
                      </div>
                      {getStatusIcon(systemStatus.scheduler)}
                    </div>
                    <p className="text-white/40 text-xs">자동 데이터 수집 스케줄링</p>
                  </div>
                </div>
              </div>

              {/* 시스템 관리 */}
              <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">시스템 관리</h2>
                <p className="text-white/60">시스템 관리 기능은 향후 구현 예정입니다.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}