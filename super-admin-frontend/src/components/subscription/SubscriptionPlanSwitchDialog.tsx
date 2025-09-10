/**
 * Subscription Plan Switch Dialog Component
 * Allows switching between subscription plans with immediate effect
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
import { 
  TenantSubscription, 
  SubscriptionPlanSwitchRequest, 
  SubscriptionType,
  TenantStatus
} from '@/types/subscription';

interface SubscriptionPlanSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantSubscription;
  onSwitchPlan: (tenantId: string, data: SubscriptionPlanSwitchRequest) => Promise<any>;
  loading: boolean;
}

const SubscriptionPlanSwitchDialog: React.FC<SubscriptionPlanSwitchDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onSwitchPlan,
  loading
}) => {
  const [newPlan, setNewPlan] = useState<SubscriptionType>(
    tenant.subscription_type === SubscriptionType.PRO ? SubscriptionType.FREE : SubscriptionType.PRO
  );
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [reason, setReason] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPlan === SubscriptionType.PRO && (durationMonths < 1 || durationMonths > 60)) {
      return;
    }

    try {
      await onSwitchPlan(tenant.id, {
        new_plan: newPlan,
        duration_months: newPlan === SubscriptionType.PRO ? durationMonths : undefined,
        reason: reason.trim() || undefined
      });
      
      // Reset form
      setNewPlan(tenant.subscription_type === SubscriptionType.PRO ? SubscriptionType.FREE : SubscriptionType.PRO);
      setDurationMonths(12);
      setReason('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'نامحدود';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  const calculateNewExpiryDate = () => {
    if (newPlan === SubscriptionType.FREE) {
      return 'نامحدود';
    }
    
    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + durationMonths);
    return newExpiry.toLocaleDateString('fa-IR');
  };

  const getPlanFeatures = (plan: SubscriptionType) => {
    if (plan === SubscriptionType.PRO) {
      return [
        'حداکثر ۵ کاربر',
        'محصولات نامحدود',
        'مشتریان نامحدود',
        'فاکتورهای نامحدود',
        'پشتیبانی اولویت‌دار'
      ];
    } else {
      return [
        'حداکثر ۱ کاربر',
        'حداکثر ۱۰ محصول',
        'حداکثر ۱۰ مشتری',
        'حداکثر ۱۰ فاکتور در ماه',
        'پشتیبانی استاندارد'
      ];
    }
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

  const isUpgrade = newPlan === SubscriptionType.PRO && tenant.subscription_type === SubscriptionType.FREE;
  const isDowngrade = newPlan === SubscriptionType.FREE && tenant.subscription_type === SubscriptionType.PRO;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تغییر پلن اشتراک</DialogTitle>
          <DialogDescription>
            تغییر پلن اشتراک با اثر فوری بر دسترسی‌های تنانت
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">اطلاعات تنانت</h4>
            <div className="space-y-2 text-sm">
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
              <div className="flex justify-between">
                <span className="text-gray-600">پلن فعلی:</span>
                <Badge variant={tenant.subscription_type === SubscriptionType.PRO ? 'default' : 'secondary'}>
                  {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">انقضای فعلی:</span>
                <span className="font-medium">{formatDate(tenant.subscription_expires_at)}</span>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPlan">پلن جدید</Label>
              <Select value={newPlan} onValueChange={(value) => setNewPlan(value as SubscriptionType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="پلن جدید را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SubscriptionType.FREE}>رایگان</SelectItem>
                  <SelectItem value={SubscriptionType.PRO}>حرفه‌ای</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration for Pro Plan */}
            {newPlan === SubscriptionType.PRO && (
              <div>
                <Label htmlFor="duration">مدت اشتراک (ماه)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="60"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  حداقل ۱ ماه و حداکثر ۶۰ ماه
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="reason">دلیل تغییر پلن (اختیاری)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="دلیل تغییر پلن را وارد کنید..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Plan */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                پلن فعلی
                <Badge variant={tenant.subscription_type === SubscriptionType.PRO ? 'default' : 'secondary'}>
                  {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                </Badge>
              </h4>
              <ul className="text-sm space-y-1">
                {getPlanFeatures(tenant.subscription_type).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* New Plan */}
            <div className={`border rounded-lg p-4 ${
              isUpgrade ? 'border-green-200 bg-green-50' : 
              isDowngrade ? 'border-red-200 bg-red-50' : 
              'border-blue-200 bg-blue-50'
            }`}>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                پلن جدید
                <Badge variant={newPlan === SubscriptionType.PRO ? 'default' : 'secondary'}>
                  {newPlan === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                </Badge>
              </h4>
              <ul className="text-sm space-y-1">
                {getPlanFeatures(newPlan).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className={`w-1 h-1 rounded-full ${
                      isUpgrade ? 'bg-green-500' : 
                      isDowngrade ? 'bg-red-500' : 
                      'bg-blue-500'
                    }`}></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Preview */}
          <div className={`p-4 rounded-lg ${
            isUpgrade ? 'bg-green-50 border border-green-200' : 
            isDowngrade ? 'bg-red-50 border border-red-200' : 
            'bg-blue-50 border border-blue-200'
          }`}>
            <h4 className={`font-medium mb-2 ${
              isUpgrade ? 'text-green-900' : 
              isDowngrade ? 'text-red-900' : 
              'text-blue-900'
            }`}>
              پیش‌نمایش تغییرات
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={isUpgrade ? 'text-green-700' : isDowngrade ? 'text-red-700' : 'text-blue-700'}>
                  نوع تغییر:
                </span>
                <span className={`font-medium ${
                  isUpgrade ? 'text-green-900' : 
                  isDowngrade ? 'text-red-900' : 
                  'text-blue-900'
                }`}>
                  {isUpgrade ? 'ارتقاء' : isDowngrade ? 'تنزل' : 'تغییر'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isUpgrade ? 'text-green-700' : isDowngrade ? 'text-red-700' : 'text-blue-700'}>
                  انقضای جدید:
                </span>
                <span className={`font-medium ${
                  isUpgrade ? 'text-green-900' : 
                  isDowngrade ? 'text-red-900' : 
                  'text-blue-900'
                }`}>
                  {calculateNewExpiryDate()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isUpgrade ? 'text-green-700' : isDowngrade ? 'text-red-700' : 'text-blue-700'}>
                  اثر:
                </span>
                <span className={`font-medium ${
                  isUpgrade ? 'text-green-900' : 
                  isDowngrade ? 'text-red-900' : 
                  'text-blue-900'
                }`}>
                  فوری
                </span>
              </div>
            </div>
          </div>

          {/* Warning for Downgrade */}
          {isDowngrade && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                <strong>هشدار:</strong> تنزل پلن ممکن است محدودیت‌هایی را برای تنانت ایجاد کند. 
                اطمینان حاصل کنید که تنانت از این تغییرات آگاه است.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              انصراف
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (newPlan === SubscriptionType.PRO && (durationMonths < 1 || durationMonths > 60))}
              variant={isDowngrade ? 'destructive' : 'default'}
            >
              {loading ? 'در حال اعمال...' : 'تغییر پلن'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlanSwitchDialog;