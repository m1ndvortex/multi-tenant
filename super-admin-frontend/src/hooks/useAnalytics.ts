import { useQuery } from '@tanstack/react-query';
import { analyticsService, ErrorLogFilters } from '@/services/analyticsService';

export const usePlatformMetrics = (timeRange: '7d' | '30d' | '90d' | '1y' = '30d') => {
  return useQuery({
    queryKey: ['platform-metrics', timeRange],
    queryFn: () => analyticsService.getPlatformMetrics(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

export const useSystemHealthMetrics = (timeRange: '1h' | '24h' | '7d' = '24h') => {
  return useQuery({
    queryKey: ['system-health-metrics', timeRange],
    queryFn: () => analyticsService.getSystemHealthMetrics(timeRange),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

export const useCurrentSystemHealth = () => {
  return useQuery({
    queryKey: ['current-system-health'],
    queryFn: () => analyticsService.getCurrentSystemHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
    gcTime: 60000, // Keep in cache for 1 minute
    retry: 3,
    retryDelay: 2000,
  });
};

export const useApiErrors = (filters: ErrorLogFilters = {}) => {
  return useQuery({
    queryKey: ['api-errors', filters],
    queryFn: () => analyticsService.getApiErrors(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new data
  });
};

export const useErrorStatistics = (timeRange: '24h' | '7d' | '30d' = '24h') => {
  return useQuery({
    queryKey: ['error-statistics', timeRange],
    queryFn: () => analyticsService.getErrorStatistics(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};