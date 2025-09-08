import { Tenant, TenantFormData, TenantsResponse, TenantFilters } from '@/types/tenant';
import { apiClient } from './apiClient';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

class TenantService {
  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    try {
      const { method = 'GET', body } = options;
      
      // NOTE: apiClient methods already return response data (not AxiosResponse)
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
      // Handle axios errors
      if (error.response) {
        const apiError: ApiError = {
          message: error.response.data?.message || error.response.data?.detail || `HTTP error! status: ${error.response.status}`,
          status: error.response.status,
          details: error.response.data
        };
        throw apiError;
      }
      
      // Handle network errors
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      }
      if (!navigator.onLine) {
        throw new Error('No internet connection - please check your network');
      }
      
      throw error;
    }
  }

  async getTenants(
    page: number = 1,
    limit: number = 10,
    filters: Partial<TenantFilters> = {}
  ): Promise<TenantsResponse> {
    // Map frontend filters to backend query params
    const qs = new URLSearchParams();
    // Backend expects skip/limit; compute skip from page/limit
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    qs.set('skip', String(skip));
    qs.set('limit', String(limit));

    if (filters.search && filters.search.trim()) {
      qs.set('search_term', filters.search.trim());
    }
    if (filters.subscription_type && filters.subscription_type !== '') {
      // Only supported values on backend: free | pro | enterprise
      const st = filters.subscription_type as string;
      if (['free', 'pro', 'enterprise'].includes(st)) {
        qs.set('subscription_type', st);
      }
    }
    // Note: backend uses status enum (pending|active|suspended|cancelled).
    // Our UI currently has a boolean is_active filter; ignore it to avoid 422.

    const backend = await this.request<any>(`/api/super-admin/tenants?${qs.toString()}`);

    // backend shape: { tenants, total, skip, limit, has_more }
    const tenants = (backend?.tenants ?? []).map((t: any) => ({
      // passthrough
      ...t,
      // derive for UI compatibility
      is_active: String(t?.status || '').toLowerCase() === 'active',
    }));

    const pageFromSkip = Math.floor((backend?.skip ?? 0) / Math.max(1, limit)) + 1;
    const pagination = {
      page: pageFromSkip,
      limit: backend?.limit ?? limit,
      total: backend?.total ?? tenants.length,
      totalPages: Math.max(1, Math.ceil((backend?.total ?? tenants.length) / Math.max(1, backend?.limit ?? limit)))
    };

    return { tenants, pagination } as TenantsResponse;
  }

  async getTenant(id: string): Promise<Tenant> {
    return this.request<Tenant>(`/api/super-admin/tenants/${id}`);
  }

  async createTenant(data: TenantFormData): Promise<Tenant> {
    return this.request<Tenant>('/api/super-admin/tenants', {
      method: 'POST',
      body: data,
    });
  }

  async updateTenant(id: string, data: Partial<TenantFormData>): Promise<Tenant> {
    return this.request<Tenant>(`/api/super-admin/tenants/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteTenant(id: string): Promise<void> {
    return this.request<void>(`/api/super-admin/tenants/${id}`, {
      method: 'DELETE',
    });
  }

  async suspendTenant(id: string): Promise<Tenant> {
    // Align with backend: PUT /super-admin/tenants/{tenant_id}/status
    return this.request<Tenant>(`/api/super-admin/tenants/${id}/status`, {
      method: 'PUT',
      body: { status: 'suspended' },
    });
  }

  async activateTenant(id: string): Promise<Tenant> {
    return this.request<Tenant>(`/api/super-admin/tenants/${id}/status`, {
      method: 'PUT',
      body: { status: 'active' },
    });
  }

  async confirmPayment(id: string, duration: number = 12): Promise<Tenant> {
    // Backend expects POST /super-admin/tenants/confirm-payment with tenant_id
    return this.request<Tenant>(`/api/super-admin/tenants/confirm-payment`, {
      method: 'POST',
      body: { tenant_id: id, duration_months: duration },
    });
  }
}

export const tenantService = new TenantService();