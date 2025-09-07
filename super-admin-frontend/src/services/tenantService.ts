import { Tenant, TenantFormData, TenantsResponse, TenantFilters } from '@/types/tenant';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

class TenantService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('super_admin_token');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.detail || errorMessage;
          errorDetails = errorData;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }

        const apiError: ApiError = {
          message: errorMessage,
          status: response.status,
          details: errorDetails
        };

        throw apiError;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        if (!navigator.onLine) {
          throw new Error('No internet connection - please check your network');
        }
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
      body: JSON.stringify(data),
    });
  }

  async updateTenant(id: string, data: Partial<TenantFormData>): Promise<Tenant> {
    return this.request<Tenant>(`/api/super-admin/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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