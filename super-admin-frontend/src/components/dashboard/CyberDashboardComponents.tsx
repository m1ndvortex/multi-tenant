/**
 * Cybersecurity-themed Dashboard Components
 * Enhanced dashboard components with crypto-style layouts and animations
 */

import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter, AnimatedPercentage } from '@/components/animations/AnimatedCounter';
import { CyberMiniChart, CyberSparkline } from '@/components/charts/CyberCharts';
import { cn } from '@/lib/utils';

// Enhanced Cybersecurity Stat Card
interface CyberStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  link?: string;
  isLoading?: boolean;
  delay?: number;
  sparklineData?: number[];
}

export const CyberStatCard = memo<CyberStatCardProps>(({
  title,
  value,
  subtitle,
  icon,
  gradient,
  trend,
  link,
  isLoading = false,
  delay = 0,
  sparklineData = []
}) => {
  const CardWrapper = link ? Link : 'div';
  const cardProps = link ? { to: link } : {};

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.95,
      rotateX: -15,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        delay,
        ease: "easeOut",
        type: "spring",
        stiffness: 300,
        damping: 20
      },
    },
    hover: {
      y: -8,
      scale: 1.03,
      rotateX: 5,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      },
    },
  };

  if (isLoading) {
    return (
      <Card variant="cyber-glass" className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded mb-3 w-2/3"></div>
              <div className="h-8 bg-white/10 rounded mb-3 w-1/2"></div>
              <div className="h-3 bg-white/10 rounded w-1/3"></div>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CardWrapper {...(cardProps as any)} className={link ? 'block' : ''}>
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={link ? "hover" : undefined}
      >
        <Card 
          variant="cyber-glass" 
          className={cn(
            "h-full transition-all duration-300 relative overflow-hidden",
            link && "cursor-pointer group"
          )}
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${gradient.includes('blue') ? '#00D4FF' : gradient.includes('green') ? '#00FF88' : gradient.includes('purple') ? '#A55EEA' : '#FF6B35'}20 0%, transparent 70%)`
            }}
          />
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <motion.p 
                  className="text-sm font-medium text-[#B8BCC8] mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.2, duration: 0.3 }}
                >
                  {title}
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay + 0.4, duration: 0.3 }}
                >
                  <AnimatedCounter
                    value={typeof value === 'number' ? value : parseInt(value.toString()) || 0}
                    duration={1.5}
                    delay={delay + 0.6}
                    size="xl"
                    className="block mb-2"
                    glowEffect={true}
                  />
                </motion.div>
                
                {subtitle && (
                  <motion.p 
                    className="text-sm text-[#6B7280] mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: delay + 0.8, duration: 0.3 }}
                  >
                    {subtitle}
                  </motion.p>
                )}
                
                {trend && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 1, duration: 0.3 }}
                  >
                    <AnimatedPercentage
                      value={trend.value}
                      delay={delay + 1.2}
                      size="sm"
                    />
                  </motion.div>
                )}

                {sparklineData.length > 0 && (
                  <motion.div
                    className="mt-3"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: delay + 1.4, duration: 0.8 }}
                  >
                    <CyberSparkline
                      data={sparklineData}
                      width={120}
                      height={25}
                      color={trend?.isPositive ? '#00FF88' : '#00D4FF'}
                    />
                  </motion.div>
                )}
              </div>
              
              <motion.div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg relative",
                  "bg-gradient-to-br",
                  gradient
                )}
                initial={{ opacity: 0, scale: 0, rotate: -180 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ 
                  delay: delay + 0.3, 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 200
                }}
                whileHover={{
                  scale: 1.1,
                  rotate: 5,
                  transition: { duration: 0.2 }
                }}
              >
                {/* Icon glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100"
                  style={{
                    boxShadow: `0 0 20px ${gradient.includes('blue') ? '#00D4FF' : gradient.includes('green') ? '#00FF88' : gradient.includes('purple') ? '#A55EEA' : '#FF6B35'}60`
                  }}
                  transition={{ duration: 0.3 }}
                />
                {icon}
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </CardWrapper>
  );
});

CyberStatCard.displayName = 'CyberStatCard';

// Enhanced Quick Action Card
interface CyberQuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  link: string;
  badge?: string;
  delay?: number;
}

export const CyberQuickActionCard = memo<CyberQuickActionProps>(({
  title,
  description,
  icon,
  gradient,
  link,
  badge,
  delay = 0
}) => {
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay,
        ease: "easeOut"
      },
    },
    hover: {
      y: -4,
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      },
    },
  };

  return (
    <Link to={link} className="block">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
      >
        <Card 
          variant="cyber-neon-subtle" 
          className="h-full cursor-pointer group relative overflow-hidden"
        >
          {/* Animated background effect */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `linear-gradient(135deg, ${gradient.includes('blue') ? '#00D4FF' : gradient.includes('green') ? '#00FF88' : gradient.includes('purple') ? '#A55EEA' : '#FF6B35'}10 0%, transparent 70%)`
            }}
          />
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start gap-4">
              <motion.div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 relative",
                  "bg-gradient-to-br",
                  gradient
                )}
                whileHover={{
                  scale: 1.1,
                  rotate: 5,
                  transition: { duration: 0.2 }
                }}
              >
                {/* Icon pulse effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  animate={{
                    boxShadow: [
                      "0 0 0px transparent",
                      `0 0 20px ${gradient.includes('blue') ? '#00D4FF' : gradient.includes('green') ? '#00FF88' : gradient.includes('purple') ? '#A55EEA' : '#FF6B35'}40`,
                      "0 0 0px transparent"
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                {icon}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <motion.h3 
                    className="font-semibold text-white truncate"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: delay + 0.2, duration: 0.3 }}
                  >
                    {title}
                  </motion.h3>
                  {badge && (
                    <motion.span 
                      className="bg-[#FF4757]/20 text-[#FF4757] text-xs px-2 py-1 rounded-full border border-[#FF4757]/30"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: delay + 0.4, duration: 0.3 }}
                      style={{
                        boxShadow: "0 0 10px rgba(255, 71, 87, 0.3)"
                      }}
                    >
                      {badge}
                    </motion.span>
                  )}
                </div>
                
                <motion.p 
                  className="text-sm text-[#B8BCC8] line-clamp-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.3, duration: 0.3 }}
                >
                  {description}
                </motion.p>
              </div>
              
              <motion.svg 
                className="w-5 h-5 text-[#6B7280] flex-shrink-0 group-hover:text-white transition-colors duration-200" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.5, duration: 0.3 }}
                whileHover={{ x: 5, transition: { duration: 0.2 } }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </motion.svg>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
});

CyberQuickActionCard.displayName = 'CyberQuickActionCard';

// Enhanced Mini Chart Component
interface CyberMiniChartCardProps {
  data: number[];
  color: string;
  label: string;
  delay?: number;
}

export const CyberMiniChartCard = memo<CyberMiniChartCardProps>(({ 
  data, 
  color, 
  label, 
  delay = 0 
}) => {
  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <CyberMiniChart
        data={data}
        color={color}
        label={label}
        height={80}
        animated={true}
      />
    </motion.div>
  );
});

CyberMiniChartCard.displayName = 'CyberMiniChartCard';

// Enhanced System Health Indicator
interface CyberSystemHealthIndicatorProps {
  label: string;
  value: number | string;
  status?: 'healthy' | 'warning' | 'error' | 'unknown';
  type?: 'percentage' | 'status';
  delay?: number;
}

export const CyberSystemHealthIndicator = memo<CyberSystemHealthIndicatorProps>(({
  label,
  value,
  status,
  type = 'percentage',
  delay = 0
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          color: '#00FF88',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          glow: '0 0 10px rgba(0, 255, 136, 0.4)'
        };
      case 'warning':
        return {
          color: '#FFB800',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          glow: '0 0 10px rgba(255, 184, 0, 0.4)'
        };
      case 'error':
        return {
          color: '#FF4757',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          glow: '0 0 10px rgba(255, 71, 87, 0.4)'
        };
      default:
        return {
          color: '#6B7280',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          glow: '0 0 10px rgba(107, 114, 128, 0.4)'
        };
    }
  };

  const statusConfig = getStatusConfig(status || 'unknown');

  return (
    <motion.div
      className="flex items-center justify-between p-4 rounded-xl backdrop-blur-[12px] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.06] transition-all duration-300"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{
        scale: 1.02,
        boxShadow: statusConfig.glow,
        transition: { duration: 0.2 }
      }}
    >
      <span className="text-sm font-medium text-white">{label}</span>
      
      {type === 'percentage' ? (
        <div className="flex items-center gap-3">
          <AnimatedCounter
            value={Number(value) || 0}
            duration={1.5}
            delay={delay + 0.3}
            suffix="%"
            size="sm"
            className="text-white"
          />
          <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ 
                background: `linear-gradient(90deg, ${statusConfig.color}, ${statusConfig.color}80)`,
                boxShadow: `0 0 8px ${statusConfig.color}60`
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Number(value) || 0, 100)}%` }}
              transition={{ duration: 1.5, delay: delay + 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      ) : (
        <motion.div
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: statusConfig.color }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.3, duration: 0.3 }}
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0px transparent",
                statusConfig.glow,
                "0 0 0px transparent"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="rounded-full"
          >
            {statusConfig.icon}
          </motion.div>
          <span className="capitalize">{value}</span>
        </motion.div>
      )}
    </motion.div>
  );
});

CyberSystemHealthIndicator.displayName = 'CyberSystemHealthIndicator';