import React, { useState } from 'react';
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تأیید پرداخت</DialogTitle>
          <DialogDescription>
            آیا از تأیید پرداخت برای تنانت "{tenant?.name}" اطمینان دارید؟
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              مدت اشتراک (ماه)
            </label>
            <Select
              value={duration.toString()}
              onValueChange={(value) => setDuration(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 ماه</SelectItem>
                <SelectItem value="3">3 ماه</SelectItem>
                <SelectItem value="6">6 ماه</SelectItem>
                <SelectItem value="12">12 ماه (پیشنهادی)</SelectItem>
                <SelectItem value="24">24 ماه</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              پس از تأیید، اشتراک تنانت به حالت "حرفه‌ای" تغییر یافته و برای مدت {duration} ماه فعال خواهد بود.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            انصراف
          </Button>
          <Button
            variant="gradient-green"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'در حال پردازش...' : 'تأیید پرداخت'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentConfirmationDialog;