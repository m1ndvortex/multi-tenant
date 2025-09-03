import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBackups } from '@/hooks/useBackups';
import { BackupFilters, TenantBackup } from '@/types/backup';
import { formatBytes, formatDate } from '@/lib/utils';
import { 
  HardDriveIcon, 
  CloudIcon, 
  ShieldCheckIcon, 
  AlertTriangleIcon,
  DownloadIcon,

  RefreshCwIcon
} from 'lucide-react';

interface TenantBackupManagementProps {
  onRestoreClick: (backup: TenantBackup) => void;
}

const TenantBackupManagement: React.FC<TenantBackupManagementProps> = ({ onRestoreClick }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<BackupFilters>({});
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [storageProvider, setStorageProvider] = useState<'cloudflare_r2' | 'backblaze_b2'>('cloudflare_r2');

  const { 
    useTenantBackups, 
    useCreateTenantBackup, 
    useVerifyBackupIntegrity 
  } = useBackups();

  const { data: backupsData, isLoading, refetch } = useTenantBackups(page, 10, filters);
  const createBackupMutation = useCreateTenantBackup();
  const verifyIntegrityMutation = useVerifyBackupIntegrity();

  const handleFilterChange = (key: keyof BackupFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleCreateBackup = () => {
    if (selectedTenants.length === 0) return;
    createBackupMutation.mutate({ tenantIds: selectedTenants, storageProvider });
  };

  const handleVerifyIntegrity = (backupId: string) => {
    verifyIntegrityMutation.mutate({ backupId, backupType: 'tenant' });
  };

  const getStorageProviderIcon = (provider: string) => {
    return provider === 'cloudflare_r2' ? (
      <CloudIcon className="w-4 h-4 text-orange-500" />
    ) : (
      <HardDriveIcon className="w-4 h-4 text-blue-500" />
    );
  };

  const getIntegrityBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">تایید شده</Badge>;
      case 'pending':
        return <Badge variant="secondary">در انتظار</Badge>;
      case 'failed':
        return <Badge variant="destructive">ناموفق</Badge>;
      default:
        return <Badge variant="secondary">نامشخص</Badge>;
    }
  };

  return (
    <Card variant="professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <HardDriveIcon className="w-4 h-4 text-white" />
            </div>
            مدیریت پشتیبان‌گیری تنانت‌ها
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCwIcon className="w-4 h-4 ml-2" />
              بروزرسانی
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="gradient-blue" size="sm">
                  <CloudIcon className="w-4 h-4 ml-2" />
                  پشتیبان‌گیری جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>ایجاد پشتیبان جدید</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">ارائه‌دهنده ذخیره‌سازی</label>
                    <Select value={storageProvider} onValueChange={(value: any) => setStorageProvider(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cloudflare_r2">Cloudflare R2</SelectItem>
                        <SelectItem value="backblaze_b2">Backblaze B2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">تنانت‌های انتخابی</label>
                    <Input
                      placeholder="شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)"
                      value={selectedTenants.join(', ')}
                      onChange={(e) => setSelectedTenants(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                  </div>
                  <Button
                    variant="gradient-blue"
                    className="w-full"
                    onClick={handleCreateBackup}
                    disabled={createBackupMutation.isPending || selectedTenants.length === 0}
                  >
                    {createBackupMutation.isPending ? 'در حال ایجاد...' : 'ایجاد پشتیبان'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <Card variant="filter" className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">نام تنانت</label>
                <Input
                  placeholder="جستجو در نام تنانت..."
                  value={filters.tenant_name || ''}
                  onChange={(e) => handleFilterChange('tenant_name', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">از تاریخ</label>
                <Input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">تا تاریخ</label>
                <Input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">ارائه‌دهنده</label>
                <Select value={filters.storage_provider || 'all'} onValueChange={(value) => handleFilterChange('storage_provider', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="cloudflare_r2">Cloudflare R2</SelectItem>
                    <SelectItem value="backblaze_b2">Backblaze B2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backups Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                <TableHead>تنانت</TableHead>
                <TableHead>تاریخ پشتیبان</TableHead>
                <TableHead>حجم فایل</TableHead>
                <TableHead>ارائه‌دهنده</TableHead>
                <TableHead>وضعیت یکپارچگی</TableHead>
                <TableHead>رمزنگاری</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <RefreshCwIcon className="w-4 h-4 animate-spin ml-2" />
                      در حال بارگذاری...
                    </div>
                  </TableCell>
                </TableRow>
              ) : backupsData?.backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    هیچ پشتیبانی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                backupsData?.backups.map((backup) => (
                  <TableRow key={backup.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{backup.tenant_name}</TableCell>
                    <TableCell>{formatDate(backup.backup_date)}</TableCell>
                    <TableCell>{formatBytes(backup.file_size)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStorageProviderIcon(backup.storage_provider)}
                        <span className="text-sm">
                          {backup.storage_provider === 'cloudflare_r2' ? 'Cloudflare R2' : 'Backblaze B2'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getIntegrityBadge(backup.integrity_status)}</TableCell>
                    <TableCell>
                      {backup.encryption_status === 'encrypted' ? (
                        <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangleIcon className="w-4 h-4 text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRestoreClick(backup)}
                        >
                          <DownloadIcon className="w-3 h-3 ml-1" />
                          بازیابی
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyIntegrity(backup.id)}
                          disabled={verifyIntegrityMutation.isPending}
                        >
                          <ShieldCheckIcon className="w-3 h-3 ml-1" />
                          بررسی
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {backupsData && backupsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-slate-600">
              نمایش {((page - 1) * 10) + 1} تا {Math.min(page * 10, backupsData.pagination.total)} از {backupsData.pagination.total} مورد
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                قبلی
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(backupsData.pagination.totalPages, p + 1))}
                disabled={page === backupsData.pagination.totalPages}
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantBackupManagement;