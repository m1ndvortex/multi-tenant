/**
 * TypeScript types for Online Users Monitoring System
 */

export interface UserActivityUpdateRequest {
  session_id: string;
  user_agent?: string;
  ip_address?: string;
}

export interface OnlineUser {
  id: string;
  user_id: string;
  tenant_id: string;
  user_email: string;
  email: string;
  user_full_name: string;
  tenant_name: string;
  is_online: boolean;
  is_impersonation?: boolean;
  last_activity: string;
  session_id: string;
  user_agent?: string;
  ip_address?: string;
  session_duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface OnlineUsersStats {
  total_online_users: number;
  total_offline_users: number;
  online_by_tenant: Record<string, number>;
  recent_activity_count: number;
  peak_online_today: number;
  average_session_duration: number;
}

export interface TenantOnlineUsers {
  tenant_id: string;
  tenant_name: string;
  online_users_count: number;
  offline_users_count: number;
  users: OnlineUser[];
}

export interface OnlineUsersFilter {
  tenant_id?: string;
  is_online?: boolean;
  last_activity_minutes?: number;
  limit?: number;
  offset?: number;
}

export interface UserSession {
  user_id: string;
  tenant_id: string;
  session_id: string;
  is_online: boolean;
  last_activity: string;
  session_start: string;
  session_duration_minutes: number;
  ip_address?: string;
  user_agent?: string;
}

export interface OnlineUsersWebSocketMessage {
  type: 'user_online' | 'user_offline' | 'activity_update' | 'stats_update' | 'users_update' | 'initial_stats' | 'ping' | 'pong' | 'request_stats' | 'request_users';
  data: any;
  timestamp: string;
}

export interface BulkUserStatusResponse {
  success: boolean;
  message: string;
  updated_count: number;
  failed_count: number;
  errors: string[];
}

export interface RealtimeConnectionStatus {
  connected: boolean;
  connection_id: string;
  connected_at: string;
  last_ping?: string;
}

// UI-specific types
export interface OnlineUsersTableProps {
  users: OnlineUser[];
  loading?: boolean;
  onUserSelect?: (user: OnlineUser) => void;
  onSetOffline?: (userId: string) => void;
}

export interface OnlineUsersStatsCardProps {
  stats: OnlineUsersStats;
  loading?: boolean;
}

export interface TenantUsersGroupProps {
  tenantUsers: TenantOnlineUsers;
  expanded?: boolean;
  onToggle?: () => void;
}

export interface OnlineUsersFilterProps {
  filters: OnlineUsersFilter;
  onFiltersChange: (filters: OnlineUsersFilter) => void;
  tenants: Array<{ id: string; name: string }>;
}

export interface UserActivityTimelineProps {
  user: OnlineUser;
  session?: UserSession;
}

// WebSocket hook types
export interface UseOnlineUsersWebSocketOptions {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface UseOnlineUsersWebSocketReturn {
  isConnected: boolean;
  stats: OnlineUsersStats | null;
  users: OnlineUser[];
  sendMessage: (message: Partial<OnlineUsersWebSocketMessage>) => void;
  reconnect: () => void;
  disconnect: () => void;
}

// Service types
export interface OnlineUsersServiceOptions {
  baseURL?: string;
  timeout?: number;
}

export interface OnlineUsersApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}