/**
 * Subscription Status Dialog Component
 * Allows updating subscription status (activate/deactivate/suspend/disable)
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TenantSubscription, 
  SubscriptionStatusUpdateRequest, 
  SubscriptionStatusAction,
  SubscriptionType,
  TenantStatus
} from '@/types/subscription';

interface SubscriptionStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantSubscription;
  onUpdateStatus: (tenantId: string, data: SubscriptionStatusUpdateRequest) => Promise<any>;
  loading: boolean;
}

const SubscriptionStatusDialog: React.FC<SubscriptionStatusDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onUpdateStatus,
  loading
}) => {
  const [action, setAction] = useState<SubscriptionStatusAction>(SubscriptionStatusAction.ACTIVATE);
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType | undefined>(undefined);
  const [reason, setReason] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await onUpdateStatus(tenant.id, {
        action,
        subscription_type: subscriptionType,
        reason: reason.trim() || undefined
      });
      
      // Reset form
      setAction(SubscriptionStatusAction.ACTIVATE);
      setSubscriptionType(undefined);
      setReason('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const getActionDescription = (selectedAction: SubscriptionStatusAction) => {
    switch (selectedAction) {
      case SubscriptionStatusAction.ACTIVATE:
        return 'تنانت فعال شده و دسترسی کامل خواهد داشت';
      case SubscriptionStatusAction.DEACTIVATE:
        return 'تنانت غیرفعال شده و دسترسی محدود خواهد داشت';
      case SubscriptionStatusAction.SUSPEND:
        return 'تنانت تعلیق شده و دسترسی موقتاً قطع خواهد شد';
      case SubscriptionStatusAction.DISABLE:
        return 'تنانت کاملاً غیرفعال شده و دسترسی قطع خواهد شد';
      default:
        return '';
    }
  };

  const getActionColor = (selectedAction: SubscriptionStatusAction) => {
    switch (selectedAction) {
      case SubscriptionStatusAction.ACTIVATE:
        return 'text-green-600 bg-green-50 border-green-200';
      case SubscriptionStatusAction.DEACTIVATE:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case SubscriptionStatusAction.SUSPEND:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case SubscriptionStatusAction.DISABLE:
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>تغییر وضعیت اشتراک</DialogTitle>
          <DialogDescription>
            مدیریت وضعیت اشتراک تنانت با کنترل کامل
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
                <span className="text-gray-600">وضعیت فعلی:</span>
                <Badge variant={getStatusBadgeVariant(tenant.status)}>
                  {tenant.status === TenantStatus.ACTIVE ? 'فعال' : 
                   tenant.status === TenantStatus.SUSPENDED ? 'تعلیق' : 'لغو شده'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">نوع اشتراک:</span>
                <Badge variant={tenant.subscription_type === SubscriptionType.PRO ? 'default' : 'secondary'}>
                  {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">انقضا:</span>
                <span className="font-medium">{formatDate(tenant.subscription_expires_at)}</span>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="action">عملیات مورد نظر</Label>
              <Select value={action} onValueChange={(value) => setAction(value as SubscriptionStatusAction)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="عملیات را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SubscriptionStatusAction.ACTIVATE}>فعال‌سازی</SelectItem>
                  <SelectItem value={SubscriptionStatusAction.DEACTIVATE}>غیرفعال‌سازی</SelectItem>
                  <SelectItem value={SubscriptionStatusAction.SUSPEND}>تعلیق</SelectItem>
                  <SelectItem value={SubscriptionStatusAction.DISABLE}>غیرفعال کامل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subscription Type for Activation */}
            {action === SubscriptionStatusAction.ACTIVATE && (
              <div>
                <Label htmlFor="subscriptionType">نوع اشتراک (برای فعال‌سازی)</Label>
                <Select 
                  value={subscriptionType || ''} 
                  onValueChange={(value) => setSubscriptionType(value as SubscriptionType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="نوع اشتراک را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SubscriptionType.FREE}>رایگان</SelectItem>
                    <SelectItem value={SubscriptionType.PRO}>حرفه‌ای</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="reason">دلیل تغییر وضعیت (اختیاری)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="دلیل تغییر وضعیت را وارد کنید..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Action Preview */}
          <Alert className={getActionColor(action)}>
            <AlertDescription>
              <strong>تأثیر این عملیات:</strong> {getActionDescription(action)}
            </AlertDescription>
          </Alert>

          {/* Warning for Destructive Actions */}
          {(action === SubscriptionStatusAction.DISABLE || action === SubscriptionStatusAction.SUSPEND) && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                <strong>هشدار:</strong> این عملیات دسترسی تنانت را محدود یا قطع خواهد کرد. 
                لطفاً از انجام این عملیات اطمینان حاصل کنید.
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
              disabled={loading || (action === SubscriptionStatusAction.ACTIVATE && !subscriptionType)}
              variant={
                action === SubscriptionStatusAction.DISABLE || action === SubscriptionStatusAction.SUSPEND 
                  ? 'destructive' 
                  : 'default'
              }
            >
              {loading ? 'در حال اعمال...' : 'اعمال تغییرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionStatusDialog;