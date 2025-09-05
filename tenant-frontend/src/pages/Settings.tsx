import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, FileText, Settings as SettingsIcon, User, Bell, Shield } from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const settingsCategories = [
    {
      title: 'پشتیبان‌گیری و خروجی داده‌ها',
      description: 'مدیریت پشتیبان‌گیری روزانه و تولید خروجی از اطلاعات',
      icon: Database,
      action: () => navigate('/backup'),
      variant: 'gradient-green' as const,
    },
    {
      title: 'مدیریت کاربران',
      description: 'افزودن، ویرایش و مدیریت دسترسی کاربران',
      icon: User,
      action: () => {}, // TODO: Implement user management
      variant: 'gradient-blue' as const,
      disabled: true,
    },
    {
      title: 'تنظیمات اعلان‌ها',
      description: 'پیکربندی ایمیل، پیامک و سایر اعلان‌ها',
      icon: Bell,
      action: () => navigate('/notifications'),
      variant: 'gradient-purple' as const,
    },
    {
      title: 'امنیت و حریم خصوصی',
      description: 'تنظیمات امنیتی و مدیریت حریم خصوصی',
      icon: Shield,
      action: () => {}, // TODO: Implement security settings
      variant: 'gradient-blue' as const,
      disabled: true,
    },
  ];

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

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <Card key={index} variant={category.variant} className="h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-6 w-6 text-gray-700" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                    <Button
                      variant={category.variant}
                      onClick={category.action}
                      disabled={category.disabled}
                      className="w-full"
                    >
                      {category.disabled ? 'به زودی...' : 'مدیریت'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Settings */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle>تنظیمات عمومی</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="font-medium">زبان سیستم</h4>
                <p className="text-sm text-gray-600">انتخاب زبان رابط کاربری</p>
              </div>
              <Button variant="outline" disabled>
                فارسی
              </Button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="font-medium">واحد پول</h4>
                <p className="text-sm text-gray-600">واحد پولی پیش‌فرض سیستم</p>
              </div>
              <Button variant="outline" disabled>
                ریال
              </Button>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div>
                <h4 className="font-medium">تقویم</h4>
                <p className="text-sm text-gray-600">نوع تقویم مورد استفاده</p>
              </div>
              <Button variant="outline" disabled>
                شمسی
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;