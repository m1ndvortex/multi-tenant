/**
 * Subscription Overview Dashboard Component
 * Displays subscription statistics and overview
 * Enhanced with cybersecurity theme, glassmorphism, and neon effects
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubscriptionOverview } from '@/types/subscription';
import { cn } from '@/lib/utils';
import { AnimatedWrapper, CyberCard, NeonText, CyberSpinner } from '@/components/animations/CyberAnimations';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { createStaggerAnimation } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

interface SubscriptionOverviewDashboardProps {
  overview?: SubscriptionOverview | null;
  loading: boolean;
  onRefresh: () => void;
}

const SubscriptionOverviewDashboard: React.FC<SubscriptionOverviewDashboardProps> = ({
  overview,
  loading,
  onRefresh
}) => {
  if (loading) {
    return (
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial="hidden"
        animate="visible"
        variants={createStaggerAnimation(0.1, 0.3)}
      >
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <CyberCard className={`${glassmorphismClasses.card} border-cyan-500/20`}>
              <CardHeader className="pb-2">
                <motion.div 
                  className="h-4 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded w-3/4"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="h-8 bg-gradient-to-r from-emerald-500/20 to-orange-500/20 rounded w-1/2 mb-2"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div 
                  className="h-3 bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded w-full"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                />
              </CardContent>
            </CyberCard>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (!overview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <CyberCard variant="primary" className={`${glassmorphismClasses.card} border-red-500/20`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,71,87,0.8)]"></div>
              <NeonText color="#FF4757" intensity="medium">
                خطا در بارگذاری
              </NeonText>
            </CardTitle>
            <CardDescription className="text-gray-400">
              اطلاعات آماری اشتراک‌ها در دسترس نیست
            </CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={onRefresh}
                className={`${glassmorphismClasses.base} border-red-500/30 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(255,71,87,0.3)] bg-white/5 text-white hover:bg-red-500/10 transition-all duration-300`}
              >
                <NeonText color="#FF4757" intensity="low">
                  تلاش مجدد
                </NeonText>
              </Button>
            </motion.div>
          </CardContent>
        </CyberCard>
      </motion.div>
    );
  }

  const formatLastUpdated = (dateString: string) => {
    return new Date(dateString).toLocaleString('fa-IR');
  };

  const getConversionRateColor = (rate: number) => {
    if (rate >= 20) return 'text-green-600';
    if (rate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={createStaggerAnimation(0.1, 0.3)}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        variants={{
          hidden: { opacity: 0, y: -20 },
          visible: { opacity: 1, y: 0 }
        }}
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            <NeonText color="#00D4FF" intensity="high" as="span">
              آمار کلی اشتراک‌ها
            </NeonText>
          </h2>
          <motion.p 
            className="text-sm text-gray-400"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            آخرین به‌روزرسانی: {formatLastUpdated(overview.last_updated)}
          </motion.p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button 
            onClick={onRefresh} 
            variant="outline"
            className={`${glassmorphismClasses.base} border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] bg-white/5 text-white hover:bg-cyan-500/10 transition-all duration-300`}
          >
            <NeonText color="#00D4FF" intensity="low">
              به‌روزرسانی
            </NeonText>
          </Button>
        </motion.div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
              delayChildren: 0.2
            }
          }
        }}
      >
        {/* Total Tenants */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 }
          }}
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <CyberCard variant="primary" className={`${glassmorphismClasses.cardCrypto} border-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_30px_rgba(0,212,255,0.2)] transition-all duration-300`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,212,255,0.8)]"></div>
                <NeonText color="#00D4FF" intensity="medium">
                  کل تنانت‌ها
                </NeonText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter 
                  value={overview.total_tenants} 
                  className={neonClasses.text.numbers}
                />
              </div>
              <p className="text-xs text-cyan-300 mt-1">
                تمام تنانت‌های ثبت شده
              </p>
            </CardContent>
          </CyberCard>
        </motion.div>

        {/* Pro Subscriptions */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 }
          }}
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <CyberCard variant="secondary" className={`${glassmorphismClasses.cardCrypto} border-emerald-500/20 hover:border-emerald-400/40 hover:shadow-[0_0_30px_rgba(0,255,136,0.2)] transition-all duration-300`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,136,0.8)]"></div>
                <NeonText color="#00FF88" intensity="medium">
                  اشتراک حرفه‌ای
                </NeonText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter 
                  value={overview.pro_subscriptions} 
                  className={neonClasses.text.secondary}
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-emerald-300">
                  فعال: <AnimatedCounter value={overview.active_pro_subscriptions} className="inline" />
                </p>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                >
                  <Badge 
                    variant="secondary" 
                    className="text-xs bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-400/30 text-emerald-300 shadow-[0_0_8px_rgba(0,255,136,0.3)]"
                  >
                    {((overview.active_pro_subscriptions / overview.pro_subscriptions) * 100).toFixed(1)}%
                  </Badge>
                </motion.div>
              </div>
            </CardContent>
          </CyberCard>
        </motion.div>

        {/* Free Subscriptions */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 }
          }}
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <CyberCard variant="accent" className={`${glassmorphismClasses.cardCrypto} border-orange-500/20 hover:border-orange-400/40 hover:shadow-[0_0_30px_rgba(255,107,53,0.2)] transition-all duration-300`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,107,53,0.8)]"></div>
                <NeonText color="#FF6B35" intensity="medium">
                  اشتراک رایگان
                </NeonText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter 
                  value={overview.free_subscriptions} 
                  className={neonClasses.text.tertiary}
                />
              </div>
              <p className="text-xs text-orange-300 mt-1">
                {((overview.free_subscriptions / overview.total_tenants) * 100).toFixed(1)}% از کل
              </p>
            </CardContent>
          </CyberCard>
        </motion.div>

        {/* Conversion Rate */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 }
          }}
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <CyberCard variant="primary" className={`${glassmorphismClasses.cardCrypto} border-purple-500/20 hover:border-purple-400/40 hover:shadow-[0_0_30px_rgba(165,94,234,0.2)] transition-all duration-300`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(165,94,234,0.8)]"></div>
                <NeonText color="#A55EEA" intensity="medium">
                  نرخ تبدیل
                </NeonText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                overview.conversion_rate >= 20 ? neonClasses.text.secondary : 
                overview.conversion_rate >= 10 ? neonClasses.text.warning : 
                neonClasses.text.danger
              )}>
                <AnimatedCounter 
                  value={overview.conversion_rate} 
                  decimals={1}
                  suffix="%"
                />
              </div>
              <p className="text-xs text-purple-300 mt-1">
                رایگان به حرفه‌ای
              </p>
            </CardContent>
          </CyberCard>
        </motion.div>
      </motion.div>

      {/* Alert Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
              delayChildren: 0.4
            }
          }
        }}
      >
        {/* Expiring Soon */}
        {overview.expiring_soon > 0 && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 30, scale: 0.95 },
              visible: { opacity: 1, y: 0, scale: 1 }
            }}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <CyberCard variant="primary" className={`${glassmorphismClasses.cardCrypto} border-yellow-500/20 hover:border-yellow-400/40 hover:shadow-[0_0_30px_rgba(255,184,0,0.2)] transition-all duration-300`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <motion.svg 
                    className="w-4 h-4 text-yellow-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </motion.svg>
                  <NeonText color="#FFB800" intensity="medium">
                    در حال انقضا
                  </NeonText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <AnimatedCounter 
                    value={overview.expiring_soon} 
                    className={neonClasses.text.warning}
                  />
                </div>
                <p className="text-xs text-yellow-300 mt-1">
                  اشتراک در ۳۰ روز آینده منقضی می‌شود
                </p>
              </CardContent>
            </CyberCard>
          </motion.div>
        )}

        {/* Expired */}
        {overview.expired_subscriptions > 0 && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 30, scale: 0.95 },
              visible: { opacity: 1, y: 0, scale: 1 }
            }}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <CyberCard variant="primary" className={`${glassmorphismClasses.cardCrypto} border-red-500/20 hover:border-red-400/40 hover:shadow-[0_0_30px_rgba(255,71,87,0.2)] transition-all duration-300`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <motion.svg 
                    className="w-4 h-4 text-red-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </motion.svg>
                  <NeonText color="#FF4757" intensity="medium">
                    منقضی شده
                  </NeonText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <AnimatedCounter 
                    value={overview.expired_subscriptions} 
                    className={neonClasses.text.danger}
                  />
                </div>
                <p className="text-xs text-red-300 mt-1">
                  اشتراک منقضی شده که نیاز به تمدید دارد
                </p>
              </CardContent>
            </CyberCard>
          </motion.div>
        )}

        {/* Recent Upgrades */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 }
          }}
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <CyberCard variant="primary" className={`${glassmorphismClasses.cardCrypto} border-indigo-500/20 hover:border-indigo-400/40 hover:shadow-[0_0_30px_rgba(83,82,237,0.2)] transition-all duration-300`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <motion.svg 
                  className="w-4 h-4 text-indigo-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </motion.svg>
                <NeonText color="#5352ED" intensity="medium">
                  ارتقاء اخیر
                </NeonText>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter 
                  value={overview.recent_upgrades} 
                  className={neonClasses.text.info}
                />
              </div>
              <p className="text-xs text-indigo-300 mt-1">
                ارتقاء به حرفه‌ای در ۳۰ روز گذشته
              </p>
            </CardContent>
          </CyberCard>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default SubscriptionOverviewDashboard;