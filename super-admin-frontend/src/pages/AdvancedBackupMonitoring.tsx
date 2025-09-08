import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackupMonitoringDashboard from '@/components/BackupMonitoringDashboard';
import StorageProviderAnalytics from '@/components/StorageProviderAnalytics';
import BackupVerificationDashboard from '@/components/BackupVerificationDashboard';
import RetentionPolicyManagement from '@/components/RetentionPolicyManagement';
import BackupAuditTrail from '@/components/BackupAuditTrail';
import { 
  ActivityIcon,
  BarChart3Icon,
  ShieldCheckIcon,
  CalendarIcon,
  FileTextIcon,
  MonitorIcon
} from 'lucide-react';

const AdvancedBackupMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState('monitoring');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <MonitorIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">نظارت پیشرفته پشتیبان‌گیری</h1>
              <p className="text-sm text-slate-600 mt-1">
                داشبورد جامع نظارت، تحلیل و مدیریت سیستم پشتیبان‌گیری
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-6">
            <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-50">
              <TabsTrigger 
                value="monitoring" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
              >
                <ActivityIcon className="w-4 h-4" />
                نظارت لحظه‌ای
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
              >
                <BarChart3Icon className="w-4 h-4" />
                آمار ذخیره‌سازی
              </TabsTrigger>
              <TabsTrigger 
                value="verification"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
              >
                <ShieldCheckIcon className="w-4 h-4" />
                تأیید یکپارچگی
              </TabsTrigger>
              <TabsTrigger 
                value="retention"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-indigo-300"
              >
                <CalendarIcon className="w-4 h-4" />
                سیاست‌های نگهداری
              </TabsTrigger>
              <TabsTrigger 
                value="audit"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-slate-300"
              >
                <FileTextIcon className="w-4 h-4" />
                گزارش حسابرسی
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        {/* Real-time Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <BackupMonitoringDashboard refreshInterval={30000} />
        </TabsContent>

        {/* Storage Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <StorageProviderAnalytics />
        </TabsContent>

        {/* Backup Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <BackupVerificationDashboard refreshInterval={60000} />
        </TabsContent>

        {/* Retention Policy Management Tab */}
        <TabsContent value="retention" className="space-y-6">
          <RetentionPolicyManagement />
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-6">
          <BackupAuditTrail />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedBackupMonitoring;