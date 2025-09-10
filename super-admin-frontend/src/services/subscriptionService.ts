/**
 * Professional Subscription Management Service
 * Handles all subscription-related API calls for super admin
 */

import { apiClient } from './apiClient';
import {
  SubscriptionOverview,
  TenantSubscription,
  SubscriptionExtensionRequest,
  SubscriptionExtensionResponse,
  SubscriptionStatusUpdateRequest,
  SubscriptionStatusUpdateResponse,
  SubscriptionPlanSwitchRequest,
  SubscriptionPlanSwitchResponse,
  SubscriptionFullControlRequest,
  SubscriptionFullControlResponse,
  SubscriptionHistory,
  SubscriptionStats,
  SubscriptionFilters
} from '@/types/subscription';

class SubscriptionService {
  private baseUrl = '/subscription-management';

  /**
   * Get subscription overview and statistics
   */
  async getOverview(): Promise<SubscriptionOverview> {
    return await apiClient.get<SubscriptionOverview>(`${this.baseUrl}/overview`);
  }

  /**
   * Get list of tenants with subscription details
   */
  async getTenantSubscriptions(filters?: SubscriptionFilters): Promise<TenantSubscription[]> {
    const params = new URLSearchParams();
    
    if (filters?.subscriptionType) {
      params.append('subscription_type', filters.subscriptionType);
    }
    if (filters?.statusFilter) {
      params.append('status_filter', filters.statusFilter);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.skip) {
      params.append('skip', filters.skip.toString());
    }

    return await apiClient.get<TenantSubscription[]>(`${this.baseUrl}/tenants?${params.toString()}`);
  }

  /**
   * Extend tenant subscription by specified months
   */
  async extendSubscription(
    tenantId: string, 
    data: SubscriptionExtensionRequest
  ): Promise<SubscriptionExtensionResponse> {
    return await apiClient.post<SubscriptionExtensionResponse>(`${this.baseUrl}/tenants/${tenantId}/extend`, data);
  }

  /**
   * Update subscription status (activate/deactivate/suspend/disable)
   */
  async updateSubscriptionStatus(
    tenantId: string,
    data: SubscriptionStatusUpdateRequest
  ): Promise<SubscriptionStatusUpdateResponse> {
    return await apiClient.put<SubscriptionStatusUpdateResponse>(`${this.baseUrl}/tenants/${tenantId}/status`, data);
  }

  /**
   * Switch subscription plan with immediate effect
   */
  async switchSubscriptionPlan(
    tenantId: string,
    data: SubscriptionPlanSwitchRequest
  ): Promise<SubscriptionPlanSwitchResponse> {
    return await apiClient.put<SubscriptionPlanSwitchResponse>(`${this.baseUrl}/tenants/${tenantId}/plan`, data);
  }

  /**
   * Full manual control over all subscription aspects
   */
  async fullSubscriptionControl(
    tenantId: string,
    data: SubscriptionFullControlRequest
  ): Promise<SubscriptionFullControlResponse> {
    return await apiClient.put<SubscriptionFullControlResponse>(`${this.baseUrl}/tenants/${tenantId}/full-control`, data);
  }

  /**
   * Get subscription history for a tenant
   */
  async getSubscriptionHistory(tenantId: string, limit?: number): Promise<SubscriptionHistory> {
    const params = limit ? `?limit=${limit}` : '';
    return await apiClient.get<SubscriptionHistory>(`${this.baseUrl}/tenants/${tenantId}/history${params}`);
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(period: string = 'month'): Promise<SubscriptionStats> {
    return await apiClient.get<SubscriptionStats>(`${this.baseUrl}/stats?period=${period}`);
  }
}

export const subscriptionService = new SubscriptionService();