/**
 * Enhanced Tenant Management Types
 * Types for enhanced tenant management functionality including credential updates
 */

export interface TenantCredentialsUpdateRequest {
  email?: string;
  password?: string;
  reason?: string;
}

export interface TenantFullUpdateRequest {
  // Basic information
  name?: string;
  phone?: string;
  address?: string;
  business_type?: string;
  domain?: string;
  
  // Subscription management
  subscription_type?: 'free' | 'pro' | 'enterprise';
  subscription_duration_months?: number;
  
  // Status management
  status?: 'pending' | 'active' | 'suspended' | 'cancelled';
  
  // Limits (for custom configurations)
  max_users?: number;
  max_products?: number;
  max_customers?: number;
  max_monthly_invoices?: number;
  
  // Business settings
  currency?: string;
  timezone?: string;
  
  // Admin notes
  notes?: string;
  admin_reason?: string;
}

export interface TenantCredentialsResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  updated_email?: string;
  password_updated: boolean;
  timestamp: string;
}

export interface TenantFullUpdateResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  changes_made: number;
  changes: string[];
  timestamp: string;
}

export interface EnhancedTenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  domain?: string;
  subscription_type: 'free' | 'pro' | 'enterprise';
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  business_type?: string;
  currency: string;
  timezone: string;
  
  // Subscription details
  subscription_starts_at?: string;
  subscription_expires_at?: string;
  is_subscription_active: boolean;
  days_until_expiry: number;
  
  // Limits
  max_users: number;
  max_products: number;
  max_customers: number;
  max_monthly_invoices: number;
  
  // Usage statistics
  current_usage?: Record<string, number>;
  usage_percentages?: Record<string, number>;
  
  // Enhanced details
  owner_email?: string;
  owner_name?: string;
  last_credential_update?: string;
  total_audit_entries: number;
  
  // Metadata
  notes?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantAuditLogEntry {
  timestamp: string;
  admin_id: string;
  admin_email: string;
  action: string;
  changes: Record<string, any>;
  reason?: string;
  ip_address?: string;
}

export interface TenantAuditLogResponse {
  tenant_id: string;
  tenant_name: string;
  total_entries: number;
  entries: TenantAuditLogEntry[];
}

export interface TenantManagementStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  pending_tenants: number;
  
  // Subscription breakdown
  free_subscriptions: number;
  pro_subscriptions: number;
  enterprise_subscriptions: number;
  
  // Recent activity
  recent_credential_updates: number;
  recent_status_changes: number;
  recent_subscription_changes: number;
  
  // Usage statistics
  average_users_per_tenant: number;
  average_products_per_tenant: number;
  tenants_over_limits: number;
  
  last_updated: string;
}

export interface BulkTenantCredentialUpdateRequest {
  tenant_ids: string[];
  action: 'reset_password' | 'update_email_domain';
  new_email_domain?: string;
  reason: string;
}

export interface BulkTenantCredentialUpdateResponse {
  success_count: number;
  failed_count: number;
  successful_tenant_ids: string[];
  failed_operations: Array<{ tenant_id: string; error: string }>;
  message: string;
  timestamp: string;
}