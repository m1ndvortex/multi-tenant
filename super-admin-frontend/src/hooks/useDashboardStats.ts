import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { ApiError } from '@/services/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';

export const useDashboardStats = () => {
  // const { toast } = useToast();
  
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getDashboardStats(),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 50000, // Consider data stale after 50 seconds
    retry: (failureCount, error) => {
      const apiError = error as unknown as ApiError;
      
      // Don't retry on auth errors
      if (apiError.status === 401 || apiError.status === 403) {
        return false;
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // onError callback removed - React Query v5 doesn't support it
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
};

export const useOnlineUsers = () => {
  return useQuery({
    queryKey: ['online-users'],
    queryFn: () => dashboardService.getOnlineUsers(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000,
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useSystemAlerts = (limit: number = 10) => {
  return useQuery({
    queryKey: ['system-alerts', limit],
    queryFn: () => dashboardService.getSystemAlerts(limit),
    refetchInterval: 45000, // Refetch every 45 seconds
    staleTime: 40000,
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useQuickStats = () => {
  return useQuery({
    queryKey: ['quick-stats'],
    queryFn: () => dashboardService.getQuickStats(),
    refetchInterval: 30000,
    staleTime: 25000,
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useCurrentSystemHealth = () => {
  return useQuery({
    queryKey: ['current-system-health'],
    queryFn: () => dashboardService.getCurrentSystemHealth(),
    refetchInterval: 15000, // More frequent updates for system health
    staleTime: 10000,
    retry: 3,
    retryDelay: 500,
    placeholderData: (previousData) => previousData,
  });
};

// Combined hook for dashboard data with error recovery
export const useDashboardData = () => {
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { toast } = useToast();

  const stats = useDashboardStats();
  const onlineUsers = useOnlineUsers();
  const alerts = useSystemAlerts();
  const quickStats = useQuickStats();
  const systemHealth = useCurrentSystemHealth();

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Refetch all data when coming back online
      queryClient.invalidateQueries();
      toast({
        title: 'Connection Restored',
        description: 'Dashboard data is being refreshed',
      });
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
  }, [queryClient, toast]);

  // Manual refresh function
  const refreshAll = useCallback(async () => {
    try {
      await queryClient.invalidateQueries();
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
  }, [queryClient, toast]);

  // Check if any query is loading
  const isLoading = stats.isLoading || onlineUsers.isLoading || alerts.isLoading || quickStats.isLoading;
  
  // Check if any query has error
  const hasError = stats.error || onlineUsers.error || alerts.error || quickStats.error;
  
  // Check if all queries have data
  const hasData = stats.data && onlineUsers.data && alerts.data && quickStats.data;

  return {
    stats,
    onlineUsers,
    alerts,
    quickStats,
    systemHealth,
    isLoading,
    hasError,
    hasData,
    isOffline,
    refreshAll,
  };
};