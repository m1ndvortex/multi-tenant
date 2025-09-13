import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { animationPresets, cyberAnimations } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

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
    <motion.div 
      className="space-y-6"
      variants={animationPresets.pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Cybersecurity Page Header */}
      <motion.div 
        className="text-center mb-8"
        variants={animationPresets.fadeIn}
      >
        <motion.div 
          className={`w-20 h-20 ${glassmorphismClasses.card} ${neonClasses.glow.multiColor} 
                     bg-gradient-to-br from-[#00D4FF]/20 via-[#00FF88]/20 to-[#FF6B35]/20 
                     flex items-center justify-center mx-auto mb-4 relative overflow-hidden`}
          variants={animationPresets.cardEntrance}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 0 40px rgba(0,212,255,0.4), 0 0 60px rgba(0,255,136,0.2)",
            transition: { duration: 0.3 }
          }}
        >
          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#00D4FF] via-[#00FF88] to-[#FF6B35] opacity-20"
            variants={cyberAnimations.holographic}
            animate="animate"
          />
          
          <svg className="w-10 h-10 text-[#00D4FF] relative z-10 drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </motion.div>

        <motion.h1 
          className={`text-3xl font-bold mb-2 ${neonClasses.text.primary}`}
          variants={cyberAnimations.matrixReveal}
          custom={0}
        >
          آنالیتیکس و نظارت پلتفرم
        </motion.h1>
        
        <motion.p 
          className="text-lg text-[#B8BCC8]"
          variants={cyberAnimations.matrixReveal}
          custom={1}
        >
          تحلیل عملکرد، نظارت بر سلامت سیستم و بررسی خطاها
        </motion.p>
        
        {/* Cybersecurity Real-time Status and Controls */}
        <motion.div 
          className="flex items-center justify-center gap-4 mt-6"
          variants={animationPresets.staggerContainer}
        >
          <motion.div 
            className={`flex items-center gap-2 text-sm ${glassmorphismClasses.base} px-3 py-2 rounded-lg`}
            variants={animationPresets.fadeIn}
          >
            <motion.div 
              className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-[#00FF88]' : 'bg-[#6B7280]'}`}
              variants={cyberAnimations.cyberPulse}
              animate={autoRefresh ? "animate" : ""}
            />
            <span className="text-[#B8BCC8]">
              آخرین بروزرسانی: {lastUpdated.toLocaleTimeString('fa-IR')}
            </span>
          </motion.div>
          
          <motion.div variants={animationPresets.fadeIn}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={metricsLoading || healthLoading}
              className={`${glassmorphismClasses.base} border-[#00D4FF]/30 hover:border-[#00D4FF]/60 
                         hover:bg-[#00D4FF]/10 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]
                         text-[#00D4FF] transition-all duration-300`}
            >
              {metricsLoading || healthLoading ? (
                <motion.div 
                  className="w-4 h-4 border-2 border-[#00D4FF] border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              بروزرسانی
            </Button>
          </motion.div>
          
          <motion.div variants={animationPresets.fadeIn}>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh 
                ? `bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-black font-medium
                   hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300`
                : `${glassmorphismClasses.base} border-[#6B7280]/30 hover:border-[#00FF88]/60 
                   hover:bg-[#00FF88]/10 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]
                   text-[#6B7280] hover:text-[#00FF88] transition-all duration-300`
              }
            >
              {autoRefresh ? 'خودکار فعال' : 'خودکار غیرفعال'}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Cybersecurity Analytics Tabs */}
      <motion.div variants={animationPresets.fadeIn}>
        <Tabs defaultValue="platform" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 ${glassmorphismClasses.base} p-1 rounded-lg 
                               bg-gradient-to-r from-[#0B0E1A] via-[#1A1D29] to-[#252A3A]`}>
            <TabsTrigger 
              value="platform" 
              className={`data-[state=active]:${glassmorphismClasses.neon} 
                         data-[state=active]:text-[#00D4FF] data-[state=active]:shadow-[0_0_20px_rgba(0,212,255,0.3)]
                         text-[#B8BCC8] hover:text-[#00D4FF] transition-all duration-300
                         data-[state=active]:border-[#00D4FF]/40`}
            >
              آنالیتیکس پلتفرم
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className={`data-[state=active]:${glassmorphismClasses.base} 
                         data-[state=active]:text-[#00FF88] data-[state=active]:shadow-[0_0_20px_rgba(0,255,136,0.3)]
                         data-[state=active]:border-[#00FF88]/40 data-[state=active]:bg-[#00FF88]/10
                         text-[#B8BCC8] hover:text-[#00FF88] transition-all duration-300`}
            >
              سلامت سیستم
            </TabsTrigger>
            <TabsTrigger 
              value="errors" 
              className={`data-[state=active]:${glassmorphismClasses.base} 
                         data-[state=active]:text-[#FF4757] data-[state=active]:shadow-[0_0_20px_rgba(255,71,87,0.3)]
                         data-[state=active]:border-[#FF4757]/40 data-[state=active]:bg-[#FF4757]/10
                         text-[#B8BCC8] hover:text-[#FF4757] transition-all duration-300`}
            >
              لاگ خطاها
            </TabsTrigger>
          </TabsList>

          {/* Cybersecurity Platform Analytics Tab */}
          <TabsContent value="platform" className="space-y-6">
            {/* Cybersecurity Time Range Filter */}
            <motion.div
              variants={animationPresets.fadeIn}
              initial="hidden"
              animate="visible"
            >
              <Card className={`${glassmorphismClasses.card} border-[#00D4FF]/20 hover:border-[#00D4FF]/40 transition-all duration-300`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${neonClasses.text.primary}`}>
                      آنالیتیکس پلتفرم
                    </h3>
                    <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                      <SelectTrigger className={`w-48 ${glassmorphismClasses.base} border-[#00D4FF]/30 
                                                 hover:border-[#00D4FF]/60 text-[#B8BCC8] hover:text-[#00D4FF]
                                                 transition-all duration-300`}>
                        <SelectValue placeholder="انتخاب بازه زمانی" />
                      </SelectTrigger>
                      <SelectContent className={`${glassmorphismClasses.elevated} border-[#00D4FF]/30`}>
                        {timeRangeOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="text-[#B8BCC8] hover:text-[#00D4FF] hover:bg-[#00D4FF]/10"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Cybersecurity Platform Charts */}
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              variants={animationPresets.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={animationPresets.cardEntrance}>
                <UserGrowthChart 
                  data={(platformMetrics as any)?.user_growth || { labels: [], data: [] }}
                  isLoading={metricsLoading}
                  onTimeRangeChange={handleTimeRangeChange}
                  currentTimeRange={timeRange}
                />
              </motion.div>
              <motion.div variants={animationPresets.cardEntrance}>
                <RevenueChart 
                  data={(platformMetrics as any)?.revenue_trends || { labels: [], mrr_data: [], growth_rate: [] }}
                  isLoading={metricsLoading}
                  onTimeRangeChange={handleTimeRangeChange}
                  currentTimeRange={timeRange}
                />
              </motion.div>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              variants={animationPresets.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={animationPresets.cardEntrance}>
                <InvoiceVolumeChart 
                  data={(platformMetrics as any)?.invoice_volume || { labels: [], data: [] }}
                  isLoading={metricsLoading}
                  onTimeRangeChange={handleTimeRangeChange}
                  currentTimeRange={timeRange}
                />
              </motion.div>
              
              {/* Cybersecurity Subscription Conversions Chart */}
              <motion.div variants={animationPresets.cardEntrance}>
                <ConversionRatesChart 
                  data={(platformMetrics as any)?.subscription_conversions || { labels: [], free_to_pro: [], churn_rate: [] }}
                  isLoading={metricsLoading}
                />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Cybersecurity System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            {/* Cybersecurity Time Range Filter */}
            <motion.div
              variants={animationPresets.fadeIn}
              initial="hidden"
              animate="visible"
            >
              <Card className={`${glassmorphismClasses.card} border-[#00FF88]/20 hover:border-[#00FF88]/40 transition-all duration-300`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${neonClasses.text.secondary}`}>
                      نظارت بر سلامت سیستم
                    </h3>
                    <Select value={healthTimeRange} onValueChange={(value: any) => setHealthTimeRange(value)}>
                      <SelectTrigger className={`w-48 ${glassmorphismClasses.base} border-[#00FF88]/30 
                                                 hover:border-[#00FF88]/60 text-[#B8BCC8] hover:text-[#00FF88]
                                                 transition-all duration-300`}>
                        <SelectValue placeholder="انتخاب بازه زمانی" />
                      </SelectTrigger>
                      <SelectContent className={`${glassmorphismClasses.elevated} border-[#00FF88]/30`}>
                        {healthTimeRangeOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value}
                            className="text-[#B8BCC8] hover:text-[#00FF88] hover:bg-[#00FF88]/10"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Cybersecurity Real-time Health and Historical Chart */}
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              variants={animationPresets.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="lg:col-span-1" variants={animationPresets.cardEntrance}>
                <RealTimeSystemHealth />
              </motion.div>
              <motion.div className="lg:col-span-2" variants={animationPresets.cardEntrance}>
                <SystemHealthChart 
                  data={(healthMetrics as any) || []}
                  isLoading={healthLoading}
                />
              </motion.div>
            </motion.div>

            {/* Cybersecurity Additional System Metrics */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={animationPresets.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={animationPresets.cardEntrance}>
                <Card className={`${glassmorphismClasses.cardCrypto} border-[#00D4FF]/20 hover:border-[#00D4FF]/40 
                                 hover:shadow-[0_0_30px_rgba(0,212,255,0.2)] transition-all duration-300`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#B8BCC8] mb-1">اتصالات فعال DB</p>
                        <p className={`text-2xl font-bold font-mono ${neonClasses.text.numbers}`}>
                          {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.database_connections || 0}
                        </p>
                      </div>
                      <motion.div 
                        className="w-10 h-10 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-lg flex items-center justify-center"
                        whileHover={{ 
                          scale: 1.1,
                          boxShadow: "0 0 20px rgba(0,212,255,0.6)",
                          transition: { duration: 0.2 }
                        }}
                      >
                        <svg className="w-5 h-5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={animationPresets.cardEntrance}>
                <Card className={`${glassmorphismClasses.cardCrypto} border-[#00FF88]/20 hover:border-[#00FF88]/40 
                                 hover:shadow-[0_0_30px_rgba(0,255,136,0.2)] transition-all duration-300`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#B8BCC8] mb-1">زمان پاسخ API</p>
                        <p className={`text-2xl font-bold font-mono ${neonClasses.text.numbers}`}>
                          {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.api_response_time || 0}ms
                        </p>
                      </div>
                      <motion.div 
                        className="w-10 h-10 bg-gradient-to-br from-[#00FF88] to-[#00CC6A] rounded-lg flex items-center justify-center"
                        whileHover={{ 
                          scale: 1.1,
                          boxShadow: "0 0 20px rgba(0,255,136,0.6)",
                          transition: { duration: 0.2 }
                        }}
                      >
                        <svg className="w-5 h-5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={animationPresets.cardEntrance}>
                <Card className={`${glassmorphismClasses.cardCrypto} border-[#A55EEA]/20 hover:border-[#A55EEA]/40 
                                 hover:shadow-[0_0_30px_rgba(165,94,234,0.2)] transition-all duration-300`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#B8BCC8] mb-1">تسک‌های Celery</p>
                        <p className={`text-2xl font-bold font-mono ${neonClasses.text.purple}`}>
                          {((healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_active_tasks || 0) + 
                           ((healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_pending_tasks || 0)}
                        </p>
                      </div>
                      <motion.div 
                        className="w-10 h-10 bg-gradient-to-br from-[#A55EEA] to-[#8B46C7] rounded-lg flex items-center justify-center"
                        whileHover={{ 
                          scale: 1.1,
                          boxShadow: "0 0 20px rgba(165,94,234,0.6)",
                          transition: { duration: 0.2 }
                        }}
                      >
                        <svg className="w-5 h-5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={animationPresets.cardEntrance}>
                <Card className={`${glassmorphismClasses.cardCrypto} border-[#FF4757]/20 hover:border-[#FF4757]/40 
                                 hover:shadow-[0_0_30px_rgba(255,71,87,0.2)] transition-all duration-300`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#B8BCC8] mb-1">نرخ خطا</p>
                        <p className={`text-2xl font-bold font-mono ${neonClasses.text.danger}`}>
                          {(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.error_rate || 0}%
                        </p>
                      </div>
                      <motion.div 
                        className="w-10 h-10 bg-gradient-to-br from-[#FF4757] to-[#CC3A47] rounded-lg flex items-center justify-center"
                        whileHover={{ 
                          scale: 1.1,
                          boxShadow: "0 0 20px rgba(255,71,87,0.6)",
                          transition: { duration: 0.2 }
                        }}
                      >
                        <svg className="w-5 h-5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Cybersecurity API Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            <motion.div
              variants={animationPresets.fadeIn}
              initial="hidden"
              animate="visible"
            >
              <ApiErrorLog />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default Analytics;