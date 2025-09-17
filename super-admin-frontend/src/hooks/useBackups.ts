import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupService } from '@/services/backupService';
import { BackupFilters, RestoreConfirmationData } from '@/types/backup';
import { useToast } from '@/hooks/use-toast';

export const useBackups = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Tenant Backups
  const useTenantBackups = (page: number = 1, limit: number = 10, filters: BackupFilters = {}) => {
    return useQuery({
      queryKey: ['tenant-backups', page, limit, filters],
      queryFn: () => backupService.getTenantBackups(page, limit, filters),
      staleTime: 30000, // 30 seconds
    });
  };

  const useCreateTenantBackup = () => {
    return useMutation({
      mutationFn: ({ tenantIds, storageProvider }: { tenantIds: string[]; storageProvider: 'cloudflare_r2' | 'backblaze_b2' }) =>
        backupService.createTenantBackup(tenantIds, storageProvider),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tenant-backups'] });
        toast({
          title: 'پشتیبان‌گیری آغاز شد',
          description: 'فرآیند پشتیبان‌گیری از تنانت‌های انتخابی شروع شده است.',
        });
      },
      onError: () => {
        toast({
          title: 'خطا در پشتیبان‌گیری',
          description: 'امکان شروع فرآیند پشتیبان‌گیری وجود ندارد.',
          variant: 'destructive',
        });
      },
    });
  };

  const useRestoreTenantBackup = () => {
    return useMutation({
      mutationFn: (data: RestoreConfirmationData) => backupService.restoreTenantBackup(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restore-operations'] });
        toast({
          title: 'بازیابی آغاز شد',
          description: 'فرآیند بازیابی داده‌ها شروع شده است.',
        });
      },
      onError: () => {
        toast({
          title: 'خطا در بازیابی',
          description: 'امکان شروع فرآیند بازیابی وجود ندارد.',
          variant: 'destructive',
        });
      },
    });
  };

  const useRestoreDisasterRecovery = () => {
    return useMutation({
      mutationFn: ({ backupId, storageProvider, confirmationPhrase, createRollback }: { 
        backupId: string; 
        storageProvider: 'cloudflare_r2' | 'backblaze_b2'; 
        confirmationPhrase: string;
        createRollback?: boolean;
      }) =>
        backupService.restoreDisasterRecoveryBackup(backupId, storageProvider, confirmationPhrase, createRollback),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restore-operations'] });
        queryClient.invalidateQueries({ queryKey: ['rollback-points'] });
        toast({
          title: 'بازیابی فاجعه آغاز شد',
          description: 'فرآیند بازیابی کامل پلتفرم شروع شد.',
        });
      },
      onError: (err: any) => {
        toast({
          title: 'خطا در بازیابی فاجعه',
          description: err?.message || 'امکان شروع فرآیند بازیابی فاجعه وجود ندارد.',
          variant: 'destructive',
        });
      },
    });
  };

  // Rollback Points
  const useListRollbackPoints = () => {
    return useQuery({
      queryKey: ['rollback-points'],
      queryFn: () => backupService.listRollbackPoints(),
      staleTime: 30000,
    });
  };

  const useRollbackToPoint = () => {
    return useMutation({
      mutationFn: ({ rollbackId, storageProvider }: { rollbackId: string; storageProvider: 'cloudflare_r2' | 'backblaze_b2' }) =>
        backupService.rollbackToPoint(rollbackId, storageProvider),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restore-operations'] });
        queryClient.invalidateQueries({ queryKey: ['rollback-points'] });
        toast({
          title: 'بازگشت آغاز شد',
          description: 'فرآیند بازگشت به نقطه قبلی شروع شد.',
        });
      },
      onError: (err: any) => {
        toast({
          title: 'خطا در بازگشت',
          description: err?.message || 'امکان بازگشت به نقطه قبلی وجود ندارد.',
          variant: 'destructive',
        });
      },
    });
  };

  // Disaster Recovery Backups
  const useDisasterRecoveryBackups = (page: number = 1, limit: number = 10) => {
    return useQuery({
      queryKey: ['disaster-recovery-backups', page, limit],
      queryFn: () => backupService.getDisasterRecoveryBackups(page, limit),
      staleTime: 30000,
    });
  };

  const useCreateDisasterRecoveryBackup = () => {
    return useMutation({
      mutationFn: () => backupService.createDisasterRecoveryBackup(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['disaster-recovery-backups'] });
        toast({
          title: 'پشتیبان‌گیری کامل آغاز شد',
          description: 'فرآیند پشتیبان‌گیری کامل پلتفرم شروع شده است.',
        });
      },
      onError: () => {
        toast({
          title: 'خطا در پشتیبان‌گیری کامل',
          description: 'امکان شروع فرآیند پشتیبان‌گیری کامل وجود ندارد.',
          variant: 'destructive',
        });
      },
    });
  };

  // Storage Usage
  const useStorageUsage = () => {
    return useQuery({
      queryKey: ['storage-usage'],
      queryFn: () => backupService.getStorageUsage(),
      staleTime: 60000, // 1 minute
    });
  };

  // Integrity Checks
  const useIntegrityChecks = (page: number = 1, limit: number = 10) => {
    return useQuery({
      queryKey: ['integrity-checks', page, limit],
      queryFn: () => backupService.getIntegrityChecks(page, limit),
      staleTime: 30000,
    });
  };

  const useVerifyBackupIntegrity = () => {
    return useMutation({
      mutationFn: ({ backupId, backupType }: { backupId: string; backupType: 'tenant' | 'disaster_recovery' }) =>
        backupService.verifyBackupIntegrity(backupId, backupType),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['integrity-checks'] });
        toast({
          title: 'بررسی یکپارچگی آغاز شد',
          description: 'فرآیند بررسی یکپارچگی فایل پشتیبان شروع شده است.',
        });
      },
      onError: () => {
        toast({
          title: 'خطا در بررسی یکپارچگی',
          description: 'امکان شروع فرآیند بررسی یکپارچگی وجود ندارد.',
          variant: 'destructive',
        });
      },
    });
  };

  // Restore Operations
  const useRestoreOperations = (page: number = 1, limit: number = 10) => {
    return useQuery({
      queryKey: ['restore-operations', page, limit],
      queryFn: () => backupService.getRestoreOperations(page, limit),
      staleTime: 10000, // 10 seconds for real-time updates
    });
  };

  const useCancelRestoreOperation = () => {
    return useMutation({
      mutationFn: (operationId: string) => backupService.cancelRestoreOperation(operationId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restore-operations'] });
        toast({
          title: 'عملیات لغو شد',
          description: 'عملیات بازیابی با موفقیت لغو شد.',
        });
      },
      onError: () => {
        toast({
          title: 'خطا در لغو عملیات',
          description: 'امکان لغو عملیات بازیابی وجود ندارد.',
          variant: 'destructive',
        });
      },
    });
  };

  return {
    useTenantBackups,
    useCreateTenantBackup,
    useRestoreTenantBackup,
    useRestoreDisasterRecovery,
    useDisasterRecoveryBackups,
    useCreateDisasterRecoveryBackup,
    useStorageUsage,
    useIntegrityChecks,
    useVerifyBackupIntegrity,
    useRestoreOperations,
    useCancelRestoreOperation,
    useListRollbackPoints,
    useRollbackToPoint,
  };
};