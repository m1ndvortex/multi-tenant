import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/enhanced-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { subscriptionService } from '@/services/subscriptionService';

interface SubscriptionExtensionDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (months: number, reason?: string) => void;
  isLoading: boolean;
}

const SubscriptionExtensionDialog: React.FC<SubscriptionExtensionDialogProps> = ({
  tenant,
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [months, setMonths] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<{ months?: string; reason?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { months?: string; reason?: string } = {};
    
    if (!months || months < 1 || months > 36) {
      newErrors.months = 'تعداد ماه باید بین 1 تا 36 باشد';
    }
    
    if (reason && reason.length > 500) {
      newErrors.reason = 'دلیل نباید بیش از 500 کاراکتر باشد';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(months, reason || undefined);
    }
  };

  const handleClose = () => {
    setMonths(1);
    setReason('');
    setErrors({});
    onClose();
  };

  const calculateNewExpiryDate = () => {
    if (!tenant?.subscription_expires_at) {
      const now = new Date();
      return new Date(now.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
    }
    
    const currentExpiry = new Date(tenant.subscription_expires_at);
    const now = new Date();
    
    // If already expired, start from now
    if (currentExpiry < now) {
      return new Date(now.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
    }
    
    // Otherwise, extend from current expiry
    return new Date(currentExpiry.getTime() + (months * 30 * 24 * 60 * 60 * 1000));
  };

  const getExpiryStatus = () => {
    if (!tenant?.subscription_expires_at) return null;
    
    const now = new Date();
    const expiry = new Date(tenant.subscription_expires_at);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        status: 'expired',
        message: `منقضی شده (${Math.abs(diffDays)} روز پیش)`,
        color: 'text-red-600',
        icon: AlertTriangle
      };
    } else if (diffDays <= 7) {
      return {
        status: 'expiring_soon',
        message: `${diffDays} روز باقی مانده`,
        color: 'text-orange-600',
        icon: AlertTriangle
      };
    } else {
      return {
        status: 'active',
        message: `${diffDays} روز باقی مانده`,
        color: 'text-green-600',
        icon: CheckCircle
      };
    }
  };

  const expiryStatus = getExpiryStatus();
  const newExpiryDate = calculateNewExpiryDate();

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            تمدید اشتراک
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
                <Badge variant="default" className="mr-2 bg-purple-600">
                  {subscriptionService.getSubscriptionTypeLabel(tenant.subscription_type)}
                </Badge>
              </div>
              <div>
                <span className="text-slate-600">وضعیت:</span>
                <Badge variant="outline" className="mr-2">
                  {subscriptionService.getSubscriptionStatusLabel(tenant.status || (tenant.is_active ? 'active' : 'suspended'))}
                </Badge>
              </div>
            </div>
          </div>

          {/* Current Expiry Status */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-700">وضعیت فعلی اشتراک</span>
            </div>
            
            {tenant.subscription_expires_at ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {expiryStatus && (
                    <>
                      <expiryStatus.icon className={`h-4 w-4 ${expiryStatus.color}`} />
                      <span className={expiryStatus.color}>{expiryStatus.message}</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-slate-500">
                  انقضا: {new Date(tenant.subscription_expires_at).toLocaleDateString('fa-IR')}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600">اشتراک نامحدود</span>
              </div>
            )}
          </div>

          {/* Extension Settings */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="months" className="text-sm font-medium text-slate-700">
                تعداد ماه برای تمدید *
              </Label>
              <Input
                id="months"
                type="number"
                min="1"
                max="36"
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
                className={errors.months ? 'border-red-500' : ''}
                placeholder="تعداد ماه..."
              />
              {errors.months && (
                <p className="text-sm text-red-600 mt-1">{errors.months}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                حداقل 1 ماه و حداکثر 36 ماه
              </p>
            </div>

            <div>
              <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
                دلیل تمدید (اختیاری)
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={errors.reason ? 'border-red-500' : ''}
                placeholder="دلیل تمدید اشتراک را وارد کنید..."
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
          </div>

          {/* Preview New Expiry */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">تاریخ انقضای جدید</span>
            </div>
            <div className="text-sm text-green-700">
              {newExpiryDate.toLocaleDateString('fa-IR')} 
              <span className="text-green-600 mr-2">
                (+{months} ماه)
              </span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              {subscriptionService.formatExpiryDate(newExpiryDate.toISOString())}
            </div>
          </div>

          {/* Quick Selection Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">انتخاب سریع:</Label>
            <div className="flex gap-2 flex-wrap">
              {[1, 3, 6, 12].map((monthOption) => (
                <Button
                  key={monthOption}
                  type="button"
                  variant={months === monthOption ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMonths(monthOption)}
                >
                  {monthOption} ماه
                </Button>
              ))}
            </div>
          </div>

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
              variant="gradient"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  در حال تمدید...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  تمدید اشتراک
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionExtensionDialog;