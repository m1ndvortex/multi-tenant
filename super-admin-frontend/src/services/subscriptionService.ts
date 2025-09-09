import { apiClient } from './apiClient';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export interface SubscriptionOverview {
  total_tenants: number;
  free_subscriptions: number;
  pro_subscriptions: number;
  enterprise_subscriptions: number;
  expiring_soon: number;
  expired: number;
  conversion_rate: number;
  revenue_impact?: number;
}

export interface SubscriptionExtensionRequest {
  months: number;
  reason?: string;
}

export interface SubscriptionExtensionResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  old_expiration_date?: string;
  new_expiration_date: string;
  months_added: number;
  days_added: number;
}

export interface SubscriptionStatusRequest {
  activate: boolean;
  subscription_type?: 'free' | 'pro';
  reason?: string;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  old_status: string;
  new_status: string;
  old_subscription_type: string;
  new_subscription_type: string;
}

export interface SubscriptionPlanSwitchRequest {
  new_plan: 'free' | 'pro';
  duration_months?: number;
  reason?: string;
  immediate_effect?: boolean;
}

export interface SubscriptionPlanSwitchResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  old_plan: string;
  new_plan: string;
  old_expiration?: string;
  new_expiration?: string;
  limits_updated: boolean;
}

export interface TenantSubscriptionDetails {
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  subscription_type: string;
  subscription_status: string;
  subscription_starts_at?: string;
  subscription_expires_at?: string;
  days_until_expiry: number;
  is_active: boolean;
  usage_stats: Record<string, number>;
  limits: Record<string, any>;
  last_activity?: string;
}

export interface SubscriptionHistoryEntry {
  id: string;
  action: string;
  old_subscription_type?: string;
  new_subscription_type: string;
  duration_months?: number;
  old_expiry_date?: string;
  new_expiry_date?: string;
  reason?: string;
  notes?: string;
  change_date: string;
  admin_email?: string;
  admin_name?: string;
}

export interface SubscriptionHistoryResponse {
  tenant_id: string;
  tenant_name: string;
  history: SubscriptionHistoryEntry[];
  total_entries: number;
  current_subscription: string;
  current_expiry?: string;
}

export interface SubscriptionStats {
  total_active_subscriptions: number;
  subscriptions_by_type: Record<string, number>;
  expiring_this_month: number;
  expired_count: number;
  new_subscriptions_this_month: number;
  churn_rate: number;
  average_subscription_duration: number;
  revenue_metrics: Record<string, number>;
  last_updated: string;
}

class SubscriptionService {
  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    try {
      const { method = 'GET', body } = options;
      
      let result: any;
      if (method === 'GET') {
        result = await apiClient.get(endpoint);
      } else if (method === 'POST') {
        result = await apiClient.post(endpoint, body);
      } else if (method === 'PUT') {
        result = await apiClient.put(endpoint, body);
      } else if (method === 'DELETE') {
        result = await apiClient.delete(endpoint);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }

      return result as T;
    } catch (error: any) {
      if (error.response) {
        const apiError: ApiError = {
          message: error.response.data?.message || error.response.data?.detail || `HTTP error! status: ${error.response.status}`,
          status: error.response.status,
          details: error.response.data
        };
        throw apiError;
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      }
      if (!navigator.onLine) {
        throw new Error('No internet connection - please check your network');
      }
      
      throw error;
    }
  }

  // Subscription overview and statistics
  async getSubscriptionOverview(): Promise<SubscriptionOverview> {
    return this.request('/api/subscription-management/overview');
  }

  async getSubscriptionStats(): Promise<SubscriptionStats> {
    return this.request('/api/subscription-management/stats');
  }

  // Tenant subscription management
  async getTenantSubscriptionDetails(tenantId: string): Promise<TenantSubscriptionDetails> {
    return this.request(`/api/subscription-management/tenants/${tenantId}/details`);
  }

  async extendSubscription(tenantId: string, data: SubscriptionExtensionRequest): Promise<SubscriptionExtensionResponse> {
    return this.request(`/api/subscription-management/tenants/${tenantId}/extend`, {
      method: 'POST',
      body: data,
    });
  }

  async updateSubscriptionStatus(tenantId: string, data: SubscriptionStatusRequest): Promise<SubscriptionStatusResponse> {
    return this.request(`/api/subscription-management/tenants/${tenantId}/status`, {
      method: 'PUT',
      body: data,
    });
  }

  async switchSubscriptionPlan(tenantId: string, data: SubscriptionPlanSwitchRequest): Promise<SubscriptionPlanSwitchResponse> {
    return this.request(`/api/subscription-management/tenants/${tenantId}/plan`, {
      method: 'PUT',
      body: data,
    });
  }

  async getSubscriptionHistory(tenantId: string, limit: number = 50): Promise<SubscriptionHistoryResponse> {
    return this.request(`/api/subscription-management/tenants/${tenantId}/history?limit=${limit}`);
  }

  // Utility methods
  formatExpiryDate(dateString?: string): string {
    if (!dateString) return 'نامحدود';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `منقضی شده (${Math.abs(diffDays)} روز پیش)`;
    } else if (diffDays === 0) {
      return 'امروز منقضی می‌شود';
    } else if (diffDays === 1) {
      return 'فردا منقضی می‌شود';
    } else if (diffDays <= 7) {
      return `${diffDays} روز باقی مانده`;
    } else if (diffDays <= 30) {
      return `${diffDays} روز باقی مانده`;
    } else {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      if (remainingDays === 0) {
        return `${months} ماه باقی مانده`;
      } else {
        return `${months} ماه و ${remainingDays} روز باقی مانده`;
      }
    }
  }

  getSubscriptionStatusColor(status: string, expiryDate?: string): string {
    if (status === 'suspended') return 'text-red-600';
    if (status === 'pending') return 'text-yellow-600';
    
    if (expiryDate) {
      const date = new Date(expiryDate);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'text-red-600'; // Expired
      if (diffDays <= 7) return 'text-orange-600'; // Expiring soon
      if (diffDays <= 30) return 'text-yellow-600'; // Expiring this month
    }
    
    return 'text-green-600'; // Active
  }

  getSubscriptionTypeLabel(type: string): string {
    switch (type) {
      case 'free': return 'رایگان';
      case 'pro': return 'حرفه‌ای';
      case 'enterprise': return 'سازمانی';
      default: return type;
    }
  }

  getSubscriptionStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'فعال';
      case 'suspended': return 'تعلیق';
      case 'pending': return 'در انتظار';
      case 'expired': return 'منقضی';
      default: return status;
    }
  }
}

export const subscriptionService = new SubscriptionService();