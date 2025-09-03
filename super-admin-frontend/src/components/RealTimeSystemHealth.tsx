import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrentSystemHealth } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';

interface RealTimeSystemHealthProps {
  className?: string;
}

const RealTimeSystemHealth: React.FC<RealTimeSystemHealthProps> = ({ className }) => {
  const { data: healthData, isLoading, error } = useCurrentSystemHealth();

  const getHealthStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'critical':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'from-green-500 to-green-600';
      case 'warning': return 'from-yellow-500 to-yellow-600';
      case 'critical': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (error) {
    return (
      <Card variant="professional" className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">خطا در دریافت وضعیت سیستم</h3>
          <p className="text-slate-600">امکان دریافت اطلاعات سلامت سیستم وجود ندارد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            سلامت سیستم (زنده)
          </div>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !healthData ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* CPU Usage */}
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">استفاده از CPU</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', getStatusColor(getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 })))}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 }))}
                      {healthData?.cpu_usage || 0}%
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full bg-gradient-to-r transition-all duration-300",
                    getProgressBarColor(getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 }))
                  )}
                  style={{ width: `${Math.min(healthData?.cpu_usage || 0, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">استفاده از حافظه</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', getStatusColor(getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 })))}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 }))}
                      {healthData?.memory_usage || 0}%
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full bg-gradient-to-r transition-all duration-300",
                    getProgressBarColor(getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 }))
                  )}
                  style={{ width: `${Math.min(healthData?.memory_usage || 0, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Disk Usage */}
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">استفاده از دیسک</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', getStatusColor(getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 })))}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 }))}
                      {healthData?.disk_usage || 0}%
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full bg-gradient-to-r transition-all duration-300",
                    getProgressBarColor(getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 }))
                  )}
                  style={{ width: `${Math.min(healthData?.disk_usage || 0, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Database Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">اتصالات دیتابیس</span>
                  <span className="text-sm font-bold text-slate-900">{healthData?.database_connections || 0}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">زمان پاسخ DB</span>
                  <span className="text-sm font-bold text-slate-900">{healthData?.database_response_time || 0}ms</span>
                </div>
              </div>
            </div>

            {/* Redis Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">حافظه Redis</span>
                  <span className="text-sm font-bold text-slate-900">{healthData?.redis_memory_usage || 0}MB</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">کلاینت‌های Redis</span>
                  <span className="text-sm font-bold text-slate-900">{healthData?.redis_connected_clients || 0}</span>
                </div>
              </div>
            </div>

            {/* Celery Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">تسک‌های فعال</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {healthData?.celery_active_tasks || 0}
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">تسک‌های در انتظار</span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {healthData?.celery_pending_tasks || 0}
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">تسک‌های ناموفق</span>
                  <Badge className="bg-red-100 text-red-800">
                    {healthData?.celery_failed_tasks || 0}
                  </Badge>
                </div>
              </div>
            </div>

            {/* API Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">زمان پاسخ API</span>
                  <span className="text-sm font-bold text-slate-900">{healthData?.api_response_time || 0}ms</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">نرخ خطا</span>
                  <Badge className={cn(
                    'text-xs',
                    getStatusColor(getHealthStatus(healthData?.error_rate || 0, { warning: 5, critical: 10 }))
                  )}>
                    {healthData?.error_rate || 0}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Last Update */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-center text-xs text-slate-500">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                آخرین بروزرسانی: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString('fa-IR') : 'نامشخص'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeSystemHealth;