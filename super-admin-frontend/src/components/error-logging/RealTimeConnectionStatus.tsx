/**
 * Real-Time Connection Status Component - Cybersecurity Theme
 * Shows WebSocket connection status with cybersecurity aesthetics and pulsing indicators
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Signal,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { RealTimeConnectionState } from '../../types/errorLogging';
import { glassmorphismClasses, neonClasses } from '../../lib/theme/cybersecurity';

interface RealTimeConnectionStatusProps {
  connectionState: RealTimeConnectionState;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

const RealTimeConnectionStatus: React.FC<RealTimeConnectionStatusProps> = ({
  connectionState,
  onReconnect,
  onDisconnect,
  className
}) => {
  /**
   * Get connection status with cybersecurity styling
   */
  const getConnectionStatus = () => {
    if (connectionState.isConnecting) {
      return {
        icon: (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className={`h-4 w-4 ${neonClasses.text.warning}`} />
          </motion.div>
        ),
        color: `${glassmorphismClasses.card} border-l-4 border-l-[#FFB800] ${neonClasses.glow.warning}`,
        status: 'Connecting...',
        description: 'Establishing real-time connection',
        badgeClass: `bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 ${neonClasses.glow.warning}`
      };
    }

    if (connectionState.isConnected) {
      return {
        icon: (
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              boxShadow: [
                '0 0 10px rgba(0, 255, 136, 0.5)',
                '0 0 20px rgba(0, 255, 136, 0.8)',
                '0 0 10px rgba(0, 255, 136, 0.5)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Wifi className={`h-4 w-4 ${neonClasses.text.secondary}`} />
          </motion.div>
        ),
        color: `${glassmorphismClasses.card} border-l-4 border-l-[#00FF88] ${neonClasses.glow.secondary}`,
        status: 'Connected',
        description: 'Real-time updates active',
        badgeClass: `bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30 ${neonClasses.glow.secondary}`
      };
    }

    return {
      icon: (
        <motion.div
          animate={{ 
            opacity: [1, 0.5, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <WifiOff className={`h-4 w-4 ${neonClasses.text.danger}`} />
        </motion.div>
      ),
      color: `${glassmorphismClasses.card} border-l-4 border-l-[#FF4757] ${neonClasses.glow.danger}`,
      status: 'Disconnected',
      description: connectionState.connectionError || 'No real-time connection',
      badgeClass: `bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`
    };
  };

  /**
   * Get connection quality indicator
   */
  const getConnectionQuality = (): number => {
    if (!connectionState.isConnected) return 0;
    if (connectionState.reconnectAttempts > 0) return 60;
    return 100;
  };

  /**
   * Format connection duration
   */
  const formatConnectionDuration = (): string => {
    if (!connectionState.lastPing) return 'N/A';
    
    const lastPing = new Date(connectionState.lastPing);
    const now = new Date();
    const diffMs = now.getTime() - lastPing.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`;
    if (diffMinutes > 0) return `${diffMinutes}m ${diffSeconds % 60}s`;
    return `${diffSeconds}s`;
  };

  const status = getConnectionStatus();
  const connectionQuality = getConnectionQuality();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className={cn(status.color)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              {status.icon}
              <span className="text-white">Real-Time Connection</span>
            </span>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Badge className={cn('capitalize', status.badgeClass)}>
                {status.status}
              </Badge>
            </motion.div>
          </CardTitle>
        </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status Description */}
        <motion.p 
          className="text-sm text-[#B8BCC8]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {status.description}
        </motion.p>

        {/* Connection Quality */}
        <AnimatePresence>
          {connectionState.isConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#B8BCC8]">Connection Quality</span>
                <span className={`font-medium ${neonClasses.text.numbers}`}>{connectionQuality}%</span>
              </div>
              <div className="relative">
                <Progress 
                  value={connectionQuality} 
                  className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#00D4FF] [&>div]:to-[#00FF88]" 
                />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ 
                    boxShadow: [
                      '0 0 5px rgba(0, 212, 255, 0.3)',
                      '0 0 15px rgba(0, 212, 255, 0.6)',
                      '0 0 5px rgba(0, 212, 255, 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Statistics */}
        <motion.div 
          className="grid grid-cols-2 gap-4 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Activity className={`h-3 w-3 ${neonClasses.text.primary}`} />
              </motion.div>
              <span className="text-[#B8BCC8]">Status</span>
            </div>
            <p className={`font-medium pl-5 ${connectionState.isConnected ? neonClasses.text.secondary : neonClasses.text.danger}`}>
              {connectionState.isConnected ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className={`h-3 w-3 ${neonClasses.text.tertiary}`} />
              <span className="text-[#B8BCC8]">Duration</span>
            </div>
            <p className="font-medium pl-5 text-white font-mono">
              {formatConnectionDuration()}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className={`h-3 w-3 ${neonClasses.text.warning}`} />
              </motion.div>
              <span className="text-[#B8BCC8]">Reconnects</span>
            </div>
            <p className={`font-medium pl-5 ${neonClasses.text.numbers}`}>
              {connectionState.reconnectAttempts}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Signal className={`h-3 w-3 ${neonClasses.text.info}`} />
              </motion.div>
              <span className="text-[#B8BCC8]">Max Attempts</span>
            </div>
            <p className="font-medium pl-5 text-white">
              {connectionState.maxReconnectAttempts}
            </p>
          </div>
        </motion.div>

        {/* Last Ping Time */}
        <AnimatePresence>
          {connectionState.lastPing && (
            <motion.div 
              className="text-xs text-[#6B7280] border-t border-white/10 pt-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Zap className={`h-3 w-3 ${neonClasses.text.warning}`} />
                </motion.div>
                <span className="font-mono">
                  Last ping: <span className="text-[#00D4FF]">{new Date(connectionState.lastPing).toLocaleTimeString()}</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Error */}
        <AnimatePresence>
          {connectionState.connectionError && (
            <motion.div 
              className={`${glassmorphismClasses.base} border-[#FF4757]/30 bg-[#FF4757]/10 rounded-md p-3 ${neonClasses.glow.danger}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: [
                  '0 0 10px rgba(255, 71, 87, 0.3)',
                  '0 0 20px rgba(255, 71, 87, 0.6)',
                  '0 0 10px rgba(255, 71, 87, 0.3)'
                ]
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, boxShadow: { duration: 2, repeat: Infinity } }}
            >
              <div className="flex items-start gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${neonClasses.text.danger}`} />
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-[#FF4757]">Connection Error</p>
                  <p className="text-xs text-[#B8BCC8] mt-1 font-mono">
                    {connectionState.connectionError}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reconnection Progress */}
        <AnimatePresence>
          {connectionState.isConnecting && connectionState.reconnectAttempts > 0 && (
            <motion.div 
              className={`${glassmorphismClasses.base} border-[#FFB800]/30 bg-[#FFB800]/10 rounded-md p-3 ${neonClasses.glow.warning}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: [
                  '0 0 10px rgba(255, 184, 0, 0.3)',
                  '0 0 20px rgba(255, 184, 0, 0.6)',
                  '0 0 10px rgba(255, 184, 0, 0.3)'
                ]
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, boxShadow: { duration: 2, repeat: Infinity } }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className={`h-4 w-4 ${neonClasses.text.warning}`} />
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-[#FFB800]">
                    Reconnecting...
                  </p>
                  <p className="text-xs text-[#B8BCC8] font-mono">
                    Attempt <span className={neonClasses.text.numbers}>{connectionState.reconnectAttempts}</span> of <span className="text-white">{connectionState.maxReconnectAttempts}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div 
          className="flex gap-2 pt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {connectionState.isConnected ? (
            <motion.div 
              className="flex-1"
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                className={`flex-1 ${glassmorphismClasses.base} border-[#FF4757]/30 text-[#FF4757] hover:bg-[#FF4757]/10 ${neonClasses.glow.danger}`}
              >
                <WifiOff className="h-3 w-3 mr-2" />
                Disconnect
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              className="flex-1"
              whileHover={{ scale: connectionState.isConnecting ? 1 : 1.02 }} 
              whileTap={{ scale: connectionState.isConnecting ? 1 : 0.98 }}
            >
              <Button
                size="sm"
                onClick={onReconnect}
                disabled={connectionState.isConnecting}
                className={`flex-1 ${
                  connectionState.isConnecting 
                    ? `bg-[#FFB800]/20 border border-[#FFB800]/30 text-[#FFB800] cursor-not-allowed`
                    : `bg-[#00FF88]/20 border border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/30 ${neonClasses.glow.secondary}`
                }`}
              >
                {connectionState.isConnecting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                    </motion.div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Connection Benefits */}
        <motion.div 
          className={`${glassmorphismClasses.base} border-[#5352ED]/30 bg-[#5352ED]/10 rounded-md p-3 ${neonClasses.glow.info}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-start gap-2">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 360]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <CheckCircle className={`h-4 w-4 mt-0.5 ${neonClasses.text.info}`} />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-[#5352ED]">Real-Time Benefits</p>
              <ul className="text-xs text-[#B8BCC8] mt-1 space-y-1">
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  • <span className={neonClasses.text.secondary}>Instant error notifications</span>
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  • <span className={neonClasses.text.primary}>Live statistics updates</span>
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  • <span className={neonClasses.text.warning}>Automatic resolution alerts</span>
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0 }}
                >
                  • <span className={neonClasses.text.tertiary}>No manual refresh needed</span>
                </motion.li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Technical Details */}
        <motion.details 
          className="text-xs text-[#6B7280]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <motion.summary 
            className="cursor-pointer hover:text-[#00D4FF] transition-colors duration-200 font-mono"
            whileHover={{ scale: 1.02 }}
          >
            Technical Details
          </motion.summary>
          <motion.div 
            className="mt-2 space-y-1 pl-4 border-l-2 border-[#00D4FF]/30"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
          >
            <p className="font-mono">
              <span className="text-[#00D4FF]">Protocol:</span> <span className="text-white">WebSocket</span>
            </p>
            <p className="font-mono">
              <span className="text-[#00FF88]">Reconnect Strategy:</span> <span className="text-white">Exponential Backoff</span>
            </p>
            <p className="font-mono">
              <span className="text-[#FFB800]">Ping Interval:</span> <span className="text-white">30 seconds</span>
            </p>
            <p className="font-mono">
              <span className="text-[#A55EEA]">Max Reconnect Attempts:</span> <span className={neonClasses.text.numbers}>{connectionState.maxReconnectAttempts}</span>
            </p>
            {connectionState.lastPing && (
              <p className="font-mono">
                <span className="text-[#FF6B35]">Last Activity:</span> <span className="text-[#B8BCC8]">{new Date(connectionState.lastPing).toISOString()}</span>
              </p>
            )}
          </motion.div>
        </motion.details>
      </CardContent>
    </Card>
  </motion.div>
  );
};

export default RealTimeConnectionStatus;