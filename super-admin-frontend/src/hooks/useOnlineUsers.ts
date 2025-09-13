/**
 * Online Users Management Hook
 * Combines API calls with WebSocket real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  OnlineUser, 
  OnlineUsersStats, 
  TenantOnlineUsers, 
  OnlineUsersFilter, 
  UserSession 
} from '../types/onlineUsers';
import { onlineUsersService } from '../services/onlineUsersService';
import { useOnlineUsersWebSocket } from './useOnlineUsersWebSocket';

export interface UseOnlineUsersOptions {
  enableRealTime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialFilters?: OnlineUsersFilter;
}

export interface UseOnlineUsersReturn {
  // Data
  data: OnlineUsersStats | null; // Add missing data property
  users: OnlineUser[];
  stats: OnlineUsersStats | null;
  tenantUsers: Record<string, TenantOnlineUsers>;
  
  // Loading states
  loading: boolean;
  isLoading: boolean; // Add missing isLoading property
  statsLoading: boolean;
  usersLoading: boolean;
  isRefetching: boolean; // Add missing isRefetching property
  
  // Real-time connection
  isConnected: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Actions
  refreshUsers: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setUserOffline: (userId: string) => Promise<boolean>;
  bulkSetUsersOffline: (userIds: string[]) => Promise<boolean>;
  getUserSession: (userId: string) => Promise<UserSession | null>;
  getTenantUsers: (tenantId: string) => Promise<TenantOnlineUsers | null>;
  cleanupExpiredUsers: () => Promise<boolean>;
  
  // Filters
  filters: OnlineUsersFilter;
  setFilters: (filters: OnlineUsersFilter) => void;
}

export const useOnlineUsers = (options: UseOnlineUsersOptions = {}): UseOnlineUsersReturn => {
  const {
    enableRealTime = true,
    autoRefresh = false,
    refreshInterval = 30000,
    initialFilters = {}
  } = options;

  // State
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [stats, setStats] = useState<OnlineUsersStats | null>(null);
  const [tenantUsers, setTenantUsers] = useState<Record<string, TenantOnlineUsers>>({});
  const [loading, setLoading] = useState(false);
  const [isLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isRefetching] = useState(false);
  const [filters, setFilters] = useState<OnlineUsersFilter>(initialFilters);
  const [error, setError] = useState<string | null>(null);

  // WebSocket for real-time updates
  const {
    isConnected,
    stats: wsStats,
    users: wsUsers,
    sendMessage
  } = useOnlineUsersWebSocket({
    enabled: enableRealTime,
    onError: (error) => {
      console.error('WebSocket error:', error);
      setError('Real-time connection error. Falling back to manual refresh.');
    }
  });

  // Update data from WebSocket
  useEffect(() => {
    if (wsStats) {
      setStats(wsStats);
    }
  }, [wsStats]);

  useEffect(() => {
    if (wsUsers.length > 0) {
      setUsers(wsUsers);
    }
  }, [wsUsers]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    
    try {
      const response = await onlineUsersService.getOnlineUsers(filters);
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error || 'Failed to fetch online users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setUsersLoading(false);
    }
  }, [filters]);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    setError(null);
    
    try {
      const response = await onlineUsersService.getOnlineUsersStats();
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const setUserOffline = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const response = await onlineUsersService.setUserOffline(userId);
      
      if (response.success) {
        // Update local state immediately
        setUsers(prev => prev.filter(u => u.user_id !== userId));
        
        // Request fresh data if not using real-time
        if (!enableRealTime) {
          await refreshUsers();
          await refreshStats();
        }
        
        return true;
      } else {
        setError(response.error || 'Failed to set user offline');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    }
  }, [enableRealTime, refreshUsers, refreshStats]);

  const bulkSetUsersOffline = useCallback(async (userIds: string[]): Promise<boolean> => {
    try {
      const response = await onlineUsersService.bulkSetUsersOffline(userIds);
      
      if (response.success && response.data) {
        // Update local state immediately
        setUsers(prev => prev.filter(u => !userIds.includes(u.user_id)));
        
        // Request fresh data if not using real-time
        if (!enableRealTime) {
          await refreshUsers();
          await refreshStats();
        }
        
        return true;
      } else {
        setError(response.error || 'Failed to set users offline');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    }
  }, [enableRealTime, refreshUsers, refreshStats]);

  const getUserSession = useCallback(async (userId: string): Promise<UserSession | null> => {
    try {
      const response = await onlineUsersService.getUserSession(userId);
      
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'Failed to get user session');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    }
  }, []);

  const getTenantUsers = useCallback(async (tenantId: string): Promise<TenantOnlineUsers | null> => {
    try {
      const response = await onlineUsersService.getTenantOnlineUsers(tenantId);
      
      if (response.success && response.data) {
        setTenantUsers(prev => ({
          ...prev,
          [tenantId]: response.data!
        }));
        return response.data;
      } else {
        setError(response.error || 'Failed to get tenant users');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    }
  }, []);

  const cleanupExpiredUsers = useCallback(async (): Promise<boolean> => {
    try {
      const response = await onlineUsersService.cleanupExpiredUsers();
      
      if (response.success) {
        // Refresh data after cleanup
        await refreshUsers();
        await refreshStats();
        return true;
      } else {
        setError(response.error || 'Failed to cleanup expired users');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return false;
    }
  }, [refreshUsers, refreshStats]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      try {
        await Promise.all([
          refreshUsers(),
          refreshStats()
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [refreshUsers, refreshStats]);

  // Auto-refresh when not using real-time
  useEffect(() => {
    if (!enableRealTime && autoRefresh) {
      const interval = setInterval(() => {
        refreshUsers();
        refreshStats();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [enableRealTime, autoRefresh, refreshInterval, refreshUsers, refreshStats]);

  // Refresh when filters change
  useEffect(() => {
    if (!enableRealTime) {
      refreshUsers();
    } else {
      // Request filtered users via WebSocket
      sendMessage({ 
        type: 'request_users', 
        data: { ...filters } 
      });
    }
  }, [filters, enableRealTime, refreshUsers, sendMessage]);

  return {
    // Data
    data: stats, // Add missing data property
    users,
    stats,
    tenantUsers,
    
    // Loading states
    loading,
    isLoading,
    statsLoading,
    usersLoading,
    isRefetching,
    
    // Real-time connection
    isConnected,
    
    // Error handling
    error,
    clearError,
    
    // Actions
    refreshUsers,
    refreshStats,
    setUserOffline,
    bulkSetUsersOffline,
    getUserSession,
    getTenantUsers,
    cleanupExpiredUsers,
    
    // Filters
    filters,
    setFilters
  };
};