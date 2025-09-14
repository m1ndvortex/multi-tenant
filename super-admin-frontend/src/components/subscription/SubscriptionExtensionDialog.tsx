/**
 * Subscription Extension Dialog Component
 * Allows manual extension of tenant subscriptions
 * Enhanced with cybersecurity theme, glassmorphism, and neon effects
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { NeonText, CyberSpinner } from '@/components/animations/CyberAnimations';
import { createModalAnimation } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

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

  const modalAnimation = createModalAnimation();

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={`sm:max-w-[500px] ${glassmorphismClasses.modal} border-emerald-500/20 bg-gray-900/95`} dir="rtl">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalAnimation.content}
            >
              <DialogHeader className="space-y-3">
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,136,0.8)]"></div>
                  <NeonText color="#00FF88" intensity="high">
                    تمدید اشتراک
                  </NeonText>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  تمدید اشتراک تنانت با کنترل کامل دستی
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tenant Info */}
                <motion.div 
                  className={`${glassmorphismClasses.base} p-4 rounded-lg border border-white/10`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <NeonText color="#00FF88" intensity="medium">
                      اطلاعات تنانت
                    </NeonText>
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">نام:</span>
                      <span className="font-medium text-white">{tenant.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">ایمیل:</span>
                      <span className="font-medium text-white">{tenant.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">نوع اشتراک فعلی:</span>
                      <motion.div whileHover={{ scale: 1.05 }}>
                        <Badge 
                          variant={tenant.subscription_type === SubscriptionType.PRO ? 'default' : 'secondary'}
                          className={`${
                            tenant.subscription_type === SubscriptionType.PRO 
                              ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-400/30 text-emerald-300 shadow-[0_0_8px_rgba(0,255,136,0.3)]'
                              : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400/30 text-gray-300 shadow-[0_0_8px_rgba(156,163,175,0.3)]'
                          }`}
                        >
                          {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                        </Badge>
                      </motion.div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">انقضای فعلی:</span>
                      <span className="font-medium text-white">{formatDate(tenant.subscription_expires_at)}</span>
                    </div>
                  </div>
                </motion.div>

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

                <DialogFooter className="gap-3 pt-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                      className={`${glassmorphismClasses.base} border-gray-500/30 hover:border-gray-400/50 hover:shadow-[0_0_15px_rgba(156,163,175,0.3)] bg-white/5 text-gray-300 hover:bg-gray-500/10 transition-all duration-300`}
                    >
                      انصراف
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      type="submit" 
                      disabled={loading || months < 1 || months > 60}
                      className={`${glassmorphismClasses.base} border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all duration-300 disabled:opacity-50`}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <CyberSpinner size="sm" color="#00FF88" />
                          <span>در حال تمدید...</span>
                        </div>
                      ) : (
                        <NeonText color="#00FF88" intensity="low">
                          تمدید اشتراک
                        </NeonText>
                      )}
                    </Button>
                  </motion.div>
                </DialogFooter>
              </form>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default SubscriptionExtensionDialog;