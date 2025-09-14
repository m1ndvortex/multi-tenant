import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SystemHealthChart from '@/components/charts/SystemHealthChart';
import RealTimeSystemHealth from '@/components/RealTimeSystemHealth';
import SystemHealthAlerts from '@/components/SystemHealthAlerts';
import { useSystemHealthMetrics } from '@/hooks/useAnalytics';
import { CyberAnimations } from '@/components/animations/CyberAnimations';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';

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
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-card-crypto border-red-500/20">
          <CardContent className="p-8 text-center">
            <motion.div 
              className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30"
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.3)',
                  '0 0 30px rgba(239, 68, 68, 0.5)',
                  '0 0 20px rgba(239, 68, 68, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
            <h3 className="text-lg font-semibold text-white mb-2">خطا در دریافت وضعیت سیستم</h3>
            <p className="text-slate-300 mb-4">امکان دریافت اطلاعات سلامت سیستم وجود ندارد</p>
            <Button 
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300"
              onClick={() => window.location.reload()}
            >
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Page Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <motion.div 
          className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30"
          animate={{ 
            boxShadow: [
              '0 0 30px rgba(0, 212, 255, 0.3)',
              '0 0 50px rgba(0, 212, 255, 0.5)',
              '0 0 30px rgba(0, 212, 255, 0.3)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          whileHover={{ scale: 1.05 }}
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </motion.div>
        <motion.h1 
          className="text-3xl font-bold text-white mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          نظارت بر سلامت سیستم
        </motion.h1>
        <motion.p 
          className="text-lg text-slate-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          مانیتورینگ زنده و تاریخچه عملکرد سیستم
        </motion.p>
      </motion.div>

      {/* Time Range Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="glass-card-crypto border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">نمودار سلامت سیستم</h3>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-48 bg-slate-800/50 border-cyan-500/30 text-white">
                  <SelectValue placeholder="انتخاب بازه زمانی" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-cyan-500/30">
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white hover:bg-cyan-500/20">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* System Health Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <SystemHealthAlerts />
      </motion.div>

      {/* Real-time Health and Historical Chart */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.div 
          className="lg:col-span-1"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <RealTimeSystemHealth />
        </motion.div>
        <motion.div 
          className="lg:col-span-2"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <SystemHealthChart 
            data={(healthMetrics as any) || []}
            isLoading={isLoading}
          />
        </motion.div>
      </motion.div>

      {/* Detailed System Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <CyberAnimations.StaggerContainer>
          <motion.div variants={CyberAnimations.cardVariants}>
            <Card className="glass-card-crypto border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-1">اتصالات فعال دیتابیس</p>
                    <AnimatedCounter
                      value={(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.database_connections || 0}
                      className="text-2xl font-bold text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      زمان پاسخ: <span className="text-blue-400">{(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.database_response_time || 0}ms</span>
                    </p>
                  </div>
                  <motion.div 
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center border border-blue-400/30 group-hover:shadow-lg group-hover:shadow-blue-500/25"
                    whileHover={{ scale: 1.1 }}
                    animate={{ 
                      boxShadow: [
                        '0 0 10px rgba(59, 130, 246, 0.3)',
                        '0 0 20px rgba(59, 130, 246, 0.5)',
                        '0 0 10px rgba(59, 130, 246, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={CyberAnimations.cardVariants}>
            <Card className="glass-card-crypto border-green-500/30 hover:border-green-400/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-1">Redis</p>
                    <AnimatedCounter
                      value={(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.redis_memory_usage || 0}
                      suffix="MB"
                      className="text-2xl font-bold text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      کلاینت‌ها: <span className="text-green-400">{(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.redis_connected_clients || 0}</span>
                    </p>
                  </div>
                  <motion.div 
                    className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center border border-green-400/30 group-hover:shadow-lg group-hover:shadow-green-500/25"
                    whileHover={{ scale: 1.1 }}
                    animate={{ 
                      boxShadow: [
                        '0 0 10px rgba(34, 197, 94, 0.3)',
                        '0 0 20px rgba(34, 197, 94, 0.5)',
                        '0 0 10px rgba(34, 197, 94, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={CyberAnimations.cardVariants}>
            <Card className="glass-card-crypto border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-1">تسک‌های Celery</p>
                    <AnimatedCounter
                      value={((healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_active_tasks || 0) + 
                             ((healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_pending_tasks || 0)}
                      className="text-2xl font-bold text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      ناموفق: <span className="text-red-400">{(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.celery_failed_tasks || 0}</span>
                    </p>
                  </div>
                  <motion.div 
                    className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center border border-purple-400/30 group-hover:shadow-lg group-hover:shadow-purple-500/25"
                    whileHover={{ scale: 1.1 }}
                    animate={{ 
                      boxShadow: [
                        '0 0 10px rgba(168, 85, 247, 0.3)',
                        '0 0 20px rgba(168, 85, 247, 0.5)',
                        '0 0 10px rgba(168, 85, 247, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={CyberAnimations.cardVariants}>
            <Card className="glass-card-crypto border-orange-500/30 hover:border-orange-400/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-1">عملکرد API</p>
                    <AnimatedCounter
                      value={(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.api_response_time || 0}
                      suffix="ms"
                      className="text-2xl font-bold text-white"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      نرخ خطا: <span className="text-orange-400">{(healthMetrics as any)?.[((healthMetrics as any)?.length || 1) - 1]?.error_rate || 0}%</span>
                    </p>
                  </div>
                  <motion.div 
                    className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center border border-orange-400/30 group-hover:shadow-lg group-hover:shadow-orange-500/25"
                    whileHover={{ scale: 1.1 }}
                    animate={{ 
                      boxShadow: [
                        '0 0 10px rgba(249, 115, 22, 0.3)',
                        '0 0 20px rgba(249, 115, 22, 0.5)',
                        '0 0 10px rgba(249, 115, 22, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </CyberAnimations.StaggerContainer>
      </motion.div>

      {/* System Status Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="glass-card-crypto border-indigo-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center border border-indigo-400/30"
                animate={{ 
                  boxShadow: [
                    '0 0 10px rgba(99, 102, 241, 0.3)',
                    '0 0 20px rgba(99, 102, 241, 0.5)',
                    '0 0 10px rgba(99, 102, 241, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              <span className="text-white">خلاصه وضعیت سیستم</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    className="p-4 border border-slate-600/30 rounded-lg bg-slate-800/30"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  >
                    <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-slate-600 rounded w-1/2"></div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
                variants={CyberAnimations.staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  className="p-4 border border-cyan-500/20 rounded-lg bg-slate-800/30 hover:border-cyan-400/40 transition-all duration-300"
                  variants={CyberAnimations.cardVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-slate-300 mb-1">میانگین استفاده از CPU</p>
                  <AnimatedCounter
                    value={(healthMetrics as any)?.length ? 
                      Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.cpu_usage, 0) / (healthMetrics as any).length) 
                      : 0}
                    suffix="%"
                    className="text-xl font-bold text-cyan-400"
                  />
                </motion.div>
                
                <motion.div 
                  className="p-4 border border-green-500/20 rounded-lg bg-slate-800/30 hover:border-green-400/40 transition-all duration-300"
                  variants={CyberAnimations.cardVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-slate-300 mb-1">میانگین استفاده از حافظه</p>
                  <AnimatedCounter
                    value={(healthMetrics as any)?.length ? 
                      Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.memory_usage, 0) / (healthMetrics as any).length) 
                      : 0}
                    suffix="%"
                    className="text-xl font-bold text-green-400"
                  />
                </motion.div>
                
                <motion.div 
                  className="p-4 border border-blue-500/20 rounded-lg bg-slate-800/30 hover:border-blue-400/40 transition-all duration-300"
                  variants={CyberAnimations.cardVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-slate-300 mb-1">میانگین استفاده از دیسک</p>
                  <AnimatedCounter
                    value={(healthMetrics as any)?.length ? 
                      Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.disk_usage, 0) / (healthMetrics as any).length) 
                      : 0}
                    suffix="%"
                    className="text-xl font-bold text-blue-400"
                  />
                </motion.div>
                
                <motion.div 
                  className="p-4 border border-purple-500/20 rounded-lg bg-slate-800/30 hover:border-purple-400/40 transition-all duration-300"
                  variants={CyberAnimations.cardVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-slate-300 mb-1">میانگین زمان پاسخ دیتابیس</p>
                  <AnimatedCounter
                    value={(healthMetrics as any)?.length ? 
                      Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.database_response_time, 0) / (healthMetrics as any).length) 
                      : 0}
                    suffix="ms"
                    className="text-xl font-bold text-purple-400"
                  />
                </motion.div>
                
                <motion.div 
                  className="p-4 border border-orange-500/20 rounded-lg bg-slate-800/30 hover:border-orange-400/40 transition-all duration-300"
                  variants={CyberAnimations.cardVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-slate-300 mb-1">میانگین زمان پاسخ API</p>
                  <AnimatedCounter
                    value={(healthMetrics as any)?.length ? 
                      Math.round((healthMetrics as any).reduce((sum: number, item: any) => sum + item.api_response_time, 0) / (healthMetrics as any).length) 
                      : 0}
                    suffix="ms"
                    className="text-xl font-bold text-orange-400"
                  />
                </motion.div>
                
                <motion.div 
                  className="p-4 border border-red-500/20 rounded-lg bg-slate-800/30 hover:border-red-400/40 transition-all duration-300"
                  variants={CyberAnimations.cardVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <p className="text-sm font-medium text-slate-300 mb-1">میانگین نرخ خطا</p>
                  <AnimatedCounter
                    value={(healthMetrics as any)?.length ? 
                      parseFloat(((healthMetrics as any).reduce((sum: number, item: any) => sum + item.error_rate, 0) / (healthMetrics as any).length).toFixed(2))
                      : 0}
                    suffix="%"
                    className="text-xl font-bold text-red-400"
                    decimals={2}
                  />
                </motion.div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default SystemHealth;