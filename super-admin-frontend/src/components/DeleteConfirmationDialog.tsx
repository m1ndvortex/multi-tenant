import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            حذف تنانت
          </DialogTitle>
          <DialogDescription>
            آیا از حذف تنانت "{tenant?.name}" اطمینان دارید؟
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ هشدار: این عمل غیرقابل بازگشت است!
            </p>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• تمام داده‌های تنانت حذف خواهد شد</li>
              <li>• تمام کاربران این تنانت دسترسی خود را از دست خواهند داد</li>
              <li>• فاکتورها، مشتریان و محصولات حذف خواهند شد</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            انصراف
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'در حال حذف...' : 'حذف تنانت'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;