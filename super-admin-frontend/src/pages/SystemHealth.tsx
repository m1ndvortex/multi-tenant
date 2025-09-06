import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SystemHealthChart from '@/components/charts/SystemHealthChart';
import RealTimeSystemHealth from '@/components/RealTimeSystemHealth';
import SystemHealthAlerts from '@/components/SystemHealthAlerts';
import { useSystemHealthMetrics } from '@/hooks/useAnalytics';

const SystemHealth: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  const { data: healthMetrics, isLoading, error } = useSystemHealthMetrics(timeRange);

  const timeRangeOptions = [
    { value: '1h', label: '1 ساعت گذشته' },
    { value: '24h', label: '24 ساعت گذشته' },
    { value: '7d', label: '7 روز گذشته' },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">خطا در دریافت وضعیت سیستم</h3>
            <p className="text-slate-600 mb-4">امکان دریافت اطلاعات سلامت سیستم وجود ندارد</p>
            <Button variant="gradient-green" onClick={() => window.location.reload()}>
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          نظارت بر سلامت سیستم
        </h1>
        <p className="text-lg text-slate-600">
          مانیتورینگ زنده و تاریخچه عملکرد سیستم
        </p>
      </div>

      {/* Time Range Filter */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">نمودار سلامت سیستم</h3>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="انتخاب بازه زمانی" />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Health Alerts */}
      <SystemHealthAlerts />

      {/* Real-time Health and Historical Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RealTimeSystemHealth />
        </div>
        <div className="lg:col-span-2">
          <SystemHealthChart 
            data={(healthMetrics as any) || []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Detailed System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="gradient-blue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">اتصالات فعال دیتابیس</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.database_connections || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  زمان پاسخ: {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.database_response_time || 0}ms
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Redis</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.redis_memory_usage || 0}MB
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  کلاینت‌ها: {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.redis_connected_clients || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-purple">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">تسک‌های Celery</p>
                <p className="text-2xl font-bold text-slate-900">
                  {((healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_active_tasks || 0) + 
                   ((healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_pending_tasks || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ناموفق: {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_failed_tasks || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">عملکرد API</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.api_response_time || 0}ms
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  نرخ خطا: {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.error_rate || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Overview */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            خلاصه وضعیت سیستم
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4 border border-slate-200 rounded-lg animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-600 mb-1">میانگین استفاده از CPU</p>
                <p className="text-xl font-bold text-slate-900">
                  {(healthMetrics as any)?.length ? 
                    Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.cpu_usage, 0) / (healthMetrics as any).length) 
                    : 0}%
                </p>
              </div>
              
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-600 mb-1">میانگین استفاده از حافظه</p>
                <p className="text-xl font-bold text-slate-900">
                  {(healthMetrics as any)?.length ? 
                    Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.memory_usage, 0) / (healthMetrics as any).length) 
                    : 0}%
                </p>
              </div>
              
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-600 mb-1">میانگین استفاده از دیسک</p>
                <p className="text-xl font-bold text-slate-900">
                  {(healthMetrics as any)?.length ? 
                    Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.disk_usage, 0) / (healthMetrics as any).length) 
                    : 0}%
                </p>
              </div>
              
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-600 mb-1">میانگین زمان پاسخ دیتابیس</p>
                <p className="text-xl font-bold text-slate-900">
                  {(healthMetrics as any)?.length ? 
                    Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.database_response_time, 0) / (healthMetrics as any).length) 
                    : 0}ms
                </p>
              </div>
              
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-600 mb-1">میانگین زمان پاسخ API</p>
                <p className="text-xl font-bold text-slate-900">
                  {(healthMetrics as any)?.length ? 
                    Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.api_response_time, 0) / (healthMetrics as any).length) 
                    : 0}ms
                </p>
              </div>
              
              <div className="p-4 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-600 mb-1">میانگین نرخ خطا</p>
                <p className="text-xl font-bold text-slate-900">
                  {(healthMetrics as any)?.length ? 
                    ((healthMetrics as any).reduce((sum: number, item: any) => sum + item.error_rate, 0) / (healthMetrics as any).length).toFixed(2) 
                    : 0}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealth;