import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimizedDashboardData } from '@/hooks/useOptimizedDashboard';
import { DashboardStats } from '@/services/dashboardService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { SystemHealthSkeleton } from '@/components/ui/skeleton';
import { 
  MemoizedStatCard, 
  MemoizedQuickActionCard, 
  MemoizedMiniChart,
  MemoizedSystemHealthIndicator 
} from '@/components/MemoizedDashboardComponents';
// import { VirtualTenantList, VirtualLogList } from '@/components/VirtualScrollList';
import { 
  WhoIsOnlineWidgetLazy
  // AnalyticsChartLazy, 
  // SystemHealthWidgetLazy,
  // QuickActionsGridLazy 
} from '@/components/LazyComponents';
import { usePerformanceMonitor, performanceUtils } from '@/utils/performanceMonitor';
import { useAnimations } from '@/hooks/useAnimations';
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
  const animations = useAnimations();

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
        variants={animations.presets.pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Offline Indicator */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <OfflineIndicator onRetry={handleRetry} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner for non-critical errors */}
        <AnimatePresence>
          {hasAnyError && hasAllData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ErrorDisplay
                error={stats.error || onlineUsers.error || alerts.error || quickStats.error}
                title="Some data may be outdated"
                variant="banner"
                onRetry={handleRetry}
                onDismiss={() => {/* Could implement dismiss logic */}}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cybersecurity Dashboard Header */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          variants={animations.presets.fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="text-center lg:text-right">
            {/* Cybersecurity-themed logo with neon glow */}
            <motion.div 
              className="w-20 h-20 glass-morphism border-2 border-cyber-neon-primary/30 rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-4 relative group"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 0 30px var(--cyber-neon-primary)",
              }}
              animate={{
                boxShadow: [
                  "0 0 10px var(--cyber-neon-primary)",
                  "0 0 20px var(--cyber-neon-primary)",
                  "0 0 10px var(--cyber-neon-primary)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <svg className="w-10 h-10 text-cyber-neon-primary cyber-text-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              
              {/* Rotating border effect */}
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-cyber-neon-secondary opacity-30"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            
            <motion.h1 
              className="text-3xl font-bold text-cyber-text-primary mb-2 font-accent cyber-text-glow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              خوش آمدید به پلتفرم HesaabPlus
            </motion.h1>
            <motion.p 
              className="text-lg text-cyber-text-secondary font-mono"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              مدیریت و نظارت بر تمامی عملیات سیستم حسابداری
            </motion.p>
          </div>

          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="cyber-secondary"
              size="sm"
              onClick={() => setShowPersonalization(!showPersonalization)}
              className="flex items-center gap-2 group"
            >
              <motion.svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </motion.svg>
              شخصی‌سازی
            </Button>
            
            <Button
              variant="cyber-ghost"
              size="sm"
              onClick={handleRefreshClick}
              disabled={Boolean(isRefreshing)}
              className="flex items-center gap-2"
            >
              <motion.svg 
                className="w-4 h-4"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                animate={Boolean(isRefreshing) ? { rotate: 360 } : {}}
                transition={Boolean(isRefreshing) ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </motion.svg>
              {Boolean(isRefreshing) ? 'در حال بروزرسانی...' : 'بروزرسانی'}
            </Button>
            
            {import.meta.env.DEV && (
              <motion.div 
                className="text-xs text-cyber-text-muted font-mono glass-morphism px-2 py-1 rounded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                Cache: {cacheStats.size} items
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Cybersecurity Personalization Panel */}
        <AnimatePresence>
          {showPersonalization && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Card variant="cyber-elevated" className="border-2 border-cyber-neon-primary/30 relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <svg className="w-5 h-5 text-cyber-neon-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                    </motion.div>
                    تنظیمات داشبورد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    variants={animations.presets.staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {[
                      { key: 'default', label: 'چیدمان پیش‌فرض', icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
                      { key: 'compact', label: 'چیدمان فشرده', icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
                      { key: 'detailed', label: 'چیدمان تفصیلی', icon: "M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0V17m0-10a2 2 0 012-2h2a2 2 0 002-2M13 7h6l1 5-1 5h-6m-6-4h2m5-9v18" }
                    ].map((layout, index) => (
                      <motion.div
                        key={layout.key}
                        variants={animations.presets.fadeIn}
                        custom={index}
                      >
                        <Button
                          variant={dashboardLayout === layout.key ? 'cyber-primary' : 'cyber-ghost'}
                          onClick={() => throttledLayoutChange(layout.key)}
                          className="h-20 flex-col w-full group relative overflow-hidden"
                        >
                          <motion.svg 
                            className="w-6 h-6 mb-1" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={layout.icon} />
                          </motion.svg>
                          {layout.label}
                          
                          {/* Active indicator */}
                          {dashboardLayout === layout.key && (
                            <motion.div
                              className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-neon-primary"
                              layoutId="activeLayout"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
                
                {/* Animated border effect */}
                <motion.div
                  className="absolute inset-0 border-2 border-cyber-neon-primary/20 rounded-xl pointer-events-none"
                  animate={{
                    borderColor: [
                      "rgba(0, 255, 255, 0.2)",
                      "rgba(0, 255, 255, 0.4)",
                      "rgba(0, 255, 255, 0.2)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cybersecurity Statistics Grid with Animated Counters */}
        <motion.div 
          className={cn(
            "grid gap-6",
            dashboardLayout === 'compact' ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}
          variants={animations.presets.staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={animations.presets.fadeIn}>
            <MemoizedStatCard
              title="کل تنانت‌ها"
              value={statsData?.total_tenants || 0}
              subtitle={`${statsData?.active_tenants || 0} فعال`}
              gradient="from-cyber-neon-primary to-cyber-neon-info"
              link="/tenants"
              isLoading={isInitialLoading}
              icon={
                <svg className="w-6 h-6 text-cyber-neon-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
          </motion.div>

          <motion.div variants={animations.presets.fadeIn}>
            <MemoizedStatCard
              title="کاربران فعال امروز"
              value={statsData?.active_users_today || 0}
              subtitle={`از ${statsData?.total_users || 0} کل کاربر`}
              gradient="from-cyber-neon-success to-cyber-neon-secondary"
              isLoading={isInitialLoading}
              trend={{ value: 12, isPositive: true }}
              icon={
                <svg className="w-6 h-6 text-cyber-neon-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
          </motion.div>

          <motion.div variants={animations.presets.fadeIn}>
            <MemoizedStatCard
              title="فاکتورهای این ماه"
              value={statsData?.total_invoices_this_month || 0}
              gradient="from-cyber-neon-info to-cyber-neon-primary"
              link="/analytics"
              isLoading={isInitialLoading}
              trend={{ value: 8, isPositive: true }}
              icon={
                <svg className="w-6 h-6 text-cyber-neon-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </motion.div>

          <motion.div variants={animations.presets.fadeIn}>
            <MemoizedStatCard
              title="درآمد ماهانه (MRR)"
              value={`${statsData?.mrr || 0}`}
              gradient="from-cyber-neon-warning to-cyber-neon-danger"
              link="/analytics"
              isLoading={isInitialLoading}
              trend={{ value: 15, isPositive: true }}
              icon={
                <svg className="w-6 h-6 text-cyber-neon-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </motion.div>
        </motion.div>

        {/* Cybersecurity Analytics Overview - Detailed Layout */}
        <AnimatePresence>
          {dashboardLayout === 'detailed' && (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <motion.div
                variants={animations.presets.cardEntrance}
                initial="hidden"
                animate="visible"
                custom={0}
              >
                <Card variant="cyber-success" className="relative overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <svg className="w-5 h-5 text-cyber-neon-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </motion.div>
                      ثبت‌نام‌های اخیر
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MemoizedMiniChart
                      data={sampleChartData.signups}
                      color="bg-cyber-neon-success"
                      label="7 روز گذشته"
                    />
                  </CardContent>
                  
                  {/* Animated scanning line */}
                  <motion.div
                    className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyber-neon-success to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                </Card>
              </motion.div>

              <motion.div
                variants={animations.presets.cardEntrance}
                initial="hidden"
                animate="visible"
                custom={1}
              >
                <Card variant="cyber-info" className="relative overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      >
                        <svg className="w-5 h-5 text-cyber-neon-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </motion.div>
                      روند درآمد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MemoizedMiniChart
                      data={sampleChartData.revenue}
                      color="bg-cyber-neon-info"
                      label="هفته گذشته ($)"
                    />
                  </CardContent>
                  
                  {/* Pulsing border effect */}
                  <motion.div
                    className="absolute inset-0 border-2 border-cyber-neon-info rounded-xl opacity-30"
                    animate={{
                      scale: [1, 1.02, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </Card>
              </motion.div>

              <motion.div
                variants={animations.presets.cardEntrance}
                initial="hidden"
                animate="visible"
                custom={2}
              >
                <Card variant="cyber-warning" className="relative overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <svg className="w-5 h-5 text-cyber-neon-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </motion.div>
                      فعالیت کاربران
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MemoizedMiniChart
                      data={sampleChartData.activity}
                      color="bg-cyber-neon-warning"
                      label="میانگین فعالیت (%)"
                    />
                  </CardContent>
                  
                  {/* Glitch effect */}
                  <motion.div
                    className="absolute inset-0 bg-cyber-neon-warning opacity-5"
                    animate={{
                      opacity: [0, 0.1, 0],
                      x: [0, -2, 2, 0],
                    }}
                    transition={{
                      duration: 0.3,
                      repeat: Infinity,
                      repeatDelay: 4,
                      ease: "easeInOut",
                    }}
                  />
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cybersecurity System Health and Real-time Monitoring */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={animations.presets.staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Enhanced System Health with Cybersecurity Theme */}
          <motion.div 
            className="lg:col-span-2"
            variants={animations.presets.fadeIn}
          >
            <Card variant="cyber-glass" className="h-full relative overflow-hidden group">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="w-8 h-8 glass-morphism border-2 border-cyber-neon-primary/30 rounded-lg flex items-center justify-center relative"
                      animate={{
                        boxShadow: [
                          "0 0 10px var(--cyber-neon-primary)",
                          "0 0 20px var(--cyber-neon-primary)",
                          "0 0 10px var(--cyber-neon-primary)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <svg className="w-4 h-4 text-cyber-neon-primary cyber-text-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      
                      {/* Rotating scanner ring */}
                      <motion.div
                        className="absolute inset-0 border-2 border-cyber-neon-secondary rounded-lg opacity-50"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>
                    <span className="font-accent cyber-text-glow">سلامت سیستم</span>
                  </div>
                  <Link to="/system-health">
                    <Button variant="cyber-ghost" size="sm" className="group">
                      <motion.span
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        جزئیات بیشتر
                      </motion.span>
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {systemHealth.isLoading && !systemHealth.data ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <SystemHealthSkeleton />
                  </motion.div>
                ) : systemHealth.error ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <ErrorDisplay
                      error={systemHealth.error}
                      title="System Health Unavailable"
                      variant="inline"
                      onRetry={() => systemHealth.refetch()}
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    variants={animations.presets.staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.div 
                      className="space-y-4"
                      variants={animations.presets.fadeIn}
                    >
                      <MemoizedSystemHealthIndicator
                        label="CPU Usage"
                        value={systemHealthData?.cpu_usage || statsData?.system_health?.cpu_usage || 0}
                        type="percentage"
                      />
                      <MemoizedSystemHealthIndicator
                        label="Memory Usage"
                        value={systemHealthData?.memory_usage || statsData?.system_health?.memory_usage || 0}
                        type="percentage"
                      />
                    </motion.div>

                    <motion.div 
                      className="space-y-4"
                      variants={animations.presets.fadeIn}
                    >
                      <MemoizedSystemHealthIndicator
                        label="Database"
                        value={systemHealthData?.database_status || statsData?.system_health?.database_status || 'unknown'}
                        status={systemHealthData?.database_status || statsData?.system_health?.database_status || 'unknown'}
                        type="status"
                      />
                      <MemoizedSystemHealthIndicator
                        label="Redis"
                        value={systemHealthData?.redis_status || statsData?.system_health?.redis_status || 'unknown'}
                        status={systemHealthData?.redis_status || statsData?.system_health?.redis_status || 'unknown'}
                        type="status"
                      />
                    </motion.div>
                  </motion.div>
                )}
              </CardContent>
              
              {/* Real-time data flow animation */}
              <motion.div
                className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-neon-primary to-transparent opacity-50"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              
              {/* Corner accent lights */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-cyber-neon-success rounded-full animate-cyber-pulse" />
              <div className="absolute bottom-2 left-2 w-2 h-2 bg-cyber-neon-info rounded-full animate-cyber-pulse" style={{ animationDelay: '1s' }} />
            </Card>
          </motion.div>

          {/* Enhanced Online Users Widget */}
          <motion.div variants={animations.presets.fadeIn}>
            <WhoIsOnlineWidgetLazy />
          </motion.div>
        </motion.div>

        {/* Cybersecurity Quick Actions Grid */}
        <motion.div
          variants={animations.presets.fadeIn}
          initial="hidden"
          animate="visible"
        >
          <Card variant="cyber-glass" className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.div 
                  className="w-8 h-8 glass-morphism border-2 border-cyber-neon-secondary/30 rounded-lg flex items-center justify-center relative"
                  whileHover={{ scale: 1.1 }}
                  animate={{
                    boxShadow: [
                      "0 0 10px var(--cyber-neon-secondary)",
                      "0 0 20px var(--cyber-neon-secondary)",
                      "0 0 10px var(--cyber-neon-secondary)",
                    ],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <motion.svg 
                    className="w-4 h-4 text-cyber-neon-secondary cyber-text-glow" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </motion.svg>
                  
                  {/* Energy pulse effect */}
                  <motion.div
                    className="absolute inset-0 border-2 border-cyber-neon-warning rounded-lg opacity-30"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                </motion.div>
                <span className="font-accent cyber-text-glow">عملیات سریع</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={animations.presets.staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {quickActions.map((action, index) => (
                  <motion.div
                    key={index}
                    variants={animations.presets.fadeIn}
                    custom={index}
                  >
                    <MemoizedQuickActionCard {...action} />
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
            
            {/* Animated grid background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="w-full h-full" style={{
                backgroundImage: `
                  linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }} />
            </div>
            
            {/* Corner scanning effects */}
            <motion.div
              className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyber-neon-primary opacity-60"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyber-neon-primary opacity-60"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </Card>
        </motion.div>
      </motion.div>
    </ErrorBoundary>
  );
};

export default OptimizedDashboard;