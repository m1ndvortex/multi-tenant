import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Webhook, BarChart3, FileText, Settings } from 'lucide-react';
import { apiAccessService } from '@/services/apiAccessService';
import ApiKeyManagement from './api-access/ApiKeyManagement';
import WebhookManagement from './api-access/WebhookManagement';
import ApiDocumentation from './api-access/ApiDocumentation';
import UsageAnalytics from './api-access/UsageAnalytics';

const ApiAccessManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('keys');

  // Check if user has Pro subscription (this would come from context in real implementation)
  const hasProAccess = true; // TODO: Get from subscription context

  const { data: usageStats } = useQuery({
    queryKey: ['api-usage-stats'],
    queryFn: () => apiAccessService.getUsageStats(),
    enabled: hasProAccess,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!hasProAccess) {
    return (
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>دسترسی API</CardTitle>
              <p className="text-sm text-gray-600 mt-1">مدیریت کلیدهای API و وب‌هوک‌ها</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Key className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">دسترسی API فقط برای کاربران Pro</h3>
            <p className="text-gray-600 mb-6">
              برای استفاده از قابلیت‌های API، وب‌هوک و مستندات تعاملی، لطفاً اشتراک خود را به Pro ارتقا دهید.
            </p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">قابلیت‌های API در نسخه Pro:</h4>
              <ul className="text-sm text-gray-600 space-y-1 text-right">
                <li>• مدیریت کلیدهای API با سطوح دسترسی مختلف</li>
                <li>• پیکربندی وب‌هوک‌ها برای اعلان‌های خودکار</li>
                <li>• مستندات تعاملی با امکان تست مستقیم</li>
                <li>• آمار و تحلیل استفاده از API</li>
                <li>• محدودیت نرخ بالاتر و پشتیبانی اولویت‌دار</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Usage Overview */}
      <Card variant="gradient-blue">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Key className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <CardTitle className="text-gray-900">مدیریت دسترسی API</CardTitle>
                <p className="text-gray-700 text-sm mt-1">کلیدهای API، وب‌هوک‌ها و مستندات</p>
              </div>
            </div>
            {usageStats && (
              <div className="text-left">
                <div className="text-sm text-gray-700">درخواست‌های امروز</div>
                <div className="text-2xl font-bold text-gray-900">{usageStats.requests_today.toLocaleString('fa-IR')}</div>
                <div className="text-xs text-gray-600">
                  از {usageStats.rate_limit.toLocaleString('fa-IR')} مجاز
                </div>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* API Access Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-1">
          <TabsList className="grid w-full grid-cols-4 bg-transparent gap-1">
            <TabsTrigger 
              value="keys" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
            >
              <Key className="h-4 w-4 ml-2" />
              کلیدهای API
            </TabsTrigger>
            <TabsTrigger 
              value="webhooks"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-indigo-300"
            >
              <Webhook className="h-4 w-4 ml-2" />
              وب‌هوک‌ها
            </TabsTrigger>
            <TabsTrigger 
              value="docs"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
            >
              <FileText className="h-4 w-4 ml-2" />
              مستندات API
            </TabsTrigger>
            <TabsTrigger 
              value="analytics"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
            >
              <BarChart3 className="h-4 w-4 ml-2" />
              آمار استفاده
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="keys" className="space-y-6">
          <ApiKeyManagement />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <WebhookManagement />
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <ApiDocumentation />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <UsageAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApiAccessManagement;