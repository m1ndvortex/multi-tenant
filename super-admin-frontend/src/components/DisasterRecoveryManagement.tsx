import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useBackups } from '@/hooks/useBackups';
import { DisasterRecoveryBackup } from '@/types/backup';
import { formatBytes, formatDate } from '@/lib/utils';
import { 
  ServerIcon, 
  CloudIcon, 
  HardDriveIcon,
  ShieldIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  DownloadIcon
} from 'lucide-react';

interface DisasterRecoveryManagementProps {
  onRestoreClick: (backup: DisasterRecoveryBackup) => void;
}

const DisasterRecoveryManagement: React.FC<DisasterRecoveryManagementProps> = ({ onRestoreClick }) => {
  const [page, setPage] = useState(1);


  const { 
    useDisasterRecoveryBackups, 
    useCreateDisasterRecoveryBackup,
    useVerifyBackupIntegrity 
  } = useBackups();

  const { data: backupsData, isLoading, refetch } = useDisasterRecoveryBackups(page, 10);
  const createBackupMutation = useCreateDisasterRecoveryBackup();
  const verifyIntegrityMutation = useVerifyBackupIntegrity();

  const handleCreateBackup = () => {
    createBackupMutation.mutate();
  };

  const handleVerifyIntegrity = (backupId: string) => {
    verifyIntegrityMutation.mutate({ backupId, backupType: 'disaster_recovery' });
  };

  const getStorageStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="default" className="bg-green-100 text-green-800">آپلود شده</Badge>;
      case 'pending':
        return <Badge variant="secondary">در انتظار</Badge>;
      case 'failed':
        return <Badge variant="destructive">ناموفق</Badge>;
      default:
        return <Badge variant="secondary">نامشخص</Badge>;
    }
  };

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case 'full_platform':
        return <ServerIcon className="w-4 h-4 text-purple-500" />;
      case 'database_only':
        return <HardDriveIcon className="w-4 h-4 text-blue-500" />;
      case 'configuration':
        return <ShieldIcon className="w-4 h-4 text-green-500" />;
      default:
        return <ServerIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getBackupTypeLabel = (type: string) => {
    switch (type) {
      case 'full_platform':
        return 'پلتفرم کامل';
      case 'database_only':
        return 'فقط پایگاه داده';
      case 'configuration':
        return 'تنظیمات';
      default:
        return 'نامشخص';
    }
  };

  return (
    <Card variant="professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <ServerIcon className="w-4 h-4 text-white" />
            </div>
            مدیریت بازیابی فاجعه
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
            <Button
              variant="gradient-purple"
              size="sm"
              onClick={handleCreateBackup}
              disabled={createBackupMutation.isPending}
            >
              <ServerIcon className="w-4 h-4 ml-2" />
              {createBackupMutation.isPending ? 'در حال ایجاد...' : 'پشتیبان کامل جدید'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card variant="gradient-blue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Cloudflare R2</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {backupsData?.backups.filter(b => b.cloudflare_r2_status === 'uploaded').length || 0}
                  </p>
                  <p className="text-xs text-blue-600">پشتیبان موفق</p>
                </div>
                <CloudIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient-green">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Backblaze B2</p>
                  <p className="text-2xl font-bold text-green-900">
                    {backupsData?.backups.filter(b => b.backblaze_b2_status === 'uploaded').length || 0}
                  </p>
                  <p className="text-xs text-green-600">پشتیبان موفق</p>
                </div>
                <HardDriveIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient-purple">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">کل حجم</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatBytes(backupsData?.backups.reduce((sum, b) => sum + b.file_size, 0) || 0)}
                  </p>
                  <p className="text-xs text-purple-600">فضای استفاده شده</p>
                </div>
                <ServerIcon className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backups Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                <TableHead>نوع پشتیبان</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>حجم فایل</TableHead>
                <TableHead>Cloudflare R2</TableHead>
                <TableHead>Backblaze B2</TableHead>
                <TableHead>وضعیت یکپارچگی</TableHead>
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
                    هیچ پشتیبان فاجعه‌ای یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                backupsData?.backups.map((backup) => (
                  <TableRow key={backup.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getBackupTypeIcon(backup.backup_type)}
                        <span className="font-medium">{getBackupTypeLabel(backup.backup_type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(backup.backup_date)}</TableCell>
                    <TableCell>{formatBytes(backup.file_size)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {backup.cloudflare_r2_status === 'uploaded' ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : backup.cloudflare_r2_status === 'failed' ? (
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                        ) : (
                          <AlertTriangleIcon className="w-4 h-4 text-yellow-500" />
                        )}
                        {getStorageStatusBadge(backup.cloudflare_r2_status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {backup.backblaze_b2_status === 'uploaded' ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : backup.backblaze_b2_status === 'failed' ? (
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                        ) : (
                          <AlertTriangleIcon className="w-4 h-4 text-yellow-500" />
                        )}
                        {getStorageStatusBadge(backup.backblaze_b2_status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {backup.integrity_status === 'verified' ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">تایید شده</Badge>
                      ) : backup.integrity_status === 'pending' ? (
                        <Badge variant="secondary">در انتظار</Badge>
                      ) : (
                        <Badge variant="destructive">ناموفق</Badge>
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
                          <ShieldIcon className="w-3 h-3 ml-1" />
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

export default DisasterRecoveryManagement;