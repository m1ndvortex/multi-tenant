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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, User, Clock, FileText, ExternalLink, Monitor, Shield, Zap } from 'lucide-react';
import { User as UserType } from '@/types/impersonation';

interface ImpersonationStartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    target_user_id: string;
    duration_hours: number;
    reason?: string;
    is_window_based?: boolean;
  }) => void;
  user: UserType | null;
  isLoading?: boolean;
}

const ImpersonationStartDialog: React.FC<ImpersonationStartDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false,
}) => {
  const [durationHours, setDurationHours] = useState<number>(2);
  const [reason, setReason] = useState<string>('');
  const [isWindowBased, setIsWindowBased] = useState<boolean>(true);

  const handleConfirm = () => {
    if (!user) return;

    onConfirm({
      target_user_id: user.id,
      duration_hours: durationHours,
      reason: reason.trim() || undefined,
      is_window_based: isWindowBased,
    });
  };

  const handleClose = () => {
    setDurationHours(2);
    setReason('');
    setIsWindowBased(true);
    onClose();
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-2xl backdrop-blur-[25px] saturate-[200%] bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        "0 0 10px rgba(0,212,255,0.4)",
                        "0 0 20px rgba(0,212,255,0.6)",
                        "0 0 10px rgba(0,212,255,0.4)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30"
                  >
                    <User className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
                  </motion.div>
                  شروع جانشینی کاربر
                </DialogTitle>
                <DialogDescription className="text-gray-300 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
                  شما در حال شروع جلسه جانشینی برای کاربر زیر هستید. لطفاً اطلاعات مورد نیاز را تکمیل کنید.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Security Warning */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex items-start gap-4 p-4 backdrop-blur-[16px] bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-400/30 shadow-[0_8px_32px_rgba(255,107,53,0.15)] rounded-xl"
                >
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        "0 0 10px rgba(255,107,53,0.4)",
                        "0 0 20px rgba(255,107,53,0.6)",
                        "0 0 10px rgba(255,107,53,0.4)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="p-2 rounded-lg bg-orange-500/20 border border-orange-400/30"
                  >
                    <AlertTriangle className="h-5 w-5 text-orange-400 drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]" />
                  </motion.div>
                  <div className="text-sm">
                    <p className="font-bold mb-2 text-orange-300 drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">
                      هشدار امنیتی
                    </p>
                    <p className="text-orange-200">
                      تمام اقدامات شما در طول جانشینی ثبت و نظارت خواهد شد. 
                      از این قابلیت فقط برای پشتیبانی مشتریان استفاده کنید.
                    </p>
                  </div>
                </motion.div>

                {/* User Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-4 p-4 backdrop-blur-[16px] bg-white/[0.03] border border-white/[0.06] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
                    <h4 className="font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                      اطلاعات کاربر هدف
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">ایمیل:</span>
                      <p className="font-medium text-white mt-1">{user.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">نام:</span>
                      <p className="font-medium text-white mt-1">{user.name || 'نامشخص'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">تنانت:</span>
                      <p className="font-medium text-white mt-1">{user.tenant_name || 'نامشخص'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">نقش:</span>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30 shadow-[0_0_10px_rgba(165,94,234,0.3)] mt-1">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                {/* Duration Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="space-y-3"
                >
                  <Label htmlFor="duration" className="flex items-center gap-2 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                    <Clock className="h-4 w-4" />
                    مدت زمان جلسه (ساعت)
                  </Label>
                  <Select
                    value={durationHours.toString()}
                    onValueChange={(value) => setDurationHours(parseInt(value))}
                  >
                    <SelectTrigger className="backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-white focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-[20px] bg-gray-900/90 border-white/[0.08]">
                      <SelectItem value="1" className="text-white hover:bg-white/[0.05]">1 ساعت</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-white/[0.05]">2 ساعت (پیشنهادی)</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-white/[0.05]">4 ساعت</SelectItem>
                      <SelectItem value="8" className="text-white hover:bg-white/[0.05]">8 ساعت</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Window Mode Selection */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="space-y-4 p-4 backdrop-blur-[16px] bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-400/30 shadow-[0_8px_32px_rgba(0,212,255,0.15)] rounded-xl"
                >
                  <Label className="flex items-center gap-2 font-semibold text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                    <Monitor className="h-4 w-4" />
                    نحوه باز کردن جلسه جانشینی
                  </Label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="window-based"
                        checked={isWindowBased}
                        onCheckedChange={(checked) => setIsWindowBased(checked as boolean)}
                        className="border-cyan-400/30 data-[state=checked]:bg-cyan-500/20 data-[state=checked]:border-cyan-400"
                      />
                      <Label htmlFor="window-based" className="flex items-center gap-2 cursor-pointer text-white">
                        <ExternalLink className="h-4 w-4 text-cyan-400" />
                        <span>باز کردن در پنجره/تب جدید (پیشنهادی)</span>
                      </Label>
                    </div>
                    <div className="text-sm mr-6">
                      <AnimatePresence mode="wait">
                        {isWindowBased ? (
                          <motion.div
                            key="window-benefits"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-2"
                          >
                            <p className="text-emerald-400 font-medium drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]">
                              ✓ مزایای پنجره جدید:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-emerald-200">
                              <li>امکان کار همزمان با پنل ادمین</li>
                              <li>تشخیص خودکار بسته شدن پنجره و پاک‌سازی جلسه</li>
                              <li>مدیریت بهتر جلسات چندگانه</li>
                              <li>امنیت بالاتر با جداسازی جلسات</li>
                            </ul>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="redirect-warnings"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-2"
                          >
                            <p className="text-orange-400 font-medium drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">
                              ⚠ حالت تغییر مسیر:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-orange-200">
                              <li>پنل ادمین بسته می‌شود</li>
                              <li>باید دستی به پنل ادمین برگردید</li>
                              <li>مدیریت جلسه محدودتر است</li>
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>

                {/* Reason */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="space-y-3"
                >
                  <Label htmlFor="reason" className="flex items-center gap-2 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                    <FileText className="h-4 w-4" />
                    دلیل جانشینی (اختیاری)
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="دلیل جانشینی را وارد کنید (مثلاً: پشتیبانی مشتری، رفع مشکل فنی، ...)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-white placeholder:text-gray-400 focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-300 resize-none"
                  />
                  <div className="text-xs text-gray-400 text-left">
                    {reason.length}/500 کاراکتر
                  </div>
                </motion.div>
              </div>

              <DialogFooter className="gap-3 mt-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="backdrop-blur-[16px] bg-gray-500/20 border border-gray-400/30 text-gray-300 hover:bg-gray-500/30 hover:border-gray-400/50 hover:shadow-[0_0_20px_rgba(156,163,175,0.4)] transition-all duration-300"
                  >
                    انصراف
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      isLoading
                        ? 'backdrop-blur-[16px] bg-gray-500/20 border border-gray-400/30 text-gray-400 cursor-not-allowed'
                        : 'backdrop-blur-[16px] bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30 text-cyan-400 hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-emerald-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full"
                        />
                        در حال شروع...
                      </>
                    ) : (
                      <>
                        {isWindowBased ? <ExternalLink className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                        {isWindowBased ? 'باز کردن در پنجره جدید' : 'شروع جانشینی'}
                      </>
                    )}
                  </Button>
                </motion.div>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default ImpersonationStartDialog;