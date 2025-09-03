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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ImpersonationService {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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
    return this.request<ImpersonationStartResponse>('/api/super-admin/impersonation/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async endImpersonation(data: ImpersonationEndRequest = {}): Promise<ImpersonationEndResponse> {
    return this.request<ImpersonationEndResponse>('/api/super-admin/impersonation/end', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActiveSessions(
    adminUserId?: string,
    targetUserId?: string
  ): Promise<ActiveSession[]> {
    const params = new URLSearchParams();
    if (adminUserId) params.append('admin_user_id', adminUserId);
    if (targetUserId) params.append('target_user_id', targetUserId);

    return this.request<ActiveSession[]>(`/api/super-admin/impersonation/sessions?${params}`);
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

    return this.request<AuditLogEntry[]>(`/api/super-admin/impersonation/audit-log?${params}`);
  }

  async validateSession(sessionId: string): Promise<{
    session_id: string;
    is_valid: boolean;
    session_data?: any;
    validated_at: string;
  }> {
    return this.request(`/api/super-admin/impersonation/validate-session/${sessionId}`);
  }

  async terminateSession(sessionId: string): Promise<{
    message: string;
    session_id: string;
    terminated_at: string;
    terminated_by: string;
  }> {
    return this.request(`/api/super-admin/impersonation/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getCurrentSession(): Promise<CurrentSessionInfo> {
    return this.request<CurrentSessionInfo>('/api/super-admin/impersonation/current-session');
  }

  // Helper method to redirect to tenant application with impersonation token
  redirectToTenantApp(token: string, targetUser: any): void {
    // Store the impersonation token
    localStorage.setItem('impersonation_token', token);
    localStorage.setItem('impersonation_target_user', JSON.stringify(targetUser));
    
    // Redirect to tenant application
    const tenantAppUrl = process.env.REACT_APP_TENANT_APP_URL || 'http://localhost:3001';
    window.location.href = `${tenantAppUrl}?impersonation=true`;
  }

  // Helper method to return from impersonation
  returnFromImpersonation(): void {
    // Clear impersonation tokens
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('impersonation_target_user');
    
    // Return to super admin app
    const superAdminUrl = process.env.REACT_APP_SUPER_ADMIN_URL || 'http://localhost:3000';
    window.location.href = `${superAdminUrl}/impersonation`;
  }
}

export const impersonationService = new ImpersonationService();