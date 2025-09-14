import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { CyberAnimations } from '@/components/animations/CyberAnimations';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card-crypto border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <motion.div 
                className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border border-blue-400/30"
                animate={{ 
                  boxShadow: [
                    '0 0 10px rgba(59, 130, 246, 0.3)',
                    '0 0 20px rgba(59, 130, 246, 0.5)',
                    '0 0 10px rgba(59, 130, 246, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                whileHover={{ scale: 1.05 }}
              >
                <HardDriveIcon className="w-4 h-4 text-white" />
              </motion.div>
              <span className="text-white">مدیریت پشتیبان‌گیری تنانت‌ها</span>
            </CardTitle>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                >
                  <motion.div
                    animate={isLoading ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
                  >
                    <RefreshCwIcon className="w-4 h-4 ml-2" />
                  </motion.div>
                  بروزرسانی
                </Button>
              </motion.div>
              <Dialog>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300" size="sm">
                      <CloudIcon className="w-4 h-4 ml-2" />
                      پشتیبان‌گیری جدید
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-slate-800 border border-slate-600/50">
                  <DialogHeader>
                    <DialogTitle className="text-white">ایجاد پشتیبان جدید</DialogTitle>
                  </DialogHeader>
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div>
                      <label className="text-sm font-medium text-slate-300">ارائه‌دهنده ذخیره‌سازی</label>
                      <Select value={storageProvider} onValueChange={(value: any) => setStorageProvider(value)}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600/50">
                          <SelectItem value="cloudflare_r2" className="text-white hover:bg-slate-700">Cloudflare R2</SelectItem>
                          <SelectItem value="backblaze_b2" className="text-white hover:bg-slate-700">Backblaze B2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">تنانت‌های انتخابی</label>
                      <Input
                        placeholder="شناسه تنانت‌ها را وارد کنید (با کاما جدا کنید)"
                        value={selectedTenants.join(', ')}
                        onChange={(e) => setSelectedTenants(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                      onClick={handleCreateBackup}
                      disabled={createBackupMutation.isPending || selectedTenants.length === 0}
                    >
                      {createBackupMutation.isPending ? 'در حال ایجاد...' : 'ایجاد پشتیبان'}
                    </Button>
                  </motion.div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <Card className="glass-card-crypto border-slate-500/30">
            <CardContent className="p-4">
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
                variants={CyberAnimations.staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.div variants={CyberAnimations.cardVariants}>
                  <label className="text-sm font-medium text-slate-300">نام تنانت</label>
                  <Input
                    placeholder="جستجو در نام تنانت..."
                    value={filters.tenant_name || ''}
                    onChange={(e) => handleFilterChange('tenant_name', e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-500/50"
                  />
                </motion.div>
                <motion.div variants={CyberAnimations.cardVariants}>
                  <label className="text-sm font-medium text-slate-300">از تاریخ</label>
                  <Input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white focus:border-cyan-500/50"
                  />
                </motion.div>
                <motion.div variants={CyberAnimations.cardVariants}>
                  <label className="text-sm font-medium text-slate-300">تا تاریخ</label>
                  <Input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white focus:border-cyan-500/50"
                  />
                </motion.div>
                <motion.div variants={CyberAnimations.cardVariants}>
                  <label className="text-sm font-medium text-slate-300">ارائه‌دهنده</label>
                  <Select value={filters.storage_provider || 'all'} onValueChange={(value) => handleFilterChange('storage_provider', value)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600/50">
                      <SelectItem value="all" className="text-white hover:bg-slate-700">همه</SelectItem>
                      <SelectItem value="cloudflare_r2" className="text-white hover:bg-slate-700">Cloudflare R2</SelectItem>
                      <SelectItem value="backblaze_b2" className="text-white hover:bg-slate-700">Backblaze B2</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Backups Table */}
        <motion.div 
          className="rounded-lg border border-slate-600/30 bg-slate-800/30"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-b border-slate-600/30">
                <TableHead className="text-slate-300">تنانت</TableHead>
                <TableHead className="text-slate-300">تاریخ پشتیبان</TableHead>
                <TableHead className="text-slate-300">حجم فایل</TableHead>
                <TableHead className="text-slate-300">ارائه‌دهنده</TableHead>
                <TableHead className="text-slate-300">وضعیت یکپارچگی</TableHead>
                <TableHead className="text-slate-300">رمزنگاری</TableHead>
                <TableHead className="text-slate-300">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center text-slate-300">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <RefreshCwIcon className="w-4 h-4 ml-2" />
                      </motion.div>
                      در حال بارگذاری...
                    </div>
                  </TableCell>
                </TableRow>
              ) : backupsData?.backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    هیچ پشتیبانی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {backupsData?.backups.map((backup, index) => (
                    <motion.tr 
                      key={backup.id} 
                      className="hover:bg-slate-700/30 border-b border-slate-600/20 transition-colors duration-200"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <TableCell className="font-medium text-white">{backup.tenant_name}</TableCell>
                      <TableCell className="text-slate-300">{formatDate(backup.backup_date)}</TableCell>
                      <TableCell className="text-cyan-400">{formatBytes(backup.file_size)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStorageProviderIcon(backup.storage_provider)}
                          <span className="text-sm text-slate-300">
                            {backup.storage_provider === 'cloudflare_r2' ? 'Cloudflare R2' : 'Backblaze B2'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getIntegrityBadge(backup.integrity_status)}</TableCell>
                      <TableCell>
                        <motion.div
                          animate={backup.encryption_status === 'encrypted' ? {
                            boxShadow: [
                              '0 0 5px rgba(34, 197, 94, 0.3)',
                              '0 0 10px rgba(34, 197, 94, 0.5)',
                              '0 0 5px rgba(34, 197, 94, 0.3)'
                            ]
                          } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {backup.encryption_status === 'encrypted' ? (
                            <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertTriangleIcon className="w-4 h-4 text-yellow-400" />
                          )}
                        </motion.div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRestoreClick(backup)}
                              className="bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-400"
                            >
                              <DownloadIcon className="w-3 h-3 ml-1" />
                              بازیابی
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyIntegrity(backup.id)}
                              disabled={verifyIntegrityMutation.isPending}
                              className="bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400"
                            >
                              <ShieldCheckIcon className="w-3 h-3 ml-1" />
                              بررسی
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </motion.div>

        {/* Pagination */}
        <AnimatePresence>
          {backupsData && backupsData.pagination.totalPages > 1 && (
            <motion.div 
              className="flex items-center justify-between mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-sm text-slate-300">
                نمایش <span className="text-cyan-400">{((page - 1) * 10) + 1}</span> تا <span className="text-cyan-400">{Math.min(page * 10, backupsData.pagination.total)}</span> از <span className="text-cyan-400">{backupsData.pagination.total}</span> مورد
              </div>
              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white disabled:opacity-50"
                  >
                    قبلی
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(backupsData.pagination.totalPages, p + 1))}
                    disabled={page === backupsData.pagination.totalPages}
                    className="bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white disabled:opacity-50"
                  >
                    بعدی
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
    </motion.div>
  );
};

export default TenantBackupManagement;