export interface User {
  id: string;
  email: string;
  name?: string;
  tenant_id: string;
  tenant_name?: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface ImpersonationStartRequest {
  target_user_id: string;
  duration_hours?: number;
  reason?: string;
  is_window_based?: boolean;
}

export interface ImpersonationStartResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  session_id: string;
  target_user: {
    id: string;
    email: string;
    name?: string;
    tenant_id: string;
    tenant_name?: string;
  };
  admin_user: {
    id: string;
    email: string;
    name?: string;
  };
  expires_at: string;
  is_window_based?: boolean;
  window_url?: string;
}

export interface ImpersonationEndRequest {
  session_id?: string;
}

export interface ImpersonationEndResponse {
  message: string;
  ended_at: string;
}

export interface ActiveSession {
  id?: string;
  session_id: string;
  admin_user_id: string;
  target_user_id: string;
  target_tenant_id?: string;
  started_at: string;
  expires_at: string;
  ended_at?: string;
  is_active?: boolean;
  is_window_based?: boolean;
  window_closed_detected?: boolean;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
  last_activity_at?: string;
  activity_count?: number;
  termination_reason?: string;
  terminated_by_admin_id?: string;
  duration_minutes?: number;
  created_at?: string;
  updated_at?: string;
  status: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  status: string;
  admin_user_id: string;
  target_user_id?: string;
  session_id?: string;
  ip_address?: string;
  reason?: string;
  created_at: string;
  details: Record<string, any>;
}

export interface CurrentSessionInfo {
  is_impersonation: boolean;
  admin_user_id: string;
  target_user_id: string;
  target_tenant_id?: string;
  current_time: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserFilters {
  search: string;
  tenant_id: string;
  role: string;
  is_active: string;
}