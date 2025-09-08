export interface BackupMonitoringStatus {
  overall_status: 'healthy' | 'warning' | 'critical';
  tenant_backups: {
    total_tenants: number;
    successful_backups_24h: number;
    failed_backups_24h: number;
    pending_backups: number;
    last_backup_time: string;
  };
  disaster_recovery: {
    last_full_backup: string;
    backup_status: 'success' | 'failed' | 'in_progress';
    next_scheduled_backup: string;
  };
  storage_providers: {
    backblaze_b2: StorageProviderStatus;
    cloudflare_r2: StorageProviderStatus;
  };
}

export interface StorageProviderStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  response_time: number;
  last_check: string;
  error_message?: string;
  uptime_percentage: number;
}

export interface StorageAnalytics {
  provider: 'backblaze_b2' | 'cloudflare_r2';
  usage_metrics: {
    total_storage_gb: number;
    monthly_growth_gb: number;
    file_count: number;
    average_file_size_mb: number;
  };
  cost_metrics: {
    estimated_monthly_cost: number;
    storage_cost: number;
    bandwidth_cost: number;
    operations_cost: number;
    cost_trend_percentage: number;
  };
  performance_metrics: {
    average_upload_speed_mbps: number;
    average_download_speed_mbps: number;
    success_rate_percentage: number;
    average_response_time_ms: number;
  };
  redundancy_status: {
    files_in_both_providers: number;
    files_only_primary: number;
    files_only_secondary: number;
    redundancy_percentage: number;
  };
}

export interface BackupVerificationResult {
  backup_id: string;
  backup_type: 'tenant' | 'disaster_recovery';
  tenant_name?: string;
  verification_date: string;
  status: 'passed' | 'failed' | 'in_progress' | 'pending';
  checks: {
    file_exists: boolean;
    file_size_match: boolean;
    checksum_valid: boolean;
    encryption_valid: boolean;
    download_test: boolean;
  };
  storage_providers: {
    backblaze_b2: ProviderVerificationResult;
    cloudflare_r2: ProviderVerificationResult;
  };
  error_details?: string;
  verification_duration_seconds: number;
}

export interface ProviderVerificationResult {
  available: boolean;
  file_exists: boolean;
  file_size: number;
  checksum: string;
  last_modified: string;
  error?: string;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  backup_type: 'tenant' | 'disaster_recovery';
  retention_days: number;
  max_backups_per_tenant?: number;
  auto_cleanup_enabled: boolean;
  storage_providers: ('backblaze_b2' | 'cloudflare_r2')[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface BackupAuditLog {
  id: string;
  timestamp: string;
  operation_type: 'backup_created' | 'backup_deleted' | 'backup_restored' | 'backup_verified' | 'policy_changed';
  backup_id?: string;
  tenant_id?: string;
  tenant_name?: string;
  user_id: string;
  user_email: string;
  operation_details: {
    storage_provider?: string;
    file_size?: number;
    duration_seconds?: number;
    success: boolean;
    error_message?: string;
  };
  metadata: Record<string, any>;
}

export interface BackupHealthMetrics {
  success_rate_24h: number;
  success_rate_7d: number;
  success_rate_30d: number;
  average_backup_size_gb: number;
  average_backup_duration_minutes: number;
  storage_efficiency_percentage: number;
  redundancy_compliance_percentage: number;
  cost_per_gb_monthly: number;
}

export interface StorageProviderComparison {
  metric: string;
  backblaze_b2_value: number | string;
  cloudflare_r2_value: number | string;
  better_provider: 'backblaze_b2' | 'cloudflare_r2' | 'equal';
  unit?: string;
}

export interface BackupTrend {
  date: string;
  successful_backups: number;
  failed_backups: number;
  total_size_gb: number;
  average_duration_minutes: number;
}

export interface AlertConfiguration {
  id: string;
  name: string;
  alert_type: 'backup_failure' | 'storage_threshold' | 'cost_threshold' | 'verification_failure';
  threshold_value: number;
  threshold_unit: string;
  notification_channels: ('email' | 'webhook')[];
  is_enabled: boolean;
  created_at: string;
}