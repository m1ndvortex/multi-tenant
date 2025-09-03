export interface TenantBackup {
  id: string;
  tenant_id: string;
  tenant_name: string;
  backup_date: string;
  file_size: number;
  storage_provider: 'cloudflare_r2' | 'backblaze_b2';
  file_path: string;
  encryption_status: 'encrypted' | 'not_encrypted';
  integrity_status: 'verified' | 'pending' | 'failed';
  created_at: string;
}

export interface DisasterRecoveryBackup {
  id: string;
  backup_date: string;
  backup_type: 'full_platform' | 'database_only' | 'configuration';
  file_size: number;
  cloudflare_r2_status: 'uploaded' | 'failed' | 'pending';
  backblaze_b2_status: 'uploaded' | 'failed' | 'pending';
  cloudflare_r2_path?: string;
  backblaze_b2_path?: string;
  integrity_status: 'verified' | 'pending' | 'failed';
  created_at: string;
}

export interface StorageUsage {
  provider: 'cloudflare_r2' | 'backblaze_b2';
  total_size: number;
  tenant_backups_size: number;
  disaster_recovery_size: number;
  monthly_cost: number;
  file_count: number;
  last_updated: string;
}

export interface RestoreOperation {
  id: string;
  operation_type: 'tenant_restore' | 'disaster_recovery';
  tenant_ids?: string[];
  backup_id: string;
  storage_provider: 'cloudflare_r2' | 'backblaze_b2';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  restored_data_size?: number;
}

export interface BackupIntegrityCheck {
  backup_id: string;
  backup_type: 'tenant' | 'disaster_recovery';
  check_status: 'pending' | 'in_progress' | 'passed' | 'failed';
  check_date: string;
  file_size_verified: boolean;
  encryption_verified: boolean;
  download_test_passed: boolean;
  error_details?: string;
}

export interface RestoreConfirmationData {
  backup_id: string;
  tenant_ids: string[];
  storage_provider: 'cloudflare_r2' | 'backblaze_b2';
  restore_type: 'individual' | 'multiple' | 'all_tenants' | 'disaster_recovery';
  confirmation_phrase: string;
  rollback_enabled: boolean;
}

export interface BackupFilters {
  tenant_name?: string;
  date_from?: string;
  date_to?: string;
  storage_provider?: 'cloudflare_r2' | 'backblaze_b2' | 'all';
  integrity_status?: 'verified' | 'pending' | 'failed' | 'all';
}

export interface PaginatedBackupsResponse {
  backups: TenantBackup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedDisasterRecoveryResponse {
  backups: DisasterRecoveryBackup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}