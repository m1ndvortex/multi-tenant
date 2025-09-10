/**
 * Subscription Extension Dialog Component
 * Allows manual extension of tenant subscriptions
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TenantSubscription, SubscriptionExtensionRequest, SubscriptionType } from '@/types/subscription';

interface SubscriptionExtensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantSubscription;
  onExtend: (tenantId: string, data: SubscriptionExtensionRequest) => Promise<any>;
  loading: boolean;
}

const SubscriptionExtensionDialog: React.FC<SubscriptionExtensionDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onExtend,
  loading
}) => {
  const [months, setMonths] = useState<number>(12);
  const [reason, setReason] = useState<string>('');
  const [keepCurrentPlan, setKeepCurrentPlan] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (months < 1 || months > 60) {
      return;
    }

    try {
      await onExtend(tenant.id, {
        months,
        reason: reason.trim() || undefined,
        keep_current_plan: keepCurrentPlan
      });
      
      // Reset form
      setMonths(12);
      setReason('');
      setKeepCurrentPlan(false);
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
    const currentExpiry = tenant.subscription_expires_at 
      ? new Date(tenant.subscription_expires_at)
      : new Date();
    
    // If current expiry is in the past, start from now
    const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
    
    const newExpiry = new Date(startDate);
    newExpiry.setMonth(newExpiry.getMonth() + months);
    
    return newExpiry.toLocaleDateString('fa-IR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تمدید اشتراک</DialogTitle>
          <DialogDescription>
            تمدید اشتراک تنانت با کنترل کامل دستی
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
                <span className="text-gray-600">نوع اشتراک فعلی:</span>
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

          {/* Extension Settings */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="months">تعداد ماه برای تمدید</Label>
              <Input
                id="months"
                type="number"
                min="1"
                max="60"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
                className="mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                حداقل ۱ ماه و حداکثر ۶۰ ماه
              </p>
            </div>

            <div>
              <Label htmlFor="reason">دلیل تمدید (اختیاری)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="دلیل تمدید اشتراک را وارد کنید..."
                className="mt-1"
                rows={3}
              />
            </div>

            {tenant.subscription_type === SubscriptionType.FREE && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="keepCurrentPlan"
                  checked={keepCurrentPlan}
                  onCheckedChange={(checked) => setKeepCurrentPlan(checked as boolean)}
                />
                <Label htmlFor="keepCurrentPlan" className="text-sm">
                  حفظ پلن رایگان (عدم ارتقاء به حرفه‌ای)
                </Label>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">پیش‌نمایش تغییرات</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">تاریخ انقضای جدید:</span>
                <span className="font-medium text-blue-900">{calculateNewExpiryDate()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">مدت تمدید:</span>
                <span className="font-medium text-blue-900">{months} ماه</span>
              </div>
              {tenant.subscription_type === SubscriptionType.FREE && !keepCurrentPlan && (
                <div className="flex justify-between">
                  <span className="text-blue-700">تغییر پلن:</span>
                  <span className="font-medium text-blue-900">ارتقاء به حرفه‌ای</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={loading || months < 1 || months > 60}>
              {loading ? 'در حال تمدید...' : 'تمدید اشتراک'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionExtensionDialog;