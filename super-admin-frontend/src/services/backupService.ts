import {
  StorageUsage,
  RestoreOperation,
  BackupIntegrityCheck,
  RestoreConfirmationData,
  BackupFilters,
  PaginatedBackupsResponse,
  PaginatedDisasterRecoveryResponse,
} from '@/types/backup';
import { apiClient } from './apiClient';

class BackupService {
  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    try {
      const { method = 'GET', body } = options;
      
      let response: any;
      if (method === 'GET') {
        response = await apiClient.get(endpoint);
      } else if (method === 'POST') {
        response = await apiClient.post(endpoint, body);
      } else if (method === 'PUT') {
        response = await apiClient.put(endpoint, body);
      } else if (method === 'DELETE') {
        response = await apiClient.delete(endpoint);
      } else {
        throw new Error(`Unsupported method: ${method}`);
      }

      return response.data as T;
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        throw new Error(error.response.data?.message || error.response.data?.detail || `HTTP error! status: ${error.response.status}`);
      }
      
      // Handle network errors
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - please try again');
      }
      if (!navigator.onLine) {
        throw new Error('No internet connection - please check your network');
      }
      
      throw error;
    }
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
      body: {
        tenant_ids: tenantIds,
        storage_provider: storageProvider,
      },
    });
  }

  async restoreTenantBackup(data: RestoreConfirmationData): Promise<RestoreOperation> {
    return this.request<RestoreOperation>('/api/super-admin/backups/tenants/restore', {
      method: 'POST',
      body: data,
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
      body: {
        backup_id: backupId,
        storage_provider: storageProvider,
        confirmation_phrase: confirmationPhrase,
      },
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
      body: {
        backup_id: backupId,
        backup_type: backupType,
      },
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