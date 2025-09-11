/**
 * Online Users Monitoring Service
 * Handles API calls for real-time online users monitoring
 */

import { 
  OnlineUser, 
  OnlineUsersStats, 
  TenantOnlineUsers, 
  OnlineUsersFilter, 
  UserSession,
  BulkUserStatusResponse,
  OnlineUsersServiceOptions,
  OnlineUsersApiResponse
} from '../types/onlineUsers';

class OnlineUsersService {
  private baseURL: string;
  private timeout: number;

  constructor(options: OnlineUsersServiceOptions = {}) {
    this.baseURL = options.baseURL || '/api/online-users';
    this.timeout = options.timeout || 10000;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<OnlineUsersApiResponse<T>> {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`Online Users API Error (${endpoint}):`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Get list of currently online users
   */
  async getOnlineUsers(filters: OnlineUsersFilter = {}): Promise<OnlineUsersApiResponse<OnlineUser[]>> {
    const params = new URLSearchParams();
    
    if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<OnlineUser[]>(endpoint);
  }

  /**
   * Get online users statistics
   */
  async getOnlineUsersStats(): Promise<OnlineUsersApiResponse<OnlineUsersStats>> {
    return this.makeRequest<OnlineUsersStats>('/stats');
  }

  /**
   * Get online users for a specific tenant
   */
  async getTenantOnlineUsers(tenantId: string): Promise<OnlineUsersApiResponse<TenantOnlineUsers>> {
    return this.makeRequest<TenantOnlineUsers>(`/tenants/${tenantId}`);
  }

  /**
   * Get detailed session information for a specific user
   */
  async getUserSession(userId: string): Promise<OnlineUsersApiResponse<UserSession>> {
    return this.makeRequest<UserSession>(`/users/${userId}/session`);
  }

  /**
   * Manually set a user as offline
   */
  async setUserOffline(userId: string): Promise<OnlineUsersApiResponse<{ success: boolean; message: string }>> {
    return this.makeRequest(`/users/${userId}/offline`, {
      method: 'POST',
    });
  }

  /**
   * Set multiple users as offline
   */
  async bulkSetUsersOffline(userIds: string[]): Promise<OnlineUsersApiResponse<BulkUserStatusResponse>> {
    return this.makeRequest<BulkUserStatusResponse>('/bulk/offline', {
      method: 'POST',
      body: JSON.stringify(userIds),
    });
  }

  /**
   * Trigger cleanup of expired user sessions
   */
  async cleanupExpiredUsers(): Promise<OnlineUsersApiResponse<{ success: boolean; message: string }>> {
    return this.makeRequest('/cleanup', {
      method: 'POST',
    });
  }

  /**
   * Update user activity (called by tenant applications)
   */
  async updateUserActivity(sessionId: string, userAgent?: string, ipAddress?: string): Promise<OnlineUsersApiResponse<any>> {
    return this.makeRequest('/activity/update', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        user_agent: userAgent,
        ip_address: ipAddress,
      }),
    });
  }

  /**
   * Get WebSocket URL for real-time updates
   */
  getWebSocketURL(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${this.baseURL}/ws`;
  }

  /**
   * Create WebSocket connection for real-time updates
   */
  createWebSocketConnection(): WebSocket {
    const wsUrl = this.getWebSocketURL();
    return new WebSocket(wsUrl);
  }
}

// Export singleton instance
export const onlineUsersService = new OnlineUsersService();
export default onlineUsersService;