/**
 * Real-Time Connection Status Component
 * Shows WebSocket connection status and statistics
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
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Signal,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { RealTimeConnectionState } from '../../types/errorLogging';

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
   * Get connection status color and icon
   */
  const getConnectionStatus = () => {
    if (connectionState.isConnecting) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />,
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        status: 'Connecting...',
        description: 'Establishing real-time connection'
      };
    }

    if (connectionState.isConnected) {
      return {
        icon: <Wifi className="h-4 w-4 text-green-500" />,
        color: 'text-green-600 bg-green-50 border-green-200',
        status: 'Connected',
        description: 'Real-time updates active'
      };
    }

    return {
      icon: <WifiOff className="h-4 w-4 text-red-500" />,
      color: 'text-red-600 bg-red-50 border-red-200',
      status: 'Disconnected',
      description: connectionState.connectionError || 'No real-time connection'
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
    <Card className={cn('border-l-4', status.color.split(' ')[2], className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {status.icon}
            Real-Time Connection
          </span>
          <Badge className={cn('capitalize', status.color)}>
            {status.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status Description */}
        <p className="text-sm text-gray-600">
          {status.description}
        </p>

        {/* Connection Quality */}
        {connectionState.isConnected && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Connection Quality</span>
              <span className="font-medium">{connectionQuality}%</span>
            </div>
            <Progress value={connectionQuality} className="h-2" />
          </div>
        )}

        {/* Connection Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">Status</span>
            </div>
            <p className="font-medium pl-5">
              {connectionState.isConnected ? 'Active' : 'Inactive'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">Duration</span>
            </div>
            <p className="font-medium pl-5">
              {formatConnectionDuration()}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">Reconnects</span>
            </div>
            <p className="font-medium pl-5">
              {connectionState.reconnectAttempts}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Signal className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">Max Attempts</span>
            </div>
            <p className="font-medium pl-5">
              {connectionState.maxReconnectAttempts}
            </p>
          </div>
        </div>

        {/* Last Ping Time */}
        {connectionState.lastPing && (
          <div className="text-xs text-gray-500 border-t pt-3">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>Last ping: {new Date(connectionState.lastPing).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Connection Error */}
        {connectionState.connectionError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-xs text-red-600 mt-1">
                  {connectionState.connectionError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reconnection Progress */}
        {connectionState.isConnecting && connectionState.reconnectAttempts > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Reconnecting...
                </p>
                <p className="text-xs text-yellow-600">
                  Attempt {connectionState.reconnectAttempts} of {connectionState.maxReconnectAttempts}
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
              className="flex-1"
            >
              <WifiOff className="h-3 w-3 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onReconnect}
              disabled={connectionState.isConnecting}
              className="flex-1"
            >
              {connectionState.isConnecting ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wifi className="h-3 w-3 mr-2" />
                  Connect
                </>
              )}
            </Button>
          )}
        </div>

        {/* Connection Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Real-Time Benefits</p>
              <ul className="text-xs text-blue-600 mt-1 space-y-1">
                <li>• Instant error notifications</li>
                <li>• Live statistics updates</li>
                <li>• Automatic resolution alerts</li>
                <li>• No manual refresh needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            Technical Details
          </summary>
          <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
            <p>Protocol: WebSocket</p>
            <p>Reconnect Strategy: Exponential Backoff</p>
            <p>Ping Interval: 30 seconds</p>
            <p>Max Reconnect Attempts: {connectionState.maxReconnectAttempts}</p>
            {connectionState.lastPing && (
              <p>Last Activity: {new Date(connectionState.lastPing).toISOString()}</p>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

export default RealTimeConnectionStatus;