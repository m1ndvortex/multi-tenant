/**
 * Animation Performance Monitor Component
 * Real-time monitoring and display of animation performance metrics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformanceMonitor } from '@/lib/theme/hooks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PerformanceMonitorProps {
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  position = 'bottom-right',
  className = ''
}) => {
  const { metrics, config, shouldAnimate } = usePerformanceMonitor();
  const [isExpanded, setIsExpanded] = useState(showDetails);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getPerformanceColor = (frameRate: number) => {
    if (frameRate >= 50) return 'text-green-400';
    if (frameRate >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPerformanceBadge = (level: string) => {
    const colors = {
      high: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      low: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return colors[level as keyof typeof colors] || colors.medium;
  };

  if (!shouldAnimate && !showDetails) {
    return null;
  }

  return (
    <motion.div
      className={`fixed z-50 ${positionClasses[position]} ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-black/80 backdrop-blur-md border-cyan-500/30 p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-cyan-400">Performance</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-cyan-400 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <div className="space-y-2">
          {/* Frame Rate */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">FPS:</span>
            <span className={`text-xs font-mono ${getPerformanceColor(metrics.frameRate)}`}>
              {metrics.frameRate}
            </span>
          </div>

          {/* Performance Level */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Level:</span>
            <Badge className={`text-xs ${getPerformanceBadge(config.performanceLevel)}`}>
              {config.performanceLevel}
            </Badge>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 pt-2 border-t border-gray-700"
              >
                {/* Memory Usage */}
                {metrics.memoryUsage > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Memory:</span>
                    <span className="text-xs font-mono text-blue-400">
                      {metrics.memoryUsage.toFixed(1)}MB
                    </span>
                  </div>
                )}

                {/* Animation Count */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Animations:</span>
                  <span className="text-xs font-mono text-purple-400">
                    {metrics.animationCount}
                  </span>
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Reduced Motion:</span>
                  <Badge className={`text-xs ${
                    config.reducedMotion 
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      : 'bg-green-500/20 text-green-400 border-green-500/30'
                  }`}>
                    {config.reducedMotion ? 'ON' : 'OFF'}
                  </Badge>
                </div>

                {/* Animations Enabled */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Animations:</span>
                  <Badge className={`text-xs ${
                    config.enableAnimations 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {config.enableAnimations ? 'ON' : 'OFF'}
                  </Badge>
                </div>

                {/* Last Update */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Updated:</span>
                  <span className="text-xs font-mono text-gray-400">
                    {new Date(metrics.lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Performance Indicator */}
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center space-x-1">
            <div className="flex-1 bg-gray-700 rounded-full h-1">
              <motion.div
                className={`h-1 rounded-full ${
                  metrics.frameRate >= 50 ? 'bg-green-400' :
                  metrics.frameRate >= 30 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(metrics.frameRate / 60 * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {Math.round(metrics.frameRate / 60 * 100)}%
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Performance warning component
interface PerformanceWarningProps {
  threshold?: number;
  className?: string;
}

export const PerformanceWarning: React.FC<PerformanceWarningProps> = ({
  threshold = 30,
  className = ''
}) => {
  const { metrics } = usePerformanceMonitor();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    setShowWarning(metrics.frameRate < threshold && metrics.frameRate > 0);
  }, [metrics.frameRate, threshold]);

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-red-900/80 backdrop-blur-md border-red-500/50 p-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <div>
                <h4 className="text-sm font-semibold text-red-400">Performance Warning</h4>
                <p className="text-xs text-red-300">
                  Low frame rate detected ({metrics.frameRate} FPS). Some animations may be disabled.
                </p>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Performance stats component for development
interface PerformanceStatsProps {
  className?: string;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({
  className = ''
}) => {
  const { metrics, config } = usePerformanceMonitor();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`bg-black/90 text-green-400 font-mono text-xs p-2 rounded ${className}`}>
      <div>FPS: {metrics.frameRate}</div>
      <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
      <div>Animations: {metrics.animationCount}</div>
      <div>Level: {config.performanceLevel}</div>
      <div>Reduced Motion: {config.reducedMotion ? 'ON' : 'OFF'}</div>
    </div>
  );
};

export default PerformanceMonitor;