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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, CreditCard, Shield, Zap } from 'lucide-react';
import { Tenant } from '@/types/tenant';

interface PaymentConfirmationDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tenantId: string, duration: number) => void;
  isLoading?: boolean;
}

const PaymentConfirmationDialog: React.FC<PaymentConfirmationDialogProps> = ({
  tenant,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [duration, setDuration] = useState<number>(12);

  const handleConfirm = () => {
    if (tenant) {
      onConfirm(tenant.id, duration);
    }
  };

  const handleClose = () => {
    setDuration(12);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-md relative overflow-hidden">
            {/* Animated neon border */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(90deg, #00FF88, #00D4FF, #A55EEA, #00FF88)',
                backgroundSize: '300% 300%',
                padding: '2px',
                zIndex: -1,
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <div className="w-full h-full rounded-2xl backdrop-blur-[25px] saturate-[200%] bg-gradient-to-br from-white/[0.08] to-white/[0.04]" />
            </motion.div>

            {/* Content with entrance animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                duration: 0.4, 
                ease: [0.4, 0, 0.2, 1],
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-[#00FF88] text-right">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <CheckCircle className="h-6 w-6 drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]" />
                  </motion.div>
                  <span className="drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]">تأیید پرداخت</span>
                  <CreditCard className="h-5 w-5 text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]" />
                </DialogTitle>
                <DialogDescription className="text-[#B8BCC8] text-right">
                  آیا از تأیید پرداخت برای تنانت "<span className="text-white font-medium">{tenant?.name}</span>" اطمینان دارید؟
                </DialogDescription>
              </DialogHeader>

              <motion.div 
                className="space-y-4 py-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="space-y-3">
                  <label className="text-sm font-medium text-[#00D4FF] flex items-center gap-2 justify-end drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]">
                    <span>مدت اشتراک (ماه)</span>
                    <Zap className="h-4 w-4" />
                  </label>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Select
                      value={duration.toString()}
                      onValueChange={(value) => setDuration(parseInt(value))}
                    >
                      <SelectTrigger className="backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.08] hover:border-[#00D4FF]/30 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-[20px] bg-[#1A1D29]/95 border-white/[0.08]">
                        <SelectItem value="1" className="text-white hover:bg-white/[0.08] hover:text-[#00D4FF]">1 ماه</SelectItem>
                        <SelectItem value="3" className="text-white hover:bg-white/[0.08] hover:text-[#00D4FF]">3 ماه</SelectItem>
                        <SelectItem value="6" className="text-white hover:bg-white/[0.08] hover:text-[#00D4FF]">6 ماه</SelectItem>
                        <SelectItem value="12" className="text-white hover:bg-white/[0.08] hover:text-[#00FF88]">12 ماه (پیشنهادی)</SelectItem>
                        <SelectItem value="24" className="text-white hover:bg-white/[0.08] hover:text-[#A55EEA]">24 ماه</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                </div>

                <div className="relative backdrop-blur-[16px] bg-gradient-to-br from-green-500/[0.15] to-emerald-600/[0.08] border border-green-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                  {/* Animated success glow */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  <div className="relative z-10">
                    <motion.p 
                      className="text-sm text-[#00FF88] flex items-center gap-2 justify-end text-right"
                      animate={{ 
                        textShadow: [
                          '0 0 8px rgba(0,255,136,0.6)',
                          '0 0 12px rgba(0,255,136,0.8)',
                          '0 0 8px rgba(0,255,136,0.6)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span>
                        پس از تأیید، اشتراک تنانت به حالت "حرفه‌ای" تغییر یافته و برای مدت <span className="font-bold text-white">{duration}</span> ماه فعال خواهد بود.
                      </span>
                      <Shield className="h-4 w-4" />
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              <DialogFooter className="gap-3 flex-row-reverse">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-[#B8BCC8] hover:bg-white/[0.08] hover:border-[#00D4FF]/30 hover:text-[#00D4FF] hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-300"
                  >
                    انصراف
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="relative backdrop-blur-[16px] bg-gradient-to-r from-green-600/80 to-emerald-500/80 border border-green-500/50 text-white hover:from-green-500/90 hover:to-emerald-400/90 hover:border-green-400/60 hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading && (
                      <motion.div
                        className="absolute inset-0 rounded-md bg-gradient-to-r from-green-600/20 to-emerald-500/20"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                    <span className="relative z-10">
                      {isLoading ? 'در حال پردازش...' : 'تأیید پرداخت'}
                    </span>
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

export default PaymentConfirmationDialog;