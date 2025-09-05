import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { notificationService, NotificationSettings } from '@/services/notificationService';
import { Settings, Mail, MessageSquare, Bell, Clock } from 'lucide-react';

const NotificationSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [smsTemplates, setSmsTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await notificationService.getNotificationSettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری تنظیمات اعلان‌ها',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const [emailTemplates, smsTemplates] = await Promise.all([
        notificationService.getEmailTemplates(),
        notificationService.getSmsTemplates(),
      ]);
      setEmailTemplates(emailTemplates);
      setSmsTemplates(smsTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const updatedSettings = await notificationService.updateNotificationSettings(settings);
      setSettings(updatedSettings);
      toast({
        title: 'موفقیت',
        description: 'تنظیمات اعلان‌ها با موفقیت ذخیره شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیره تنظیمات',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" data-testid="loading-spinner"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <p className="text-center text-gray-500">خطا در بارگذاری تنظیمات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Notification Settings */}
      <Card variant="gradient-green">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Settings className="h-4 w-4 text-white" />
            </div>
            تنظیمات کلی اعلان‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-600" />
                <Label htmlFor="email-notifications">اعلان‌های ایمیل</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.email_notifications}
                onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <Label htmlFor="sms-notifications">اعلان‌های پیامک</Label>
              </div>
              <Switch
                id="sms-notifications"
                checked={settings.sms_notifications}
                onCheckedChange={(checked) => updateSetting('sms_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-purple-600" />
                <Label htmlFor="invoice-notifications">اعلان فاکتورها</Label>
              </div>
              <Switch
                id="invoice-notifications"
                checked={settings.invoice_notifications}
                onCheckedChange={(checked) => updateSetting('invoice_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <Label htmlFor="payment-reminders">یادآوری پرداخت</Label>
              </div>
              <Switch
                id="payment-reminders"
                checked={settings.payment_reminders}
                onCheckedChange={(checked) => updateSetting('payment_reminders', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card variant="gradient-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
            تنظیمات یادآوری
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reminder-days">روزهای قبل از سررسید</Label>
              <Input
                id="reminder-days"
                type="number"
                min="1"
                max="30"
                value={settings.reminder_days_before}
                onChange={(e) => updateSetting('reminder_days_before', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="overdue-frequency">فاصله یادآوری معوقات (روز)</Label>
              <Input
                id="overdue-frequency"
                type="number"
                min="1"
                max="30"
                value={settings.overdue_reminder_frequency}
                onChange={(e) => updateSetting('overdue_reminder_frequency', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Settings */}
      <Card variant="gradient-purple">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Mail className="h-4 w-4 text-white" />
            </div>
            قالب‌های پیام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email-template">قالب ایمیل پیش‌فرض</Label>
              <Select
                value={settings.email_template_id || ''}
                onValueChange={(value) => updateSetting('email_template_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="انتخاب قالب ایمیل" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sms-template">قالب پیامک پیش‌فرض</Label>
              <Select
                value={settings.sms_template_id || ''}
                onValueChange={(value) => updateSetting('sms_template_id', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="انتخاب قالب پیامک" />
                </SelectTrigger>
                <SelectContent>
                  {smsTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marketing Notifications */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle>اعلان‌های بازاریابی</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketing-notifications">دریافت پیام‌های تبلیغاتی</Label>
              <p className="text-sm text-gray-500 mt-1">
                اجازه ارسال پیام‌های تبلیغاتی و اطلاعیه‌های بازاریابی
              </p>
            </div>
            <Switch
              id="marketing-notifications"
              checked={settings.marketing_notifications}
              onCheckedChange={(checked) => updateSetting('marketing_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="gradient-green"
          size="lg"
        >
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettingsComponent;