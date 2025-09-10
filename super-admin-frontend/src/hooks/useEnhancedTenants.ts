/**
 * Enhanced Tenant Management Hooks
 * React Query hooks for enhanced tenant management operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enhancedTenantService } from '@/services/enhancedTenantService';
import {
  TenantCredentialsUpdateRequest,
  TenantFullUpdateRequest,
  BulkTenantCredentialUpdateRequest
} from '@/types/enhancedTenant';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for updating tenant credentials
 */
export const useUpdateTenantCredentials = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: TenantCredentialsUpdateRequest }) =>
      enhancedTenantService.updateTenantCredentials(tenantId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-tenant'] });
      toast({
        title: 'موفقیت',
        description: response.message || 'اطلاعات ورود تنانت با موفقیت به‌روزرسانی شد',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در به‌روزرسانی اطلاعات ورود تنانت',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook for comprehensive tenant updates
 */
export const useFullTenantUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: TenantFullUpdateRequest }) =>
      enhancedTenantService.fullTenantUpdate(tenantId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-tenant'] });
      toast({
        title: 'موفقیت',
        description: `تنانت با موفقیت به‌روزرسانی شد (${response.changes_made} تغییر اعمال شد)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در به‌روزرسانی جامع تنانت',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Hook for getting enhanced tenant details
 */
export const useEnhancedTenantDetails = (tenantId: string) => {
  return useQuery({
    queryKey: ['enhanced-tenant', tenantId],
    queryFn: () => enhancedTenantService.getEnhancedTenantDetails(tenantId),
    enabled: !!tenantId,
  });
};

/**
 * Hook for getting tenant audit log
 */
export const useTenantAuditLog = (tenantId: string, limit: number = 50) => {
  return useQuery({
    queryKey: ['tenant-audit-log', tenantId, limit],
    queryFn: () => enhancedTenantService.getTenantAuditLog(tenantId, limit),
    enabled: !!tenantId,
  });
};

/**
 * Hook for getting tenant management statistics
 */
export const useTenantManagementStats = () => {
  return useQuery({
    queryKey: ['tenant-management-stats'],
    queryFn: () => enhancedTenantService.getTenantManagementStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

/**
 * Hook for bulk tenant credential operations
 */
export const useBulkTenantCredentialUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: BulkTenantCredentialUpdateRequest) =>
      enhancedTenantService.bulkTenantCredentialUpdate(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-tenant'] });
      toast({
        title: 'موفقیت',
        description: response.message || `عملیات گروهی انجام شد: ${response.success_count} موفق، ${response.failed_count} ناموفق`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در انجام عملیات گروهی',
        variant: 'destructive',
      });
    },
  });
};