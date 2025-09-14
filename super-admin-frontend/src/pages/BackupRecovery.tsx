import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TenantBackupManagement from '@/components/TenantBackupManagement';
import DisasterRecoveryManagement from '@/components/DisasterRecoveryManagement';
import StorageUsageAnalytics from '@/components/StorageUsageAnalytics';
import RestoreConfirmationDialog from '@/components/RestoreConfirmationDialog';
import RestoreOperationsMonitor from '@/components/RestoreOperationsMonitor';
import AdvancedBackupMonitoring from '@/pages/AdvancedBackupMonitoring';
import { TenantBackup, DisasterRecoveryBackup } from '@/types/backup';

import { 
  HardDriveIcon, 
  ServerIcon, 
  BarChart3Icon, 
  ActivityIcon,
  ShieldIcon,
  MonitorIcon
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
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="glass-card-crypto border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <motion.div 
                className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center border border-orange-400/30"
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(249, 115, 22, 0.3)',
                    '0 0 30px rgba(249, 115, 22, 0.5)',
                    '0 0 20px rgba(249, 115, 22, 0.3)'
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                whileHover={{ scale: 1.05 }}
              >
                <ShieldIcon className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <motion.h1 
                  className="text-2xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  مدیریت پشتیبان‌گیری و بازیابی
                </motion.h1>
                <motion.p 
                  className="text-sm text-slate-300 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  مدیریت کامل پشتیبان‌گیری تنانت‌ها، بازیابی فاجعه و نظارت بر عملیات
                </motion.p>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs defaultValue="tenant-backups" className="space-y-6">
          <Card className="glass-card-crypto border-slate-500/30">
            <CardContent className="p-6">
              <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-600/30">
                <TabsTrigger 
                  value="tenant-backups" 
                  className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-blue-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25"
                >
                  <HardDriveIcon className="w-4 h-4" />
                  پشتیبان تنانت‌ها
                </TabsTrigger>
                <TabsTrigger 
                  value="disaster-recovery"
                  className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-purple-600/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-purple-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25"
                >
                  <ServerIcon className="w-4 h-4" />
                  بازیابی فاجعه
                </TabsTrigger>
                <TabsTrigger 
                  value="storage-analytics"
                  className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/20 data-[state=active]:to-green-600/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-green-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25"
                >
                  <BarChart3Icon className="w-4 h-4" />
                  آمار ذخیره‌سازی
                </TabsTrigger>
                <TabsTrigger 
                  value="operations-monitor"
                  className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-600/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-orange-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25"
                >
                  <ActivityIcon className="w-4 h-4" />
                  نظارت عملیات
                </TabsTrigger>
                <TabsTrigger 
                  value="advanced-monitoring"
                  className="flex items-center gap-2 text-slate-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500/20 data-[state=active]:to-indigo-600/20 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-indigo-400/50 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25"
                >
                  <MonitorIcon className="w-4 h-4" />
                  نظارت پیشرفته
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          {/* Tenant Backups Tab */}
          <TabsContent value="tenant-backups" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <TenantBackupManagement onRestoreClick={handleTenantRestoreClick} />
            </motion.div>
          </TabsContent>

          {/* Disaster Recovery Tab */}
          <TabsContent value="disaster-recovery" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <DisasterRecoveryManagement onRestoreClick={handleDisasterRecoveryRestoreClick} />
            </motion.div>
          </TabsContent>

          {/* Storage Analytics Tab */}
          <TabsContent value="storage-analytics" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <StorageUsageAnalytics />
            </motion.div>
          </TabsContent>

          {/* Operations Monitor Tab */}
          <TabsContent value="operations-monitor" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <RestoreOperationsMonitor />
            </motion.div>
          </TabsContent>

          {/* Advanced Monitoring Tab */}
          <TabsContent value="advanced-monitoring" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <AdvancedBackupMonitoring />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Restore Confirmation Dialog */}
      <RestoreConfirmationDialog
        isOpen={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        backup={selectedBackup}
        backupType={backupType}
      />
    </motion.div>
  );
};

export default BackupRecovery;