/**
 * Cybersecurity-themed Chart Components
 * Chart components with glowing neon lines and gradient fills
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CyberMiniChartProps {
  data: number[];
  color?: string;
  glowColor?: string;
  label?: string;
  height?: number;
  className?: string;
  animated?: boolean;
}

export const CyberMiniChart: React.FC<CyberMiniChartProps> = ({
  data,
  color = '#00FF88',
  glowColor,
  label,
  height = 60,
  className = '',
  animated = true
}) => {
  const { chartBars } = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const chartBars = data.map((value, index) => ({
      key: index,
      height: `${((value - min) / range) * 100}%`,
      minHeight: '4px',
      value
    }));

    return { chartBars };
  }, [data]);

  const effectiveGlowColor = glowColor || color;

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">{label}</span>
          <span className="text-sm text-[#B8BCC8]">{data[data.length - 1]}</span>
        </div>
      )}
      
      <div 
        className="flex items-end gap-1 relative overflow-hidden rounded-lg"
        style={{ height: `${height}px` }}
      >
        {/* Background glow effect */}
        <div 
          className="absolute inset-0 opacity-10 rounded-lg"
          style={{
            background: `radial-gradient(ellipse at bottom, ${effectiveGlowColor}40 0%, transparent 70%)`
          }}
        />
        
        {chartBars.map((bar, index) => (
          <motion.div
            key={bar.key}
            className="flex-1 rounded-t-sm relative"
            style={{
              background: `linear-gradient(to top, ${color}, ${color}80)`,
              minHeight: bar.minHeight,
              boxShadow: `0 0 8px ${effectiveGlowColor}60, inset 0 1px 0 rgba(255,255,255,0.2)`
            }}
            initial={animated ? { height: 0, opacity: 0 } : { height: bar.height, opacity: 1 }}
            animate={{ height: bar.height, opacity: 1 }}
            transition={{
              duration: animated ? 0.8 : 0,
              delay: animated ? index * 0.1 : 0,
              ease: "easeOut"
            }}
            whileHover={{
              scale: 1.1,
              boxShadow: `0 0 12px ${effectiveGlowColor}80, inset 0 1px 0 rgba(255,255,255,0.3)`,
              transition: { duration: 0.2 }
            }}
          >
            {/* Tooltip on hover */}
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none"
              whileHover={{ opacity: 1 }}
            >
              {bar.value}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface CyberLineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  animated?: boolean;
  showDots?: boolean;
}

export const CyberLineChart: React.FC<CyberLineChartProps> = ({
  data,
  width = 300,
  height = 100,
  color = '#00D4FF',
  strokeWidth = 2,
  className = '',
  animated = true,
  showDots = true
}) => {
  const { pathData, points } = useMemo(() => {
    if (data.length === 0) return { pathData: '', points: [] };

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const stepX = width / (data.length - 1);
    
    const points = data.map((value, index) => ({
      x: index * stepX,
      y: height - ((value - min) / range) * height,
      value
    }));

    const pathData = points.reduce((path, point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${path} ${command} ${point.x} ${point.y}`;
    }, '');

    return { pathData, points };
  }, [data, width, height]);

  return (
    <div className={cn("relative", className)}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
          
          <filter id={`glow-${color}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Area fill */}
        <motion.path
          d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#gradient-${color})`}
          initial={animated ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Main line */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${color})`}
          initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Data points */}
        {showDots && points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            stroke="white"
            strokeWidth="1"
            filter={`url(#glow-${color})`}
            initial={animated ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.3, 
              delay: animated ? 1 + index * 0.1 : 0,
              ease: "easeOut" 
            }}
            whileHover={{ 
              scale: 1.5,
              transition: { duration: 0.2 }
            }}
            className="cursor-pointer"
          >
            <title>{point.value}</title>
          </motion.circle>
        ))}
      </svg>
    </div>
  );
};

interface CyberProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  className?: string;
  animated?: boolean;
  showValue?: boolean;
}

export const CyberProgressRing: React.FC<CyberProgressRingProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = '#00FF88',
  backgroundColor = 'rgba(255,255,255,0.1)',
  className = '',
  animated = true,
  showValue = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = (value / max) * 100;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <filter id={`ring-glow-${color}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          filter={`url(#ring-glow-${color})`}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
          animate={{ strokeDashoffset }}
          transition={{ duration: animated ? 1.5 : 0, ease: "easeInOut" }}
        />
      </svg>

      {showValue && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={animated ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: animated ? 0.8 : 0 }}
        >
          <span 
            className="text-lg font-bold font-mono"
            style={{ color }}
          >
            {Math.round(percentage)}%
          </span>
        </motion.div>
      )}
    </div>
  );
};

interface CyberSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  animated?: boolean;
}

export const CyberSparkline: React.FC<CyberSparklineProps> = ({
  data,
  width = 100,
  height = 30,
  color = '#00D4FF',
  className = '',
  animated = true
}) => {
  const pathData = useMemo(() => {
    if (data.length === 0) return '';

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const stepX = width / (data.length - 1);
    
    return data.reduce((path, value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      const command = index === 0 ? 'M' : 'L';
      return `${path} ${command} ${x} ${y}`;
    }, '');
  }, [data, width, height]);

  return (
    <svg width={width} height={height} className={cn("overflow-visible", className)}>
      <defs>
        <filter id={`sparkline-glow-${color}`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <motion.path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#sparkline-glow-${color})`}
        initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
    </svg>
  );
};

interface CyberMetricCardProps {
  title: string;
  value: number;
  change?: number;
  data?: number[];
  color?: string;
  className?: string;
  animated?: boolean;
}

export const CyberMetricCard: React.FC<CyberMetricCardProps> = ({
  title,
  value,
  change,
  data = [],
  color = '#00D4FF',
  className = '',
  animated = true
}) => {
  const isPositiveChange = change !== undefined && change > 0;
  const changeColor = isPositiveChange ? '#00FF88' : '#FF4757';

  return (
    <motion.div
      className={cn(
        "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
        "border border-white/[0.08] rounded-2xl p-4 space-y-3",
        "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
        "hover:border-white/[0.12] hover:scale-[1.02] hover:-translate-y-1",
        "transition-all duration-300",
        className
      )}
      initial={animated ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${color}15`
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#B8BCC8]">{title}</h3>
        {data.length > 0 && (
          <CyberSparkline 
            data={data} 
            color={color} 
            width={60} 
            height={20}
            animated={animated}
          />
        )}
      </div>

      <div className="flex items-end justify-between">
        <span 
          className="text-2xl font-bold font-mono"
          style={{ 
            color,
            textShadow: `0 0 10px ${color}60`
          }}
        >
          {value.toLocaleString()}
        </span>

        {change !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <motion.svg 
              className="w-4 h-4" 
              fill="none" 
              stroke={changeColor} 
              viewBox="0 0 24 24"
              initial={animated ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={isPositiveChange 
                  ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                  : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                } 
              />
            </motion.svg>
            <span 
              style={{ color: changeColor }}
              className="font-medium"
            >
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};