import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  invoiceCustomizationService, 
  InvoiceBranding, 
  CreateInvoiceBranding 
} from '@/services/invoiceCustomizationService';
import { 
  Palette, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Loader2,
  Image as ImageIcon,
  Type,
  Building2,
  Eye
} from 'lucide-react';

const BrandingCustomization: React.FC = () => {
  const [brandingConfigs, setBrandingConfigs] = useState<InvoiceBranding[]>([]);
  const [selectedBranding, setSelectedBranding] = useState<InvoiceBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  // Form state for creating/editing branding
  const [formData, setFormData] = useState<CreateInvoiceBranding>({
    name: '',
    description: '',
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    accent_color: '#F59E0B',
    text_color: '#1F2937',
    background_color: '#FFFFFF',
    font_family: 'Inter',
    header_font_size: '24px',
    body_font_size: '14px',
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    tax_id: '',
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    loadBrandingConfigs();
  }, []);

  const loadBrandingConfigs = async () => {
    try {
      const response = await invoiceCustomizationService.getBrandingConfigs();
      setBrandingConfigs(response.branding_configs);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری تنظیمات برندینگ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranding = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'خطا',
        description: 'نام تنظیمات برندینگ الزامی است',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const newBranding = await invoiceCustomizationService.createBranding(formData);
      setBrandingConfigs([...brandingConfigs, newBranding]);
      setShowCreateForm(false);
      resetForm();
      
      toast({
        title: 'موفقیت',
        description: 'تنظیمات برندینگ جدید با موفقیت ایجاد شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ایجاد تنظیمات برندینگ',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBranding = async () => {
    if (!selectedBranding) return;

    setSaving(true);
    try {
      const updatedBranding = await invoiceCustomizationService.updateBranding(
        selectedBranding.id,
        formData
      );
      
      setBrandingConfigs(configs => 
        configs.map(config => config.id === updatedBranding.id ? updatedBranding : config)
      );
      setSelectedBranding(updatedBranding);
      
      toast({
        title: 'موفقیت',
        description: 'تنظیمات برندینگ با موفقیت به‌روزرسانی شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در به‌روزرسانی تنظیمات برندینگ',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranding = async (brandingId: string) => {
    if (!confirm('آیا از حذف این تنظیمات برندینگ اطمینان دارید؟')) return;

    try {
      await invoiceCustomizationService.deleteBranding(brandingId);
      setBrandingConfigs(configs => configs.filter(config => config.id !== brandingId));
      
      if (selectedBranding?.id === brandingId) {
        setSelectedBranding(null);
        resetForm();
      }
      
      toast({
        title: 'موفقیت',
        description: 'تنظیمات برندینگ با موفقیت حذف شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در حذف تنظیمات برندینگ',
        variant: 'destructive',
      });
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
      const result = await invoiceCustomizationService.uploadLogo(file);
      setFormData({ ...formData, logo_url: result.logo_url });
      
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

  const selectBranding = (branding: InvoiceBranding) => {
    setSelectedBranding(branding);
    setFormData({
      name: branding.name,
      description: branding.description || '',
      logo_url: branding.logo_url,
      logo_width: branding.logo_width,
      logo_height: branding.logo_height,
      primary_color: branding.primary_color || '#3B82F6',
      secondary_color: branding.secondary_color || '#10B981',
      accent_color: branding.accent_color || '#F59E0B',
      text_color: branding.text_color || '#1F2937',
      background_color: branding.background_color || '#FFFFFF',
      font_family: branding.font_family || 'Inter',
      header_font_size: branding.header_font_size || '24px',
      body_font_size: branding.body_font_size || '14px',
      company_name: branding.company_name || '',
      company_address: branding.company_address || '',
      company_phone: branding.company_phone || '',
      company_email: branding.company_email || '',
      company_website: branding.company_website || '',
      tax_id: branding.tax_id || '',
      is_active: branding.is_active,
      is_default: branding.is_default,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
      accent_color: '#F59E0B',
      text_color: '#1F2937',
      background_color: '#FFFFFF',
      font_family: 'Inter',
      header_font_size: '24px',
      body_font_size: '14px',
      company_name: '',
      company_address: '',
      company_phone: '',
      company_email: '',
      company_website: '',
      tax_id: '',
      is_active: true,
      is_default: false,
    });
  };

  const updateField = (field: keyof CreateInvoiceBranding, value: any) => {
    setFormData({ ...formData, [field]: value });
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Branding Configs List */}
      <div className="lg:col-span-1 space-y-4">
        <Card variant="gradient-pink">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                تنظیمات برندینگ
              </CardTitle>
              <Button
                variant="gradient-pink"
                size="sm"
                onClick={() => {
                  setShowCreateForm(true);
                  setSelectedBranding(null);
                  resetForm();
                }}
              >
                <Plus className="h-4 w-4 ml-1" />
                جدید
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {brandingConfigs.map((branding) => (
              <div
                key={branding.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedBranding?.id === branding.id
                    ? 'border-pink-300 bg-pink-50'
                    : 'border-gray-200 hover:border-pink-200 hover:bg-pink-50/50'
                }`}
                onClick={() => selectBranding(branding)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{branding.name}</h3>
                    {branding.description && (
                      <p className="text-sm text-gray-600 mt-1">{branding.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {branding.is_default && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBranding(branding.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Color Preview */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1">
                    {branding.primary_color && (
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: branding.primary_color }}
                        title="رنگ اصلی"
                      />
                    )}
                    {branding.secondary_color && (
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: branding.secondary_color }}
                        title="رنگ فرعی"
                      />
                    )}
                    {branding.accent_color && (
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: branding.accent_color }}
                        title="رنگ تاکیدی"
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {branding.company_name || 'بدون نام شرکت'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {branding.is_active ? (
                      <span className="text-green-600">فعال</span>
                    ) : (
                      <span className="text-red-600">غیرفعال</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {brandingConfigs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Palette className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">هیچ تنظیماتی یافت نشد</p>
                <p className="text-sm">اولین تنظیمات برندینگ خود را ایجاد کنید</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branding Editor */}
      <div className="lg:col-span-2 space-y-4">
        {(selectedBranding || showCreateForm) ? (
          <Card variant="professional">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <Palette className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>
                      {selectedBranding ? 'ویرایش برندینگ' : 'ایجاد برندینگ جدید'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      تنظیم رنگ‌ها، فونت‌ها و اطلاعات شرکت
                    </p>
                  </div>
                </div>
                {selectedBranding?.is_default && (
                  <Badge variant="secondary">
                    <Star className="h-3 w-3 ml-1 fill-current" />
                    پیش‌فرض
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  اطلاعات پایه
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branding-name">نام تنظیمات *</Label>
                    <Input
                      id="branding-name"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="نام تنظیمات برندینگ"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-name">نام شرکت</Label>
                    <Input
                      id="company-name"
                      value={formData.company_name}
                      onChange={(e) => updateField('company_name', e.target.value)}
                      placeholder="نام شرکت"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branding-description">توضیحات</Label>
                  <Textarea
                    id="branding-description"
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="توضیحات تنظیمات برندینگ"
                    rows={2}
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  لوگو
                </h3>
                
                <div className="flex items-center gap-4">
                  {formData.logo_url && (
                    <div className="w-20 h-20 rounded-lg border-2 border-gray-200 overflow-hidden">
                      <img
                        src={formData.logo_url}
                        alt="لوگو"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo-width">عرض لوگو</Label>
                    <Input
                      id="logo-width"
                      value={formData.logo_width || ''}
                      onChange={(e) => updateField('logo_width', e.target.value)}
                      placeholder="مثال: 200px یا 50%"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logo-height">ارتفاع لوگو</Label>
                    <Input
                      id="logo-height"
                      value={formData.logo_height || ''}
                      onChange={(e) => updateField('logo_height', e.target.value)}
                      placeholder="مثال: 100px یا auto"
                    />
                  </div>
                </div>
              </div>

              {/* Color Scheme */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  طرح رنگی
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">رنگ اصلی</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => updateField('primary_color', e.target.value)}
                        className="w-12 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => updateField('primary_color', e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">رنگ فرعی</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => updateField('secondary_color', e.target.value)}
                        className="w-12 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.secondary_color}
                        onChange={(e) => updateField('secondary_color', e.target.value)}
                        placeholder="#10B981"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color">رنگ تاکیدی</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) => updateField('accent_color', e.target.value)}
                        className="w-12 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.accent_color}
                        onChange={(e) => updateField('accent_color', e.target.value)}
                        placeholder="#F59E0B"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="text-color">رنگ متن</Label>
                    <div className="flex gap-2">
                      <Input
                        id="text-color"
                        type="color"
                        value={formData.text_color}
                        onChange={(e) => updateField('text_color', e.target.value)}
                        className="w-12 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.text_color}
                        onChange={(e) => updateField('text_color', e.target.value)}
                        placeholder="#1F2937"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="background-color">رنگ پس‌زمینه</Label>
                    <div className="flex gap-2">
                      <Input
                        id="background-color"
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => updateField('background_color', e.target.value)}
                        className="w-12 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.background_color}
                        onChange={(e) => updateField('background_color', e.target.value)}
                        placeholder="#FFFFFF"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  تایپوگرافی
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="font-family">فونت</Label>
                    <Select
                      value={formData.font_family}
                      onValueChange={(value) => updateField('font_family', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Vazir">وزیر</SelectItem>
                        <SelectItem value="IRANSans">ایران‌سنس</SelectItem>
                        <SelectItem value="Tahoma">Tahoma</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="header-font-size">اندازه فونت سربرگ</Label>
                    <Input
                      id="header-font-size"
                      value={formData.header_font_size}
                      onChange={(e) => updateField('header_font_size', e.target.value)}
                      placeholder="24px"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body-font-size">اندازه فونت متن</Label>
                    <Input
                      id="body-font-size"
                      value={formData.body_font_size}
                      onChange={(e) => updateField('body_font_size', e.target.value)}
                      placeholder="14px"
                    />
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">اطلاعات شرکت</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">تلفن</Label>
                    <Input
                      id="company-phone"
                      value={formData.company_phone}
                      onChange={(e) => updateField('company_phone', e.target.value)}
                      placeholder="شماره تلفن"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-email">ایمیل</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => updateField('company_email', e.target.value)}
                      placeholder="آدرس ایمیل"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-website">وب‌سایت</Label>
                    <Input
                      id="company-website"
                      value={formData.company_website}
                      onChange={(e) => updateField('company_website', e.target.value)}
                      placeholder="آدرس وب‌سایت"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax-id">شناسه مالیاتی</Label>
                    <Input
                      id="tax-id"
                      value={formData.tax_id}
                      onChange={(e) => updateField('tax_id', e.target.value)}
                      placeholder="شناسه مالیاتی"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-address">آدرس</Label>
                  <Textarea
                    id="company-address"
                    value={formData.company_address}
                    onChange={(e) => updateField('company_address', e.target.value)}
                    placeholder="آدرس کامل شرکت"
                    rows={3}
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-active"
                      checked={formData.is_active}
                      onChange={(e) => updateField('is_active', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="is-active">فعال</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-default"
                      checked={formData.is_default}
                      onChange={(e) => updateField('is_default', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="is-default">پیش‌فرض</Label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedBranding(null);
                    resetForm();
                  }}
                >
                  انصراف
                </Button>
                <Button
                  variant="gradient-pink"
                  onClick={selectedBranding ? handleUpdateBranding : handleCreateBranding}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      در حال ذخیره...
                    </>
                  ) : (
                    selectedBranding ? 'به‌روزرسانی' : 'ایجاد'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card variant="professional">
            <CardContent className="p-12">
              <div className="text-center text-gray-500">
                <Palette className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">تنظیماتی انتخاب نشده</h3>
                <p className="text-sm">
                  برای شروع، یک تنظیمات برندینگ از فهرست سمت راست انتخاب کنید یا یکی جدید ایجاد کنید
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BrandingCustomization;