import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  errorLoggingService, 
  ErrorLogFilters, 
  ErrorResolutionRequest,
  BulkErrorActionRequest 
} from '@/services/errorLoggingService';
import { toast } from '@/hooks/use-toast';

// Get error logs with filtering and pagination
export const useErrorLogs = (filters: ErrorLogFilters = {}) => {
  return useQuery({
    queryKey: ['error-logs', filters],
    queryFn: () => errorLoggingService.getErrorLogs(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });
};

// Get specific error log by ID
export const useErrorLog = (errorId: string) => {
  return useQuery({
    queryKey: ['error-log', errorId],
    queryFn: () => errorLoggingService.getErrorLog(errorId),
    enabled: !!errorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

// Get error statistics
export const useErrorStatistics = (
  tenantId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ['error-statistics', tenantId, startDate, endDate],
    queryFn: () => errorLoggingService.getErrorStatistics(tenantId, startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

// Get error trends
export const useErrorTrends = (days: number = 7) => {
  return useQuery({
    queryKey: ['error-trends', days],
    queryFn: () => errorLoggingService.getErrorTrends(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

// Get critical errors
export const useCriticalErrors = (hours: number = 24) => {
  return useQuery({
    queryKey: ['critical-errors', hours],
    queryFn: () => errorLoggingService.getCriticalErrors(hours),
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes for critical errors
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: 2000,
  });
};

// Resolve error mutation
export const useResolveError = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ errorId, resolutionData }: { errorId: string; resolutionData: ErrorResolutionRequest }) =>
      errorLoggingService.resolveError(errorId, resolutionData),
    onSuccess: (_, variables) => {
      // Invalidate and refetch error logs
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-log', variables.errorId] });
      queryClient.invalidateQueries({ queryKey: ['error-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['critical-errors'] });
      
      toast({
        title: 'خطا حل شد',
        description: 'خطا با موفقیت به عنوان حل شده علامت‌گذاری شد',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در حل کردن',
        description: error.response?.data?.detail || 'امکان حل کردن خطا وجود ندارد',
        variant: 'destructive',
      });
    },
  });
};

// Bulk error action mutation
export const useBulkErrorAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actionData: BulkErrorActionRequest) =>
      errorLoggingService.bulkErrorAction(actionData),
    onSuccess: (data) => {
      // Invalidate and refetch error logs
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['critical-errors'] });
      
      toast({
        title: 'عملیات گروهی انجام شد',
        description: data.message,
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در عملیات گروهی',
        description: error.response?.data?.detail || 'امکان انجام عملیات گروهی وجود ندارد',
        variant: 'destructive',
      });
    },
  });
};

// Delete error mutation
export const useDeleteError = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (errorId: string) => errorLoggingService.deleteErrorLog(errorId),
    onSuccess: () => {
      // Invalidate and refetch error logs
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['critical-errors'] });
      
      toast({
        title: 'خطا حذف شد',
        description: 'خطا با موفقیت حذف شد',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا در حذف',
        description: error.response?.data?.detail || 'امکان حذف خطا وجود ندارد',
        variant: 'destructive',
      });
    },
  });
};

// Error logging health check
export const useErrorLoggingHealth = () => {
  return useQuery({
    queryKey: ['error-logging-health'],
    queryFn: () => errorLoggingService.healthCheck(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 4 * 60 * 1000, // 4 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 2000,
  });
};