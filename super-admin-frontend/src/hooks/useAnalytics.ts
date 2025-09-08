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
    refetchOnWindowFocus: false, // Prevent automatic refetch on window focus
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
    refetchOnWindowFocus: false, // Prevent automatic refetch on window focus
  refetchInterval: 10000, // Refresh the time-series every 10 seconds
  });
};

export const useCurrentSystemHealth = () => {
  return useQuery({
    queryKey: ['current-system-health'],
    queryFn: () => analyticsService.getCurrentSystemHealth(),
  refetchInterval: 5000, // Refetch every 5 seconds for near real-time updates
  staleTime: 4500, // Consider data stale shortly before next refetch
    gcTime: 60000, // Keep in cache for 1 minute
    retry: 3,
    retryDelay: 2000,
  refetchOnWindowFocus: false,
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