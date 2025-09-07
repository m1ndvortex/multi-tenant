import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { StatCardSkeleton, SystemHealthSkeleton } from '@/components/ui/skeleton';
import { 
  MemoizedStatCard, 
  MemoizedQuickActionCard, 
  MemoizedMiniChart,
  MemoizedSystemHealthIndicator 
} from '@/components/MemoizedDashboardComponents';
import { VirtualTenantList, VirtualLogList } from '@/components/VirtualScrollList';
import { 
  WhoIsOnlineWidgetLazy, 
  AnalyticsChartLazy, 
  SystemHealthWidgetLazy,
  QuickActionsGridLazy 
} from '@/components/LazyComponents';
import { usePerformanceMonitor, performanceUtils } from '@/utils/performanceMonitor';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  link: string;
  badge?: string;
}

const OptimizedDashboard: React.FC = () => {
  const { startRender, endRender } = usePerformanceMonitor('OptimizedDashboard');
  const [dashboardLayout, setDashboardLayout] = useState('default');
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [renderStartTime] = useState(() => startRender());

  const dashboardData = useOptimizedDashboardData();
  
  const { 
    stats, 
    onlineUsers, 
    alerts, 
    quickStats, 
    systemHealth,
    isInitialLoading,
    isRefreshing,
    isAnyLoading,
    hasAnyError, 
    hasAllData, 
    isOffline, 
    refreshAll,
    cacheStats
  } = dashboardData;

  // Memoized sample data for charts (in real app, this would come from API)
  const sampleChartData = useMemo(() => ({
    signups: [12, 15, 8, 22, 18, 25, 30],
    revenue: [1200, 1350, 1100, 1800, 1650, 2100, 2400],
    activity: [85, 92, 78, 95, 88, 96, 91]
  }), []);

  // Memoized quick actions
  const quickActions = useMemo((): QuickAction[] => [
    {
      title: 'مدیریت تنانت‌ها',
      description: 'مشاهده، ایجاد و مدیریت تمامی تنانت‌های سیستم',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-indigo-600',
      link: '/tenants',
      badge: stats.data?.pending_payment_tenants ? `${stats.data.pending_payment_tenants} در انتظار` : undefined
    },
    {
      title: 'آنالیتیکس پلتفرم',
      description: 'بررسی آمار و گزارش‌های جامع پلتفرم',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-violet-600',
      link: '/analytics'
    },
    {
      title: 'سلامت سیستم',
      description: 'نظارت بر عملکرد و سلامت کلی سیستم',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-teal-500 to-cyan-600',
      link: '/system-health'
    },
    {
      title: 'پشتیبان‌گیری و بازیابی',
      description: 'مدیریت پشتیبان‌گیری و عملیات بازیابی',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      gradient: 'from-orange-500 to-red-600',
      link: '/backup-recovery'
    },
    {
      title: 'جایگزینی کاربر',
      description: 'دسترسی به حساب کاربران برای پشتیبانی',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      gradient: 'from-pink-500 to-rose-600',
      link: '/impersonation'
    },
    {
      title: 'مدیریت خطاها',
      description: 'بررسی و مدیریت خطاهای سیستم',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-red-500 to-pink-600',
      link: '/error-logging'
    }
  ], [stats.data?.pending_payment_tenants]);

  // Debounced refresh function
  const debouncedRefresh = useCallback(
    performanceUtils.debounce(refreshAll, 1000),
    [refreshAll]
  );

  // Throttled layout change
  const throttledLayoutChange = useCallback(
    performanceUtils.throttle((layout: string) => {
      setDashboardLayout(layout);
    }, 300),
    []
  );

  // Record render completion
  React.useEffect(() => {
    endRender(renderStartTime);
  });

  // Show error state if there's a critical error and no cached data
  if (hasAnyError && !hasAllData && !isInitialLoading) {
    return (
      <div className="space-y-6">
        {isOffline && <OfflineIndicator onRetry={debouncedRefresh} />}
        <ErrorDisplay
          error={stats.error || onlineUsers.error || alerts.error || quickStats.error}
          title="خطا در دریافت اطلاعات داشبورد"
          onRetry={debouncedRefresh}
          showDetails={import.meta.env.DEV}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Offline Indicator */}
        {isOffline && <OfflineIndicator onRetry={debouncedRefresh} />}

        {/* Error Banner for non-critical errors */}
        {hasAnyError && hasAllData && (
          <ErrorDisplay
            error={stats.error || onlineUsers.error || alerts.error || quickStats.error}
            title="Some data may be outdated"
            variant="banner"
            onRetry={debouncedRefresh}
            onDismiss={() => {/* Could implement dismiss logic */}}
          />
        )}

        {/* Dashboard Header with Personalization */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="text-center lg:text-right">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-4 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              خوش آمدید به پلتفرم HesaabPlus
            </h1>
            <p className="text-lg text-slate-600">
              مدیریت و نظارت بر تمامی عملیات سیستم حسابداری
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPersonalization(!showPersonalization)}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              شخصی‌سازی
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={debouncedRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <svg className={cn(
                "w-4 h-4",
                isRefreshing && "animate-spin"
              )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'در حال بروزرسانی...' : 'بروزرسانی'}
            </Button>
            {import.meta.env.DEV && (
              <div className="text-xs text-slate-500">
                Cache: {cacheStats.size} items
              </div>
            )}
          </div>
        </div>

        {/* Personalization Panel */}
        {showPersonalization && (
          <Card variant="filter" className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg">تنظیمات داشبورد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant={dashboardLayout === 'default' ? 'gradient-green' : 'outline'}
                  onClick={() => throttledLayoutChange('default')}
                  className="h-20 flex-col"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  چیدمان پیش‌فرض
                </Button>
                <Button
                  variant={dashboardLayout === 'compact' ? 'gradient-green' : 'outline'}
                  onClick={() => throttledLayoutChange('compact')}
                  className="h-20 flex-col"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  چیدمان فشرده
                </Button>
                <Button
                  variant={dashboardLayout === 'detailed' ? 'gradient-green' : 'outline'}
                  onClick={() => throttledLayoutChange('detailed')}
                  className="h-20 flex-col"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0V17m0-10a2 2 0 012-2h2a2 2 0 002-2M13 7h6l1 5-1 5h-6m-6-4h2m5-9v18" />
                  </svg>
                  چیدمان تفصیلی
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Statistics Grid */}
        <div className={cn(
          "grid gap-6",
          dashboardLayout === 'compact' ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          <MemoizedStatCard
            title="کل تنانت‌ها"
            value={stats.data?.total_tenants || 0}
            subtitle={`${stats.data?.active_tenants || 0} فعال`}
            gradient="from-blue-500 to-indigo-600"
            link="/tenants"
            isLoading={isInitialLoading}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          <MemoizedStatCard
            title="کاربران فعال امروز"
            value={stats.data?.active_users_today || 0}
            subtitle={`از ${stats.data?.total_users || 0} کل کاربر`}
            gradient="from-green-500 to-teal-600"
            isLoading={isInitialLoading}
            trend={{ value: 12, isPositive: true }}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <MemoizedStatCard
            title="فاکتورهای این ماه"
            value={stats.data?.total_invoices_this_month || 0}
            gradient="from-purple-500 to-violet-600"
            link="/analytics"
            isLoading={isInitialLoading}
            trend={{ value: 8, isPositive: true }}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          <MemoizedStatCard
            title="درآمد ماهانه (MRR)"
            value={`${stats.data?.mrr || 0}`}
            gradient="from-orange-500 to-red-600"
            link="/analytics"
            isLoading={isInitialLoading}
            trend={{ value: 15, isPositive: true }}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Analytics Overview - Only show in detailed layout */}
        {dashboardLayout === 'detailed' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card variant="gradient-green">
              <CardHeader>
                <CardTitle className="text-lg">ثبت‌نام‌های اخیر</CardTitle>
              </CardHeader>
              <CardContent>
                <MemoizedMiniChart
                  data={sampleChartData.signups}
                  color="bg-green-500"
                  label="7 روز گذشته"
                />
              </CardContent>
            </Card>

            <Card variant="gradient-blue">
              <CardHeader>
                <CardTitle className="text-lg">روند درآمد</CardTitle>
              </CardHeader>
              <CardContent>
                <MemoizedMiniChart
                  data={sampleChartData.revenue}
                  color="bg-blue-500"
                  label="هفته گذشته ($)"
                />
              </CardContent>
            </Card>

            <Card variant="gradient-purple">
              <CardHeader>
                <CardTitle className="text-lg">فعالیت کاربران</CardTitle>
              </CardHeader>
              <CardContent>
                <MemoizedMiniChart
                  data={sampleChartData.activity}
                  color="bg-purple-500"
                  label="میانگین فعالیت (%)"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* System Health and Online Users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <div className="lg:col-span-2">
            <Card variant="professional" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    سلامت سیستم
                  </div>
                  <Link to="/system-health">
                    <Button variant="ghost" size="sm">
                      جزئیات بیشتر
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {systemHealth.isLoading && !systemHealth.data ? (
                  <SystemHealthSkeleton />
                ) : systemHealth.error ? (
                  <ErrorDisplay
                    error={systemHealth.error}
                    title="System Health Unavailable"
                    variant="inline"
                    onRetry={() => systemHealth.refetch()}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <MemoizedSystemHealthIndicator
                        label="CPU Usage"
                        value={systemHealth.data?.cpu_usage || stats.data?.system_health?.cpu_usage || 0}
                        type="percentage"
                      />
                      <MemoizedSystemHealthIndicator
                        label="Memory Usage"
                        value={systemHealth.data?.memory_usage || stats.data?.system_health?.memory_usage || 0}
                        type="percentage"
                      />
                    </div>

                    <div className="space-y-4">
                      <MemoizedSystemHealthIndicator
                        label="Database"
                        value={systemHealth.data?.database_status || stats.data?.system_health?.database_status || 'unknown'}
                        status={systemHealth.data?.database_status || stats.data?.system_health?.database_status || 'unknown'}
                        type="status"
                      />
                      <MemoizedSystemHealthIndicator
                        label="Redis"
                        value={systemHealth.data?.redis_status || stats.data?.system_health?.redis_status || 'unknown'}
                        status={systemHealth.data?.redis_status || stats.data?.system_health?.redis_status || 'unknown'}
                        type="status"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Who is Online Widget - Lazy loaded */}
          <WhoIsOnlineWidgetLazy />
        </div>

        {/* Quick Actions Grid - Lazy loaded */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              عملیات سریع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <MemoizedQuickActionCard key={index} {...action} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedDashboard;