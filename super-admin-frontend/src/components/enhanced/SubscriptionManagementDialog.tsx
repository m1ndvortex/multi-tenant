import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/enhanced-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/enhanced-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  CreditCard, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Settings
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface SubscriptionManagementDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onExtendSubscription: (tenantId: string, months: number, reason?: string) => void;
  onChangePlan: (tenantId: string, newPlan: 'free' | 'pro', reason?: string) => void;
  onActivateSubscription: (tenantId: string, reason?: string) => void;
  onDeactivateSubscription: (tenantId: string, reason?: string) => void;
  isLoading?: boolean;
}

type ActionType = 'extend' | 'changePlan' | 'activate' | 'deactivate' | null;

const SubscriptionManagementDialog: React.FC<SubscriptionManagementDialogProps> = ({
  tenant,
  isOpen,
  onClose,
  onExtendSubscription,
  onChangePlan,
  onActivateSubscription,
  onDeactivateSubscription,
  isLoading = false,
}) => {
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [extensionMonths, setExtensionMonths] = useState(12);
  const [newPlan, setNewPlan] = useState<'free' | 'pro'>('pro');
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (isOpen && tenant) {
      setActiveAction(null);
      setExtensionMonths(12);
      setNewPlan(tenant.subscription_type === 'free' ? 'pro' : 'free');
      setReason('');
    }
  }, [isOpen, tenant]);

  const getSubscriptionStatus = () => {
    if (!tenant) return null;

    const status = tenant.status || (tenant.is_active ? 'active' : 'suspended');
    const isExpired = tenant.subscription_expires_at && new Date(tenant.subscription_expires_at) < new Date();

    return {
      status,
      isExpired,
      isActive: status === 'active',
      isPro: tenant.subscription_type === 'pro',
    };
  };

  const getExpirationInfo = () => {
    if (!tenant?.subscription_expires_at) return null;

    const expirationDate = new Date(tenant.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      date: expirationDate,
      daysUntilExpiration,
      isExpired: daysUntilExpiration < 0,
      isExpiringSoon: daysUntilExpiration <= 30 && daysUntilExpiration >= 0,
      formattedDistance: formatDistanceToNow(expirationDate, { addSuffix: true, locale: faIR }),
    };
  };

  const handleExtendSubscription = () => {
    if (!tenant || extensionMonths < 1) return;
    onExtendSubscription(tenant.id, extensionMonths, reason.trim() || undefined);
  };

  const handleChangePlan = () => {
    if (!tenant) return;
    onChangePlan(tenant.id, newPlan, reason.trim() || undefined);
  };

  const handleActivateSubscription = () => {
    if (!tenant) return;
    onActivateSubscription(tenant.id, reason.trim() || undefined);
  };

  const handleDeactivateSubscription = () => {
    if (!tenant) return;
    onDeactivateSubscription(tenant.id, reason.trim() || undefined);
  };

  const subscriptionStatus = getSubscriptionStatus();
  const expirationInfo = getExpirationInfo();

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            مدیریت اشتراک تنانت
          </DialogTitle>
        </DialogHeader>

        {/* Tenant Info Card */}
        <Card variant="gradient-super-admin">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 font-bold">
                    {tenant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{tenant.name}</h3>
                  <p className="text-sm text-slate-600">ID: {tenant.id.slice(0, 8)}...</p>
                </div>
              </div>
              <div className="text-right">
                <Badge 
                  variant="default" 
                  className={
                    tenant.subscription_type === 'pro' 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                      : 'bg-slate-100 text-slate-700'
                  }
                >
                  {tenant.subscription_type === 'pro' ? 'حرفه‌ای' : 'رایگان'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Subscription Status */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="text-lg">وضعیت فعلی اشتراک</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">نوع اشتراک</p>
                <Badge 
                  variant="default" 
                  className={
                    subscriptionStatus?.isPro 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                      : 'bg-slate-100 text-slate-700'
                  }
                >
                  {subscriptionStatus?.isPro ? 'حرفه‌ای' : 'رایگان'}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-slate-600 mb-1">وضعیت</p>
                <Badge 
                  variant="default" 
                  className={
                    subscriptionStatus?.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }
                >
                  {subscriptionStatus?.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
              </div>
            </div>

            {expirationInfo && (
              <div>
                <p className="text-sm text-slate-600 mb-2">تاریخ انقضا</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">
                    {expirationInfo.date.toLocaleDateString('fa-IR')}
                  </span>
                  <span className="text-sm text-slate-500">
                    ({expirationInfo.formattedDistance})
                  </span>
                </div>
                
                {expirationInfo.isExpired && (
                  <Alert className="mt-2 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      اشتراک منقضی شده است
                    </AlertDescription>
                  </Alert>
                )}
                
                {expirationInfo.isExpiringSoon && (
                  <Alert className="mt-2 border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      اشتراک در {expirationInfo.daysUntilExpiration} روز آینده منقضی می‌شود
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!activeAction && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Extend Subscription */}
            {subscriptionStatus?.isPro && (
              <Button
                variant="outline"
                onClick={() => setActiveAction('extend')}
                className="flex items-center gap-2 h-auto p-4"
              >
                <Plus className="h-5 w-5 text-green-600" />
                <div className="text-right">
                  <div className="font-medium">تمدید اشتراک</div>
                  <div className="text-sm text-slate-500">افزودن ماه به اشتراک</div>
                </div>
              </Button>
            )}

            {/* Change Plan */}
            <Button
              variant="outline"
              onClick={() => setActiveAction('changePlan')}
              className="flex items-center gap-2 h-auto p-4"
            >
              {subscriptionStatus?.isPro ? (
                <ArrowDownCircle className="h-5 w-5 text-orange-600" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              )}
              <div className="text-right">
                <div className="font-medium">
                  {subscriptionStatus?.isPro ? 'تبدیل به رایگان' : 'ارتقا به حرفه‌ای'}
                </div>
                <div className="text-sm text-slate-500">تغییر نوع اشتراک</div>
              </div>
            </Button>

            {/* Activate/Deactivate */}
            {subscriptionStatus?.isActive ? (
              <Button
                variant="outline"
                onClick={() => setActiveAction('deactivate')}
                className="flex items-center gap-2 h-auto p-4"
              >
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div className="text-right">
                  <div className="font-medium">تعلیق اشتراک</div>
                  <div className="text-sm text-slate-500">غیرفعال کردن موقت</div>
                </div>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setActiveAction('activate')}
                className="flex items-center gap-2 h-auto p-4"
              >
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="text-right">
                  <div className="font-medium">فعال‌سازی اشتراک</div>
                  <div className="text-sm text-slate-500">بازگشت به حالت فعال</div>
                </div>
              </Button>
            )}
          </div>
        )}

        {/* Action Forms */}
        {activeAction === 'extend' && (
          <Card variant="gradient-super-admin">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                تمدید اشتراک
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  تعداد ماه برای تمدید
                </label>
                <Select
                  value={extensionMonths.toString()}
                  onValueChange={(value) => setExtensionMonths(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">۱ ماه</SelectItem>
                    <SelectItem value="3">۳ ماه</SelectItem>
                    <SelectItem value="6">۶ ماه</SelectItem>
                    <SelectItem value="12">۱۲ ماه</SelectItem>
                    <SelectItem value="24">۲۴ ماه</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  دلیل تمدید (اختیاری)
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="دلیل تمدید اشتراک..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleExtendSubscription}
                  disabled={isLoading}
                  className="flex-1"
                  variant="gradient"
                >
                  {isLoading ? 'در حال تمدید...' : `تمدید ${extensionMonths} ماهه`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  disabled={isLoading}
                >
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeAction === 'changePlan' && (
          <Card variant="gradient-super-admin">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {newPlan === 'pro' ? (
                  <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-orange-600" />
                )}
                تغییر نوع اشتراک
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  نوع اشتراک جدید
                </label>
                <Select
                  value={newPlan}
                  onValueChange={(value: 'free' | 'pro') => setNewPlan(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">رایگان</SelectItem>
                    <SelectItem value="pro">حرفه‌ای</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  تغییر نوع اشتراک تأثیر فوری بر محدودیت‌های تنانت خواهد داشت.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  دلیل تغییر (اختیاری)
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="دلیل تغییر نوع اشتراک..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleChangePlan}
                  disabled={isLoading}
                  className="flex-1"
                  variant="gradient"
                >
                  {isLoading ? 'در حال تغییر...' : `تغییر به ${newPlan === 'pro' ? 'حرفه‌ای' : 'رایگان'}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  disabled={isLoading}
                >
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(activeAction === 'activate' || activeAction === 'deactivate') && (
          <Card variant="gradient-super-admin">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {activeAction === 'activate' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                )}
                {activeAction === 'activate' ? 'فعال‌سازی اشتراک' : 'تعلیق اشتراک'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {activeAction === 'activate' 
                    ? 'فعال‌سازی اشتراک دسترسی کامل تنانت را بازگردانی می‌کند.'
                    : 'تعلیق اشتراک دسترسی تنانت را محدود می‌کند.'
                  }
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  دلیل {activeAction === 'activate' ? 'فعال‌سازی' : 'تعلیق'} (اختیاری)
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`دلیل ${activeAction === 'activate' ? 'فعال‌سازی' : 'تعلیق'} اشتراک...`}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={activeAction === 'activate' ? handleActivateSubscription : handleDeactivateSubscription}
                  disabled={isLoading}
                  className="flex-1"
                  variant={activeAction === 'activate' ? 'gradient' : 'destructive'}
                >
                  {isLoading 
                    ? `در حال ${activeAction === 'activate' ? 'فعال‌سازی' : 'تعلیق'}...` 
                    : activeAction === 'activate' ? 'فعال‌سازی اشتراک' : 'تعلیق اشتراک'
                  }
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveAction(null)}
                  disabled={isLoading}
                >
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Close Button */}
        {!activeAction && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              بستن
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionManagementDialog;