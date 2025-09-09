import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/enhanced-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { 
  ArrowUpDown, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Package, 
  FileText,
  Calendar,
  Infinity
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { subscriptionService } from '@/services/subscriptionService';

interface SubscriptionPlanSwitchDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPlan: 'free' | 'pro', durationMonths?: number, reason?: string) => void;
  isLoading: boolean;
}

const SubscriptionPlanSwitchDialog: React.FC<SubscriptionPlanSwitchDialogProps> = ({
  tenant,
  isOpen,
  onClose,
  onSubmit,
  isLoading
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('free');
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [reason, setReason] = useState<string>('');
  const [errors, setErrors] = useState<{ durationMonths?: string; reason?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { durationMonths?: string; reason?: string } = {};
    
    if (selectedPlan === 'pro' && (!durationMonths || durationMonths < 1 || durationMonths > 36)) {
      newErrors.durationMonths = 'مدت زمان باید بین 1 تا 36 ماه باشد';
    }
    
    if (reason && reason.length > 500) {
      newErrors.reason = 'دلیل نباید بیش از 500 کاراکتر باشد';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onSubmit(selectedPlan, selectedPlan === 'pro' ? durationMonths : undefined, reason || undefined);
    }
  };

  const handleClose = () => {
    setSelectedPlan('free');
    setDurationMonths(12);
    setReason('');
    setErrors({});
    onClose();
  };

  const getPlanFeatures = (plan: 'free' | 'pro') => {
    if (plan === 'free') {
      return {
        name: 'رایگان',
        price: 'رایگان',
        features: [
          { icon: Users, text: '1 کاربر', limit: '1' },
          { icon: Package, text: '10 محصول', limit: '10' },
          { icon: Users, text: '10 مشتری', limit: '10' },
          { icon: FileText, text: '10 فاکتور در ماه', limit: '10' },
        ],
        color: 'slate',
        bgColor: 'bg-slate-50',
        borderColor: 'border-slate-200'
      };
    } else {
      return {
        name: 'حرفه‌ای',
        price: 'پولی',
        features: [
          { icon: Users, text: '5 کاربر', limit: '5' },
          { icon: Infinity, text: 'محصولات نامحدود', limit: 'نامحدود' },
          { icon: Infinity, text: 'مشتریان نامحدود', limit: 'نامحدود' },
          { icon: Infinity, text: 'فاکتورهای نامحدود', limit: 'نامحدود' },
        ],
        color: 'purple',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    }
  };

  const getCurrentPlanInfo = () => {
    if (!tenant) return null;
    return getPlanFeatures(tenant.subscription_type as 'free' | 'pro');
  };

  const getNewPlanInfo = () => {
    return getPlanFeatures(selectedPlan);
  };

  const isUpgrade = () => {
    if (!tenant) return false;
    return tenant.subscription_type === 'free' && selectedPlan === 'pro';
  };

  const isDowngrade = () => {
    if (!tenant) return false;
    return tenant.subscription_type === 'pro' && selectedPlan === 'free';
  };

  const calculateNewExpiryDate = () => {
    if (selectedPlan === 'free') return null;
    
    const now = new Date();
    return new Date(now.getTime() + (durationMonths * 30 * 24 * 60 * 60 * 1000));
  };

  const currentPlan = getCurrentPlanInfo();
  const newPlan = getNewPlanInfo();
  const newExpiryDate = calculateNewExpiryDate();

  if (!tenant || !currentPlan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-indigo-600" />
            تغییر نوع اشتراک
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
            
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-slate-600">نوع فعلی:</span>
                <Badge variant="outline" className="mr-2">
                  {subscriptionService.getSubscriptionTypeLabel(tenant.subscription_type)}
                </Badge>
              </div>
              {tenant.subscription_expires_at && (
                <div>
                  <span className="text-slate-600">انقضا:</span>
                  <span className="mr-2 text-slate-700">
                    {new Date(tenant.subscription_expires_at).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Plan Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-700">انتخاب نوع اشتراک جدید:</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Free Plan */}
              <Card 
                variant={selectedPlan === 'free' ? 'gradient-super-admin' : 'professional'}
                className={`cursor-pointer transition-all ${
                  selectedPlan === 'free' ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedPlan('free')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">رایگان</h3>
                      <p className="text-sm text-slate-500">برای شروع</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPlan === 'free' 
                        ? 'bg-indigo-600 border-indigo-600' 
                        : 'border-slate-300'
                    }`}>
                      {selectedPlan === 'free' && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {getPlanFeatures('free').features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <feature.icon className="h-4 w-4 text-slate-500" />
                        <span className="text-slate-700">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card 
                variant={selectedPlan === 'pro' ? 'gradient-tenant' : 'professional'}
                className={`cursor-pointer transition-all ${
                  selectedPlan === 'pro' ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedPlan('pro')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">حرفه‌ای</h3>
                      <p className="text-sm text-slate-500">برای کسب‌وکارها</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedPlan === 'pro' 
                        ? 'bg-purple-600 border-purple-600' 
                        : 'border-slate-300'
                    }`}>
                      {selectedPlan === 'pro' && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {getPlanFeatures('pro').features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <feature.icon className="h-4 w-4 text-purple-500" />
                        <span className="text-slate-700">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Duration for Pro Plan */}
          {selectedPlan === 'pro' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration" className="text-sm font-medium text-slate-700">
                  مدت زمان اشتراک (ماه) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="36"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(parseInt(e.target.value) || 12)}
                  className={errors.durationMonths ? 'border-red-500' : ''}
                  placeholder="تعداد ماه..."
                />
                {errors.durationMonths && (
                  <p className="text-sm text-red-600 mt-1">{errors.durationMonths}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  حداقل 1 ماه و حداکثر 36 ماه
                </p>
              </div>

              {/* Quick Duration Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">انتخاب سریع:</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 3, 6, 12, 24].map((monthOption) => (
                    <Button
                      key={monthOption}
                      type="button"
                      variant={durationMonths === monthOption ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDurationMonths(monthOption)}
                    >
                      {monthOption} ماه
                    </Button>
                  ))}
                </div>
              </div>

              {/* New Expiry Preview */}
              {newExpiryDate && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-800">تاریخ انقضای جدید</span>
                  </div>
                  <div className="text-sm text-purple-700">
                    {newExpiryDate.toLocaleDateString('fa-IR')}
                    <span className="text-purple-600 mr-2">
                      ({durationMonths} ماه)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
              دلیل تغییر نوع اشتراک (اختیاری)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={errors.reason ? 'border-red-500' : ''}
              placeholder="دلیل تغییر نوع اشتراک را وارد کنید..."
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

          {/* Change Summary */}
          <div className={`border rounded-lg p-4 ${
            isUpgrade() ? 'bg-green-50 border-green-200' : 
            isDowngrade() ? 'bg-orange-50 border-orange-200' : 
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isUpgrade() ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">ارتقاء اشتراک</span>
                </>
              ) : isDowngrade() ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">کاهش سطح اشتراک</span>
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">تغییر نوع اشتراک</span>
                </>
              )}
            </div>
            
            <div className="text-sm space-y-1">
              <div>
                <span className="text-slate-600">از:</span>
                <span className="font-medium mr-2">{currentPlan.name}</span>
              </div>
              <div>
                <span className="text-slate-600">به:</span>
                <span className="font-medium mr-2">{newPlan.name}</span>
              </div>
              {selectedPlan === 'pro' && newExpiryDate && (
                <div>
                  <span className="text-slate-600">انقضای جدید:</span>
                  <span className="font-medium mr-2">
                    {newExpiryDate.toLocaleDateString('fa-IR')}
                  </span>
                </div>
              )}
            </div>

            {isDowngrade() && (
              <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <div className="font-medium mb-1">هشدار کاهش سطح اشتراک</div>
                    <div>با کاهش سطح اشتراک، محدودیت‌های نوع رایگان اعمال خواهد شد.</div>
                  </div>
                </div>
              </div>
            )}
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
                  در حال تغییر...
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4" />
                  تغییر نوع اشتراک
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlanSwitchDialog;