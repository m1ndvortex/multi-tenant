import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrentSystemHealth } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';
import { CyberAnimations } from '@/components/animations/CyberAnimations';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';

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
      <Card className={cn("glass-card-crypto border-red-500/30", className)}>
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
          <p className="text-slate-300">امکان دریافت اطلاعات سلامت سیستم وجود ندارد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass-card-crypto border-cyan-500/30", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center border border-cyan-400/30"
              animate={{ 
                boxShadow: [
                  '0 0 10px rgba(0, 212, 255, 0.3)',
                  '0 0 20px rgba(0, 212, 255, 0.5)',
                  '0 0 10px rgba(0, 212, 255, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </motion.div>
            <span className="text-white">سلامت سیستم (زنده)</span>
          </div>
          {isLoading && (
            <motion.div 
              className="rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && !healthData ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <motion.div 
                key={i} 
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-600/20"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              >
                <div className="h-4 bg-slate-600 rounded w-1/3"></div>
                <div className="h-4 bg-slate-600 rounded w-1/4"></div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            className="space-y-4"
            variants={CyberAnimations.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* CPU Usage */}
            <motion.div 
              className="p-3 rounded-lg bg-slate-800/30 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300"
              variants={CyberAnimations.cardVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">استفاده از CPU</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs border-0', getStatusColor(getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 })))}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 }))}
                      <AnimatedCounter value={healthData?.cpu_usage || 0} suffix="%" />
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  className={cn(
                    "h-full bg-gradient-to-r",
                    getProgressBarColor(getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 }))
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(healthData?.cpu_usage || 0, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{
                    boxShadow: `0 0 10px ${
                      getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 }) === 'healthy' ? 'rgba(34, 197, 94, 0.5)' :
                      getHealthStatus(healthData?.cpu_usage || 0, { warning: 70, critical: 90 }) === 'warning' ? 'rgba(251, 191, 36, 0.5)' :
                      'rgba(239, 68, 68, 0.5)'
                    }`
                  }}
                />
              </div>
            </motion.div>

            {/* Memory Usage */}
            <motion.div 
              className="p-3 rounded-lg bg-slate-800/30 border border-green-500/20 hover:border-green-400/40 transition-all duration-300"
              variants={CyberAnimations.cardVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">استفاده از حافظه</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs border-0', getStatusColor(getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 })))}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 }))}
                      <AnimatedCounter value={healthData?.memory_usage || 0} suffix="%" />
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  className={cn(
                    "h-full bg-gradient-to-r",
                    getProgressBarColor(getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 }))
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(healthData?.memory_usage || 0, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                  style={{
                    boxShadow: `0 0 10px ${
                      getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 }) === 'healthy' ? 'rgba(34, 197, 94, 0.5)' :
                      getHealthStatus(healthData?.memory_usage || 0, { warning: 80, critical: 95 }) === 'warning' ? 'rgba(251, 191, 36, 0.5)' :
                      'rgba(239, 68, 68, 0.5)'
                    }`
                  }}
                />
              </div>
            </motion.div>

            {/* Disk Usage */}
            <motion.div 
              className="p-3 rounded-lg bg-slate-800/30 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300"
              variants={CyberAnimations.cardVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">استفاده از دیسک</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs border-0', getStatusColor(getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 })))}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 }))}
                      <AnimatedCounter value={healthData?.disk_usage || 0} suffix="%" />
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  className={cn(
                    "h-full bg-gradient-to-r",
                    getProgressBarColor(getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 }))
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(healthData?.disk_usage || 0, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  style={{
                    boxShadow: `0 0 10px ${
                      getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 }) === 'healthy' ? 'rgba(34, 197, 94, 0.5)' :
                      getHealthStatus(healthData?.disk_usage || 0, { warning: 85, critical: 95 }) === 'warning' ? 'rgba(251, 191, 36, 0.5)' :
                      'rgba(239, 68, 68, 0.5)'
                    }`
                  }}
                />
              </div>
            </motion.div>

            {/* Database Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">اتصالات دیتابیس</span>
                  <AnimatedCounter 
                    value={healthData?.database_connections || 0}
                    className="text-sm font-bold text-purple-400"
                  />
                </div>
              </motion.div>
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-indigo-500/20 hover:border-indigo-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">زمان پاسخ DB</span>
                  <AnimatedCounter 
                    value={healthData?.database_response_time || 0}
                    suffix="ms"
                    className="text-sm font-bold text-indigo-400"
                  />
                </div>
              </motion.div>
            </div>

            {/* Redis Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-red-500/20 hover:border-red-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">حافظه Redis</span>
                  <AnimatedCounter 
                    value={healthData?.redis_memory_usage || 0}
                    suffix="MB"
                    className="text-sm font-bold text-red-400"
                  />
                </div>
              </motion.div>
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-pink-500/20 hover:border-pink-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">کلاینت‌های Redis</span>
                  <AnimatedCounter 
                    value={healthData?.redis_connected_clients || 0}
                    className="text-sm font-bold text-pink-400"
                  />
                </div>
              </motion.div>
            </div>

            {/* Celery Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">تسک‌های فعال</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <AnimatedCounter value={healthData?.celery_active_tasks || 0} />
                  </Badge>
                </div>
              </motion.div>
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-yellow-500/20 hover:border-yellow-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">تسک‌های در انتظار</span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <AnimatedCounter value={healthData?.celery_pending_tasks || 0} />
                  </Badge>
                </div>
              </motion.div>
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-red-500/20 hover:border-red-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">تسک‌های ناموفق</span>
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                    <AnimatedCounter value={healthData?.celery_failed_tasks || 0} />
                  </Badge>
                </div>
              </motion.div>
            </div>

            {/* API Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">زمان پاسخ API</span>
                  <AnimatedCounter 
                    value={healthData?.api_response_time || 0}
                    suffix="ms"
                    className="text-sm font-bold text-orange-400"
                  />
                </div>
              </motion.div>
              <motion.div 
                className="p-3 rounded-lg bg-slate-800/30 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300"
                variants={CyberAnimations.cardVariants}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">نرخ خطا</span>
                  <Badge className={cn(
                    'text-xs border-0',
                    getStatusColor(getHealthStatus(healthData?.error_rate || 0, { warning: 5, critical: 10 }))
                  )}>
                    <AnimatedCounter value={healthData?.error_rate || 0} suffix="%" />
                  </Badge>
                </div>
              </motion.div>
            </div>

            {/* Last Update */}
            <motion.div 
              className="pt-4 border-t border-slate-600/30"
              variants={CyberAnimations.cardVariants}
            >
              <div className="flex items-center justify-center text-xs text-slate-400">
                <motion.svg 
                  className="w-3 h-3 mr-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </motion.svg>
                آخرین بروزرسانی: <span className="text-cyan-400">{healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString('fa-IR') : 'نامشخص'}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeSystemHealth;