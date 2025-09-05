import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { settingsService, TenantSettings } from '@/services/settingsService';
import { Building2, Upload, Loader2 } from 'lucide-react';

const TenantSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getTenantSettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری تنظیمات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const updatedSettings = await settingsService.updateTenantSettings(settings);
      setSettings(updatedSettings);
      toast({
        title: 'موفقیت',
        description: 'تنظیمات با موفقیت ذخیره شد',
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'خطا',
        description: 'لطفاً یک فایل تصویری انتخاب کنید',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'خطا',
        description: 'حجم فایل نباید بیشتر از 2 مگابایت باشد',
        variant: 'destructive',
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const result = await settingsService.uploadLogo(file);
      if (settings) {
        setSettings({ ...settings, logo: result.logoUrl });
      }
      toast({
        title: 'موفقیت',
        description: 'لوگو با موفقیت آپلود شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در آپلود لوگو',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateField = (field: keyof TenantSettings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
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

  if (!settings) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            خطا در بارگذاری تنظیمات
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>اطلاعات کسب‌وکار</CardTitle>
            <p className="text-sm text-gray-600 mt-1">مدیریت اطلاعات عمومی کسب‌وکار</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>لوگو</Label>
          <div className="flex items-center gap-4">
            {settings.logo && (
              <div className="w-16 h-16 rounded-lg border-2 border-gray-200 overflow-hidden">
                <img
                  src={settings.logo}
                  alt="لوگو"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
                disabled={uploadingLogo}
              />
              <label htmlFor="logo-upload">
                <Button
                  variant="outline"
                  disabled={uploadingLogo}
                  className="cursor-pointer"
                  asChild
                >
                  <span>
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Upload className="h-4 w-4 ml-2" />
                    )}
                    {uploadingLogo ? 'در حال آپلود...' : 'انتخاب لوگو'}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                حداکثر 2 مگابایت، فرمت‌های JPG، PNG
              </p>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">نام کسب‌وکار *</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="نام کسب‌وکار را وارد کنید"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessType">نوع کسب‌وکار</Label>
            <Select
              value={settings.businessType}
              onValueChange={(value) => updateField('businessType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="نوع کسب‌وکار را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">خرده‌فروشی</SelectItem>
                <SelectItem value="wholesale">عمده‌فروشی</SelectItem>
                <SelectItem value="gold">طلا و جواهر</SelectItem>
                <SelectItem value="service">خدماتی</SelectItem>
                <SelectItem value="manufacturing">تولیدی</SelectItem>
                <SelectItem value="other">سایر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">تلفن</Label>
            <Input
              id="phone"
              value={settings.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="شماره تلفن"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="آدرس ایمیل"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">شناسه مالیاتی</Label>
            <Input
              id="taxId"
              value={settings.taxId}
              onChange={(e) => updateField('taxId', e.target.value)}
              placeholder="شناسه مالیاتی"
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">آدرس</Label>
          <Textarea
            id="address"
            value={settings.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="آدرس کامل کسب‌وکار"
            rows={3}
          />
        </div>

        {/* Regional Settings */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">تنظیمات منطقه‌ای</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">واحد پول</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => updateField('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IRR">ریال ایران (IRR)</SelectItem>
                  <SelectItem value="IRT">تومان ایران (IRT)</SelectItem>
                  <SelectItem value="USD">دلار آمریکا (USD)</SelectItem>
                  <SelectItem value="EUR">یورو (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">زبان</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => updateField('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fa">فارسی</SelectItem>
                  <SelectItem value="en">انگلیسی</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">منطقه زمانی</Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateField('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Tehran">تهران (UTC+3:30)</SelectItem>
                  <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">فرمت تاریخ</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) => updateField('dateFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jalali">شمسی (۱۴۰۳/۰۱/۰۱)</SelectItem>
                  <SelectItem value="gregorian">میلادی (2024/03/21)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            variant="gradient-blue"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                در حال ذخیره...
              </>
            ) : (
              'ذخیره تغییرات'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantSettingsComponent;