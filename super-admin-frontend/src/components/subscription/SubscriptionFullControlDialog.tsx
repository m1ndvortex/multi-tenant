/**
 * Subscription Full Control Dialog Component
 * Allows complete manual control over all subscription aspects
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TenantSubscription, 
  SubscriptionFullControlRequest, 
  SubscriptionType,
  TenantStatus
} from '@/types/subscription';

interface SubscriptionFullControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantSubscription;
  onFullControl: (tenantId: string, data: SubscriptionFullControlRequest) => Promise<any>;
  loading: boolean;
}

const SubscriptionFullControlDialog: React.FC<SubscriptionFullControlDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onFullControl,
  loading
}) => {
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType | undefined>(undefined);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [maxUsers, setMaxUsers] = useState<number | undefined>(undefined);
  const [maxProducts, setMaxProducts] = useState<number | undefined>(undefined);
  const [maxCustomers, setMaxCustomers] = useState<number | undefined>(undefined);
  const [maxMonthlyInvoices, setMaxMonthlyInvoices] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<TenantStatus | undefined>(undefined);
  const [adminNotes, setAdminNotes] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: SubscriptionFullControlRequest = {
      subscription_type: subscriptionType,
      custom_start_date: customStartDate || undefined,
      custom_end_date: customEndDate || undefined,
      max_users: maxUsers,
      max_products: maxProducts,
      max_customers: maxCustomers,
      max_monthly_invoices: maxMonthlyInvoices,
      status: status,
      admin_notes: adminNotes.trim() || undefined
    };

    // Remove undefined values
    Object.keys(data).forEach(key => {
      if (data[key as keyof SubscriptionFullControlRequest] === undefined) {
        delete data[key as keyof SubscriptionFullControlRequest];
      }
    });

    try {
      await onFullControl(tenant.id, data);
      
      // Reset form
      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const resetForm = () => {
    setSubscriptionType(undefined);
    setCustomStartDate('');
    setCustomEndDate('');
    setMaxUsers(undefined);
    setMaxProducts(undefined);
    setMaxCustomers(undefined);
    setMaxMonthlyInvoices(undefined);
    setStatus(undefined);
    setAdminNotes('');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'نامحدود';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };



  const getStatusBadgeVariant = (status: TenantStatus) => {
    switch (status) {
      case TenantStatus.ACTIVE:
        return 'default';
      case TenantStatus.SUSPENDED:
        return 'secondary';
      case TenantStatus.CANCELLED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const hasChanges = () => {
    return subscriptionType !== undefined ||
           customStartDate !== '' ||
           customEndDate !== '' ||
           maxUsers !== undefined ||
           maxProducts !== undefined ||
           maxCustomers !== undefined ||
           maxMonthlyInvoices !== undefined ||
           status !== undefined ||
           adminNotes.trim() !== '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>کنترل کامل اشتراک</DialogTitle>
          <DialogDescription>
            کنترل کامل دستی بر تمام جنبه‌های اشتراک شامل تاریخ‌های سفارشی و محدودیت‌ها
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">اطلاعات فعلی تنانت</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">نام:</span>
                  <span className="font-medium">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ایمیل:</span>
                  <span className="font-medium">{tenant.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">وضعیت:</span>
                  <Badge variant={getStatusBadgeVariant(tenant.status)}>
                    {tenant.status === TenantStatus.ACTIVE ? 'فعال' : 
                     tenant.status === TenantStatus.SUSPENDED ? 'تعلیق' : 'لغو شده'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">نوع اشتراک:</span>
                  <Badge variant={tenant.subscription_type === SubscriptionType.PRO ? 'default' : 'secondary'}>
                    {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">شروع:</span>
                  <span className="font-medium">{formatDate(tenant.subscription_starts_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">انقضا:</span>
                  <span className="font-medium">{formatDate(tenant.subscription_expires_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Control Tabs */}
          <Tabs defaultValue="subscription" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subscription">اشتراک</TabsTrigger>
              <TabsTrigger value="limits">محدودیت‌ها</TabsTrigger>
              <TabsTrigger value="status">وضعیت</TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscriptionType">نوع اشتراک</Label>
                  <Select 
                    value={subscriptionType || ''} 
                    onValueChange={(value) => setSubscriptionType(value as SubscriptionType || undefined)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="انتخاب کنید (بدون تغییر)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون تغییر</SelectItem>
                      <SelectItem value={SubscriptionType.FREE}>رایگان</SelectItem>
                      <SelectItem value={SubscriptionType.PRO}>حرفه‌ای</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="customStartDate">تاریخ شروع سفارشی</Label>
                  <Input
                    id="customStartDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customEndDate">تاریخ انقضای سفارشی</Label>
                  <Input
                    id="customEndDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxUsers">حداکثر کاربران</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={maxUsers || ''}
                    onChange={(e) => setMaxUsers(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="بدون تغییر"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="maxProducts">حداکثر محصولات</Label>
                  <Input
                    id="maxProducts"
                    type="number"
                    min="-1"
                    value={maxProducts !== undefined ? maxProducts : ''}
                    onChange={(e) => setMaxProducts(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="بدون تغییر (-1 برای نامحدود)"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="maxCustomers">حداکثر مشتریان</Label>
                  <Input
                    id="maxCustomers"
                    type="number"
                    min="-1"
                    value={maxCustomers !== undefined ? maxCustomers : ''}
                    onChange={(e) => setMaxCustomers(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="بدون تغییر (-1 برای نامحدود)"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="maxMonthlyInvoices">حداکثر فاکتور ماهانه</Label>
                  <Input
                    id="maxMonthlyInvoices"
                    type="number"
                    min="-1"
                    value={maxMonthlyInvoices !== undefined ? maxMonthlyInvoices : ''}
                    onChange={(e) => setMaxMonthlyInvoices(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="بدون تغییر (-1 برای نامحدود)"
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div>
                <Label htmlFor="status">وضعیت تنانت</Label>
                <Select 
                  value={status || ''} 
                  onValueChange={(value) => setStatus(value as TenantStatus || undefined)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="انتخاب کنید (بدون تغییر)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون تغییر</SelectItem>
                    <SelectItem value={TenantStatus.ACTIVE}>فعال</SelectItem>
                    <SelectItem value={TenantStatus.SUSPENDED}>تعلیق</SelectItem>
                    <SelectItem value={TenantStatus.CANCELLED}>لغو شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="adminNotes">یادداشت‌های ادمین</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="یادداشت‌های مربوط به این تغییرات را وارد کنید..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Warning */}
          {hasChanges() && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-700">
                <strong>هشدار:</strong> این عملیات کنترل کامل دستی است و تمام تغییرات فوراً اعمال خواهد شد. 
                لطفاً از صحت اطلاعات وارد شده اطمینان حاصل کنید.
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Changes */}
          {hasChanges() && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">پیش‌نمایش تغییرات</h4>
              <div className="space-y-1 text-sm">
                {subscriptionType && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">نوع اشتراک:</span>
                    <span className="font-medium text-blue-900">
                      {subscriptionType === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                    </span>
                  </div>
                )}
                {customStartDate && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">تاریخ شروع:</span>
                    <span className="font-medium text-blue-900">
                      {new Date(customStartDate).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                )}
                {customEndDate && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">تاریخ انقضا:</span>
                    <span className="font-medium text-blue-900">
                      {new Date(customEndDate).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                )}
                {maxUsers !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">حداکثر کاربران:</span>
                    <span className="font-medium text-blue-900">{maxUsers}</span>
                  </div>
                )}
                {maxProducts !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">حداکثر محصولات:</span>
                    <span className="font-medium text-blue-900">
                      {maxProducts === -1 ? 'نامحدود' : maxProducts}
                    </span>
                  </div>
                )}
                {maxCustomers !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">حداکثر مشتریان:</span>
                    <span className="font-medium text-blue-900">
                      {maxCustomers === -1 ? 'نامحدود' : maxCustomers}
                    </span>
                  </div>
                )}
                {maxMonthlyInvoices !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">حداکثر فاکتور ماهانه:</span>
                    <span className="font-medium text-blue-900">
                      {maxMonthlyInvoices === -1 ? 'نامحدود' : maxMonthlyInvoices}
                    </span>
                  </div>
                )}
                {status && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">وضعیت:</span>
                    <span className="font-medium text-blue-900">
                      {status === TenantStatus.ACTIVE ? 'فعال' : 
                       status === TenantStatus.SUSPENDED ? 'تعلیق' : 'لغو شده'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              انصراف
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !hasChanges()}
              variant="destructive"
            >
              {loading ? 'در حال اعمال...' : 'اعمال کنترل کامل'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionFullControlDialog;