import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/enhanced-button';
import { 
  History, 
  Calendar, 
  User, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Play, 
  Pause,
  RefreshCw,
  Clock,
  FileText
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { subscriptionService, SubscriptionHistoryResponse } from '@/services/subscriptionService';

interface SubscriptionHistoryDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

const SubscriptionHistoryDialog: React.FC<SubscriptionHistoryDialogProps> = ({
  tenant,
  isOpen,
  onClose
}) => {
  const { data: historyData, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-history', tenant?.id],
    queryFn: () => tenant ? subscriptionService.getSubscriptionHistory(tenant.id) : null,
    enabled: isOpen && !!tenant,
    refetchOnWindowFocus: false,
  });

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return Plus;
      case 'upgraded':
        return ArrowUp;
      case 'downgraded':
        return ArrowDown;
      case 'extended':
        return Calendar;
      case 'activated':
        return Play;
      case 'deactivated':
      case 'suspended':
        return Pause;
      case 'renewed':
        return RefreshCw;
      default:
        return FileText;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'activated':
      case 'upgraded':
      case 'extended':
      case 'renewed':
        return 'text-green-600';
      case 'deactivated':
      case 'suspended':
      case 'downgraded':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'activated':
      case 'upgraded':
      case 'extended':
      case 'renewed':
        return 'default';
      case 'deactivated':
      case 'suspended':
      case 'downgraded':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created': return 'ایجاد';
      case 'upgraded': return 'ارتقاء';
      case 'downgraded': return 'کاهش سطح';
      case 'extended': return 'تمدید';
      case 'activated': return 'فعال‌سازی';
      case 'deactivated': return 'غیرفعال‌سازی';
      case 'suspended': return 'تعلیق';
      case 'renewed': return 'تجدید';
      default: return action;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('fa-IR'),
      time: date.toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            تاریخچه اشتراک - {tenant.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status Summary */}
          <Card variant="gradient-super-admin">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-indigo-700 mb-1">نوع اشتراک فعلی</div>
                  <Badge variant="default" className="bg-indigo-600">
                    {subscriptionService.getSubscriptionTypeLabel(tenant.subscription_type)}
                  </Badge>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-indigo-700 mb-1">وضعیت</div>
                  <Badge variant={tenant.status === 'active' || (tenant.status === undefined && tenant.is_active) ? "default" : "destructive"}>
                    {subscriptionService.getSubscriptionStatusLabel(tenant.status || (tenant.is_active ? 'active' : 'suspended'))}
                  </Badge>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-indigo-700 mb-1">انقضا</div>
                  <div className="text-sm font-medium text-indigo-900">
                    {tenant.subscription_expires_at ? 
                      subscriptionService.formatExpiryDate(tenant.subscription_expires_at) : 
                      'نامحدود'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Content */}
          {isLoading ? (
            <Card variant="professional">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card variant="error">
              <CardContent className="p-6 text-center">
                <div className="text-red-600 mb-4">
                  خطا در بارگذاری تاریخچه اشتراک
                </div>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  تلاش مجدد
                </Button>
              </CardContent>
            </Card>
          ) : !historyData?.history?.length ? (
            <Card variant="professional">
              <CardContent className="p-12 text-center">
                <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">تاریخچه‌ای یافت نشد</h3>
                <p className="text-slate-500">هنوز هیچ تغییری در اشتراک این تنانت ثبت نشده است.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* History Timeline */}
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                
                {/* History Entries */}
                <div className="space-y-6">
                  {historyData.history.map((entry, index) => {
                    const ActionIcon = getActionIcon(entry.action);
                    const actionColor = getActionColor(entry.action);
                    const dateTime = formatDate(entry.change_date);
                    
                    return (
                      <div key={entry.id} className="relative">
                        {/* Timeline Dot */}
                        <div className={`absolute right-4 w-4 h-4 rounded-full border-2 border-white shadow-md ${
                          actionColor.includes('green') ? 'bg-green-500' :
                          actionColor.includes('red') ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}>
                        </div>
                        
                        {/* Entry Card */}
                        <div className="mr-12">
                          <Card variant="professional" className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <ActionIcon className={`h-5 w-5 ${actionColor}`} />
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant={getActionBadgeVariant(entry.action)}>
                                        {getActionLabel(entry.action)}
                                      </Badge>
                                      {entry.duration_months && (
                                        <Badge variant="outline">
                                          {entry.duration_months} ماه
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-slate-600">
                                      {entry.old_subscription_type && entry.new_subscription_type && 
                                       entry.old_subscription_type !== entry.new_subscription_type && (
                                        <span>
                                          از {subscriptionService.getSubscriptionTypeLabel(entry.old_subscription_type)} 
                                          {' '}به {subscriptionService.getSubscriptionTypeLabel(entry.new_subscription_type)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-left text-sm text-slate-500">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Calendar className="h-3 w-3" />
                                    {dateTime.date}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {dateTime.time}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Expiry Dates */}
                              {(entry.old_expiry_date || entry.new_expiry_date) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 p-3 bg-slate-50 rounded">
                                  {entry.old_expiry_date && (
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">انقضای قبلی</div>
                                      <div className="text-sm text-slate-700">
                                        {new Date(entry.old_expiry_date).toLocaleDateString('fa-IR')}
                                      </div>
                                    </div>
                                  )}
                                  {entry.new_expiry_date && (
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">انقضای جدید</div>
                                      <div className="text-sm text-slate-700">
                                        {new Date(entry.new_expiry_date).toLocaleDateString('fa-IR')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Reason */}
                              {entry.reason && (
                                <div className="mb-3">
                                  <div className="text-xs text-slate-500 mb-1">دلیل</div>
                                  <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                                    {entry.reason}
                                  </div>
                                </div>
                              )}
                              
                              {/* Notes */}
                              {entry.notes && (
                                <div className="mb-3">
                                  <div className="text-xs text-slate-500 mb-1">یادداشت</div>
                                  <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                                    {entry.notes}
                                  </div>
                                </div>
                              )}
                              
                              {/* Admin Info */}
                              {(entry.admin_email || entry.admin_name) && (
                                <div className="flex items-center gap-2 text-xs text-slate-500 border-t pt-2">
                                  <User className="h-3 w-3" />
                                  <span>
                                    توسط: {entry.admin_name || entry.admin_email}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Summary */}
              <Card variant="filter">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div>
                      مجموع {historyData.history.length} تغییر در تاریخچه اشتراک
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>فعال‌سازی/ارتقاء</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>تعلیق/کاهش سطح</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>سایر تغییرات</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionHistoryDialog;