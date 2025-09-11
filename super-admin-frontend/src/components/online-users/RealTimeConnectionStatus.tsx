/**
 * Real-Time Connection Status Component
 * Shows WebSocket connection status and controls
 */

import React from 'react';
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
  CheckCircle
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
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200'
      };
    }
    
    if (isPaused) {
      return {
        icon: Pause,
        text: 'متوقف شده',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-200'
      };
    }
    
    if (isConnected) {
      return {
        icon: CheckCircle,
        text: 'متصل',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200'
      };
    }
    
    return {
      icon: AlertCircle,
      text: 'قطع شده',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200'
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
    <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  اتصال بلادرنگ
                </span>
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                  {statusInfo.text}
                </Badge>
              </div>
              
              <p className="text-xs text-gray-600 mt-1">
                آخرین بروزرسانی: {formatLastUpdate(lastUpdate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pause/Resume Button */}
            {isTabActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTogglePause}
                className="h-8"
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
            )}

            {/* Reconnect Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onReconnect}
              className="h-8"
              disabled={isConnected && !isPaused}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              اتصال مجدد
            </Button>
          </div>
        </div>

        {/* Connection Details */}
        <div className="mt-3 pt-3 border-t border-gray-200/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-600">وضعیت:</span>
              <div className="flex items-center gap-1 mt-1">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-green-600" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-600" />
                )}
                <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
                  {isConnected ? 'متصل' : 'قطع'}
                </span>
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">تب:</span>
              <div className="flex items-center gap-1 mt-1">
                <span className={isTabActive ? 'text-green-700' : 'text-yellow-700'}>
                  {isTabActive ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">بروزرسانی:</span>
              <div className="flex items-center gap-1 mt-1">
                <span className={isPaused ? 'text-orange-700' : 'text-green-700'}>
                  {isPaused ? 'متوقف' : 'خودکار'}
                </span>
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">پروتکل:</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-blue-700">WebSocket</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Inactive Warning */}
        {!isTabActive && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              <span>
                بروزرسانی‌های بلادرنگ به دلیل غیرفعال بودن تب متوقف شده‌اند. 
                برای ادامه بروزرسانی‌ها، تب را فعال کنید.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeConnectionStatus;