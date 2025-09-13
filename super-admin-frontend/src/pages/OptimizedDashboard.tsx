import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboard';
import { DashboardStats } from '@/services/dashboardService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { CyberSystemHealthSkeleton } from '@/components/ui/skeleton';
import { 
  CyberStatCard,
  CyberQuickActionCard,
  CyberMiniChartCard,
  CyberSystemHealthIndicator
} from '@/components/dashboard/CyberDashboardComponents';
import { AnimatedWrapper, StaggerContainer } from '@/components/animations/CyberAnimations';
// import { VirtualTenantList, VirtualLogList } from '@/components/VirtualScrollList';
import { 
  WhoIsOnlineWidgetLazy
  // AnalyticsChartLazy, 
  // SystemHealthWidgetLazy,
  // QuickActionsGridLazy 
} from '@/components/LazyComponents';
import { usePerformanceMonitor, performanceUtils } from '@/utils/performanceMonitor';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    // isAnyLoading,
    hasAnyError, 
    hasAllData, 
    isOffline, 
    refreshAll,
    cacheStats
  } = dashboardData;

  // Type assertions for data
  const statsData = stats.data as DashboardStats | undefined;
  const systemHealthData = systemHealth.data as any;

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
      badge: statsData?.pending_payment_tenants ? `${statsData.pending_payment_tenants} در انتظار` : undefined
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
  ], [statsData?.pending_payment_tenants]);

  // Debounced refresh function
  const debouncedRefresh = useCallback(
    performanceUtils.debounce(refreshAll, 1000),
    [refreshAll]
  );

  // Properly typed wrapper functions
  const handleRetry = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

  const handleRefreshClick = useCallback(() => {
    debouncedRefresh();
  }, [debouncedRefresh]);

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
        {isOffline && <OfflineIndicator onRetry={handleRetry} />}
        <ErrorDisplay
          error={stats.error || onlineUsers.error || alerts.error || quickStats.error}
          title="خطا در دریافت اطلاعات داشبورد"
          onRetry={handleRetry}
          showDetails={import.meta.env.DEV}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Offline Indicator */}
        {isOffline && <OfflineIndicator onRetry={handleRetry} />}

        {/* Error Banner for non-critical errors */}
        {hasAnyError && hasAllData && (
          <ErrorDisplay
            error={stats.error || onlineUsers.error || alerts.error || quickStats.error}
            title="Some data may be outdated"
            variant="banner"
            onRetry={handleRetry}
            onDismiss={() => {/* Could implement dismiss logic */}}
          />
        )}

        {/* Dashboard Header with Cybersecurity Theme */}
        <AnimatedWrapper variant="cyber" delay={0}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="text-center lg:text-right">
              <motion.div
                className="w-20 h-20 bg-gradient-to-r from-[#00FF88] to-[#00D4FF] rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-4 relative"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  duration: 0.8, 
                  type: "spring", 
                  stiffness: 200,
                  delay: 0.2
                }}
                style={{
                  boxShadow: "0 0 30px rgba(0, 255, 136, 0.4), 0 0 60px rgba(0, 212, 255, 0.2)"
                }}
              >
                {/* Animated glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(0, 255, 136, 0.4)",
                      "0 0 40px rgba(0, 212, 255, 0.6)",
                      "0 0 20px rgba(0, 255, 136, 0.4)"
                    ]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              
              <motion.h1 
                className="text-3xl font-bold text-white mb-2"
                style={{
                  textShadow: "0 0 20px rgba(255, 255, 255, 0.5)"
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                خوش آمدید به پلتفرم HesaabPlus
              </motion.h1>
              
              <motion.p 
                className="text-lg text-[#B8BCC8]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                مدیریت و نظارت بر تمامی عملیات سیستم حسابداری
              </motion.p>
            </div>

            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPersonalization(!showPersonalization)}
                className="flex items-center gap-2 border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/50 backdrop-blur-sm"
              >
                <motion.svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: showPersonalization ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </motion.svg>
                شخصی‌سازی
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshClick}
                disabled={Boolean(isRefreshing)}
                className="flex items-center gap-2 text-[#00FF88] hover:bg-[#00FF88]/10 backdrop-blur-sm"
              >
                <motion.svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: Boolean(isRefreshing) ? 360 : 0 }}
                  transition={{ 
                    duration: Boolean(isRefreshing) ? 1 : 0,
                    repeat: Boolean(isRefreshing) ? Infinity : 0,
                    ease: "linear"
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </motion.svg>
                {Boolean(isRefreshing) ? 'در حال بروزرسانی...' : 'بروزرسانی'}
              </Button>
              
              {import.meta.env.DEV && (
                <motion.div 
                  className="text-xs text-[#6B7280] backdrop-blur-sm bg-white/5 px-2 py-1 rounded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.3 }}
                >
                  Cache: {cacheStats.size} items
                </motion.div>
              )}
            </motion.div>
          </div>
        </AnimatedWrapper>

        {/* Personalization Panel with Cybersecurity Theme */}
        {showPersonalization && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card variant="cyber-neon" className="border-2 border-[#00FF88]/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <motion.div
                    className="w-6 h-6 bg-gradient-to-br from-[#00FF88] to-[#00D4FF] rounded-lg flex items-center justify-center"
                    animate={{
                      boxShadow: [
                        "0 0 0px rgba(0, 255, 136, 0)",
                        "0 0 15px rgba(0, 255, 136, 0.6)",
                        "0 0 0px rgba(0, 255, 136, 0)"
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </motion.div>
                  <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                    تنظیمات داشبورد
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StaggerContainer
                  staggerDelay={0.1}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={dashboardLayout === 'default' ? 'default' : 'outline'}
                      onClick={() => throttledLayoutChange('default')}
                      className={cn(
                        "h-20 flex-col w-full backdrop-blur-sm",
                        dashboardLayout === 'default' 
                          ? "bg-gradient-to-br from-[#00FF88]/20 to-[#00D4FF]/20 border-[#00FF88]/40 text-white shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                          : "border-white/20 text-[#B8BCC8] hover:border-[#00D4FF]/40 hover:text-white hover:bg-[#00D4FF]/10"
                      )}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      چیدمان پیش‌فرض
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={dashboardLayout === 'compact' ? 'default' : 'outline'}
                      onClick={() => throttledLayoutChange('compact')}
                      className={cn(
                        "h-20 flex-col w-full backdrop-blur-sm",
                        dashboardLayout === 'compact' 
                          ? "bg-gradient-to-br from-[#00FF88]/20 to-[#00D4FF]/20 border-[#00FF88]/40 text-white shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                          : "border-white/20 text-[#B8BCC8] hover:border-[#00D4FF]/40 hover:text-white hover:bg-[#00D4FF]/10"
                      )}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      چیدمان فشرده
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={dashboardLayout === 'detailed' ? 'default' : 'outline'}
                      onClick={() => throttledLayoutChange('detailed')}
                      className={cn(
                        "h-20 flex-col w-full backdrop-blur-sm",
                        dashboardLayout === 'detailed' 
                          ? "bg-gradient-to-br from-[#00FF88]/20 to-[#00D4FF]/20 border-[#00FF88]/40 text-white shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                          : "border-white/20 text-[#B8BCC8] hover:border-[#00D4FF]/40 hover:text-white hover:bg-[#00D4FF]/10"
                      )}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0V17m0-10a2 2 0 012-2h2a2 2 0 002-2M13 7h6l1 5-1 5h-6m-6-4h2m5-9v18" />
                      </svg>
                      چیدمان تفصیلی
                    </Button>
                  </motion.div>
                </StaggerContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Statistics Grid with Cybersecurity Theme */}
        <StaggerContainer
          staggerDelay={0.1}
          className={cn(
            "grid gap-6",
            dashboardLayout === 'compact' ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}
        >
          <CyberStatCard
            title="کل تنانت‌ها"
            value={statsData?.total_tenants || 0}
            subtitle={`${statsData?.active_tenants || 0} فعال`}
            gradient="from-blue-500 to-indigo-600"
            link="/tenants"
            isLoading={isInitialLoading}
            delay={0}
            sparklineData={[12, 15, 8, 22, 18, 25, 30]}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          <CyberStatCard
            title="کاربران فعال امروز"
            value={statsData?.active_users_today || 0}
            subtitle={`از ${statsData?.total_users || 0} کل کاربر`}
            gradient="from-green-500 to-teal-600"
            isLoading={isInitialLoading}
            delay={0.1}
            trend={{ value: 12, isPositive: true }}
            sparklineData={[85, 92, 78, 95, 88, 96, 91]}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <CyberStatCard
            title="فاکتورهای این ماه"
            value={statsData?.total_invoices_this_month || 0}
            gradient="from-purple-500 to-violet-600"
            link="/analytics"
            isLoading={isInitialLoading}
            delay={0.2}
            trend={{ value: 8, isPositive: true }}
            sparklineData={[45, 52, 38, 65, 58, 72, 68]}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />

          <CyberStatCard
            title="درآمد ماهانه (MRR)"
            value={`${statsData?.mrr || 0}`}
            gradient="from-orange-500 to-red-600"
            link="/analytics"
            isLoading={isInitialLoading}
            delay={0.3}
            trend={{ value: 15, isPositive: true }}
            sparklineData={[1200, 1350, 1100, 1800, 1650, 2100, 2400]}
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </StaggerContainer>

        {/* Analytics Overview - Only show in detailed layout with Cybersecurity Theme */}
        {dashboardLayout === 'detailed' && (
          <AnimatedWrapper variant="cyber" delay={0.4}>
            <StaggerContainer
              staggerDelay={0.15}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <Card variant="cyber-success">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <motion.div
                      className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(0, 255, 136, 0)",
                          "0 0 20px rgba(0, 255, 136, 0.4)",
                          "0 0 0px rgba(0, 255, 136, 0)"
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </motion.div>
                    ثبت‌نام‌های اخیر
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CyberMiniChartCard
                    data={sampleChartData.signups}
                    color="#00FF88"
                    label="7 روز گذشته"
                    delay={0.6}
                  />
                </CardContent>
              </Card>

              <Card variant="cyber-primary">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <motion.div
                      className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center"
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(0, 212, 255, 0)",
                          "0 0 20px rgba(0, 212, 255, 0.4)",
                          "0 0 0px rgba(0, 212, 255, 0)"
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    روند درآمد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CyberMiniChartCard
                    data={sampleChartData.revenue}
                    color="#00D4FF"
                    label="هفته گذشته ($)"
                    delay={0.75}
                  />
                </CardContent>
              </Card>

              <Card variant="cyber-info">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <motion.div
                      className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center"
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(165, 94, 234, 0)",
                          "0 0 20px rgba(165, 94, 234, 0.4)",
                          "0 0 0px rgba(165, 94, 234, 0)"
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                      }}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </motion.div>
                    فعالیت کاربران
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CyberMiniChartCard
                    data={sampleChartData.activity}
                    color="#A55EEA"
                    label="میانگین فعالیت (%)"
                    delay={0.9}
                  />
                </CardContent>
              </Card>
            </StaggerContainer>
          </AnimatedWrapper>
        )}

        {/* System Health and Online Users with Cybersecurity Theme */}
        <AnimatedWrapper variant="cyber" delay={0.6}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Health */}
            <div className="lg:col-span-2">
              <Card variant="cyber-glass" className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center"
                        animate={{
                          boxShadow: [
                            "0 0 0px rgba(0, 255, 255, 0)",
                            "0 0 20px rgba(0, 255, 255, 0.4)",
                            "0 0 0px rgba(0, 255, 255, 0)"
                          ]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </motion.div>
                      <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                        سلامت سیستم
                      </span>
                    </div>
                    <Link to="/system-health">
                      <Button variant="ghost" size="sm" className="text-[#00D4FF] hover:text-white hover:bg-[#00D4FF]/20">
                        جزئیات بیشتر
                      </Button>
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemHealth.isLoading && !systemHealth.data ? (
                    <CyberSystemHealthSkeleton />
                  ) : systemHealth.error ? (
                    <ErrorDisplay
                      error={systemHealth.error}
                      title="System Health Unavailable"
                      variant="inline"
                      onRetry={() => systemHealth.refetch()}
                    />
                  ) : (
                    <StaggerContainer staggerDelay={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <CyberSystemHealthIndicator
                          label="CPU Usage"
                          value={systemHealthData?.cpu_usage || statsData?.system_health?.cpu_usage || 65}
                          type="percentage"
                          status={
                            (systemHealthData?.cpu_usage || statsData?.system_health?.cpu_usage || 65) > 80 
                              ? 'warning' 
                              : (systemHealthData?.cpu_usage || statsData?.system_health?.cpu_usage || 65) > 90 
                                ? 'error' 
                                : 'healthy'
                          }
                          delay={0}
                        />
                        <CyberSystemHealthIndicator
                          label="Memory Usage"
                          value={systemHealthData?.memory_usage || statsData?.system_health?.memory_usage || 72}
                          type="percentage"
                          status={
                            (systemHealthData?.memory_usage || statsData?.system_health?.memory_usage || 72) > 85 
                              ? 'warning' 
                              : (systemHealthData?.memory_usage || statsData?.system_health?.memory_usage || 72) > 95 
                                ? 'error' 
                                : 'healthy'
                          }
                          delay={0.1}
                        />
                      </div>

                      <div className="space-y-4">
                        <CyberSystemHealthIndicator
                          label="Database"
                          value={systemHealthData?.database_status || statsData?.system_health?.database_status || 'healthy'}
                          status={systemHealthData?.database_status || statsData?.system_health?.database_status || 'healthy'}
                          type="status"
                          delay={0.2}
                        />
                        <CyberSystemHealthIndicator
                          label="Redis"
                          value={systemHealthData?.redis_status || statsData?.system_health?.redis_status || 'healthy'}
                          status={systemHealthData?.redis_status || statsData?.system_health?.redis_status || 'healthy'}
                          type="status"
                          delay={0.3}
                        />
                      </div>
                    </StaggerContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Who is Online Widget - Lazy loaded */}
            <WhoIsOnlineWidgetLazy />
          </div>
        </AnimatedWrapper>

        {/* Quick Actions Grid with Cybersecurity Theme */}
        <AnimatedWrapper variant="cyber" delay={0.8}>
          <Card variant="cyber-glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center"
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(165, 94, 234, 0)",
                      "0 0 20px rgba(165, 94, 234, 0.4)",
                      "0 0 0px rgba(165, 94, 234, 0)"
                    ]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </motion.div>
                <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                  عملیات سریع
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StaggerContainer
                staggerDelay={0.1}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {quickActions.map((action, index) => (
                  <CyberQuickActionCard 
                    key={index} 
                    {...action} 
                    delay={index * 0.1}
                  />
                ))}
              </StaggerContainer>
            </CardContent>
          </Card>
        </AnimatedWrapper>
      </motion.div>
    </ErrorBoundary>
  );
};

export default OptimizedDashboard;