import {
  User,
  UsersResponse,
  UserFilters,
  ImpersonationStartRequest,
  ImpersonationStartResponse,
  ImpersonationEndRequest,
  ImpersonationEndResponse,
  ActiveSession,
  AuditLogEntry,
  CurrentSessionInfo,
} from '@/types/impersonation';
import { apiClient } from './apiClient';

class ImpersonationService {
  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    try {
      const { method = 'GET', body } = options;
      
      let response: any;
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

      return response as T;
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        throw new Error(error.response.data?.detail || `HTTP error! status: ${error.response.status}`);
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

  // User management methods
  async getUsers(
    page: number = 1,
    limit: number = 10,
    filters: Partial<UserFilters> = {}
  ): Promise<UsersResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value && value !== '')
      ),
    });

    return this.request<UsersResponse>(`/api/super-admin/users?${params}`);
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/api/super-admin/users/${id}`);
  }

  // Impersonation methods
  async startImpersonation(data: ImpersonationStartRequest): Promise<ImpersonationStartResponse> {
    return this.request<ImpersonationStartResponse>('/api/impersonation/start', {
      method: 'POST',
      body: data,
    });
  }

  async endImpersonation(data: ImpersonationEndRequest = {}): Promise<ImpersonationEndResponse> {
    return this.request<ImpersonationEndResponse>('/api/impersonation/end', {
      method: 'POST',
      body: data,
    });
  }

  async getActiveSessions(
    adminUserId?: string,
    targetUserId?: string
  ): Promise<ActiveSession[]> {
    const params = new URLSearchParams();
    if (adminUserId) params.append('admin_user_id', adminUserId);
    if (targetUserId) params.append('target_user_id', targetUserId);

    return this.request<ActiveSession[]>(`/api/impersonation/sessions?${params}`);
  }

  async getAuditLog(
    adminUserId?: string,
    targetUserId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (adminUserId) params.append('admin_user_id', adminUserId);
    if (targetUserId) params.append('target_user_id', targetUserId);
    if (startDate) params.append('start_date', startDate.toISOString());
    if (endDate) params.append('end_date', endDate.toISOString());

    return this.request<AuditLogEntry[]>(`/api/impersonation/audit-log?${params}`);
  }

  async validateSession(sessionId: string): Promise<{
    session_id: string;
    is_valid: boolean;
    session_data?: any;
    validated_at: string;
  }> {
    return this.request(`/api/impersonation/validate-session/${sessionId}`);
  }

  async terminateSession(sessionId: string): Promise<{
    message: string;
    session_id: string;
    terminated_at: string;
    terminated_by: string;
  }> {
    return this.request(`/api/impersonation/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getCurrentSession(): Promise<CurrentSessionInfo> {
    return this.request<CurrentSessionInfo>('/api/impersonation/current-session');
  }

  // Helper method to redirect to tenant application with impersonation token
  redirectToTenantApp(token: string, targetUser: any): void {
    // Store the impersonation token
    localStorage.setItem('impersonation_token', token);
    localStorage.setItem('impersonation_target_user', JSON.stringify(targetUser));
    
    // Redirect to tenant application
    const tenantAppUrl = (import.meta as any).env?.VITE_TENANT_APP_URL || 'http://localhost:3001';
    window.location.href = `${tenantAppUrl}?impersonation=true`;
  }

  // Helper method to return from impersonation
  returnFromImpersonation(): void {
    // Clear impersonation tokens
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('impersonation_target_user');
    
    // Return to super admin app
    const superAdminUrl = (import.meta as any).env?.VITE_SUPER_ADMIN_URL || 'http://localhost:3000';
    window.location.href = `${superAdminUrl}/impersonation`;
  }
}

export const impersonationService = new ImpersonationService();