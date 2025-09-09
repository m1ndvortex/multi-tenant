import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/enhanced-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/enhanced-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building2, 
  Globe, 
  Calendar, 
  Users, 
  Package, 
  FileText,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Tenant, TenantFormData } from '@/types/tenant';

interface EnhancedTenantFormProps {
  tenant?: Tenant;
  onSubmit: (data: EnhancedTenantFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface EnhancedTenantFormData extends TenantFormData {
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  max_users?: number;
  max_products?: number;
  max_customers?: number;
  max_monthly_invoices?: number;
}

const EnhancedTenantForm: React.FC<EnhancedTenantFormProps> = ({
  tenant,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<EnhancedTenantFormData>({
    name: '',
    domain: '',
    email: '',
    phone: '',
    address: '',
    subscription_type: 'free',
    subscription_expires_at: '',
    is_active: true,
    notes: '',
    max_users: 1,
    max_products: 10,
    max_customers: 10,
    max_monthly_invoices: 10,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        domain: tenant.domain || '',
        email: (tenant as any).email || '',
        phone: (tenant as any).phone || '',
        address: (tenant as any).address || '',
        subscription_type: tenant.subscription_type === 'enterprise' 
          ? 'pro' 
          : tenant.subscription_type as 'free' | 'pro',
        subscription_expires_at: tenant.subscription_expires_at 
          ? new Date(tenant.subscription_expires_at).toISOString().split('T')[0]
          : '',
        is_active: tenant.is_active,
        notes: (tenant as any).notes || '',
        max_users: (tenant as any).max_users || (tenant.subscription_type === 'pro' ? 5 : 1),
        max_products: (tenant as any).max_products || (tenant.subscription_type === 'pro' ? -1 : 10),
        max_customers: (tenant as any).max_customers || (tenant.subscription_type === 'pro' ? -1 : 10),
        max_monthly_invoices: (tenant as any).max_monthly_invoices || (tenant.subscription_type === 'pro' ? -1 : 10),
      });
      setShowAdvanced(true); // Show advanced options when editing
    }
  }, [tenant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof EnhancedTenantFormData, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubscriptionTypeChange = (subscriptionType: 'free' | 'pro') => {
    const updatedData = {
      ...formData,
      subscription_type: subscriptionType,
    };

    // Auto-adjust limits based on subscription type
    if (subscriptionType === 'pro') {
      updatedData.max_users = 5;
      updatedData.max_products = -1; // Unlimited
      updatedData.max_customers = -1;
      updatedData.max_monthly_invoices = -1;
      
      // Set default expiration if not set
      if (!updatedData.subscription_expires_at) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        updatedData.subscription_expires_at = oneYearFromNow.toISOString().split('T')[0];
      }
    } else {
      updatedData.max_users = 1;
      updatedData.max_products = 10;
      updatedData.max_customers = 10;
      updatedData.max_monthly_invoices = 10;
      updatedData.subscription_expires_at = '';
    }

    setFormData(updatedData);
  };

  const getSubscriptionLimits = () => {
    if (formData.subscription_type === 'pro') {
      return {
        users: 'تا ۵ کاربر',
        products: 'نامحدود',
        customers: 'نامحدود',
        invoices: 'نامحدود'
      };
    } else {
      return {
        users: '۱ کاربر',
        products: 'تا ۱۰ محصول',
        customers: 'تا ۱۰ مشتری',
        invoices: 'تا ۱۰ فاکتور در ماه'
      };
    }
  };

  const limits = getSubscriptionLimits();

  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          {tenant ? 'ویرایش جامع تنانت' : 'ایجاد تنانت جدید'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              اطلاعات پایه
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  نام تنانت *
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="نام کسب‌وکار یا شرکت"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="domain" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  دامنه (اختیاری)
                </label>
                <Input
                  id="domain"
                  type="text"
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  placeholder="example.com"
                  className="text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  ایمیل تماس
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contact@example.com"
                  className="text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                  شماره تماس
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="09123456789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium text-slate-700">
                آدرس
              </label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="آدرس کامل شرکت یا کسب‌وکار"
                rows={2}
              />
            </div>
          </div>

          {/* Subscription Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
              اطلاعات اشتراک
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="subscription_type" className="text-sm font-medium text-slate-700">
                  نوع اشتراک
                </label>
                <Select
                  value={formData.subscription_type}
                  onValueChange={(value: 'free' | 'pro') => handleSubscriptionTypeChange(value)}
                >
                  <SelectTrigger id="subscription_type">
                    <SelectValue placeholder="انتخاب نوع اشتراک" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">رایگان</SelectItem>
                    <SelectItem value="pro">حرفه‌ای</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                  وضعیت
                </label>
                <Select
                  value={formData.is_active ? 'true' : 'false'}
                  onValueChange={(value) => handleInputChange('is_active', value === 'true')}
                >
                  <SelectTrigger id="is_active">
                    <SelectValue placeholder="انتخاب وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">فعال</SelectItem>
                    <SelectItem value="false">غیرفعال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.subscription_type === 'pro' && (
              <div className="space-y-2">
                <label htmlFor="subscription_expires_at" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  تاریخ انقضای اشتراک
                </label>
                <Input
                  id="subscription_expires_at"
                  type="date"
                  value={formData.subscription_expires_at}
                  onChange={(e) => handleInputChange('subscription_expires_at', e.target.value)}
                />
              </div>
            )}

            {/* Subscription Limits Display */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">محدودیت‌های اشتراک {formData.subscription_type === 'pro' ? 'حرفه‌ای' : 'رایگان'}:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <Badge variant="outline" className="justify-center">
                      <Users className="h-3 w-3 mr-1" />
                      {limits.users}
                    </Badge>
                    <Badge variant="outline" className="justify-center">
                      <Package className="h-3 w-3 mr-1" />
                      {limits.products}
                    </Badge>
                    <Badge variant="outline" className="justify-center">
                      <Building2 className="h-3 w-3 mr-1" />
                      {limits.customers}
                    </Badge>
                    <Badge variant="outline" className="justify-center">
                      <FileText className="h-3 w-3 mr-1" />
                      {limits.invoices}
                    </Badge>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                تنظیمات پیشرفته
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'مخفی کردن' : 'نمایش'}
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    تغییر این تنظیمات تأثیر مستقیم بر عملکرد تنانت خواهد داشت. 
                    مقدار -1 به معنای نامحدود است.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="max_users" className="text-sm font-medium text-slate-700">
                      حداکثر تعداد کاربران
                    </label>
                    <Input
                      id="max_users"
                      type="number"
                      min="1"
                      value={formData.max_users}
                      onChange={(e) => handleInputChange('max_users', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="max_products" className="text-sm font-medium text-slate-700">
                      حداکثر تعداد محصولات (-1 = نامحدود)
                    </label>
                    <Input
                      id="max_products"
                      type="number"
                      min="-1"
                      value={formData.max_products}
                      onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || 10)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="max_customers" className="text-sm font-medium text-slate-700">
                      حداکثر تعداد مشتریان (-1 = نامحدود)
                    </label>
                    <Input
                      id="max_customers"
                      type="number"
                      min="-1"
                      value={formData.max_customers}
                      onChange={(e) => handleInputChange('max_customers', parseInt(e.target.value) || 10)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="max_monthly_invoices" className="text-sm font-medium text-slate-700">
                      حداکثر فاکتور ماهانه (-1 = نامحدود)
                    </label>
                    <Input
                      id="max_monthly_invoices"
                      type="number"
                      min="-1"
                      value={formData.max_monthly_invoices}
                      onChange={(e) => handleInputChange('max_monthly_invoices', parseInt(e.target.value) || 10)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium text-slate-700">
                    یادداشت‌های مدیریتی
                  </label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="یادداشت‌ها و توضیحات مربوط به این تنانت..."
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="gradient"
              disabled={isLoading || !formData.name.trim()}
              className="flex-1"
            >
              {isLoading ? 'در حال پردازش...' : tenant ? 'به‌روزرسانی تنانت' : 'ایجاد تنانت'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              انصراف
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedTenantForm;