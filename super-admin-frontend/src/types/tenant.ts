export interface Tenant {
  id: string;
  name: string;
  email?: string; // Add missing email property
  domain?: string;
  // Backend enums
  subscription_type: 'free' | 'pro' | 'enterprise';
  status?: 'pending' | 'active' | 'suspended' | 'cancelled';
  // Dates
  subscription_starts_at?: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  // Derived/legacy fields used by UI
  is_active: boolean;
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