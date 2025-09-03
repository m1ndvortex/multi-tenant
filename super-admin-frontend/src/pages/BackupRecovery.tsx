import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TenantBackupManagement from '@/components/TenantBackupManagement';
import DisasterRecoveryManagement from '@/components/DisasterRecoveryManagement';
import StorageUsageAnalytics from '@/components/StorageUsageAnalytics';
import RestoreConfirmationDialog from '@/components/RestoreConfirmationDialog';
import RestoreOperationsMonitor from '@/components/RestoreOperationsMonitor';
import { TenantBackup, DisasterRecoveryBackup } from '@/types/backup';
import { 
  HardDriveIcon, 
  ServerIcon, 
  BarChart3Icon, 
  ActivityIcon,
  ShieldIcon
} from 'lucide-react';

const BackupRecovery: React.FC = () => {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<TenantBackup | DisasterRecoveryBackup | null>(null);
  const [backupType, setBackupType] = useState<'tenant' | 'disaster_recovery'>('tenant');

  const handleTenantRestoreClick = (backup: TenantBackup) => {
    setSelectedBackup(backup);
    setBackupType('tenant');
    setRestoreDialogOpen(true);
  };

  const handleDisasterRecoveryRestoreClick = (backup: DisasterRecoveryBackup) => {
    setSelectedBackup(backup);
    setBackupType('disaster_recovery');
    setRestoreDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <ShieldIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مدیریت پشتیبان‌گیری و بازیابی</h1>
              <p className="text-sm text-slate-600 mt-1">
                مدیریت کامل پشتیبان‌گیری تنانت‌ها، بازیابی فاجعه و نظارت بر عملیات
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="tenant-backups" className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-6">
            <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-50">
              <TabsTrigger 
                value="tenant-backups" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
              >
                <HardDriveIcon className="w-4 h-4" />
                پشتیبان تنانت‌ها
              </TabsTrigger>
              <TabsTrigger 
                value="disaster-recovery"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
              >
                <ServerIcon className="w-4 h-4" />
                بازیابی فاجعه
              </TabsTrigger>
              <TabsTrigger 
                value="storage-analytics"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
              >
                <BarChart3Icon className="w-4 h-4" />
                آمار ذخیره‌سازی
              </TabsTrigger>
              <TabsTrigger 
                value="operations-monitor"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-orange-300"
              >
                <ActivityIcon className="w-4 h-4" />
                نظارت عملیات
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        {/* Tenant Backups Tab */}
        <TabsContent value="tenant-backups" className="space-y-6">
          <TenantBackupManagement onRestoreClick={handleTenantRestoreClick} />
        </TabsContent>

        {/* Disaster Recovery Tab */}
        <TabsContent value="disaster-recovery" className="space-y-6">
          <DisasterRecoveryManagement onRestoreClick={handleDisasterRecoveryRestoreClick} />
        </TabsContent>

        {/* Storage Analytics Tab */}
        <TabsContent value="storage-analytics" className="space-y-6">
          <StorageUsageAnalytics />
        </TabsContent>

        {/* Operations Monitor Tab */}
        <TabsContent value="operations-monitor" className="space-y-6">
          <RestoreOperationsMonitor />
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <RestoreConfirmationDialog
        isOpen={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        backup={selectedBackup}
        backupType={backupType}
      />
    </div>
  );
};

export default BackupRecovery;