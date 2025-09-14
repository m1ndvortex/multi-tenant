/**
 * Subscription Plan Switch Dialog Component
 * Allows switching between subscription plans with immediate effect
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TenantSubscription, 
  SubscriptionPlanSwitchRequest, 
  SubscriptionType,
  TenantStatus
} from '@/types/subscription';
import { NeonText, CyberSpinner } from '@/components/animations/CyberAnimations';
import { createModalAnimation } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

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

  const modalAnimation = createModalAnimation();

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={`sm:max-w-[600px] ${glassmorphismClasses.modal} border-cyan-500/20 bg-gray-900/95`} dir="rtl">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalAnimation.content}
            >
              <DialogHeader className="space-y-3">
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,212,255,0.8)]"></div>
                  <NeonText color="#00D4FF" intensity="high">
                    تغییر پلن اشتراک
                  </NeonText>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  تغییر پلن اشتراک با اثر فوری بر دسترسی‌های تنانت
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
                      <span className="text-gray-400">وضعیت:</span>
                      <motion.div whileHover={{ scale: 1.05 }}>
                        <Badge 
                          variant={getStatusBadgeVariant(tenant.status)}
                          className={`${
                            tenant.status === TenantStatus.ACTIVE 
                              ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-400/30 text-cyan-300 shadow-[0_0_8px_rgba(0,212,255,0.3)]'
                              : tenant.status === TenantStatus.SUSPENDED
                              ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-400/30 text-orange-300 shadow-[0_0_8px_rgba(255,107,53,0.3)]'
                              : 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/30 text-red-300 shadow-[0_0_8px_rgba(255,71,87,0.3)]'
                          }`}
                        >
                          {tenant.status === TenantStatus.ACTIVE ? 'فعال' : 
                           tenant.status === TenantStatus.SUSPENDED ? 'تعلیق' : 'لغو شده'}
                        </Badge>
                      </motion.div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">پلن فعلی:</span>
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

                {/* Plan Selection */}
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div>
                    <Label htmlFor="newPlan" className="text-white mb-2 block">
                      <NeonText color="#00D4FF" intensity="low">
                        پلن جدید
                      </NeonText>
                    </Label>
                    <motion.div whileHover={{ scale: 1.02 }}>
                      <Select value={newPlan} onValueChange={(value) => setNewPlan(value as SubscriptionType)}>
                        <SelectTrigger className={`${glassmorphismClasses.base} border-white/10 focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(0,212,255,0.3)] bg-white/5 text-white transition-all duration-300`}>
                          <SelectValue placeholder="پلن جدید را انتخاب کنید" />
                        </SelectTrigger>
                        <SelectContent className={`${glassmorphismClasses.elevated} border-white/10 bg-gray-900/95`}>
                          <SelectItem value={SubscriptionType.FREE} className="text-white hover:bg-white/10">رایگان</SelectItem>
                          <SelectItem value={SubscriptionType.PRO} className="text-white hover:bg-white/10">حرفه‌ای</SelectItem>
                        </SelectContent>
                      </Select>
                    </motion.div>
                  </div>

                  {/* Duration for Pro Plan */}
                  <AnimatePresence>
                    {newPlan === SubscriptionType.PRO && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Label htmlFor="duration" className="text-white mb-2 block">
                          <NeonText color="#00FF88" intensity="low">
                            مدت اشتراک (ماه)
                          </NeonText>
                        </Label>
                        <motion.div whileHover={{ scale: 1.02 }} whileFocus={{ scale: 1.02 }}>
                          <Input
                            id="duration"
                            type="number"
                            min="1"
                            max="60"
                            value={durationMonths}
                            onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                            className={`${glassmorphismClasses.base} border-white/10 focus:border-emerald-400/50 focus:shadow-[0_0_20px_rgba(0,255,136,0.3)] bg-white/5 text-white placeholder:text-gray-400 transition-all duration-300`}
                            required
                          />
                        </motion.div>
                        <p className="text-xs text-gray-400 mt-1">
                          حداقل ۱ ماه و حداکثر ۶۰ ماه
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <Label htmlFor="reason" className="text-white mb-2 block">
                      <NeonText color="#A55EEA" intensity="low">
                        دلیل تغییر پلن (اختیاری)
                      </NeonText>
                    </Label>
                    <motion.div whileHover={{ scale: 1.02 }} whileFocus={{ scale: 1.02 }}>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="دلیل تغییر پلن را وارد کنید..."
                        className={`${glassmorphismClasses.base} border-white/10 focus:border-purple-400/50 focus:shadow-[0_0_20px_rgba(165,94,234,0.3)] bg-white/5 text-white placeholder:text-gray-400 transition-all duration-300 resize-none`}
                        rows={3}
                      />
                    </motion.div>
                  </div>
                </motion.div>

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
                <motion.div 
                  className={`${glassmorphismClasses.base} p-4 rounded-lg border ${
                    isUpgrade ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10' : 
                    isDowngrade ? 'border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/10' : 
                    'border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-cyan-600/10'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isUpgrade ? 'bg-emerald-400 shadow-[0_0_8px_rgba(0,255,136,0.8)]' : 
                      isDowngrade ? 'bg-red-400 shadow-[0_0_8px_rgba(255,71,87,0.8)]' : 
                      'bg-cyan-400 shadow-[0_0_8px_rgba(0,212,255,0.8)]'
                    }`}></div>
                    <NeonText 
                      color={isUpgrade ? '#00FF88' : isDowngrade ? '#FF4757' : '#00D4FF'} 
                      intensity="medium"
                    >
                      پیش‌نمایش تغییرات
                    </NeonText>
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">نوع تغییر:</span>
                      <span className={`font-medium ${
                        isUpgrade ? 'text-emerald-300' : 
                        isDowngrade ? 'text-red-300' : 
                        'text-cyan-300'
                      }`}>
                        {isUpgrade ? 'ارتقاء' : isDowngrade ? 'تنزل' : 'تغییر'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">انقضای جدید:</span>
                      <span className={`font-medium ${
                        isUpgrade ? 'text-emerald-300' : 
                        isDowngrade ? 'text-red-300' : 
                        'text-cyan-300'
                      }`}>
                        {calculateNewExpiryDate()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">اثر:</span>
                      <motion.span 
                        className={`font-medium ${
                          isUpgrade ? 'text-emerald-300' : 
                          isDowngrade ? 'text-red-300' : 
                          'text-cyan-300'
                        }`}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        فوری
                      </motion.span>
                    </div>
                  </div>
                </motion.div>

                {/* Warning for Downgrade */}
                <AnimatePresence>
                  {isDowngrade && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert className={`${glassmorphismClasses.base} border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/10`}>
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-4 h-4 text-red-400 inline-block ml-2"
                        >
                          ⚠️
                        </motion.div>
                        <AlertDescription className="text-red-300">
                          <strong>هشدار:</strong> تنزل پلن ممکن است محدودیت‌هایی را برای تنانت ایجاد کند. 
                          اطمینان حاصل کنید که تنانت از این تغییرات آگاه است.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      disabled={loading || (newPlan === SubscriptionType.PRO && (durationMonths < 1 || durationMonths > 60))}
                      className={`${glassmorphismClasses.base} ${
                        isDowngrade 
                          ? 'border-red-500/30 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(255,71,87,0.3)] bg-red-500/10 text-red-300 hover:bg-red-500/20'
                          : 'border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                      } transition-all duration-300 disabled:opacity-50`}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <CyberSpinner size="sm" color={isDowngrade ? "#FF4757" : "#00D4FF"} />
                          <span>در حال اعمال...</span>
                        </div>
                      ) : (
                        <NeonText color={isDowngrade ? "#FF4757" : "#00D4FF"} intensity="low">
                          تغییر پلن
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

export default SubscriptionPlanSwitchDialog;