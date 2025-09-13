/**
 * Critical Alerts Panel Component
 * Displays critical error alerts with immediate attention indicators
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Server,
  Zap,
  ExternalLink,
  Bell,
  CheckCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CriticalErrorAlert } from '../../types/errorLogging';

interface CriticalAlertsPanelProps {
  alerts: CriticalErrorAlert[];
  isLoading: boolean;
  compact?: boolean;
  onResolveAlert?: (alertId: string) => void;
  onViewDetails?: (alert: CriticalErrorAlert) => void;
  className?: string;
}

const CriticalAlertsPanel: React.FC<CriticalAlertsPanelProps> = ({
  alerts,
  isLoading,
  compact = false,
  onResolveAlert,
  onViewDetails,
  className
}) => {
  /**
   * Format time since last occurrence
   */
  const formatTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  /**
   * Get alert priority color
   */
  const getAlertPriorityColor = (alert: CriticalErrorAlert): string => {
    if (alert.requires_immediate_attention) {
      return 'border-l-red-500 bg-red-50';
    }
    if (alert.is_escalated) {
      return 'border-l-orange-500 bg-orange-50';
    }
    return 'border-l-yellow-500 bg-yellow-50';
  };

  /**
   * Get severity badge color
   */
  const getSeverityBadgeColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  /**
   * Get category icon
   */
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'system':
        return <Server className="h-4 w-4" />;
      case 'database':
        return <Server className="h-4 w-4" />;
      case 'api':
        return <Zap className="h-4 w-4" />;
      case 'authentication':
        return <Users className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Critical Alerts</h3>
        <p className="text-gray-500">
          All systems are running smoothly. No critical errors detected.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Alert */}
      {alerts.length > 0 && !compact && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{alerts.length} critical alert{alerts.length > 1 ? 's' : ''}</strong> requiring attention.
            {alerts.filter(a => a.requires_immediate_attention).length > 0 && (
              <span className="ml-2">
                {alerts.filter(a => a.requires_immediate_attention).length} require immediate action.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card 
            key={alert.id} 
            className={cn(
              'border-l-4 transition-all duration-200 hover:shadow-md',
              getAlertPriorityColor(alert)
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Alert Header */}
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(alert.category)}
                    <Badge 
                      variant="outline" 
                      className={cn('capitalize', getSeverityBadgeColor(alert.severity))}
                    >
                      {alert.severity}
                    </Badge>
                    {alert.requires_immediate_attention && (
                      <Badge variant="destructive" className="animate-pulse">
                        <Bell className="h-3 w-3 mr-1" />
                        Urgent
                      </Badge>
                    )}
                    {alert.is_escalated && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Escalated
                      </Badge>
                    )}
                  </div>

                  {/* Error Type and Message */}
                  <div className="mb-2">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {alert.error_type}
                    </h4>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {alert.error_message}
                    </p>
                  </div>

                  {/* Alert Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Server className="h-3 w-3" />
                      <span className="font-mono text-xs">
                        {alert.endpoint}
                      </span>
                    </div>
                    
                    {alert.tenant_name && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{alert.tenant_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span>{alert.occurrence_count} occurrence{alert.occurrence_count > 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeSince(alert.last_occurrence)}</span>
                    </div>
                  </div>

                  {/* Time Range */}
                  {!compact && (
                    <div className="mt-3 text-xs text-gray-500">
                      First seen: {new Date(alert.first_occurrence).toLocaleString()} • 
                      Last seen: {new Date(alert.last_occurrence).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(alert)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  )}
                  
                  {onResolveAlert && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onResolveAlert(alert.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              {/* Priority Indicator */}
              {alert.requires_immediate_attention && (
                <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-800 text-sm">
                    <Bell className="h-4 w-4" />
                    <span className="font-medium">Immediate attention required</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compact View: Show More Button */}
      {compact && alerts.length > 3 && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            View All {alerts.length} Critical Alerts
          </Button>
        </div>
      )}

      {/* Action Summary */}
      {!compact && alerts.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Alert Summary
                </h4>
                <p className="text-sm text-blue-700">
                  {alerts.filter(a => a.requires_immediate_attention).length} urgent alerts • 
                  {alerts.filter(a => a.is_escalated).length} escalated • 
                  {alerts.filter(a => a.occurrence_count > 10).length} high frequency
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Export Report
                </Button>
                <Button variant="default" size="sm">
                  Escalate All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CriticalAlertsPanel;