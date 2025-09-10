'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { api } from '../../../utils/api';

interface SchedulerJob {
  id: string;
  type: string;
  name: string;
  description: string;
  cronExpression: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  lastRun?: string;
  nextRun?: string;
  duration?: number;
  enabled: boolean;
  error?: string;
}

interface SchedulerStats {
  totalJobs: number;
  enabledJobs: number;
  runningJobs: number;
  failedJobs: number;
  lastUpdated: string;
}

export default function SchedulerManagement() {
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [stats, setStats] = useState<SchedulerStats>({
    totalJobs: 0,
    enabledJobs: 0,
    runningJobs: 0,
    failedJobs: 0,
    lastUpdated: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadSchedulerData();
  }, []);

  const loadSchedulerData = async () => {
    try {
      setIsLoading(true);
      
      // 스케줄 작업 목록 로드
      const jobsResponse = await api.get('/scheduler/jobs');
      if (jobsResponse.success) {
        setJobs(jobsResponse.data.jobs || []);
      }

      // 스케줄러 통계 로드
      const statsResponse = await api.get('/scheduler/stats');
      if (statsResponse.success) {
        setStats(statsResponse.data.stats || stats);
      }
    } catch (error) {
      console.error('스케줄러 데이터 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteJob = async (jobId: string) => {
    try {
      await api.post(`/scheduler/jobs/${jobId}/execute`, {}, {
        loadingMessage: '작업을 실행하고 있습니다...'
      });
      
      // 성공 후 데이터 다시 로드
      loadSchedulerData();
    } catch (error) {
      console.error('작업 실행 실패:', error);
    }
  };

  const handleToggleJob = async (jobId: string, enabled: boolean) => {
    try {
      await api.put(`/scheduler/jobs/${jobId}/toggle`, { enabled }, {
        loadingMessage: `작업을 ${enabled ? '활성화' : '비활성화'}하고 있습니다...`
      });
      
      // 성공 후 데이터 다시 로드
      loadSchedulerData();
    } catch (error) {
      console.error('작업 설정 변경 실패:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'running':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'running':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    if (filter === 'enabled') return job.enabled;
    if (filter === 'disabled') return !job.enabled;
    return job.type === filter;
  });

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.round(duration / 1000)}초`;
    return `${Math.round(duration / 60000)}분`;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #f8f4fc 0%, #f3e8ff 100%)'}}>
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="p-2 transition duration-200 rounded-lg"
                style={{color: '#7a6f7f'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#311432';
                  e.currentTarget.style.backgroundColor = '#f3e8ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#7a6f7f';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="대시보드로"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold" style={{color: '#311432'}}>
                  스케줄러 관리
                </h1>
                <p className="text-sm" style={{color: '#7a6f7f'}}>
                  스케줄 작업 모니터링 및 관리
                </p>
              </div>
            </div>
            <button
              onClick={loadSchedulerData}
              className="p-2 rounded-lg transition-all duration-200"
              style={{color: '#311432'}}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3e8ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="새로고침"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4" style={{color: '#311432'}} />
              <p style={{color: '#7a6f7f'}}>스케줄러 데이터를 로드하고 있습니다...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-3" style={{backgroundColor: '#f3e8ff'}}>
                    <ClockIcon className="w-6 h-6" style={{color: '#311432'}} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{color: '#7a6f7f'}}>전체 작업</p>
                    <p className="text-2xl font-bold" style={{color: '#311432'}}>{stats.totalJobs}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-green-100">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{color: '#7a6f7f'}}>활성화된 작업</p>
                    <p className="text-2xl font-bold text-green-600">{stats.enabledJobs}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-blue-100">
                    <ArrowPathIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{color: '#7a6f7f'}}>실행 중</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.runningJobs}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-red-100">
                    <XCircleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium" style={{color: '#7a6f7f'}}>실패</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failedJobs}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 필터 */}
            <div className="bg-white rounded-lg shadow-sm border border-purple-100 p-6">
              <h3 className="text-lg font-semibold mb-4" style={{color: '#311432'}}>필터</h3>
              <div className="flex flex-wrap gap-2">
                {['all', 'enabled', 'disabled', 'data_collection', 'ml_training', 'data_cleanup', 'health_check'].map((filterOption) => (
                  <button
                    key={filterOption}
                    onClick={() => setFilter(filterOption)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      filter === filterOption 
                        ? 'text-white' 
                        : 'border-2'
                    }`}
                    style={filter === filterOption 
                      ? {backgroundColor: '#311432'} 
                      : {borderColor: '#311432', color: '#311432'}
                    }
                    onMouseEnter={(e) => {
                      if (filter !== filterOption) {
                        e.currentTarget.style.backgroundColor = '#311432';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filter !== filterOption) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#311432';
                      }
                    }}
                  >
                    {filterOption === 'all' ? '전체' :
                     filterOption === 'enabled' ? '활성화' :
                     filterOption === 'disabled' ? '비활성화' :
                     filterOption === 'data_collection' ? '데이터 수집' :
                     filterOption === 'ml_training' ? 'ML 학습' :
                     filterOption === 'data_cleanup' ? '데이터 정리' :
                     filterOption === 'health_check' ? '헬스 체크' : filterOption}
                  </button>
                ))}
              </div>
            </div>

            {/* 스케줄 작업 목록 */}
            <div className="bg-white rounded-lg shadow-sm border border-purple-100">
              <div className="px-6 py-4 border-b border-purple-100">
                <h3 className="text-lg font-semibold" style={{color: '#311432'}}>
                  스케줄 작업 ({filteredJobs.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-purple-100">
                  <thead className="bg-purple-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#311432'}}>
                        작업
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#311432'}}>
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#311432'}}>
                        스케줄
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#311432'}}>
                        마지막 실행
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#311432'}}>
                        다음 실행
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#311432'}}>
                        실행시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: '#311432'}}>
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-purple-100">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-purple-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium" style={{color: '#311432'}}>
                              {job.name}
                            </div>
                            <div className="text-sm" style={{color: '#7a6f7f'}}>
                              {job.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(job.status)}
                            <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                              {job.status === 'completed' ? '완료' :
                               job.status === 'failed' ? '실패' :
                               job.status === 'running' ? '실행중' :
                               job.status === 'pending' ? '대기' : job.status}
                            </span>
                          </div>
                          {job.error && (
                            <div className="mt-1 text-xs text-red-600 truncate max-w-xs">
                              {job.error}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" style={{color: '#7a6f7f'}}>
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {job.cronExpression}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" style={{color: '#7a6f7f'}}>
                          {formatDateTime(job.lastRun)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" style={{color: '#7a6f7f'}}>
                          {formatDateTime(job.nextRun)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm" style={{color: '#7a6f7f'}}>
                          {formatDuration(job.duration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleExecuteJob(job.id)}
                            disabled={job.status === 'running'}
                            className="p-1 rounded transition-colors disabled:opacity-50"
                            style={{color: '#311432'}}
                            onMouseEnter={(e) => {
                              if (!e.currentTarget.disabled) {
                                e.currentTarget.style.backgroundColor = '#f3e8ff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="실행"
                          >
                            <PlayIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleJob(job.id, !job.enabled)}
                            className="p-1 rounded transition-colors"
                            style={{color: job.enabled ? '#dc2626' : '#16a34a'}}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = job.enabled ? '#fef2f2' : '#f0fdf4';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title={job.enabled ? '비활성화' : '활성화'}
                          >
                            {job.enabled ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
