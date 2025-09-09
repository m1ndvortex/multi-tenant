import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle, 
  Settings,
  Clock,
  Shield
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { subscriptionService } from '@/services/subscriptionService';

interface SubscriptionStatusDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (activate: boolean, subscriptionType?: 'free' | 'pro', reason?: string) => void;
  isLoading: boolean;
}

const SubscriptionStatusDialog: React.FC<SubscriptionStatusDialogProps> = ({
  tenant,
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [action, setAction] = useState<'activate' | 'deactivate'>('activate');
  const [subscriptionType, setSubscriptionType] = useState<'free' | 'pro'>('free');
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<{ reason?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { reason?: string } = {};
    
    if (reason && reason.length > 500) {
      newErrors.reason = 'دلیل نباید بیش از 500 کاراکتر باشد';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      const activate = action === 'activate';
      onSubmit(
        activate, 
        activate ? subscriptionType : undefined, 
        reason || undefined
      );
    }
  };

  const handleClose = () => {
    setAction('activate');
    setSubscriptionType('free');
    setReason('');
    setErrors({});
    onClose();
  };

  const getCurrentStatus = () => {
    if (!tenant) return null;
    
    const status = tenant.status || (tenant.is_active ? 'active' : 'suspended');
    const isActive = status === 'active';
    
    return {
      isActive,
      status,
      label: subscriptionService.getSubscriptionStatusLabel(status),
      color: isActive ? 'text-green-600' : 'text-red-600',
      bgColor: isActive ? 'bg-green-50' : 'bg-red-50',
      borderColor: isActive ? 'border-green-200' : 'border-red-200',
      icon: isActive ? CheckCircle : AlertTriangle
    };
  };

  const getActionInfo = () => {
    const currentStatus = getCurrentStatus();
    if (!currentStatus) return null;

    if (action === 'activate') {
      return {
        title: 'فعال‌سازی اشتراک',
        description: 'اشتراک تنانت فعال شده و دسترسی کامل خواهد داشت',
        icon: Play,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else {
      return {
        title: 'تعلیق اشتراک',
        description: 'اشتراک تنانت تعلیق شده و دسترسی محدود خواهد شد',
        icon: Pause,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }
  };

  const getRecommendedAction = () => {
    const currentStatus = getCurrentStatus();
    if (!currentStatus) return 'activate';
    
    return currentStatus.isActive ? 'deactivate' : 'activate';
  };

  // Set recommended action on dialog open
  React.useEffect(() => {
    if (isOpen && tenant) {
      const recommended = getRecommendedAction();
      setAction(recommended);
      setSubscriptionType(tenant.subscription_type as 'free' | 'pro' || 'free');
    }
  }, [isOpen, tenant]);

  const currentStatus = getCurrentStatus();
  const actionInfo = getActionInfo();

  if (!tenant || !currentStatus || !actionInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-600" />
            مدیریت وضعیت اشتراک
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Info */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{tenant.name}</div>
                <div className="text-sm text-slate-500">{tenant.email}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">نوع اشتراک:</span>
                <Badge variant="outline" className="mr-2">
                  {subscriptionService.getSubscriptionTypeLabel(tenant.subscription_type)}
                </Badge>
              </div>
              <div>
                <span className="text-slate-600">وضعیت فعلی:</span>
                <Badge 
                  variant={currentStatus.isActive ? "default" : "destructive"} 
                  className="mr-2"
                >
                  {currentStatus.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className={`border rounded-lg p-4 ${currentStatus.bgColor} ${currentStatus.borderColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <currentStatus.icon className={`h-4 w-4 ${currentStatus.color}`} />
              <span className="font-medium text-slate-700">وضعیت فعلی اشتراک</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className={currentStatus.color}>
                {currentStatus.isActive ? 'اشتراک فعال است' : 'اشتراک تعلیق شده است'}
              </div>
              
              {tenant.subscription_expires_at && (
                <div className="text-slate-600">
                  انقضا: {new Date(tenant.subscription_expires_at).toLocaleDateString('fa-IR')}
                  <span className="mr-2">
                    ({subscriptionService.formatExpiryDate(tenant.subscription_expires_at)})
                  </span>
                </div>
              )}
              
              {tenant.last_activity_at && (
                <div className="text-slate-500 text-xs">
                  آخرین فعالیت: {new Date(tenant.last_activity_at).toLocaleDateString('fa-IR')}
                </div>
              )}
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-700">انتخاب عملیات:</Label>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Activate Option */}
              <Card 
                variant={action === 'activate' ? 'success' : 'professional'}
                className={`cursor-pointer transition-all ${
                  action === 'activate' ? 'ring-2 ring-green-500' : 'hover:shadow-md'
                }`}
                onClick={() => setAction('activate')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      action === 'activate' 
                        ? 'bg-green-600 border-green-600' 
                        : 'border-slate-300'
                    }`}>
                      {action === 'activate' && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <Play className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium text-slate-900">فعال‌سازی اشتراک</div>
                      <div className="text-sm text-slate-500">تنانت دسترسی کامل خواهد داشت</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deactivate Option */}
              <Card 
                variant={action === 'deactivate' ? 'warning' : 'professional'}
                className={`cursor-pointer transition-all ${
                  action === 'deactivate' ? 'ring-2 ring-orange-500' : 'hover:shadow-md'
                }`}
                onClick={() => setAction('deactivate')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      action === 'deactivate' 
                        ? 'bg-orange-600 border-orange-600' 
                        : 'border-slate-300'
                    }`}>
                      {action === 'deactivate' && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <Pause className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="font-medium text-slate-900">تعلیق اشتراک</div>
                      <div className="text-sm text-slate-500">دسترسی تنانت محدود خواهد شد</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Subscription Type Selection (for activation) */}
          {action === 'activate' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700">نوع اشتراک برای فعال‌سازی:</Label>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={subscriptionType === 'free' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSubscriptionType('free')}
                  className="flex-1"
                >
                  رایگان
                </Button>
                <Button
                  type="button"
                  variant={subscriptionType === 'pro' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSubscriptionType('pro')}
                  className="flex-1"
                >
                  حرفه‌ای
                </Button>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
              دلیل تغییر وضعیت (اختیاری)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={errors.reason ? 'border-red-500' : ''}
              placeholder="دلیل تغییر وضعیت اشتراک را وارد کنید..."
              rows={3}
              maxLength={500}
            />
            {errors.reason && (
              <p className="text-sm text-red-600 mt-1">{errors.reason}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {reason.length}/500 کاراکتر
            </p>
          </div>

          {/* Action Preview */}
          <div className={`border rounded-lg p-4 ${actionInfo.bgColor} ${actionInfo.borderColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <actionInfo.icon className={`h-4 w-4 ${actionInfo.color}`} />
              <span className="font-medium text-slate-800">{actionInfo.title}</span>
            </div>
            <div className="text-sm text-slate-700">
              {actionInfo.description}
            </div>
            
            {action === 'activate' && (
              <div className="mt-2 text-sm text-slate-600">
                نوع اشتراک: <span className="font-medium">
                  {subscriptionService.getSubscriptionTypeLabel(subscriptionType)}
                </span>
              </div>
            )}
          </div>

          {/* Warning for deactivation */}
          {action === 'deactivate' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <div className="font-medium mb-1">هشدار تعلیق اشتراک</div>
                  <div>با تعلیق اشتراک، تنانت قادر به استفاده از سیستم نخواهد بود تا زمانی که مجدداً فعال شود.</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant={action === 'activate' ? "default" : "destructive"}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  در حال اعمال...
                </>
              ) : (
                <>
                  <actionInfo.icon className="h-4 w-4" />
                  {actionInfo.title}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionStatusDialog;