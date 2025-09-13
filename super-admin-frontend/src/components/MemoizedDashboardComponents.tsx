import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAnimations } from '@/hooks/useAnimations';

// Memoized StatCard component
interface StatCardProps {
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
}

export const MemoizedStatCard = memo<StatCardProps>(({
  title,
  value,
  subtitle,
  icon,
  gradient: _gradient,
  trend,
  link,
  isLoading = false
}) => {
  const animations = useAnimations();
  const CardWrapper = link ? Link : 'div';
  const cardProps = link ? { to: link } : {};

  const trendIcon = useMemo(() => {
    if (!trend) return null;
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={trend.isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"}
        />
      </svg>
    );
  }, [trend]);

  // Cybersecurity loading state with animated scanning effect
  if (isLoading) {
    return (
      <motion.div
        variants={animations.presets.cardEntrance}
        initial="hidden"
        animate="visible"
      >
        <Card variant="cyber-glass" className="h-full cyber-loading">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded mb-2 w-2/3 animate-pulse"></div>
                <div className="h-8 bg-white/10 rounded mb-2 w-1/2 animate-pulse"></div>
                <div className="h-3 bg-white/10 rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-xl animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Get neon color based on trend
  const getNeonColor = () => {
    if (trend?.isPositive) return 'neon-green';
    if (trend && !trend.isPositive) return 'neon-pink';
    return 'neon-cyan';
  };

  return (
    <CardWrapper {...(cardProps as any)} className={link ? 'block' : ''}>
      <motion.div
        variants={animations.presets.cardEntrance}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="h-full"
      >
        <Card variant="cyber-glass" className={cn(
          "h-full transition-all duration-cyber-normal group",
          link && "cursor-pointer hover:shadow-neon-cyan/20"
        )}>
          <CardContent className="p-6 relative">
            {/* Animated counter effect */}
            <motion.div 
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-cyber-text-secondary mb-1 font-mono">
                  {title}
                </p>
                <motion.p 
                  className="text-3xl font-bold text-cyber-text-primary mb-1 font-accent cyber-text-glow"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {value}
                </motion.p>
                {subtitle && (
                  <p className="text-sm text-cyber-text-muted">{subtitle}</p>
                )}
                {trend && (
                  <motion.div 
                    className={cn(
                      "flex items-center gap-1 mt-2 text-sm font-mono",
                      trend.isPositive ? "text-cyber-neon-success" : "text-cyber-neon-danger"
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <motion.div
                      animate={{ 
                        rotate: trend.isPositive ? [0, 5, 0] : [0, -5, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      {trendIcon}
                    </motion.div>
                    <span className="cyber-text-glow">{Math.abs(trend.value)}%</span>
                  </motion.div>
                )}
              </div>
              
              {/* Neon icon with glow effect */}
              <motion.div 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center relative",
                  "glass-morphism border-2 group-hover:shadow-cyber-glow",
                  `hover:shadow-${getNeonColor()}`
                )}
                whileHover={{ 
                  scale: 1.1,
                  rotate: [0, -5, 5, 0],
                }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="text-cyber-neon-primary group-hover:animate-cyber-pulse">
                  {icon}
                </div>
                
                {/* Pulsing border effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-cyber-neon-primary opacity-0 group-hover:opacity-50"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>
            </motion.div>
            
            {/* Scanning line effect for loading/active states */}
            {link && (
              <motion.div
                className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyber-neon-primary to-transparent opacity-0 group-hover:opacity-100"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </CardWrapper>
  );
});

MemoizedStatCard.displayName = 'MemoizedStatCard';

// Memoized QuickAction component
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  link: string;
  badge?: string;
}

export const MemoizedQuickActionCard = memo<QuickActionProps>(({
  title,
  description,
  icon,
  gradient: _gradient,
  link,
  badge
}) => {
  const animations = useAnimations();

  return (
    <Link to={link} className="block">
      <motion.div
        variants={animations.presets.cardEntrance}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        className="h-full"
      >
        <Card variant="cyber-glass" className="h-full cursor-pointer group transition-all duration-cyber-normal hover:shadow-neon-cyan/20">
          <CardContent className="p-6 relative">
            <div className="flex items-start gap-4">
              {/* Cybersecurity-themed icon with neon glow */}
              <motion.div 
                className="w-12 h-12 rounded-xl flex items-center justify-center glass-morphism border-2 border-white/10 flex-shrink-0 relative group-hover:border-cyber-neon-primary/50"
                whileHover={{ 
                  scale: 1.1,
                  rotate: [0, -2, 2, 0],
                }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <div className="text-cyber-neon-primary group-hover:animate-cyber-pulse">
                  {icon}
                </div>
                
                {/* Rotating border effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-cyber-neon-primary opacity-0 group-hover:opacity-30"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <motion.h3 
                    className="font-semibold text-cyber-text-primary truncate font-accent cyber-text-glow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {title}
                  </motion.h3>
                  {badge && (
                    <motion.span 
                      className="glass-morphism border border-cyber-neon-danger/50 text-cyber-neon-danger text-xs px-2 py-1 rounded-full font-mono cyber-text-glow"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                      whileHover={{
                        scale: 1.1,
                        boxShadow: "0 0 15px var(--cyber-neon-danger)",
                      }}
                    >
                      {badge}
                    </motion.span>
                  )}
                </div>
                <motion.p 
                  className="text-sm text-cyber-text-muted line-clamp-2 font-mono"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {description}
                </motion.p>
              </div>
              
              {/* Animated arrow with RTL support */}
              <motion.svg 
                className="w-5 h-5 text-cyber-text-muted flex-shrink-0 group-hover:text-cyber-neon-primary transition-colors duration-cyber-fast rtl:rotate-180" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                whileHover={{ 
                  x: 3,
                  scale: 1.2,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </motion.svg>
            </div>
            
            {/* Hover scanning effect */}
            <motion.div
              className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyber-neon-primary to-transparent opacity-0 group-hover:opacity-100"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
});

MemoizedQuickActionCard.displayName = 'MemoizedQuickActionCard';

// Memoized MiniChart component
interface MiniChartProps {
  data: number[];
  color: string;
  label: string;
}

export const MemoizedMiniChart = memo<MiniChartProps>(({ data, color: _color, label }) => {
  const animations = useAnimations();
  
  const { chartBars } = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const chartBars = data.map((value, index) => ({
      key: index,
      height: `${((value - min) / range) * 100}%`,
      minHeight: '2px',
      value,
      delay: index * 0.1
    }));

    return { chartBars };
  }, [data]);

  return (
    <motion.div 
      className="space-y-2"
      variants={animations.presets.fadeIn}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        <motion.span 
          className="text-sm font-medium text-cyber-text-secondary font-mono"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {label}
        </motion.span>
        <motion.span 
          className="text-sm text-cyber-neon-primary font-mono cyber-text-glow"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {data[data.length - 1]}
        </motion.span>
      </div>
      
      <div className="h-8 flex items-end gap-1 relative">
        {/* Background grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-20">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-px bg-cyber-neon-primary/30" />
          ))}
        </div>
        
        {chartBars.map((bar, index) => (
          <motion.div
            key={bar.key}
            className="flex-1 relative group"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: bar.height,
              opacity: 1,
            }}
            transition={{ 
              delay: bar.delay,
              duration: 0.5,
              ease: "easeOut"
            }}
            whileHover={{ 
              scale: 1.1,
              zIndex: 10,
            }}
          >
            {/* Main bar with neon effect */}
            <div
              className={cn(
                "w-full rounded-t relative overflow-hidden",
                "bg-gradient-to-t from-cyber-neon-primary/80 to-cyber-neon-primary",
                "group-hover:shadow-cyber-glow-sm group-hover:shadow-cyber-neon-primary"
              )}
              style={{
                height: bar.height,
                minHeight: bar.minHeight
              }}
            >
              {/* Animated scanning line */}
              <motion.div
                className="absolute top-0 left-0 w-full h-px bg-white opacity-80"
                animate={{
                  y: [0, "100%", 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: "linear",
                }}
              />
              
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-cyber-fast" />
            </div>
            
            {/* Tooltip on hover */}
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 glass-morphism px-2 py-1 rounded text-xs text-cyber-text-primary font-mono opacity-0 group-hover:opacity-100 pointer-events-none z-20"
              initial={{ y: 5, opacity: 0 }}
              whileHover={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {bar.value}
            </motion.div>
          </motion.div>
        ))}
        
        {/* Animated data flow effect */}
        <motion.div
          className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-neon-primary to-transparent"
          animate={{
            x: ["-100%", "100%"],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </motion.div>
  );
});

MemoizedMiniChart.displayName = 'MemoizedMiniChart';

// Memoized SystemHealthIndicator component
interface SystemHealthIndicatorProps {
  label: string;
  value: number | string;
  status?: 'healthy' | 'warning' | 'error' | 'unknown';
  type?: 'percentage' | 'status';
}

export const MemoizedSystemHealthIndicator = memo<SystemHealthIndicatorProps>(({
  label,
  value,
  status,
  type = 'percentage'
}) => {
  const animations = useAnimations();
  
  const { statusColor, statusIcon, neonColor, pulseAnimation } = useMemo(() => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'text-cyber-neon-success';
        case 'warning': return 'text-cyber-neon-warning';
        case 'error': return 'text-cyber-neon-danger';
        default: return 'text-cyber-text-muted';
      }
    };

    const getNeonColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'cyber-neon-success';
        case 'warning': return 'cyber-neon-warning';
        case 'error': return 'cyber-neon-danger';
        default: return 'cyber-neon-info';
      }
    };

    const getPulseAnimation = (status: string) => {
      if (status === 'error') {
        return {
          scale: [1, 1.1, 1],
          opacity: [1, 0.7, 1],
        };
      }
      return {};
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
        case 'error':
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

    return {
      statusColor: getStatusColor(status || 'unknown'),
      statusIcon: getStatusIcon(status || 'unknown'),
      neonColor: getNeonColor(status || 'unknown'),
      pulseAnimation: getPulseAnimation(status || 'unknown')
    };
  }, [status]);

  return (
    <motion.div 
      className="flex items-center justify-between p-3 rounded-lg glass-morphism border border-white/10 group hover:border-white/20 transition-all duration-cyber-normal"
      variants={animations.presets.fadeIn}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02 }}
    >
      <motion.span 
        className="text-sm font-medium text-cyber-text-secondary font-mono"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {label}
      </motion.span>
      
      {type === 'percentage' ? (
        <div className="flex items-center gap-2">
          <motion.span 
            className="text-sm font-bold text-cyber-text-primary font-mono cyber-text-glow"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            {value}%
          </motion.span>
          
          <div className="w-16 h-2 glass-morphism rounded-full overflow-hidden relative">
            {/* Background track with subtle glow */}
            <div className="absolute inset-0 bg-white/5 rounded-full" />
            
            {/* Animated progress bar */}
            <motion.div
              className={cn(
                "h-full rounded-full relative overflow-hidden",
                "bg-gradient-to-r from-cyber-neon-primary to-cyber-neon-secondary"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Number(value) || 0, 100)}%` }}
              transition={{ 
                duration: 1, 
                delay: 0.2,
                ease: "easeOut"
              }}
            >
              {/* Scanning effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              
              {/* Glow effect */}
              <div className={cn(
                "absolute inset-0 rounded-full opacity-50",
                `shadow-${neonColor}`
              )} />
            </motion.div>
          </div>
        </div>
      ) : (
        <motion.div 
          className={cn(
            "flex items-center gap-1 text-sm font-medium font-mono",
            statusColor
          )}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            animate={pulseAnimation}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="cyber-text-glow"
          >
            {statusIcon}
          </motion.div>
          <motion.span 
            className="capitalize cyber-text-glow"
            whileHover={{ scale: 1.05 }}
          >
            {value}
          </motion.span>
        </motion.div>
      )}
      
      {/* Status indicator dot */}
      <motion.div
        className={cn(
          "absolute -right-1 -top-1 w-2 h-2 rounded-full",
          `bg-${neonColor}`,
          `shadow-${neonColor}`
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
});

MemoizedSystemHealthIndicator.displayName = 'MemoizedSystemHealthIndicator';