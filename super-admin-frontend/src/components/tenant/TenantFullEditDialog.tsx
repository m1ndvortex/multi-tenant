/**
 * Comprehensive Tenant Edit Dialog
 * Dialog for comprehensive tenant editing with all information updates
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  CreditCard, 
  Settings, 
  FileText, 
  Users, 
  Package, 
  UserCheck,
  Receipt
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { TenantFullUpdateRequest } from '@/types/enhancedTenant';
import { useFullTenantUpdate, useEnhancedTenantDetails } from '@/hooks/useEnhancedTenants';

interface TenantFullEditDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

const TenantFullEditDialog: React.FC<TenantFullEditDialogProps> = ({
  tenant,
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<TenantFullUpdateRequest>({});
  const [activeTab, setActiveTab] = useState('basic');

  const fullUpdateMutation = useFullTenantUpdate();
  const { data: enhancedTenant } = useEnhancedTenantDetails(
    tenant?.id || ''
  );

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen && tenant) {
      setFormData({
        name: tenant.name || '',
        phone: enhancedTenant?.phone || '',
        address: enhancedTenant?.address || '',
        business_type: enhancedTenant?.business_type || '',
        domain: tenant.domain || '',
        subscription_type: tenant.subscription_type,
        status: tenant.status || 'active',
        currency: enhancedTenant?.currency || 'IRR',
        timezone: enhancedTenant?.timezone || 'Asia/Tehran',
        max_users: enhancedTenant?.max_users || 1,
        max_products: enhancedTenant?.max_products || 10,
        max_customers: enhancedTenant?.max_customers || 10,
        max_monthly_invoices: enhancedTenant?.max_monthly_invoices || 10,
        notes: enhancedTenant?.notes || '',
        admin_reason: '',
      });
    } else if (!isOpen) {
      setFormData({});
      setActiveTab('basic');
    }
  }, [isOpen, tenant, enhancedTenant]);

  const handleInputChange = (field: keyof TenantFullUpdateRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant) return;

    // Filter out unchanged values and empty strings
    const updateData: TenantFullUpdateRequest = {};
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Compare with current values to only send changes
        const currentValue = key === 'name' ? tenant.name :
                            key === 'domain' ? tenant.domain :
                            key === 'subscription_type' ? tenant.subscription_type :
                            key === 'status' ? tenant.status :
                            enhancedTenant?.[key as keyof typeof enhancedTenant];
        
        if (value !== currentValue) {
          updateData[key as keyof TenantFullUpdateRequest] = value;
        }
      }
    });

    // Always include admin reason if provided
    if (formData.admin_reason?.trim()) {
      updateData.admin_reason = formData.admin_reason;
    }

    if (Object.keys(updateData).length === 0 || (Object.keys(updateData).length === 1 && updateData.admin_reason)) {
      return; // No changes to submit
    }

    fullUpdateMutation.mutate(
      { tenantId: tenant.id, data: updateData },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">فعال</Badge>;
      case 'suspended':
        return <Badge variant="error">تعلیق</Badge>;
      case 'pending':
        return <Badge variant="secondary">در انتظار</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">لغو شده</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (type: string) => {
    switch (type) {
      case 'free':
        return <Badge variant="secondary">رایگان</Badge>;
      case 'pro':
        return <Badge variant="gradient-green">حرفه‌ای</Badge>;
      case 'enterprise':
        return <Badge variant="gradient-purple">سازمانی</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            ویرایش جامع تنانت: {tenant.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Status Overview */}
          <Card variant="gradient-blue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-blue-900">{tenant.name}</h3>
                  <p className="text-sm text-blue-700">
                    ایمیل: {enhancedTenant?.email || tenant.email || 'تعریف نشده'}
                  </p>
                  {enhancedTenant?.owner_name && (
                    <p className="text-sm text-blue-700">
                      مالک: {enhancedTenant.owner_name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(tenant.status || 'active')}
                  {getSubscriptionBadge(tenant.subscription_type)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                اطلاعات پایه
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                اشتراک
              </TabsTrigger>
              <TabsTrigger value="limits" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                محدودیت‌ها
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                یادداشت‌ها
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card variant="professional">
                <CardHeader>
                  <CardTitle className="text-lg">اطلاعات پایه کسب‌وکار</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">نام کسب‌وکار *</Label>
                      <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="نام شرکت یا کسب‌وکار"
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business_type">نوع کسب‌وکار</Label>
                      <Input
                        id="business_type"
                        value={formData.business_type || ''}
                        onChange={(e) => handleInputChange('business_type', e.target.value)}
                        placeholder="مثال: فروشگاه، رستوران، خدمات"
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">شماره تماس</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="09123456789"
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="domain">دامنه سفارشی</Label>
                      <Input
                        id="domain"
                        value={formData.domain || ''}
                        onChange={(e) => handleInputChange('domain', e.target.value)}
                        placeholder="example.com"
                        className="text-right"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">آدرس</Label>
                    <Textarea
                      id="address"
                      value={formData.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="آدرس کامل کسب‌وکار"
                      rows={3}
                      className="text-right"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">واحد پول</Label>
                      <Select
                        value={formData.currency || 'IRR'}
                        onValueChange={(value) => handleInputChange('currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب واحد پول" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IRR">ریال ایران (IRR)</SelectItem>
                          <SelectItem value="USD">دلار آمریکا (USD)</SelectItem>
                          <SelectItem value="EUR">یورو (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">منطقه زمانی</Label>
                      <Select
                        value={formData.timezone || 'Asia/Tehran'}
                        onValueChange={(value) => handleInputChange('timezone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب منطقه زمانی" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Tehran">تهران (Asia/Tehran)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="Europe/London">لندن (Europe/London)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-4">
              <Card variant="professional">
                <CardHeader>
                  <CardTitle className="text-lg">مدیریت اشتراک</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subscription_type">نوع اشتراک</Label>
                      <Select
                        value={formData.subscription_type || 'free'}
                        onValueChange={(value: 'free' | 'pro' | 'enterprise') => 
                          handleInputChange('subscription_type', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب نوع اشتراک" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">رایگان</SelectItem>
                          <SelectItem value="pro">حرفه‌ای</SelectItem>
                          <SelectItem value="enterprise">سازمانی</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">وضعیت تنانت</Label>
                      <Select
                        value={formData.status || 'active'}
                        onValueChange={(value: 'pending' | 'active' | 'suspended' | 'cancelled') => 
                          handleInputChange('status', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب وضعیت" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">در انتظار</SelectItem>
                          <SelectItem value="active">فعال</SelectItem>
                          <SelectItem value="suspended">تعلیق</SelectItem>
                          <SelectItem value="cancelled">لغو شده</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.subscription_type === 'pro' && (
                    <div className="space-y-2">
                      <Label htmlFor="subscription_duration_months">مدت اشتراک (ماه)</Label>
                      <Input
                        id="subscription_duration_months"
                        type="number"
                        min="1"
                        max="60"
                        value={formData.subscription_duration_months || ''}
                        onChange={(e) => handleInputChange('subscription_duration_months', parseInt(e.target.value) || undefined)}
                        placeholder="12"
                        className="text-right"
                      />
                    </div>
                  )}

                  {/* Subscription Info Display */}
                  {enhancedTenant && (
                    <Card variant="gradient-green">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-green-900">اطلاعات اشتراک فعلی</h4>
                          <div className="text-sm text-green-800 space-y-1">
                            {enhancedTenant.subscription_starts_at && (
                              <p>شروع: {new Date(enhancedTenant.subscription_starts_at).toLocaleDateString('fa-IR')}</p>
                            )}
                            {enhancedTenant.subscription_expires_at && (
                              <p>انقضا: {new Date(enhancedTenant.subscription_expires_at).toLocaleDateString('fa-IR')}</p>
                            )}
                            <p>روزهای باقی‌مانده: {enhancedTenant.days_until_expiry}</p>
                            <p>وضعیت: {enhancedTenant.is_subscription_active ? 'فعال' : 'غیرفعال'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Limits Tab */}
            <TabsContent value="limits" className="space-y-4">
              <Card variant="professional">
                <CardHeader>
                  <CardTitle className="text-lg">محدودیت‌های سیستم</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="max_users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        حداکثر کاربران
                      </Label>
                      <Input
                        id="max_users"
                        type="number"
                        min="1"
                        value={formData.max_users || ''}
                        onChange={(e) => handleInputChange('max_users', parseInt(e.target.value) || undefined)}
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_products" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        حداکثر محصولات (-1 = نامحدود)
                      </Label>
                      <Input
                        id="max_products"
                        type="number"
                        min="-1"
                        value={formData.max_products || ''}
                        onChange={(e) => handleInputChange('max_products', parseInt(e.target.value) || undefined)}
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_customers" className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        حداکثر مشتریان (-1 = نامحدود)
                      </Label>
                      <Input
                        id="max_customers"
                        type="number"
                        min="-1"
                        value={formData.max_customers || ''}
                        onChange={(e) => handleInputChange('max_customers', parseInt(e.target.value) || undefined)}
                        className="text-right"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_monthly_invoices" className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        حداکثر فاکتور ماهانه (-1 = نامحدود)
                      </Label>
                      <Input
                        id="max_monthly_invoices"
                        type="number"
                        min="-1"
                        value={formData.max_monthly_invoices || ''}
                        onChange={(e) => handleInputChange('max_monthly_invoices', parseInt(e.target.value) || undefined)}
                        className="text-right"
                      />
                    </div>
                  </div>

                  {/* Usage Statistics */}
                  {enhancedTenant?.current_usage && (
                    <Card variant="gradient-purple">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-purple-900 mb-3">آمار استفاده فعلی</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-purple-800">کاربران</p>
                            <p className="font-bold text-purple-900">
                              {enhancedTenant.current_usage.users || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-purple-800">محصولات</p>
                            <p className="font-bold text-purple-900">
                              {enhancedTenant.current_usage.products || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-purple-800">مشتریان</p>
                            <p className="font-bold text-purple-900">
                              {enhancedTenant.current_usage.customers || 0}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-purple-800">فاکتور ماهانه</p>
                            <p className="font-bold text-purple-900">
                              {enhancedTenant.current_usage.monthly_invoices || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4">
              <Card variant="professional">
                <CardHeader>
                  <CardTitle className="text-lg">یادداشت‌ها و دلیل تغییر</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin_reason">دلیل این تغییر *</Label>
                    <Textarea
                      id="admin_reason"
                      value={formData.admin_reason || ''}
                      onChange={(e) => handleInputChange('admin_reason', e.target.value)}
                      placeholder="دلیل انجام این تغییرات را بنویسید..."
                      rows={3}
                      className="text-right"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">یادداشت‌های ادمین</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="یادداشت‌های اضافی در مورد این تنانت..."
                      rows={5}
                      className="text-right"
                    />
                  </div>

                  {/* Audit Info */}
                  {enhancedTenant && (
                    <Card variant="gradient-blue">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-blue-900 mb-2">اطلاعات حسابرسی</h4>
                        <div className="text-sm text-blue-800 space-y-1">
                          <p>تعداد کل تغییرات: {enhancedTenant.total_audit_entries}</p>
                          {enhancedTenant.last_credential_update && (
                            <p>آخرین تغییر اطلاعات ورود: {new Date(enhancedTenant.last_credential_update).toLocaleDateString('fa-IR')}</p>
                          )}
                          <p>آخرین به‌روزرسانی: {new Date(enhancedTenant.updated_at).toLocaleDateString('fa-IR')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={fullUpdateMutation.isPending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="gradient-green"
              disabled={fullUpdateMutation.isPending || !formData.admin_reason?.trim()}
            >
              {fullUpdateMutation.isPending ? 'در حال به‌روزرسانی...' : 'اعمال تغییرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantFullEditDialog;