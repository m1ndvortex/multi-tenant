import { apiClient } from './apiClient';
import { TenantCredentialsData } from '@/components/enhanced/TenantCredentialsDialog';
import { EnhancedTenantFormData } from '@/components/enhanced/EnhancedTenantForm';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

class EnhancedTenantService {
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

  // Enhanced tenant management endpoints
  async updateTenantCredentials(tenantId: string, credentials: TenantCredentialsData): Promise<any> {
    return this.request(`/api/enhanced-tenant-management/tenants/${tenantId}/credentials`, {
      method: 'PUT',
      body: credentials,
    });
  }

  async fullTenantUpdate(tenantId: string, data: EnhancedTenantFormData): Promise<any> {
    return this.request(`/api/enhanced-tenant-management/tenants/${tenantId}/full-update`, {
      method: 'PUT',
      body: data,
    });
  }

  // Subscription management endpoints
  async getSubscriptionOverview(): Promise<any> {
    return this.request('/api/subscription-management/subscriptions/overview');
  }

  async extendSubscription(tenantId: string, months: number, reason?: string): Promise<any> {
    return this.request(`/api/subscription-management/subscriptions/${tenantId}/extend`, {
      method: 'POST',
      body: { months, reason },
    });
  }

  async updateSubscriptionStatus(
    tenantId: string, 
    activate: boolean, 
    subscriptionType?: 'free' | 'pro',
    reason?: string
  ): Promise<any> {
    return this.request(`/api/subscription-management/subscriptions/${tenantId}/status`, {
      method: 'PUT',
      body: { 
        activate, 
        subscription_type: subscriptionType,
        reason 
      },
    });
  }

  async changeSubscriptionPlan(
    tenantId: string, 
    newPlan: 'free' | 'pro',
    reason?: string
  ): Promise<any> {
    // This uses the status endpoint with plan change
    return this.updateSubscriptionStatus(tenantId, true, newPlan, reason);
  }

  // Error logging endpoints (for future use)
  async getActiveErrors(filters?: {
    tenant_id?: string;
    severity?: string;
    error_type?: string;
    limit?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.error_type) params.set('error_type', filters.error_type);
    if (filters?.limit) params.set('limit', filters.limit.toString());

    const queryString = params.toString();
    return this.request(`/api/error-logging/errors/active${queryString ? `?${queryString}` : ''}`);
  }

  async getErrorStatistics(): Promise<any> {
    return this.request('/api/error-logging/errors/stats');
  }

  async resolveError(errorId: string, resolutionNotes?: string): Promise<any> {
    return this.request(`/api/error-logging/errors/${errorId}/resolve`, {
      method: 'PUT',
      body: { resolution_notes: resolutionNotes },
    });
  }

  // WebSocket connection for real-time error updates
  connectToErrorUpdates(onMessage: (data: any) => void, onError?: (error: Event) => void): WebSocket | null {
    try {
      // Get the base URL and convert to WebSocket URL
      const baseUrl = apiClient.defaults?.baseURL || window.location.origin;
      const wsUrl = baseUrl.replace(/^https?/, 'ws') + '/api/error-logging/ws/errors';
      
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      return ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }
}

export const enhancedTenantService = new EnhancedTenantService();