import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { settingsService, SystemPreferences } from '@/services/settingsService';
import { 
  Settings, 
  Loader2, 
  Save,
  Clock,
  Mail,
  MessageSquare,
  FileText,
  Package,
  AlertTriangle
} from 'lucide-react';

const SystemPreferencesComponent: React.FC = () => {
  const [preferences, setPreferences] = useState<SystemPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await settingsService.getSystemPreferences();
      setPreferences(data);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری تنظیمات سیستم',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const updatedPreferences = await settingsService.updateSystemPreferences(preferences);
      setPreferences(updatedPreferences);
      toast({
        title: 'موفقیت',
        description: 'تنظیمات سیستم با موفقیت ذخیره شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیره تنظیمات سیستم',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof SystemPreferences>(
    field: K,
    value: SystemPreferences[K]
  ) => {
    if (preferences) {
      setPreferences({ ...preferences, [field]: value });
    }
  };

  if (loading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            خطا در بارگذاری تنظیمات سیستم
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backup Settings */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>تنظیمات پشتیبان‌گیری</CardTitle>
              <p className="text-sm text-gray-600 mt-1">پیکربندی پشتیبان‌گیری خودکار</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>پشتیبان‌گیری خودکار</Label>
              <p className="text-sm text-gray-600">
                فعال‌سازی پشتیبان‌گیری روزانه خودکار
              </p>
            </div>
            <Switch
              checked={preferences.autoBackup}
              onCheckedChange={(checked) => updateField('autoBackup', checked)}
            />
          </div>

          {preferences.autoBackup && (
            <div className="space-y-2">
              <Label htmlFor="backup-time">زمان پشتیبان‌گیری</Label>
              <Input
                id="backup-time"
                type="time"
                value={preferences.backupTime}
                onChange={(e) => updateField('backupTime', e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-gray-500">
                زمان روزانه برای انجام پشتیبان‌گیری خودکار
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>تنظیمات اعلان‌ها</CardTitle>
              <p className="text-sm text-gray-600 mt-1">پیکربندی اعلان‌های خودکار</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label>اعلان‌های ایمیل</Label>
              </div>
              <p className="text-sm text-gray-600">
                ارسال اعلان‌ها از طریق ایمیل
              </p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => updateField('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <Label>اعلان‌های پیامکی</Label>
              </div>
              <p className="text-sm text-gray-600">
                ارسال اعلان‌ها از طریق پیامک
              </p>
            </div>
            <Switch
              checked={preferences.smsNotifications}
              onCheckedChange={(checked) => updateField('smsNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>تنظیمات فاکتور</CardTitle>
              <p className="text-sm text-gray-600 mt-1">پیکربندی شماره‌گذاری و شرایط پرداخت</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-prefix">پیشوند شماره فاکتور</Label>
              <Input
                id="invoice-prefix"
                value={preferences.invoiceNumberPrefix}
                onChange={(e) => updateField('invoiceNumberPrefix', e.target.value)}
                placeholder="مثال: INV"
                dir="ltr"
              />
              <p className="text-xs text-gray-500">
                پیشوند برای شماره‌گذاری فاکتورها
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-start">شماره شروع فاکتور</Label>
              <Input
                id="invoice-start"
                type="number"
                value={preferences.invoiceNumberStart}
                onChange={(e) => updateField('invoiceNumberStart', Number(e.target.value))}
                placeholder="1000"
                dir="ltr"
              />
              <p className="text-xs text-gray-500">
                شماره شروع برای فاکتورهای جدید
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-terms">مهلت پرداخت پیش‌فرض (روز)</Label>
            <Select
              value={preferences.defaultPaymentTerms.toString()}
              onValueChange={(value) => updateField('defaultPaymentTerms', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">نقدی</SelectItem>
                <SelectItem value="7">7 روز</SelectItem>
                <SelectItem value="15">15 روز</SelectItem>
                <SelectItem value="30">30 روز</SelectItem>
                <SelectItem value="45">45 روز</SelectItem>
                <SelectItem value="60">60 روز</SelectItem>
                <SelectItem value="90">90 روز</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              مهلت پرداخت پیش‌فرض برای فاکتورهای جدید
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>تنظیمات انبار</CardTitle>
              <p className="text-sm text-gray-600 mt-1">پیکربندی مدیریت موجودی</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="low-stock-threshold">آستانه کمبود موجودی</Label>
            <Input
              id="low-stock-threshold"
              type="number"
              value={preferences.lowStockThreshold}
              onChange={(e) => updateField('lowStockThreshold', Number(e.target.value))}
              placeholder="10"
              dir="ltr"
            />
            <p className="text-xs text-gray-500">
              حداقل موجودی برای نمایش هشدار کمبود کالا
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-700">
              هنگامی که موجودی کالایی کمتر از این مقدار باشد، هشدار نمایش داده می‌شود
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="gradient-green"
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              در حال ذخیره...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 ml-2" />
              ذخیره تمام تنظیمات
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SystemPreferencesComponent;