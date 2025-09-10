/**
 * Subscription History Dialog Component
 * Displays subscription history with admin actions and change reasons
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptionService';
import { TenantSubscription, SubscriptionType, TenantStatus } from '@/types/subscription';

interface SubscriptionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantSubscription;
}

const SubscriptionHistoryDialog: React.FC<SubscriptionHistoryDialogProps> = ({
  open,
  onOpenChange,
  tenant
}) => {
  const {
    data: history,
    isLoading,
    error
  } = useQuery({
    queryKey: ['subscription', 'history', tenant.id],
    queryFn: () => subscriptionService.getSubscriptionHistory(tenant.id),
    enabled: open && !!tenant.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('fa-IR');
    } catch {
      return dateString;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'extension':
        return 'default';
      case 'status_update':
        return 'secondary';
      case 'plan_switch':
        return 'outline';
      case 'manual_control':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'extension':
        return 'تمدید';
      case 'status_update':
        return 'تغییر وضعیت';
      case 'plan_switch':
        return 'تغییر پلن';
      case 'manual_control':
        return 'کنترل کامل';
      default:
        return action;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تاریخچه اشتراک</DialogTitle>
          <DialogDescription>
            تاریخچه کامل تغییرات اشتراک با جزئیات عملیات ادمین
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tenant Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">اطلاعات تنانت</h4>
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
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">وضعیت فعلی:</span>
                  <Badge variant={getStatusBadgeVariant(tenant.status)}>
                    {tenant.status === TenantStatus.ACTIVE ? 'فعال' : 
                     tenant.status === TenantStatus.SUSPENDED ? 'تعلیق' : 'لغو شده'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">اشتراک فعلی:</span>
                  <Badge variant={tenant.subscription_type === SubscriptionType.PRO ? 'default' : 'secondary'}>
                    {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* History Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">در حال بارگذاری تاریخچه...</p>
              </div>
            </div>
          ) : error ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">خطا در بارگذاری</CardTitle>
                <CardDescription>
                  خطایی در بارگذاری تاریخچه اشتراک رخ داد
                </CardDescription>
              </CardHeader>
            </Card>
          ) : !history || history.history.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>تاریخچه‌ای یافت نشد</CardTitle>
                <CardDescription>
                  هیچ تغییری در اشتراک این تنانت ثبت نشده است
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  تاریخچه تغییرات ({history.total_entries} مورد)
                </h4>
              </div>

              <div className="space-y-3">
                {history.history.map((entry, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(entry.action)}>
                            {getActionLabel(entry.action)}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {entry.admin_email}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Reason */}
                      {entry.reason && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">دلیل: </span>
                          <span className="text-sm text-gray-600">{entry.reason}</span>
                        </div>
                      )}

                      {/* Details */}
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(entry.details).map(([key, value]) => {
                            // Skip certain keys that are not relevant for display
                            if (['Timestamp', 'admin_email', 'Reason'].includes(key)) {
                              return null;
                            }

                            return (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600">{key}:</span>
                                <span className="font-medium text-gray-900 text-left">
                                  {typeof value === 'string' ? value : JSON.stringify(value)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionHistoryDialog;