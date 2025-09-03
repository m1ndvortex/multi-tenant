export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  subscription_type: 'free' | 'pro' | 'pending_payment' | 'expired';
  subscription_expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
  last_activity?: string;
}

export interface TenantFilters {
  search: string;
  subscription_type: string;
  is_active: string;
}

export interface TenantFormData {
  name: string;
  domain?: string;
  subscription_type: 'free' | 'pro';
  subscription_expires_at?: string;
  is_active: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TenantsResponse {
  tenants: Tenant[];
  pagination: PaginationInfo;
}