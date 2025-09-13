/**
 * Custom hook for Real-Time Error Logging
 * Manages error data, WebSocket connections, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ErrorLog, 
  ErrorStatistics, 
  ErrorFilters, 
  CriticalErrorAlert,
  ErrorResolutionRequest,
  WebSocketMessageType,
  RealTimeConnectionState,
  ErrorNotification
} from '../types/errorLogging';
import errorLoggingService from '../services/errorLoggingService';

interface UseErrorLoggingOptions {
  autoConnect?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
}

interface UseErrorLoggingReturn {
  // Data state
  activeErrors: ErrorLog[];
  statistics: ErrorStatistics | null;
  criticalAlerts: CriticalErrorAlert[];
  notifications: ErrorNotification[];
  
  // Loading states
  isLoading: boolean;
  isLoadingErrors: boolean;
  isLoadingStatistics: boolean;
  isLoadingAlerts: boolean;
  
  // Connection state
  connectionState: RealTimeConnectionState;
  
  // Error states
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  loadActiveErrors: (filters: ErrorFilters) => Promise<void>;
  loadStatistics: (tenantId?: string, hoursBack?: number) => Promise<void>;
  loadCriticalAlerts: (hours?: number, includeResolved?: boolean) => Promise<void>;
  resolveError: (errorId: string, resolutionData: ErrorResolutionRequest) => Promise<void>;
  simulateError: (message: string, severity?: string, category?: string, tenantId?: string) => Promise<void>;
  
  // WebSocket management
  connectRealTime: () => void;
  disconnectRealTime: () => void;
  
  // Notifications
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // Filters and settings
  updateFilters: (filters: Partial<ErrorFilters>) => void;
  toggleAutoRefresh: () => void;
}

const defaultFilters: ErrorFilters = {
  hours_back: 24,
  limit: 50
};

export const useErrorLogging = (options: UseErrorLoggingOptions = {}): UseErrorLoggingReturn => {
  const {
    autoConnect = true,
    autoRefresh = true,
    refreshInterval = 30000,
    enableNotifications = true
  } = options;

  // Data state
  const [activeErrors, setActiveErrors] = useState<ErrorLog[]>([]);
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalErrorAlert[]>([]);
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  // Connection state
  const [connectionState, setConnectionState] = useState<RealTimeConnectionState>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  });

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Filters and settings
  const [currentFilters, setCurrentFilters] = useState<ErrorFilters>(defaultFilters);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Safe state update helper
   */
  const safeSetState = useCallback(<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);

  /**
   * Handle API errors
   */
  const handleError = useCallback((error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    const errorMessage = error.message || `Failed to ${context}`;
    safeSetState(setError, errorMessage);
    
    // Clear error after 5 seconds
    setTimeout(() => {
      safeSetState(setError, null);
    }, 5000);
  }, [safeSetState]);

  /**
   * Load active errors
   */
  const loadActiveErrors = useCallback(async (filters: ErrorFilters = currentFilters) => {
    try {
      safeSetState(setIsLoadingErrors, true);
      safeSetState(setError, null);
      
      const response = await errorLoggingService.getActiveErrors(filters);
      safeSetState(setActiveErrors, response.errors);
    } catch (error) {
      handleError(error, 'load active errors');
    } finally {
      safeSetState(setIsLoadingErrors, false);
    }
  }, [currentFilters, safeSetState, handleError]);

  /**
   * Load error statistics
   */
  const loadStatistics = useCallback(async (tenantId?: string, hoursBack: number = 24) => {
    try {
      safeSetState(setIsLoadingStatistics, true);
      safeSetState(setError, null);
      
      const stats = await errorLoggingService.getErrorStatistics(tenantId, hoursBack);
      safeSetState(setStatistics, stats);
    } catch (error) {
      handleError(error, 'load error statistics');
    } finally {
      safeSetState(setIsLoadingStatistics, false);
    }
  }, [safeSetState, handleError]);

  /**
   * Load critical alerts
   */
  const loadCriticalAlerts = useCallback(async (hours: number = 24, includeResolved: boolean = false) => {
    try {
      safeSetState(setIsLoadingAlerts, true);
      safeSetState(setError, null);
      
      const alerts = await errorLoggingService.getCriticalAlerts(hours, includeResolved);
      safeSetState(setCriticalAlerts, alerts);
    } catch (error) {
      handleError(error, 'load critical alerts');
    } finally {
      safeSetState(setIsLoadingAlerts, false);
    }
  }, [safeSetState, handleError]);

  /**
   * Resolve an error
   */
  const resolveError = useCallback(async (errorId: string, resolutionData: ErrorResolutionRequest) => {
    try {
      safeSetState(setError, null);
      
      const resolvedError = await errorLoggingService.resolveError(errorId, resolutionData);
      
      // Update local state
      safeSetState(setActiveErrors, prev => 
        prev.map(error => 
          error.id === errorId 
            ? { ...error, is_resolved: true, resolved_at: resolvedError.resolved_at, resolution_notes: resolutionData.notes }
            : error
        )
      );

      // Add success notification
      if (enableNotifications) {
        const notification: ErrorNotification = {
          id: `resolved-${errorId}-${Date.now()}`,
          type: 'error_resolved',
          title: 'Error Resolved',
          message: `Error "${resolvedError.error_message}" has been resolved`,
          severity: resolvedError.severity,
          timestamp: new Date().toISOString(),
          read: false,
          actionRequired: false
        };
        safeSetState(setNotifications, prev => [notification, ...prev]);
      }
    } catch (error) {
      handleError(error, 'resolve error');
    }
  }, [safeSetState, handleError, enableNotifications]);

  /**
   * Simulate an error (for testing)
   */
  const simulateError = useCallback(async (
    message: string, 
    severity: string = 'high', 
    category: string = 'system',
    tenantId?: string
  ) => {
    try {
      safeSetState(setError, null);
      
      const result = await errorLoggingService.simulateError(message, severity, category, tenantId);
      
      // Refresh data to show the simulated error
      await loadActiveErrors();
      await loadStatistics();
      
      return result;
    } catch (error) {
      handleError(error, 'simulate error');
      throw error;
    }
  }, [safeSetState, handleError, loadActiveErrors, loadStatistics]);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    try {
      safeSetState(setIsLoading, true);
      safeSetState(setError, null);
      
      await Promise.all([
        loadActiveErrors(),
        loadStatistics(),
        loadCriticalAlerts()
      ]);
    } catch (error) {
      handleError(error, 'refresh data');
    } finally {
      safeSetState(setIsLoading, false);
    }
  }, [loadActiveErrors, loadStatistics, loadCriticalAlerts, safeSetState, handleError]);

  /**
   * WebSocket message handlers
   */
  const handleErrorUpdate = useCallback((data: any) => {
    console.log('Received error update:', data);
    
    // Add or update error in the list
    safeSetState(setActiveErrors, prev => {
      const existingIndex = prev.findIndex(error => error.id === data.id);
      if (existingIndex >= 0) {
        // Update existing error
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...data };
        return updated;
      } else {
        // Add new error
        return [data, ...prev];
      }
    });

    // Add notification for new critical errors
    if (enableNotifications && data.severity === 'critical') {
      const notification: ErrorNotification = {
        id: `error-${data.id}-${Date.now()}`,
        type: 'critical_alert',
        title: 'Critical Error Detected',
        message: `${data.error_type}: ${data.error_message}`,
        severity: data.severity,
        timestamp: new Date().toISOString(),
        read: false,
        actionRequired: true
      };
      safeSetState(setNotifications, prev => [notification, ...prev]);
    }
  }, [safeSetState, enableNotifications]);

  const handleStatisticsUpdate = useCallback((data: any) => {
    console.log('Received statistics update:', data);
    safeSetState(setStatistics, data);
  }, [safeSetState]);

  const handleErrorResolved = useCallback((data: any) => {
    console.log('Received error resolved:', data);
    
    // Update the resolved error in the list
    safeSetState(setActiveErrors, prev => 
      prev.map(error => 
        error.id === data.error_id 
          ? { ...error, is_resolved: true, resolved_at: data.resolved_at, resolution_notes: data.resolution_notes }
          : error
      )
    );

    // Add notification
    if (enableNotifications) {
      const notification: ErrorNotification = {
        id: `resolved-${data.error_id}-${Date.now()}`,
        type: 'error_resolved',
        title: 'Error Resolved',
        message: `Error resolved by ${data.resolved_by_name || 'Admin'}`,
        severity: data.severity || 'medium',
        timestamp: new Date().toISOString(),
        read: false,
        actionRequired: false
      };
      safeSetState(setNotifications, prev => [notification, ...prev]);
    }
  }, [safeSetState, enableNotifications]);

  /**
   * Connection state handler
   */
  const handleConnectionStateChange = useCallback((connected: boolean, error?: string) => {
    safeSetState(setConnectionState, prev => ({
      ...prev,
      isConnected: connected,
      isConnecting: false,
      connectionError: error,
      lastPing: connected ? new Date().toISOString() : prev.lastPing,
      reconnectAttempts: connected ? 0 : prev.reconnectAttempts + 1
    }));
  }, [safeSetState]);

  /**
   * Connect to real-time updates
   */
  const connectRealTime = useCallback(() => {
    safeSetState(setConnectionState, prev => ({ ...prev, isConnecting: true }));
    
    // Add message handlers
    errorLoggingService.addMessageHandler(WebSocketMessageType.ERROR_UPDATE, handleErrorUpdate);
  errorLoggingService.addMessageHandler(WebSocketMessageType.STATISTICS_UPDATE, handleStatisticsUpdate);
  // Some servers emit an initial snapshot with a different type
  errorLoggingService.addMessageHandler(WebSocketMessageType.INITIAL_STATISTICS as any, handleStatisticsUpdate);
    errorLoggingService.addMessageHandler(WebSocketMessageType.ERROR_RESOLVED, handleErrorResolved);
    
    // Add connection state handler
    errorLoggingService.addConnectionStateHandler(handleConnectionStateChange);
    
    // Connect WebSocket
    errorLoggingService.connectWebSocket();
  }, [safeSetState, handleErrorUpdate, handleStatisticsUpdate, handleErrorResolved, handleConnectionStateChange]);

  /**
   * Disconnect from real-time updates
   */
  const disconnectRealTime = useCallback(() => {
    errorLoggingService.disconnectWebSocket();
    
    // Remove handlers
    errorLoggingService.removeMessageHandler(WebSocketMessageType.ERROR_UPDATE, handleErrorUpdate);
  errorLoggingService.removeMessageHandler(WebSocketMessageType.STATISTICS_UPDATE, handleStatisticsUpdate);
  errorLoggingService.removeMessageHandler(WebSocketMessageType.INITIAL_STATISTICS as any, handleStatisticsUpdate);
    errorLoggingService.removeMessageHandler(WebSocketMessageType.ERROR_RESOLVED, handleErrorResolved);
    errorLoggingService.removeConnectionStateHandler(handleConnectionStateChange);
    
    safeSetState(setConnectionState, prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false,
      connectionError: undefined
    }));
  }, [safeSetState, handleErrorUpdate, handleStatisticsUpdate, handleErrorResolved, handleConnectionStateChange]);

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters: Partial<ErrorFilters>) => {
    const updatedFilters = { ...currentFilters, ...newFilters };
    setCurrentFilters(updatedFilters);
    loadActiveErrors(updatedFilters);
  }, [currentFilters, loadActiveErrors]);

  /**
   * Toggle auto refresh
   */
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => !prev);
  }, []);

  /**
   * Notification management
   */
  const markNotificationAsRead = useCallback((notificationId: string) => {
    safeSetState(setNotifications, prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, [safeSetState]);

  const clearAllNotifications = useCallback(() => {
    safeSetState(setNotifications, []);
  }, [safeSetState]);

  /**
   * Setup auto refresh interval
   */
  useEffect(() => {
    if (autoRefreshEnabled && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          refreshData();
        }
      }, refreshInterval);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, refreshInterval, refreshData]);

  /**
   * Initial data load and WebSocket connection
   */
  useEffect(() => {
    // Load initial data
    refreshData();

    // Connect to real-time updates if enabled
    if (autoConnect) {
      connectRealTime();
    }

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      disconnectRealTime();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []); // Empty dependency array for initial setup only

  return {
    // Data state
    activeErrors,
    statistics,
    criticalAlerts,
    notifications,
    
    // Loading states
    isLoading,
    isLoadingErrors,
    isLoadingStatistics,
    isLoadingAlerts,
    
    // Connection state
    connectionState,
    
    // Error state
    error,
    
    // Actions
    refreshData,
    loadActiveErrors,
    loadStatistics,
    loadCriticalAlerts,
    resolveError,
    simulateError,
    
    // WebSocket management
    connectRealTime,
    disconnectRealTime,
    
    // Notifications
    markNotificationAsRead,
    clearAllNotifications,
    
    // Filters and settings
    updateFilters,
    toggleAutoRefresh
  };
};

export default useErrorLogging;