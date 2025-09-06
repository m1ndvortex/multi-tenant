import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Settings as SettingsIcon, User, Bell, Shield, Building2, Coins, Cog, FileText } from 'lucide-react';
import TenantSettings from '@/components/settings/TenantSettings';
import UserManagement from '@/components/settings/UserManagement';
import GoldPriceManagement from '@/components/settings/GoldPriceManagement';
import SystemPreferences from '@/components/settings/SystemPreferences';
import InvoiceCustomization from '@/components/settings/InvoiceCustomization';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('business');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/80 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
            <SettingsIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تنظیمات</h1>
            <p className="text-gray-600">مدیریت تنظیمات سیستم و حساب کاربری</p>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 via-teal-50 to-blue-50 rounded-xl p-1">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-transparent gap-1">
            <TabsTrigger 
              value="business" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
            >
              <Building2 className="h-4 w-4 ml-2" />
              اطلاعات کسب‌وکار
            </TabsTrigger>
            <TabsTrigger 
              value="users"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
            >
              <User className="h-4 w-4 ml-2" />
              مدیریت کاربران
            </TabsTrigger>
            <TabsTrigger 
              value="invoices"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
            >
              <FileText className="h-4 w-4 ml-2" />
              سفارشی‌سازی فاکتور
            </TabsTrigger>
            <TabsTrigger 
              value="gold"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-yellow-300"
            >
              <Coins className="h-4 w-4 ml-2" />
              قیمت طلا
            </TabsTrigger>
            <TabsTrigger 
              value="preferences"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-indigo-300"
            >
              <Cog className="h-4 w-4 ml-2" />
              تنظیمات سیستم
            </TabsTrigger>
            <TabsTrigger 
              value="external"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-teal-300"
            >
              <Database className="h-4 w-4 ml-2" />
              سایر تنظیمات
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="business" className="space-y-6">
          <TenantSettings />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <InvoiceCustomization />
        </TabsContent>

        <TabsContent value="gold" className="space-y-6">
          <GoldPriceManagement />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <SystemPreferences />
        </TabsContent>

        <TabsContent value="external" className="space-y-6">
          {/* External Settings - Backup and Notifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="gradient-green" className="h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Database className="h-6 w-6 text-gray-700" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">پشتیبان‌گیری و خروجی داده‌ها</h3>
                      <p className="text-sm text-gray-600 mt-1">مدیریت پشتیبان‌گیری روزانه و تولید خروجی از اطلاعات</p>
                    </div>
                    <Button
                      variant="gradient-green"
                      onClick={() => navigate('/backup')}
                      className="w-full"
                    >
                      مدیریت
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="gradient-purple" className="h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-6 w-6 text-gray-700" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">تنظیمات اعلان‌ها</h3>
                      <p className="text-sm text-gray-600 mt-1">پیکربندی ایمیل، پیامک و سایر اعلان‌ها</p>
                    </div>
                    <Button
                      variant="gradient-purple"
                      onClick={() => navigate('/notifications')}
                      className="w-full"
                    >
                      مدیریت
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Settings - Coming Soon */}
          <Card variant="professional">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle>امنیت و حریم خصوصی</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">تنظیمات امنیتی و مدیریت حریم خصوصی</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">به زودی...</p>
                <p className="text-sm">تنظیمات امنیتی در نسخه‌های آینده اضافه خواهد شد</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;