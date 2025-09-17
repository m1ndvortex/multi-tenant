import {
  StorageUsage,
  RestoreOperation,
  BackupIntegrityCheck,
  RestoreConfirmationData,
  BackupFilters,
  PaginatedBackupsResponse,
  PaginatedDisasterRecoveryResponse,
  DisasterRecoveryBackup,
} from '@/types/backup';
import { apiClient } from './apiClient';

class BackupService {
  private async request<T>(endpoint: string, options: { method?: string; body?: any } = {}): Promise<T> {
    try {
      const { method = 'GET', body } = options;
      try { console.log('[BackupService.request] start', { method, endpoint }); } catch {}
      let response: any;
      if (method === 'GET') {
        // apiClient.get/.post/etc already return parsed data (not AxiosResponse)
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

      // response is already the data shape T
      try { console.log('[BackupService.request] done', { endpoint, hasResponse: response !== undefined, typeof: typeof response }); (window as any).__last_req = { endpoint, response }; } catch {}
      return response as T;
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
    // Fetch raw payload and normalize to UI shape
  let raw: any;
  try { console.log('[DR] about to fetch via apiClient.get'); } catch {}
  try {
    raw = await apiClient.get(`/api/super-admin/backups/disaster-recovery?${params}`);
  } catch (e) {
    try { console.error('[DR] apiClient.get failed, will fallback', e); } catch {}
  }
  if (raw === undefined) {
    try {
      console.warn('[DR] raw is undefined after apiClient.get, trying fetch fallback');
      const token = typeof window !== 'undefined' ? localStorage.getItem('super_admin_token') : null;
      const resp = await fetch(`/api/super-admin/backups/disaster-recovery?${params}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
      if (resp.ok) {
        raw = await resp.json();
      } else {
        console.error('[DR] fetch fallback failed', resp.status);
      }
    } catch (e2) {
      try { console.error('[DR] fetch fallback threw', e2); } catch {}
    }
  }
  try { (window as any).__dr_raw = raw; } catch {}
  try { console.log('[DR] raw payload', raw); } catch {}

    const normalize = (b: any): DisasterRecoveryBackup => {
      const locations: Array<{ provider: string; location?: string }> = Array.isArray(b?.storage_locations)
        ? b.storage_locations
        : [];
      const r2 = locations.find((l) => l.provider === 'cloudflare_r2');
      const b2 = locations.find((l) => l.provider === 'backblaze_b2');

      const toProviderStatus = (overall: string | undefined, hasLoc: boolean): 'uploaded' | 'failed' | 'pending' => {
        const s = (overall || '').toLowerCase();
        if (s === 'completed') return hasLoc ? 'uploaded' : 'failed';
        if (s === 'failed' || s === 'error') return 'failed';
        return 'pending';
      };

      return {
        id: String(b?.backup_id || b?.id || ''),
        backup_date: String(b?.completed_at || b?.created_at || new Date().toISOString()),
        backup_type: (b?.backup_type as any) || 'full_platform',
        file_size: Number(b?.compressed_size ?? b?.file_size ?? 0),
        cloudflare_r2_status: toProviderStatus(b?.status, !!r2),
        backblaze_b2_status: toProviderStatus(b?.status, !!b2),
        cloudflare_r2_path: r2?.location,
        backblaze_b2_path: b2?.location,
        integrity_status: (b?.integrity_status as any) || 'pending',
        created_at: String(b?.created_at || b?.completed_at || new Date().toISOString()),
      };
    };

    const normalizedBackups: DisasterRecoveryBackup[] = Array.isArray(raw?.backups)
      ? raw.backups.map(normalize)
      : [];
  try { console.log('[DR] normalized backups', { count: normalizedBackups.length, sample: normalizedBackups[0] }); } catch {}

    const pagination = raw?.pagination && typeof raw.pagination === 'object'
      ? {
          page: Number(raw.pagination.page ?? page),
          limit: Number(raw.pagination.limit ?? limit),
          total: Number(raw.pagination.total ?? normalizedBackups.length),
          totalPages: Number(raw.pagination.totalPages ?? 1),
        }
      : {
          page,
          limit,
          total: normalizedBackups.length,
          totalPages: 1,
        };

    const result = {
      backups: normalizedBackups,
      pagination,
    };
    try { console.log('[DR] result to UI', result); (window as any).__dr_result = result; } catch {}
    return result;
  }

  async createDisasterRecoveryBackup(): Promise<{ job_id: string }> {
    return this.request<{ job_id: string }>('/api/super-admin/backups/disaster-recovery/create', {
      method: 'POST',
    });
  }

  async restoreDisasterRecoveryBackup(
    backupId: string,
    storageProvider: 'cloudflare_r2' | 'backblaze_b2',
    confirmationPhrase: string,
    createRollback: boolean = true
  ): Promise<{ task_id: string; message: string }> {
    const params = new URLSearchParams({
      backup_id: backupId,
      storage_provider: storageProvider,
      confirmation_phrase: confirmationPhrase,
      create_rollback: createRollback.toString(),
    });

    return this.request<{ task_id: string; message: string }>(`/api/disaster-recovery/restore?${params}`, {
      method: 'POST',
    });
  }

  async checkRestorePrerequisites(backupId: string): Promise<any> {
    return this.request(`/api/disaster-recovery/restore/prerequisites/${backupId}`, {
      method: 'GET',
    });
  }

  async rollbackToPoint(
    rollbackId: string,
    storageProvider: 'cloudflare_r2' | 'backblaze_b2'
  ): Promise<{ task_id: string; message: string }> {
    return this.request<{ task_id: string; message: string }>('/api/disaster-recovery/rollback', {
      method: 'POST',
      body: {
        rollback_id: rollbackId,
        storage_provider: storageProvider,
      },
    });
  }

  async listRollbackPoints(): Promise<{ rollback_points: any[] }> {
    return this.request<{ rollback_points: any[] }>('/api/disaster-recovery/rollback-points', {
      method: 'GET',
    });
  }

  async getRestoreStatus(taskId: string): Promise<any> {
    return this.request(`/api/disaster-recovery/restore/status/${taskId}`, {
      method: 'GET',
    });
  }

  // Storage Usage Analytics
  async getStorageUsage(): Promise<StorageUsage[]> {
    return this.request<StorageUsage[]>('/api/super-admin/backups/storage-usage');
  }

  // Backup Integrity Management
  async verifyBackupIntegrity(backupId: string, backupType: 'tenant' | 'disaster_recovery'): Promise<{ job_id: string }> {
    const params = new URLSearchParams({
      backup_id: backupId,
      backup_type: backupType,
      storage_provider: 'backblaze_b2'
    });

    return this.request<{ job_id: string }>(`/api/super-admin/backups/verify-integrity?${params}`, {
      method: 'POST',
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