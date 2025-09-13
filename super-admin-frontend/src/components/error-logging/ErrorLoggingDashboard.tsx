// @ts-nocheck
/**
 * Real-Time Error Logging Dashboard
 * Main dashboard component showing active errors, statistics, and real-time updates
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  TrendingUp,
  Clock,
  Users,
  Server,
  Bug
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useErrorLogging } from '../../hooks/useErrorLogging';
import { ErrorSeverity, ErrorFilters } from '../../types/errorLogging';
import ErrorStatisticsCards from './ErrorStatisticsCards';
import ActiveErrorsTable from './ActiveErrorsTable';
import CriticalAlertsPanel from './CriticalAlertsPanel';
import ErrorFiltersPanel from './ErrorFiltersPanel';
import ErrorResolutionDialog from './ErrorResolutionDialog';
import RealTimeConnectionStatus from './RealTimeConnectionStatus';
import ErrorNotificationsPanel from './ErrorNotificationsPanel';

interface ErrorLoggingDashboardProps {
  className?: string;
}

const ErrorLoggingDashboard: React.FC<ErrorLoggingDashboardProps> = ({ className }) => {
  const {
    activeErrors,
    statistics,
    criticalAlerts,
    notifications,
    isLoading,
    isLoadingErrors,
    isLoadingStatistics,
    isLoadingAlerts,
    connectionState,
    error,
    refreshData,
    loadActiveErrors,
    resolveError,
    simulateError,
    connectRealTime,
    disconnectRealTime,
    markNotificationAsRead,
    clearAllNotifications,
    updateFilters,
    toggleAutoRefresh
  } = useErrorLogging({
    autoConnect: true,
    autoRefresh: true,
    refreshInterval: 30000,
    enableNotifications: true
  });

  // Local state
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentFilters, setCurrentFilters] = useState<ErrorFilters>({
    hours_back: 24,
    limit: 50
  });

  /**
   * Handle error resolution
   */
  const handleResolveError = useCallback(async (errorId: string) => {
    setSelectedErrorId(errorId);
    setShowResolutionDialog(true);
  }, []);

  /**
   * Handle resolution dialog submit
   */
  const handleResolutionSubmit = useCallback(async (resolutionData: any) => {
    if (selectedErrorId) {
      try {
        await resolveError(selectedErrorId, resolutionData);
        setShowResolutionDialog(false);
        setSelectedErrorId(null);
      } catch (error) {
        console.error('Failed to resolve error:', error);
      }
    }
  }, [selectedErrorId, resolveError]);

  /**
   * Handle filter changes
   */
  const handleFiltersChange = useCallback((newFilters: Partial<ErrorFilters>) => {
    const updatedFilters = { ...currentFilters, ...newFilters };
    setCurrentFilters(updatedFilters);
    updateFilters(updatedFilters);
  }, [currentFilters, updateFilters]);

  /**
   * Handle simulate error for testing
   */
  const handleSimulateError = useCallback(async () => {
    try {
      await simulateError(
        'Test error from dashboard',
        'high',
        'system'
      );
    } catch (error) {
      console.error('Failed to simulate error:', error);
    }
  }, [simulateError]);

  /**
   * Get severity color
   */
  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.LOW:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  /**
   * Get connection status indicator
   */
  const getConnectionStatusIndicator = () => {
    if (connectionState.isConnecting) {
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Connecting...</span>
        </div>
      );
    }

    if (connectionState.isConnected) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Wifi className="h-4 w-4" />
          <span className="text-sm">Real-time Connected</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-red-600">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm">Disconnected</span>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Error Logging</h1>
          <p className="text-gray-600 mt-1">
            Monitor system errors and resolve issues in real-time
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          {getConnectionStatusIndicator()}
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            
            {/* Development: Simulate Error Button */}
            {import.meta.env.DEV && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateError}
              >
                <Bug className="h-4 w-4 mr-2" />
                Simulate Error
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={connectionState.isConnected ? disconnectRealTime : connectRealTime}
            >
              {connectionState.isConnected ? (
                <>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connection Error Alert */}
      {connectionState.connectionError && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            WebSocket connection error: {connectionState.connectionError}
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <ErrorStatisticsCards 
        statistics={statistics}
        isLoading={isLoadingStatistics}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="active-errors" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Active Errors
            {activeErrors.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {activeErrors.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="critical-alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Critical Alerts
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {criticalAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {notifications.filter(n => !n.read).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Errors Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Recent Active Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActiveErrorsTable
                  errors={activeErrors.slice(0, 5)}
                  isLoading={isLoadingErrors}
                  onResolveError={handleResolveError}
                  compact={true}
                />
                {activeErrors.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('active-errors')}
                    >
                      View All {activeErrors.length} Errors
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Critical Alerts Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CriticalAlertsPanel
                  alerts={criticalAlerts.slice(0, 3)}
                  isLoading={isLoadingAlerts}
                  compact={true}
                />
                {criticalAlerts.length > 3 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('critical-alerts')}
                    >
                      View All {criticalAlerts.length} Alerts
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Real-Time Connection Status */}
          <RealTimeConnectionStatus 
            connectionState={connectionState}
            onReconnect={connectRealTime}
            onDisconnect={disconnectRealTime}
          />
        </TabsContent>

        {/* Active Errors Tab */}
        <TabsContent value="active-errors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Panel */}
            <div className="lg:col-span-1">
              <ErrorFiltersPanel
                filters={currentFilters}
                onFiltersChange={handleFiltersChange}
                statistics={statistics}
              />
            </div>

            {/* Errors Table */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      Active Errors ({activeErrors.length})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadActiveErrors(currentFilters)}
                      disabled={isLoadingErrors}
                    >
                      <RefreshCw className={cn('h-4 w-4 mr-2', isLoadingErrors && 'animate-spin')} />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ActiveErrorsTable
                    errors={activeErrors}
                    isLoading={isLoadingErrors}
                    onResolveError={handleResolveError}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Critical Alerts Tab */}
        <TabsContent value="critical-alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Critical Error Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CriticalAlertsPanel
                alerts={criticalAlerts}
                isLoading={isLoadingAlerts}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Error Notifications
                </span>
                {notifications.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllNotifications}
                  >
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorNotificationsPanel
                notifications={notifications}
                onMarkAsRead={markNotificationAsRead}
                onClearAll={clearAllNotifications}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Resolution Dialog */}
      <ErrorResolutionDialog
        isOpen={showResolutionDialog}
        onClose={() => {
          setShowResolutionDialog(false);
          setSelectedErrorId(null);
        }}
        onSubmit={handleResolutionSubmit}
        errorId={selectedErrorId}
        error={selectedErrorId ? activeErrors.find(e => e.id === selectedErrorId) : undefined}
      />
    </div>
  );
};

export default ErrorLoggingDashboard;