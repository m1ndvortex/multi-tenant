import { useQuery, useQueryClient } from '@tanstack/react-query';
import { optimizedDashboardService } from '@/services/optimizedDashboardService';
import { ApiError } from '@/services/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState, useMemo } from 'react';

// Optimized query configurations
const QUERY_CONFIGS = {
  stats: {
    staleTime: 50000,
    cacheTime: 300000, // 5 minutes
    refetchInterval: 60000,
  },
  onlineUsers: {
    staleTime: 10000,
    cacheTime: 60000,
    refetchInterval: 15000,
  },
  alerts: {
    staleTime: 30000,
    cacheTime: 180000,
    refetchInterval: 45000,
  },
  quickStats: {
    staleTime: 20000,
    cacheTime: 120000,
    refetchInterval: 30000,
  },
  systemHealth: {
  staleTime: 4000,
  cacheTime: 30000,
  refetchInterval: 5000,
  },
};

export const useOptimizedDashboardStats = () => {
  // const { toast } = useToast();
  
  return useQuery({
    queryKey: ['optimized-dashboard-stats'],
    queryFn: () => optimizedDashboardService.getDashboardStats(),
    ...QUERY_CONFIGS.stats,
    retry: (failureCount, error) => {
      const apiError = error as unknown as ApiError;
      if (apiError.status === 401 || apiError.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // onError callback removed - React Query v5 doesn't support it
    placeholderData: (previousData) => previousData,
  });
};

export const useOptimizedOnlineUsers = () => {
  return useQuery({
    queryKey: ['optimized-online-users'],
    queryFn: () => optimizedDashboardService.getOnlineUsers(),
    ...QUERY_CONFIGS.onlineUsers,
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useOptimizedSystemAlerts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['optimized-system-alerts', limit],
    queryFn: () => optimizedDashboardService.getSystemAlerts(limit),
    ...QUERY_CONFIGS.alerts,
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useOptimizedQuickStats = () => {
  return useQuery({
    queryKey: ['optimized-quick-stats'],
    queryFn: () => optimizedDashboardService.getQuickStats(),
    ...QUERY_CONFIGS.quickStats,
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useOptimizedSystemHealth = () => {
  return useQuery({
    queryKey: ['optimized-system-health'],
    queryFn: () => optimizedDashboardService.getCurrentSystemHealth(),
    ...QUERY_CONFIGS.systemHealth,
    retry: 3,
    retryDelay: 500,
    placeholderData: (previousData) => previousData,
  });
};

// Combined optimized hook with intelligent loading states
export const useOptimizedDashboardData = () => {
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const { toast } = useToast();

  const stats = useOptimizedDashboardStats();
  const onlineUsers = useOptimizedOnlineUsers();
  const alerts = useOptimizedSystemAlerts();
  const quickStats = useOptimizedQuickStats();
  const systemHealth = useOptimizedSystemHealth();

  // Memoized loading states
  const loadingStates = useMemo(() => ({
    isInitialLoading: stats.isLoading && !stats.data,
    isRefreshing: stats.isFetching && stats.data,
    isAnyLoading: stats.isLoading || onlineUsers.isLoading || alerts.isLoading || quickStats.isLoading,
    hasAnyError: stats.error || onlineUsers.error || alerts.error || quickStats.error,
    hasAllData: stats.data && onlineUsers.data && alerts.data && quickStats.data,
  }), [
    stats.isLoading, stats.isFetching, stats.data, stats.error,
    onlineUsers.isLoading, onlineUsers.data, onlineUsers.error,
    alerts.isLoading, alerts.data, alerts.error,
    quickStats.isLoading, quickStats.data, quickStats.error,
  ]);

  // Handle online/offline status with optimizations
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Only refetch if we've been offline for more than 30 seconds
      if (Date.now() - lastRefresh > 30000) {
        queryClient.invalidateQueries();
        toast({
          title: 'Connection Restored',
          description: 'Dashboard data is being refreshed',
        });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: 'Connection Lost',
        description: 'Working in offline mode with cached data',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, toast, lastRefresh]);

  // Optimized refresh function with debouncing
  const refreshAll = useCallback(async () => {
    const now = Date.now();
    // Prevent rapid refreshes (debounce to 5 seconds)
    if (now - lastRefresh < 5000) {
      return;
    }

    try {
      setLastRefresh(now);
      await queryClient.invalidateQueries({
        predicate: (query) => Boolean(query.queryKey[0]?.toString().startsWith('optimized-')),
      });
      
      toast({
        title: 'Dashboard Refreshed',
        description: 'All data has been updated',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Unable to refresh dashboard data',
        variant: 'destructive',
      });
    }
  }, [queryClient, toast, lastRefresh]);

  // Prefetch data on mount
  useEffect(() => {
    optimizedDashboardService.prefetchDashboardData();
  }, []);

  // Clean up expired cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      optimizedDashboardService.clearExpiredCache();
    }, 60000); // Clean every minute

    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    onlineUsers,
    alerts,
    quickStats,
    systemHealth,
    ...loadingStates,
    isOffline,
    refreshAll,
    cacheStats: optimizedDashboardService.getCacheStats(),
  };
};