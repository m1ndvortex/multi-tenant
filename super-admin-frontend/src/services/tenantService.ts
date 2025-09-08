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
      
      let response;
      if (method === 'GET') {
        response = await apiClient.get(endpoint);
      } else if (method === 'POST') {
        response = await apiClient.post(endpoint, body);
      } else if (method === 'PUT') {
        response = await apiClient.put(endpoint, body);
      } else if (method === 'DELETE') {
        response = await apiClient.delete(endpoint);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }

      return response.data as T;
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
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value && value !== '')
      ),
    });

    return this.request<TenantsResponse>(`/api/super-admin/tenants?${params}`);
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
    return this.request<Tenant>(`/api/super-admin/tenants/${id}/suspend`, {
      method: 'POST',
    });
  }

  async activateTenant(id: string): Promise<Tenant> {
    return this.request<Tenant>(`/api/super-admin/tenants/${id}/activate`, {
      method: 'POST',
    });
  }

  async confirmPayment(id: string, duration: number = 12): Promise<Tenant> {
    return this.request<Tenant>(`/api/super-admin/tenants/${id}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({ duration_months: duration }),
    });
  }
}

export const tenantService = new TenantService();