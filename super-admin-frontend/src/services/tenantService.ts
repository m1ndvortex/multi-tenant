import { Tenant, TenantFormData, TenantsResponse, TenantFilters } from '@/types/tenant';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class TenantService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('super_admin_token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
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