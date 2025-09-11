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

  // Enhanced impersonation methods
  async startEnhancedImpersonation(data: ImpersonationStartRequest & { 
    is_window_based?: boolean 
  }): Promise<ImpersonationStartResponse & { 
    is_window_based: boolean; 
    window_url: string 
  }> {
    return this.request('/api/enhanced-impersonation/start', {
      method: 'POST',
      body: { ...data, is_window_based: data.is_window_based ?? true },
    });
  }

  // Legacy impersonation method for backward compatibility
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

  // Enhanced active sessions with better tracking
  async getEnhancedActiveSessions(
    adminUserId?: string,
    targetUserId?: string,
    includeWindowBased: boolean = true
  ): Promise<ActiveSession[]> {
    const params = new URLSearchParams();
    if (adminUserId) params.append('admin_user_id', adminUserId);
    if (targetUserId) params.append('target_user_id', targetUserId);
    if (includeWindowBased !== undefined) params.append('include_window_based', includeWindowBased.toString());

    return this.request<ActiveSession[]>(`/api/enhanced-impersonation/sessions?${params}`);
  }

  // Legacy method for backward compatibility
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

  // Enhanced session termination
  async terminateEnhancedSession(sessionId: string): Promise<{
    message: string;
    session_id: string;
    terminated_at: string;
    terminated_by: string;
  }> {
    return this.request(`/api/enhanced-impersonation/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Legacy method for backward compatibility
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

  // Enhanced method to open tenant application in new window/tab with impersonation token
  openTenantAppInNewWindow(token: string, targetUser: any, sessionId: string): Window | null {
    // Store the impersonation token
    localStorage.setItem('impersonation_token', token);
    localStorage.setItem('impersonation_target_user', JSON.stringify(targetUser));
    localStorage.setItem('impersonation_session_id', sessionId);
    
    // Open tenant application in new window/tab
    const tenantAppUrl = (import.meta as any).env?.VITE_TENANT_APP_URL || 'http://localhost:3001';
    const impersonationUrl = `${tenantAppUrl}?impersonation=true&session_id=${sessionId}&token=${encodeURIComponent(token)}`;
    
    // Open in new window with specific features
    const newWindow = window.open(
      impersonationUrl,
      `impersonation_${sessionId}`,
      'width=1200,height=800,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=yes,toolbar=yes'
    );
    
    // Set up window closure detection
    if (newWindow) {
      this.setupWindowClosureDetection(newWindow, sessionId);
    }
    
    return newWindow;
  }

  // Legacy method for backward compatibility (redirects in same window)
  redirectToTenantApp(token: string, targetUser: any): void {
    // Store the impersonation token
    localStorage.setItem('impersonation_token', token);
    localStorage.setItem('impersonation_target_user', JSON.stringify(targetUser));
    
    // Redirect to tenant application
    const tenantAppUrl = (import.meta as any).env?.VITE_TENANT_APP_URL || 'http://localhost:3001';
    window.location.href = `${tenantAppUrl}?impersonation=true`;
  }

  // Set up automatic window closure detection
  private setupWindowClosureDetection(impersonationWindow: Window, sessionId: string): void {
    const checkClosure = () => {
      if (impersonationWindow.closed) {
        // Window was closed, notify backend for cleanup
        this.handleWindowClosure(sessionId).catch(console.error);
        clearInterval(intervalId);
      }
    };
    
    // Check every 2 seconds if window is closed
    const intervalId = setInterval(checkClosure, 2000);
    
    // Also listen for beforeunload event on the main window
    const handleMainWindowUnload = () => {
      if (!impersonationWindow.closed) {
        impersonationWindow.close();
      }
      clearInterval(intervalId);
    };
    
    window.addEventListener('beforeunload', handleMainWindowUnload);
    
    // Clean up event listener when window closes
    setTimeout(() => {
      window.removeEventListener('beforeunload', handleMainWindowUnload);
    }, 8 * 60 * 60 * 1000); // 8 hours max session time
  }

  // Handle window closure detection
  private async handleWindowClosure(sessionId: string): Promise<void> {
    try {
      await this.request('/api/enhanced-impersonation/detect-window-closure', {
        method: 'POST',
        body: { session_id: sessionId }
      });
      
      // Clean up local storage
      localStorage.removeItem('impersonation_token');
      localStorage.removeItem('impersonation_target_user');
      localStorage.removeItem('impersonation_session_id');
    } catch (error) {
      console.error('Failed to notify window closure:', error);
    }
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