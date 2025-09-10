/**
 * Professional Subscription Management Hook
 * Custom hook for managing subscription operations
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptionService';
import {
  TenantSubscription,
  SubscriptionExtensionRequest,
  SubscriptionStatusUpdateRequest,
  SubscriptionPlanSwitchRequest,
  SubscriptionFullControlRequest,
  SubscriptionFilters
} from '@/types/subscription';
import { useToast } from '@/hooks/use-toast';

export const useSubscriptionManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<SubscriptionFilters>({
    limit: 50,
    skip: 0
  });
  
  const [selectedTenant, setSelectedTenant] = useState<TenantSubscription | null>(null);

  // Query Keys with stable filters dependency - ensure no undefined values
  const QUERY_KEYS = {
    overview: ['subscription', 'overview'],
    tenants: [
      'subscription',
      'tenants',
      filters.subscriptionType ?? '',
      filters.statusFilter ?? '',
      filters.search ?? '',
      String(filters.limit ?? 50),
      String(filters.skip ?? 0)
    ],
    history: (tenantId: string) => ['subscription', 'history', tenantId],
    stats: (period: string) => ['subscription', 'stats', period]
  };  // Get subscription overview
  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview
  } = useQuery({
    queryKey: QUERY_KEYS.overview,
    queryFn: () => subscriptionService.getOverview(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Completely disable retries
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Get tenant subscriptions
  const {
    data: tenants = [],
    isLoading: tenantsLoading,
    error: tenantsError,
    refetch: refetchTenants
  } = useQuery({
    queryKey: QUERY_KEYS.tenants,
    queryFn: () => subscriptionService.getTenantSubscriptions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // Completely disable retries
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Get subscription history for selected tenant
  const {
    data: history,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: QUERY_KEYS.history(selectedTenant?.id || ''),
    queryFn: () => subscriptionService.getSubscriptionHistory(selectedTenant!.id),
    enabled: !!selectedTenant,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false, // Completely disable retries
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Extend subscription mutation
  const extendSubscriptionMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: SubscriptionExtensionRequest }) =>
      subscriptionService.extendSubscription(tenantId, data),
    onSuccess: (response) => {
      toast({
        title: "اشتراک تمدید شد",
        description: response.message,
        variant: "default",
      });
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
      if (selectedTenant) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history(selectedTenant.id) });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در تمدید اشتراک",
        description: error.response?.data?.detail || "خطای غیرمنتظره رخ داد",
        variant: "destructive",
      });
    },
  });

  // Update subscription status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: SubscriptionStatusUpdateRequest }) =>
      subscriptionService.updateSubscriptionStatus(tenantId, data),
    onSuccess: (response) => {
      toast({
        title: "وضعیت اشتراک به‌روزرسانی شد",
        description: response.message,
        variant: "default",
      });
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
      if (selectedTenant) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history(selectedTenant.id) });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در به‌روزرسانی وضعیت",
        description: error.response?.data?.detail || "خطای غیرمنتظره رخ داد",
        variant: "destructive",
      });
    },
  });

  // Switch subscription plan mutation
  const switchPlanMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: SubscriptionPlanSwitchRequest }) =>
      subscriptionService.switchSubscriptionPlan(tenantId, data),
    onSuccess: (response) => {
      toast({
        title: "پلن اشتراک تغییر کرد",
        description: response.message,
        variant: "default",
      });
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
      if (selectedTenant) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history(selectedTenant.id) });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در تغییر پلن",
        description: error.response?.data?.detail || "خطای غیرمنتظره رخ داد",
        variant: "destructive",
      });
    },
  });

  // Full control mutation
  const fullControlMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: SubscriptionFullControlRequest }) =>
      subscriptionService.fullSubscriptionControl(tenantId, data),
    onSuccess: (response) => {
      toast({
        title: "کنترل کامل اعمال شد",
        description: `${response.changes_applied} تغییر اعمال شد`,
        variant: "default",
      });
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
      if (selectedTenant) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.history(selectedTenant.id) });
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در کنترل کامل",
        description: error.response?.data?.detail || "خطای غیرمنتظره رخ داد",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const updateFilters = useCallback((newFilters: Partial<SubscriptionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ limit: 50, skip: 0 });
  }, []);

  const selectTenant = useCallback((tenant: TenantSubscription | null) => {
    setSelectedTenant(tenant);
  }, []);

  const refreshAll = useCallback(() => {
    refetchOverview();
    refetchTenants();
    if (selectedTenant) {
      refetchHistory();
    }
  }, [refetchOverview, refetchTenants, refetchHistory, selectedTenant]);

  // Action functions
  const extendSubscription = useCallback(
    (tenantId: string, data: SubscriptionExtensionRequest) => {
      return extendSubscriptionMutation.mutateAsync({ tenantId, data });
    },
    [extendSubscriptionMutation]
  );

  const updateSubscriptionStatus = useCallback(
    (tenantId: string, data: SubscriptionStatusUpdateRequest) => {
      return updateStatusMutation.mutateAsync({ tenantId, data });
    },
    [updateStatusMutation]
  );

  const switchSubscriptionPlan = useCallback(
    (tenantId: string, data: SubscriptionPlanSwitchRequest) => {
      return switchPlanMutation.mutateAsync({ tenantId, data });
    },
    [switchPlanMutation]
  );

  const fullSubscriptionControl = useCallback(
    (tenantId: string, data: SubscriptionFullControlRequest) => {
      return fullControlMutation.mutateAsync({ tenantId, data });
    },
    [fullControlMutation]
  );

  // Loading states
  const isLoading = overviewLoading || tenantsLoading;
  const isActionLoading = 
    extendSubscriptionMutation.isPending ||
    updateStatusMutation.isPending ||
    switchPlanMutation.isPending ||
    fullControlMutation.isPending;

  // Error states
  const error = overviewError || tenantsError || historyError;

  return {
    // Data
    overview,
    tenants,
    history,
    selectedTenant,
    filters,

    // Loading states
    isLoading,
    isActionLoading,
    overviewLoading,
    tenantsLoading,
    historyLoading,

    // Error states
    error,
    overviewError,
    tenantsError,
    historyError,

    // Actions
    extendSubscription,
    updateSubscriptionStatus,
    switchSubscriptionPlan,
    fullSubscriptionControl,

    // Utility functions
    updateFilters,
    clearFilters,
    selectTenant,
    refreshAll,
    refetchOverview,
    refetchTenants,
    refetchHistory,

    // Mutation states
    extendSubscriptionMutation,
    updateStatusMutation,
    switchPlanMutation,
    fullControlMutation,
  };
};