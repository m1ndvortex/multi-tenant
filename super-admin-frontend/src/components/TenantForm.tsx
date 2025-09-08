import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tenant, TenantFormData } from '@/types/tenant';

interface TenantFormProps {
  tenant?: Tenant;
  onSubmit: (data: TenantFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TenantForm: React.FC<TenantFormProps> = ({
  tenant,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    domain: '',
    subscription_type: 'free',
    subscription_expires_at: '',
    is_active: true,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        domain: tenant.domain || '',
        subscription_type: tenant.subscription_type === 'enterprise' 
          ? 'pro' 
          : tenant.subscription_type as 'free' | 'pro',
        subscription_expires_at: tenant.subscription_expires_at 
          ? new Date(tenant.subscription_expires_at).toISOString().split('T')[0]
          : '',
        is_active: tenant.is_active,
      });
    }
  }, [tenant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof TenantFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle>
          {tenant ? 'ویرایش تنانت' : 'ایجاد تنانت جدید'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-700">
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
            <label htmlFor="domain" className="text-sm font-medium text-slate-700">
              دامنه (اختیاری)
            </label>
            <Input
              id="domain"
              type="text"
              value={formData.domain}
              onChange={(e) => handleInputChange('domain', e.target.value)}
              placeholder="example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="subscription_type" className="text-sm font-medium text-slate-700">
              نوع اشتراک
            </label>
            <Select
              value={formData.subscription_type}
              onValueChange={(value: 'free' | 'pro') => handleInputChange('subscription_type', value)}
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

          {formData.subscription_type === 'pro' && (
            <div className="space-y-2">
              <label htmlFor="subscription_expires_at" className="text-sm font-medium text-slate-700">
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

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="gradient-green"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'در حال پردازش...' : tenant ? 'به‌روزرسانی' : 'ایجاد'}
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

export default TenantForm;