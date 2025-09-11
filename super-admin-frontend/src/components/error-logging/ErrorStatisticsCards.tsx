/**
 * Error Statistics Cards Component
 * Displays real-time error statistics with visual indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Clock,
  Server,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ErrorStatistics } from '../../types/errorLogging';

interface ErrorStatisticsCardsProps {
  statistics: ErrorStatistics | null;
  isLoading: boolean;
  className?: string;
}

const ErrorStatisticsCards: React.FC<ErrorStatisticsCardsProps> = ({
  statistics,
  isLoading,
  className
}) => {
  /**
   * Get severity color class
   */
  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  /**
   * Get alert level color
   */
  const getAlertLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'normal':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Format number with K/M suffixes
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  /**
   * Calculate resolution rate percentage
   */
  const getResolutionRate = (): number => {
    if (!statistics || statistics.total_errors === 0) return 0;
    return Math.round((statistics.resolved_errors_count / statistics.total_errors) * 100);
  };

  /**
   * Get trend indicator
   */
  const getTrendIndicator = (rate: number) => {
    if (rate > 0) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (rate < 0) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500">No statistics available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolutionRate = getResolutionRate();

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6', className)}>
      {/* Active Errors */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Active Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(statistics.active_errors_count)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Unresolved issues
              </p>
            </div>
            <div className="text-right">
              <Badge variant="destructive" className="text-xs">
                {statistics.critical_errors_last_hour} Critical
              </Badge>
            </div>
          </div>
          
          {/* Progress bar showing active vs total */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Active</span>
              <span>{statistics.active_errors_count}/{statistics.total_errors}</span>
            </div>
            <Progress 
              value={statistics.total_errors > 0 ? (statistics.active_errors_count / statistics.total_errors) * 100 : 0}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resolved Errors */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Resolved Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(statistics.resolved_errors_count)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Successfully resolved
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                {resolutionRate}% Rate
              </Badge>
            </div>
          </div>
          
          {/* Average resolution time */}
          <div className="mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                Avg: {statistics.average_resolution_time ? 
                  `${Math.round(statistics.average_resolution_time)}min` : 
                  'N/A'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Rate */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            Error Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.error_rate_per_minute.toFixed(1)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Errors per minute
              </p>
            </div>
            <div className="text-right">
              {getTrendIndicator(statistics.error_rate_per_minute)}
            </div>
          </div>
          
          {/* System health score */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>System Health</span>
              <span>{statistics.system_health_score || 'N/A'}</span>
            </div>
            {statistics.system_health_score && (
              <Progress 
                value={statistics.system_health_score}
                className="h-2"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Level */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-500" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600 capitalize">
                {statistics.alert_level}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current alert level
              </p>
            </div>
            <div className="text-right">
              <div className={cn(
                'w-3 h-3 rounded-full',
                getAlertLevelColor(statistics.alert_level)
              )}></div>
            </div>
          </div>
          
          {/* Last updated */}
          <div className="mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Activity className="h-3 w-3" />
              <span>
                Updated: {new Date(statistics.last_updated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity Breakdown */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Server className="h-4 w-4" />
            Error Breakdown by Severity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statistics.severity_breakdown).map(([severity, count]) => (
              <div key={severity} className="text-center">
                <div className={cn(
                  'rounded-lg p-3 border',
                  getSeverityColor(severity)
                )}>
                  <div className="text-lg font-bold">
                    {formatNumber(count)}
                  </div>
                  <div className="text-xs font-medium capitalize">
                    {severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Top Error Sources */}
          {statistics.top_error_endpoints.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Top Error Endpoints</h4>
              <div className="space-y-2">
                {statistics.top_error_endpoints.slice(0, 3).map((endpoint, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-gray-600 truncate">
                      {endpoint.endpoint}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{endpoint.count}</span>
                      <Badge variant="outline" className="text-xs">
                        {endpoint.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorStatisticsCards;