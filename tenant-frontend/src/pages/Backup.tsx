/**
 * Backup Page Component
 * Main page for customer self-backup and data export functionality
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomerBackupInterface from '@/components/backup/CustomerBackupInterface';
import DataExportInterface from '@/components/backup/DataExportInterface';
import BackupHistoryDisplay from '@/components/backup/BackupHistoryDisplay';
import { Database, FileText, History } from 'lucide-react';

const Backup: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-green-50 via-teal-50 to-blue-50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">پشتیبان‌گیری و خروجی داده‌ها</h1>
            <p className="text-gray-600">مدیریت پشتیبان‌گیری و تولید خروجی از اطلاعات کسب‌وکار</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="backup" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-green-50 via-teal-50 to-blue-50 p-1 rounded-lg">
          <TabsTrigger 
            value="backup" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md"
          >
            <Database className="h-4 w-4" />
            پشتیبان‌گیری
          </TabsTrigger>
          <TabsTrigger 
            value="export" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md"
          >
            <FileText className="h-4 w-4" />
            خروجی داده‌ها
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md"
          >
            <History className="h-4 w-4" />
            تاریخچه
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-6">
          <CustomerBackupInterface />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <DataExportInterface />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <BackupHistoryDisplay />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Backup;