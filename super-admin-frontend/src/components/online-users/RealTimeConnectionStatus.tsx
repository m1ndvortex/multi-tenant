/**
 * Real-Time Connection Status Component - Cybersecurity Theme
 * Shows WebSocket connection status and controls with cybersecurity styling
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Pause, 
  Play,
  AlertCircle,
  CheckCircle,
  Shield,
  Activity
} from 'lucide-react';

interface RealTimeConnectionStatusProps {
  isConnected: boolean;
  isTabActive?: boolean;
  onReconnect?: () => void;
  onTogglePause?: () => void;
  isPaused?: boolean;
  lastUpdate?: string;
  className?: string;
}

export const RealTimeConnectionStatus: React.FC<RealTimeConnectionStatusProps> = ({
  isConnected,
  isTabActive = true,
  onReconnect,
  onTogglePause,
  isPaused = false,
  lastUpdate,
  className = ''
}) => {
  const getStatusInfo = () => {
    if (!isTabActive) {
      return {
        icon: Pause,
        text: 'متوقف (تب غیرفعال)',
        color: 'text-yellow-400',
        bgColor: 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10',
        borderColor: 'border-yellow-400/30',
        glowColor: 'rgba(255,184,0,0.3)'
      };
    }
    
    if (isPaused) {
      return {
        icon: Pause,
        text: 'متوقف شده',
        color: 'text-orange-400',
        bgColor: 'bg-gradient-to-r from-orange-500/10 to-orange-600/10',
        borderColor: 'border-orange-400/30',
        glowColor: 'rgba(255,107,53,0.3)'
      };
    }
    
    if (isConnected) {
      return {
        icon: CheckCircle,
        text: 'متصل',
        color: 'text-emerald-400',
        bgColor: 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10',
        borderColor: 'border-emerald-400/30',
        glowColor: 'rgba(0,255,136,0.3)'
      };
    }
    
    return {
      icon: AlertCircle,
      text: 'قطع شده',
      color: 'text-red-400',
      bgColor: 'bg-gradient-to-r from-red-500/10 to-red-600/10',
      borderColor: 'border-red-400/30',
      glowColor: 'rgba(255,71,87,0.3)'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatLastUpdate = (updateTime?: string): string => {
    if (!updateTime) return 'هرگز';
    
    try {
      const date = new Date(updateTime);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      
      if (diffSeconds < 60) {
        return `${diffSeconds} ثانیه پیش`;
      }
      
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) {
        return `${diffMinutes} دقیقه پیش`;
      }
      
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours} ساعت پیش`;
    } catch {
      return 'نامشخص';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={isConnected ? { 
                  boxShadow: [
                    `0 0 0px ${statusInfo.glowColor}`,
                    `0 0 20px ${statusInfo.glowColor}`,
                    `0 0 0px ${statusInfo.glowColor}`
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
              </motion.div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <Shield className="h-4 w-4 text-cyan-400" />
                    </motion.div>
                    <span className="text-cyan-400">اتصال بلادرنگ</span>
                  </span>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Badge className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor} border backdrop-blur-sm`}>
                      {statusInfo.text}
                    </Badge>
                  </motion.div>
                </div>
                
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  آخرین بروزرسانی: {formatLastUpdate(lastUpdate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Pause/Resume Button */}
              <AnimatePresence>
                {isTabActive && (
                  <motion.div 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onTogglePause}
                      className="h-8 bg-white/5 border-orange-400/30 text-orange-400 hover:bg-orange-400/10 hover:border-orange-400/50 hover:text-orange-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,107,53,0.3)]"
                      disabled={!isConnected && !isPaused}
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          ادامه
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3 mr-1" />
                          توقف
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reconnect Button */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReconnect}
                  className="h-8 bg-white/5 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                  disabled={isConnected && !isPaused}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  اتصال مجدد
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Connection Details */}
          <motion.div 
            className="mt-3 pt-3 border-t border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <span className="text-gray-400">وضعیت:</span>
                <div className="flex items-center gap-1 mt-1">
                  <motion.div
                    animate={isConnected ? { rotate: 360 } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    {isConnected ? (
                      <Wifi className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-400" />
                    )}
                  </motion.div>
                  <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
                    {isConnected ? 'متصل' : 'قطع'}
                  </span>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <span className="text-gray-400">تب:</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className={isTabActive ? 'text-emerald-400' : 'text-yellow-400'}>
                    {isTabActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <span className="text-gray-400">بروزرسانی:</span>
                <div className="flex items-center gap-1 mt-1">
                  <span className={isPaused ? 'text-orange-400' : 'text-emerald-400'}>
                    {isPaused ? 'متوقف' : 'خودکار'}
                  </span>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <span className="text-gray-400">پروتکل:</span>
                <div className="flex items-center gap-1 mt-1">
                  <motion.span 
                    className="text-cyan-400 font-mono"
                    animate={{ 
                      textShadow: [
                        "0 0 0px rgba(0,212,255,0.4)",
                        "0 0 8px rgba(0,212,255,0.6)",
                        "0 0 0px rgba(0,212,255,0.4)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    WebSocket
                  </motion.span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Tab Inactive Warning */}
          <AnimatePresence>
            {!isTabActive && (
              <motion.div 
                className="mt-3 p-2 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-400/30 rounded-xl text-xs text-yellow-400 backdrop-blur-sm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        "0 0 0px rgba(255,184,0,0.4)",
                        "0 0 15px rgba(255,184,0,0.6)",
                        "0 0 0px rgba(255,184,0,0.4)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <AlertCircle className="h-3 w-3" />
                  </motion.div>
                  <span>
                    بروزرسانی‌های بلادرنگ به دلیل غیرفعال بودن تب متوقف شده‌اند. 
                    برای ادامه بروزرسانی‌ها، تب را فعال کنید.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RealTimeConnectionStatus;