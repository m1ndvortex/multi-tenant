import {
  StorageUsage,
  RestoreOperation,
  BackupIntegrityCheck,
  RestoreConfirmationData,
  BackupFilters,
  PaginatedBackupsResponse,
  PaginatedDisasterRecoveryResponse,
} from '@/types/backup';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class BackupService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('super_admin_token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Tenant Backup Management
  async getTenantBackups(
    page: number = 1,
    limit: number = 10,
    filters: BackupFilters = {}
  ): Promise<PaginatedBackupsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value && value !== '' && value !== 'all')
      ),
    });

    return this.request<PaginatedBackupsResponse>(`/api/super-admin/backups/tenants?${params}`);
  }

  async createTenantBackup(tenantIds: string[], storageProvider: 'cloudflare_r2' | 'backblaze_b2'): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/api/super-admin/backups/tenants', {
      method: 'POST',
      body: JSON.stringify({
        tenant_ids: tenantIds,
        storage_provider: storageProvider,
      }),
    });
  }

  async restoreTenantBackup(data: RestoreConfirmationData): Promise<RestoreOperation> {
    return this.request<RestoreOperation>('/api/super-admin/backups/tenants/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTenantBackup(backupId: string): Promise<void> {
    return this.request<void>(`/api/super-admin/backups/tenants/${backupId}`, {
      method: 'DELETE',
    });
  }

  // Disaster Recovery Management
  async getDisasterRecoveryBackups(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedDisasterRecoveryResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<PaginatedDisasterRecoveryResponse>(`/api/super-admin/backups/disaster-recovery?${params}`);
  }

  async createDisasterRecoveryBackup(): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/api/super-admin/backups/disaster-recovery', {
      method: 'POST',
    });
  }

  async restoreDisasterRecoveryBackup(
    backupId: string,
    storageProvider: 'cloudflare_r2' | 'backblaze_b2',
    confirmationPhrase: string
  ): Promise<RestoreOperation> {
    return this.request<RestoreOperation>('/api/super-admin/backups/disaster-recovery/restore', {
      method: 'POST',
      body: JSON.stringify({
        backup_id: backupId,
        storage_provider: storageProvider,
        confirmation_phrase: confirmationPhrase,
      }),
    });
  }

  // Storage Usage Analytics
  async getStorageUsage(): Promise<StorageUsage[]> {
    return this.request<StorageUsage[]>('/api/super-admin/backups/storage-usage');
  }

  // Backup Integrity Management
  async verifyBackupIntegrity(backupId: string, backupType: 'tenant' | 'disaster_recovery'): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/api/super-admin/backups/verify-integrity', {
      method: 'POST',
      body: JSON.stringify({
        backup_id: backupId,
        backup_type: backupType,
      }),
    });
  }

  async getIntegrityChecks(
    page: number = 1,
    limit: number = 10
  ): Promise<{ checks: BackupIntegrityCheck[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<{ checks: BackupIntegrityCheck[]; pagination: any }>(`/api/super-admin/backups/integrity-checks?${params}`);
  }

  // Restore Operations Management
  async getRestoreOperations(
    page: number = 1,
    limit: number = 10
  ): Promise<{ operations: RestoreOperation[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.request<{ operations: RestoreOperation[]; pagination: any }>(`/api/super-admin/backups/restore-operations?${params}`);
  }

  async cancelRestoreOperation(operationId: string): Promise<void> {
    return this.request<void>(`/api/super-admin/backups/restore-operations/${operationId}/cancel`, {
      method: 'POST',
    });
  }

  // Real-time status updates
  async getBackupJobStatus(jobId: string): Promise<{ status: string; progress: number; message?: string }> {
    return this.request<{ status: string; progress: number; message?: string }>(`/api/super-admin/backups/jobs/${jobId}/status`);
  }
}

export const backupService = new BackupService();