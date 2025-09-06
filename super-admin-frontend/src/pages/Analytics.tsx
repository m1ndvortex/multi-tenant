import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserGrowthChart from '@/components/charts/UserGrowthChart';
import RevenueChart from '@/components/charts/RevenueChart';
import InvoiceVolumeChart from '@/components/charts/InvoiceVolumeChart';
import ConversionRatesChart from '@/components/charts/ConversionRatesChart';
import SystemHealthChart from '@/components/charts/SystemHealthChart';
import RealTimeSystemHealth from '@/components/RealTimeSystemHealth';
import ApiErrorLog from '@/components/ApiErrorLog';
import { usePlatformMetrics, useSystemHealthMetrics } from '@/hooks/useAnalytics';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range as '7d' | '30d' | '90d' | '1y');
  };
  const [healthTimeRange, setHealthTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data: platformMetrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = usePlatformMetrics(timeRange);
  const { data: healthMetrics, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useSystemHealthMetrics(healthTimeRange);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchMetrics();
      refetchHealth();
      setLastUpdated(new Date());
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, refetchMetrics, refetchHealth]);

  const handleManualRefresh = () => {
    refetchMetrics();
    refetchHealth();
    setLastUpdated(new Date());
  };

  const timeRangeOptions = [
    { value: '7d', label: '7 روز گذشته' },
    { value: '30d', label: '30 روز گذشته' },
    { value: '90d', label: '90 روز گذشته' },
    { value: '1y', label: '1 سال گذشته' },
  ];

  const healthTimeRangeOptions = [
    { value: '1h', label: '1 ساعت گذشته' },
    { value: '24h', label: '24 ساعت گذشته' },
    { value: '7d', label: '7 روز گذشته' },
  ];

  if (metricsError || healthError) {
    return (
      <div className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">خطا در دریافت اطلاعات آنالیتیکس</h3>
            <p className="text-slate-600 mb-4">امکان دریافت داده‌های آنالیتیکس وجود ندارد</p>
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
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          آنالیتیکس و نظارت پلتفرم
        </h1>
        <p className="text-lg text-slate-600">
          تحلیل عملکرد، نظارت بر سلامت سیستم و بررسی خطاها
        </p>
        
        {/* Real-time Status and Controls */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            آخرین بروزرسانی: {lastUpdated.toLocaleTimeString('fa-IR')}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={metricsLoading || healthLoading}
          >
            {metricsLoading || healthLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            بروزرسانی
          </Button>
          
          <Button
            variant={autoRefresh ? 'gradient-green' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'خودکار فعال' : 'خودکار غیرفعال'}
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 p-1 rounded-lg">
          <TabsTrigger 
            value="platform" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
          >
            آنالیتیکس پلتفرم
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-teal-300"
          >
            سلامت سیستم
          </TabsTrigger>
          <TabsTrigger 
            value="errors" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-red-300"
          >
            لاگ خطاها
          </TabsTrigger>
        </TabsList>

        {/* Platform Analytics Tab */}
        <TabsContent value="platform" className="space-y-6">
          {/* Time Range Filter */}
          <Card variant="filter">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">آنالیتیکس پلتفرم</h3>
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

          {/* Platform Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserGrowthChart 
              data={(platformMetrics as any)?.user_growth || { labels: [], data: [] }}
              isLoading={metricsLoading}
              onTimeRangeChange={handleTimeRangeChange}
              currentTimeRange={timeRange}
            />
            <RevenueChart 
              data={(platformMetrics as any)?.revenue_trends || { labels: [], mrr_data: [], growth_rate: [] }}
              isLoading={metricsLoading}
              onTimeRangeChange={handleTimeRangeChange}
              currentTimeRange={timeRange}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InvoiceVolumeChart 
              data={(platformMetrics as any)?.invoice_volume || { labels: [], data: [] }}
              isLoading={metricsLoading}
              onTimeRangeChange={handleTimeRangeChange}
              currentTimeRange={timeRange}
            />
            
            {/* Subscription Conversions Chart */}
            <ConversionRatesChart 
              data={(platformMetrics as any)?.subscription_conversions || { labels: [], free_to_pro: [], churn_rate: [] }}
              isLoading={metricsLoading}
            />
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* Time Range Filter */}
          <Card variant="filter">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">نظارت بر سلامت سیستم</h3>
                <Select value={healthTimeRange} onValueChange={(value: any) => setHealthTimeRange(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="انتخاب بازه زمانی" />
                  </SelectTrigger>
                  <SelectContent>
                    {healthTimeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Health and Historical Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <RealTimeSystemHealth />
            </div>
            <div className="lg:col-span-2">
              <SystemHealthChart 
                data={(healthMetrics as any) || []}
                isLoading={healthLoading}
              />
            </div>
          </div>

          {/* Additional System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="gradient-blue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">اتصالات فعال DB</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.database_connections || 0}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <p className="text-sm font-medium text-slate-600 mb-1">زمان پاسخ API</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.api_response_time || 0}ms
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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
                  </div>
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <p className="text-sm font-medium text-slate-600 mb-1">نرخ خطا</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.error_rate || 0}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Errors Tab */}
        <TabsContent value="errors" className="space-y-6">
          <ApiErrorLog />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;