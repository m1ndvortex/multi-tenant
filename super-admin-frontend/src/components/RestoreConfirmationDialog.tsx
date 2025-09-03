import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Checkbox } from '@/components/ui/checkbox';
import { useBackups } from '@/hooks/useBackups';
import { TenantBackup, DisasterRecoveryBackup, RestoreConfirmationData } from '@/types/backup';
import { formatBytes, formatDate } from '@/lib/utils';
import { 
  AlertTriangleIcon, 

  CloudIcon,
  HardDriveIcon,
  ServerIcon,
  CheckCircleIcon
} from 'lucide-react';

interface RestoreConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  backup: TenantBackup | DisasterRecoveryBackup | null;
  backupType: 'tenant' | 'disaster_recovery';
}

const RestoreConfirmationDialog: React.FC<RestoreConfirmationDialogProps> = ({
  isOpen,
  onClose,
  backup,
  backupType
}) => {
  const [storageProvider, setStorageProvider] = useState<'cloudflare_r2' | 'backblaze_b2'>('cloudflare_r2');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [restoreType, setRestoreType] = useState<'individual' | 'multiple' | 'all_tenants' | 'disaster_recovery'>('individual');
  const [rollbackEnabled, setRollbackEnabled] = useState(true);
  const [acknowledgeRisks, setAcknowledgeRisks] = useState(false);

  const { useRestoreTenantBackup } = useBackups();
  const restoreMutation = useRestoreTenantBackup();

  const requiredPhrase = backupType === 'disaster_recovery' ? 'RESTORE PLATFORM' : 'RESTORE DATA';
  const isConfirmationValid = confirmationPhrase === requiredPhrase && acknowledgeRisks;

  const handleRestore = () => {
    if (!backup || !isConfirmationValid) return;

    const restoreData: RestoreConfirmationData = {
      backup_id: backup.id,
      tenant_ids: backupType === 'tenant' ? selectedTenants : [],
      storage_provider: storageProvider,
      restore_type: backupType === 'disaster_recovery' ? 'disaster_recovery' : restoreType,
      confirmation_phrase: confirmationPhrase,
      rollback_enabled: rollbackEnabled,
    };

    restoreMutation.mutate(restoreData, {
      onSuccess: () => {
        onClose();
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setStorageProvider('cloudflare_r2');
    setConfirmationPhrase('');
    setSelectedTenants([]);
    setRestoreType('individual');
    setRollbackEnabled(true);
    setAcknowledgeRisks(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!backup) return null;

  const isTenantBackup = 'tenant_name' in backup;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="w-5 h-5 text-red-500" />
            تأیید بازیابی {backupType === 'disaster_recovery' ? 'فاجعه' : 'داده‌ها'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Critical Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 mb-2">هشدار مهم</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• این عملیات تمام داده‌های فعلی را حذف خواهد کرد</li>
                  <li>• داده‌های بعد از تاریخ پشتیبان از دست خواهد رفت</li>
                  <li>• این عملیات غیرقابل برگشت است (مگر با فعال‌سازی rollback)</li>
                  {backupType === 'disaster_recovery' && (
                    <li>• کل پلتفرم برای مدتی غیرفعال خواهد شد</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Backup Information */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 mb-3">اطلاعات پشتیبان</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">نوع:</span>
                <div className="flex items-center gap-2 mt-1">
                  {backupType === 'disaster_recovery' ? (
                    <ServerIcon className="w-4 h-4 text-purple-500" />
                  ) : (
                    <HardDriveIcon className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="font-medium">
                    {backupType === 'disaster_recovery' ? 'بازیابی فاجعه' : 'پشتیبان تنانت'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-600">تاریخ:</span>
                <div className="font-medium mt-1">{formatDate(backup.backup_date || backup.created_at)}</div>
              </div>
              <div>
                <span className="text-slate-600">حجم:</span>
                <div className="font-medium mt-1">{formatBytes(backup.file_size)}</div>
              </div>
              {isTenantBackup && (
                <div>
                  <span className="text-slate-600">تنانت:</span>
                  <div className="font-medium mt-1">{(backup as TenantBackup).tenant_name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Storage Provider Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              انتخاب ارائه‌دهنده ذخیره‌سازی
            </label>
            <Select value={storageProvider} onValueChange={(value: any) => setStorageProvider(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cloudflare_r2">
                  <div className="flex items-center gap-2">
                    <CloudIcon className="w-4 h-4 text-orange-500" />
                    Cloudflare R2 (اصلی)
                  </div>
                </SelectItem>
                <SelectItem value="backblaze_b2">
                  <div className="flex items-center gap-2">
                    <HardDriveIcon className="w-4 h-4 text-blue-500" />
                    Backblaze B2 (پشتیبان)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Restore Type Selection (for tenant backups) */}
          {backupType === 'tenant' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                نوع بازیابی
              </label>
              <Select value={restoreType} onValueChange={(value: any) => setRestoreType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">بازیابی تک تنانت</SelectItem>
                  <SelectItem value="multiple">بازیابی چند تنانت</SelectItem>
                  <SelectItem value="all_tenants">بازیابی همه تنانت‌ها</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tenant Selection (for multiple tenant restore) */}
          {backupType === 'tenant' && (restoreType === 'multiple' || restoreType === 'individual') && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                انتخاب تنانت‌ها
              </label>
              <Input
                placeholder="شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)"
                value={selectedTenants.join(', ')}
                onChange={(e) => setSelectedTenants(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </div>
          )}

          {/* Rollback Option */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="rollback"
              checked={rollbackEnabled}
              onCheckedChange={(checked) => setRollbackEnabled(checked as boolean)}
            />
            <label htmlFor="rollback" className="text-sm font-medium text-slate-700">
              فعال‌سازی قابلیت rollback (ایجاد نقطه بازگشت قبل از بازیابی)
            </label>
          </div>

          {/* Risk Acknowledgment */}
          <div className="flex items-start space-x-2 space-x-reverse">
            <Checkbox
              id="acknowledge"
              checked={acknowledgeRisks}
              onCheckedChange={(checked) => setAcknowledgeRisks(checked as boolean)}
            />
            <label htmlFor="acknowledge" className="text-sm text-slate-700">
              من خطرات این عملیات را درک کرده‌ام و مسئولیت آن را می‌پذیرم. 
              تأیید می‌کنم که پشتیبان مناسب از داده‌های فعلی تهیه شده است.
            </label>
          </div>

          {/* Confirmation Phrase */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              برای تأیید، عبارت "{requiredPhrase}" را تایپ کنید:
            </label>
            <Input
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder={requiredPhrase}
              className={confirmationPhrase === requiredPhrase ? 'border-green-500' : 'border-red-300'}
            />
            {confirmationPhrase === requiredPhrase && (
              <div className="flex items-center gap-2 mt-2 text-green-600">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="text-sm">عبارت تأیید صحیح است</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              لغو
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={!isConfirmationValid || restoreMutation.isPending}
            >
              {restoreMutation.isPending ? 'در حال بازیابی...' : 'شروع بازیابی'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestoreConfirmationDialog;