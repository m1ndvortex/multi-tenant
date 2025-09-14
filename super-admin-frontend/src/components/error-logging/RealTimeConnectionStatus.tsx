// @ts-nocheck
/**
 * Real-Time Connection Status Component - Cybersecurity Theme
 * Displays WebSocket connection status with cybersecurity aesthetics and glassmorphism effects
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  Signal,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConnectionState } from '../../types/errorLogging';

// Cybersecurity theme classes
const glassmorphismClasses = {
  base: 'backdrop-blur-md bg-white/5 border border-white/10',
  card: 'backdrop-blur-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/20',
  input: 'backdrop-blur-md bg-white/10 border border-white/20 focus:border-[#00D4FF]/50',
};

const neonClasses = {
  text: {
    primary: 'text-[#00D4FF]',
    secondary: 'text-[#00FF88]',
    warning: 'text-[#FFB800]',
    danger: 'text-[#FF4757]',
    info: 'text-[#5352ED]',
  },
  glow: {
    primary: 'shadow-[0_0_20px_rgba(0,212,255,0.3)]',
    secondary: 'shadow-[0_0_20px_rgba(0,255,136,0.3)]',
    warning: 'shadow-[0_0_20px_rgba(255,184,0,0.3)]',
    danger: 'shadow-[0_0_20px_rgba(255,71,87,0.3)]',
    info: 'shadow-[0_0_20px_rgba(83,82,237,0.3)]',
  }
};

interface RealTimeConnectionStatusProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  onDisconnect: () => void;
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
        icon: <RefreshCw className={`h-4 w-4 ${neonClasses.text.warning}`} />,
        color: `${glassmorphismClasses.card} border-l-4 border-l-[#FFB800] ${neonClasses.glow.warning}`,
        status: 'Connecting...',
        description: 'Establishing real-time connection',
        badgeClass: `bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 ${neonClasses.glow.warning}`
      };
    }

    if (connectionState.isConnected) {
      return {
        icon: <Wifi className={`h-4 w-4 ${neonClasses.text.secondary}`} />,
        color: `${glassmorphismClasses.card} border-l-4 border-l-[#00FF88] ${neonClasses.glow.secondary}`,
        status: 'Connected',
        description: 'Real-time connection active',
        badgeClass: `bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30 ${neonClasses.glow.secondary}`
      };
    }

    return {
      icon: <WifiOff className={`h-4 w-4 ${neonClasses.text.danger}`} />,
      color: `${glassmorphismClasses.card} border-l-4 border-l-[#FF4757] ${neonClasses.glow.danger}`,
      status: 'Disconnected',
      description: 'Connection lost - attempting to reconnect',
      badgeClass: `bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`
    };
  };

  /**
   * Get connection quality percentage
   */
  const getConnectionQuality = (): number => {
    if (!connectionState.isConnected) return 0;

    // Calculate quality based on reconnect attempts and errors
    const baseQuality = 100;
    const reconnectPenalty = Math.min(connectionState.reconnectAttempts * 10, 50);
    const errorPenalty = connectionState.connectionError ? 30 : 0;

    return Math.max(baseQuality - reconnectPenalty - errorPenalty, 0);
  };

  /**
   * Format uptime duration
   */
  const formatUptime = (startTime: number): string => {
    const now = Date.now();
    const uptimeMs = now - startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);

    if (uptimeSeconds < 60) {
      return `${uptimeSeconds}s`;
    } else if (uptimeSeconds < 3600) {
      return `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`;
    } else {
      const hours = Math.floor(uptimeSeconds / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const status = getConnectionStatus();
  const connectionQuality = getConnectionQuality();

  return (
    <div className={cn(status.color, 'rounded-lg', className)}>
      <Card className="bg-transparent border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {status.icon}
              <span className="text-white">Real-Time Connection</span>
            </span>
            <Badge className={status.badgeClass}>
              {status.status}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection Status Description */}
          <p className="text-sm text-[#B8BCC8]">
            {status.description}
          </p>

          {/* Connection Quality */}
          {connectionState.isConnected && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#B8BCC8]">
                <span>Connection Quality</span>
                <span className={neonClasses.text.secondary}>{connectionQuality}%</span>
              </div>
              <Progress
                value={connectionQuality}
                className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#00D4FF] [&>div]:to-[#00FF88]"
              />
            </div>
          )}

          {/* Connection Statistics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className={`h-3 w-3 ${neonClasses.text.primary}`} />
                <span className="text-[#B8BCC8]">Status</span>
              </div>
              <p className="text-xs text-white font-mono">
                {connectionState.isConnected ? (
                  <span className={neonClasses.text.secondary}>
                    {connectionState.connectedAt ? formatUptime(connectionState.connectedAt) : 'Active'}
                  </span>
                ) : (
                  <span className={neonClasses.text.danger}>Offline</span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-3 w-3 ${neonClasses.text.warning}`} />
                <span className="text-[#B8BCC8]">Reconnects</span>
              </div>
              <p className="text-xs text-white font-mono">
                <span className={neonClasses.text.warning}>{connectionState.reconnectAttempts}</span>
              </p>
            </div>
          </div>

          {/* Connection Error Alert */}
          {connectionState.connectionError && (
            <div className={`${glassmorphismClasses.base} border-[#FF4757]/30 bg-[#FF4757]/10 rounded-md p-3 ${neonClasses.glow.danger}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${neonClasses.text.danger}`} />
                <div>
                  <p className="text-sm font-medium text-[#FF4757]">Connection Error</p>
                  <p className="text-xs text-[#B8BCC8] mt-1">
                    {connectionState.connectionError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {connectionState.isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                className={`w-full ${glassmorphismClasses.input} text-[#FF4757] border-[#FF4757]/30 hover:bg-[#FF4757]/10 ${neonClasses.glow.danger}`}
              >
                <WifiOff className="h-3 w-3 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onReconnect}
                disabled={connectionState.isConnecting}
                className={`w-full ${glassmorphismClasses.input} text-[#00FF88] border-[#00FF88]/30 hover:bg-[#00FF88]/10 ${neonClasses.glow.secondary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {connectionState.isConnecting ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3 mr-2" />
                    Reconnect
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeConnectionStatus;