/**
 * Professional Subscription Management Types
 * TypeScript interfaces for subscription management
 */

export enum SubscriptionType {
  FREE = 'free',
  PRO = 'pro'
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled'
}

export enum SubscriptionStatusAction {
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  SUSPEND = 'suspend',
  DISABLE = 'disable'
}

// Overview and Statistics
export interface SubscriptionOverview {
  total_tenants: number;
  free_subscriptions: number;
  pro_subscriptions: number;
  active_pro_subscriptions: number;
  expiring_soon: number;
  expired_subscriptions: number;
  conversion_rate: number;
  recent_upgrades: number;
  last_updated: string;
}

export interface SubscriptionStats {
  period: string;
  period_start: string;
  period_end: string;
  total_tenants: number;
  free_subscriptions: number;
  pro_subscriptions: number;
  active_pro_subscriptions: number;
  expired_pro_subscriptions: number;
  new_signups_in_period: number;
  upgrades_in_period: number;
  conversion_rate: number;
  upgrade_rate: number;
  last_updated: string;
}

// Tenant Subscription Details
export interface TenantSubscription {
  id: string;
  name: string;
  email: string;
  subscription_type: SubscriptionType;
  status: TenantStatus;
  subscription_starts_at?: string;
  subscription_expires_at?: string;
  is_subscription_active: boolean;
  days_until_expiry: number;
  created_at: string;
  updated_at: string;
}

// Extension
export interface SubscriptionExtensionRequest {
  months: number;
  reason?: string;
  keep_current_plan?: boolean;
}

export interface SubscriptionExtensionResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  tenant_name: string;
  old_expiration_date?: string;
  new_expiration_date?: string;
  months_added: number;
  subscription_type: SubscriptionType;
}

// Status Update
export interface SubscriptionStatusUpdateRequest {
  action: SubscriptionStatusAction;
  subscription_type?: SubscriptionType;
  reason?: string;
}

export interface SubscriptionStatusUpdateResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  tenant_name: string;
  old_status: TenantStatus;
  new_status: TenantStatus;
  subscription_type: SubscriptionType;
  action_performed: string;
}

// Plan Switch
export interface SubscriptionPlanSwitchRequest {
  new_plan: SubscriptionType;
  duration_months?: number;
  reason?: string;
}

export interface SubscriptionPlanSwitchResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  tenant_name: string;
  old_plan: SubscriptionType;
  new_plan: SubscriptionType;
  immediate_effect: boolean;
  subscription_expires_at?: string;
}

// Full Control
export interface SubscriptionFullControlRequest {
  subscription_type?: SubscriptionType;
  custom_start_date?: string;
  custom_end_date?: string;
  max_users?: number;
  max_products?: number;
  max_customers?: number;
  max_monthly_invoices?: number;
  status?: TenantStatus;
  admin_notes?: string;
}

export interface SubscriptionFullControlResponse {
  success: boolean;
  message: string;
  tenant_id: string;
  tenant_name: string;
  changes_applied: number;
  changes: string[];
  current_subscription_type: SubscriptionType;
  current_status: TenantStatus;
  current_limits: {
    max_users: number;
    max_products: number;
    max_customers: number;
    max_monthly_invoices: number;
  };
}

// History
export interface SubscriptionHistoryEntry {
  timestamp: string;
  action: string;
  admin_email: string;
  details: Record<string, any>;
  reason: string;
}

export interface SubscriptionHistory {
  tenant_id: string;
  tenant_name: string;
  history: SubscriptionHistoryEntry[];
  total_entries: number;
  current_subscription_type: SubscriptionType;
  current_status: TenantStatus;
}

// Filters
export interface SubscriptionFilters {
  subscriptionType?: SubscriptionType;
  statusFilter?: 'active' | 'expired' | 'expiring';
  search?: string;
  limit?: number;
  skip?: number;
}

// UI State
export interface SubscriptionManagementState {
  overview: SubscriptionOverview | null;
  tenants: TenantSubscription[];
  selectedTenant: TenantSubscription | null;
  filters: SubscriptionFilters;
  loading: boolean;
  error: string | null;
}