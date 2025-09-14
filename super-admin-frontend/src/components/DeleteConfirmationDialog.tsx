import React from 'react';
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
import { AlertTriangle, Shield, Trash2 } from 'lucide-react';
import { Tenant } from '@/types/tenant';

interface DeleteConfirmationDialogProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tenantId: string) => void;
  isLoading?: boolean;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  tenant,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    if (tenant) {
      onConfirm(tenant.id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-md relative overflow-hidden">
            {/* Animated neon border */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(90deg, #FF4757, #FF6B35, #FFB800, #FF4757)',
                backgroundSize: '300% 300%',
                padding: '2px',
                zIndex: -1,
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
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
                <DialogTitle className="flex items-center gap-3 text-[#FF4757] text-right">
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <AlertTriangle className="h-6 w-6 drop-shadow-[0_0_8px_rgba(255,71,87,0.6)]" />
                  </motion.div>
                  <span className="drop-shadow-[0_0_8px_rgba(255,71,87,0.4)]">حذف تنانت</span>
                  <Shield className="h-5 w-5 text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]" />
                </DialogTitle>
                <DialogDescription className="text-[#B8BCC8] text-right">
                  آیا از حذف تنانت "<span className="text-white font-medium">{tenant?.name}</span>" اطمینان دارید؟
                </DialogDescription>
              </DialogHeader>

              <motion.div 
                className="py-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="relative backdrop-blur-[16px] bg-gradient-to-br from-red-500/[0.15] to-red-600/[0.08] border border-red-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(255,71,87,0.2)]">
                  {/* Animated warning glow */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  
                  <div className="relative z-10">
                    <motion.p 
                      className="text-sm text-[#FF4757] font-medium mb-3 flex items-center gap-2 text-right"
                      animate={{ 
                        textShadow: [
                          '0 0 8px rgba(255,71,87,0.6)',
                          '0 0 12px rgba(255,71,87,0.8)',
                          '0 0 8px rgba(255,71,87,0.6)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Trash2 className="h-4 w-4" />
                      ⚠️ هشدار: این عمل غیرقابل بازگشت است!
                    </motion.p>
                    <ul className="text-sm text-[#B8BCC8] space-y-2 text-right">
                      <motion.li 
                        className="flex items-center gap-2 justify-end"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.3 }}
                      >
                        <span>تمام داده‌های تنانت حذف خواهد شد</span>
                        <span className="text-[#FF4757]">•</span>
                      </motion.li>
                      <motion.li 
                        className="flex items-center gap-2 justify-end"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                      >
                        <span>تمام کاربران این تنانت دسترسی خود را از دست خواهند داد</span>
                        <span className="text-[#FF4757]">•</span>
                      </motion.li>
                      <motion.li 
                        className="flex items-center gap-2 justify-end"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5, duration: 0.3 }}
                      >
                        <span>فاکتورها، مشتریان و محصولات حذف خواهند شد</span>
                        <span className="text-[#FF4757]">•</span>
                      </motion.li>
                    </ul>
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
                    onClick={onClose}
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
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={isLoading}
                    className="relative backdrop-blur-[16px] bg-gradient-to-r from-red-600/80 to-red-500/80 border border-red-500/50 text-white hover:from-red-500/90 hover:to-red-400/90 hover:border-red-400/60 hover:shadow-[0_0_20px_rgba(255,71,87,0.4)] transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading && (
                      <motion.div
                        className="absolute inset-0 rounded-md bg-gradient-to-r from-red-600/20 to-red-500/20"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                    <span className="relative z-10">
                      {isLoading ? 'در حال حذف...' : 'حذف تنانت'}
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

export default DeleteConfirmationDialog;