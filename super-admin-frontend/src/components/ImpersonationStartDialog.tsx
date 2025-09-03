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
import { Input } from '@/components/ui/input';
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
import { AlertTriangle, User, Clock, FileText } from 'lucide-react';
import { User as UserType } from '@/types/impersonation';

interface ImpersonationStartDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    target_user_id: string;
    duration_hours: number;
    reason?: string;
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

  const handleConfirm = () => {
    if (!user) return;

    onConfirm({
      target_user_id: user.id,
      duration_hours: durationHours,
      reason: reason.trim() || undefined,
    });
  };

  const handleClose = () => {
    setDurationHours(2);
    setReason('');
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            شروع جانشینی کاربر
          </DialogTitle>
          <DialogDescription>
            شما در حال شروع جلسه جانشینی برای کاربر زیر هستید. لطفاً اطلاعات مورد نیاز را تکمیل کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">هشدار امنیتی</p>
              <p>
                تمام اقدامات شما در طول جانشینی ثبت و نظارت خواهد شد. 
                از این قابلیت فقط برای پشتیبانی مشتریان استفاده کنید.
              </p>
            </div>
          </div>

          {/* User Information */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-900">اطلاعات کاربر هدف</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">ایمیل:</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-slate-500">نام:</span>
                <p className="font-medium">{user.name || 'نامشخص'}</p>
              </div>
              <div>
                <span className="text-slate-500">تنانت:</span>
                <p className="font-medium">{user.tenant_name || 'نامشخص'}</p>
              </div>
              <div>
                <span className="text-slate-500">نقش:</span>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              مدت زمان جلسه (ساعت)
            </Label>
            <Select
              value={durationHours.toString()}
              onValueChange={(value) => setDurationHours(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 ساعت</SelectItem>
                <SelectItem value="2">2 ساعت (پیشنهادی)</SelectItem>
                <SelectItem value="4">4 ساعت</SelectItem>
                <SelectItem value="8">8 ساعت</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-2">
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
            />
            <div className="text-xs text-slate-500 text-left">
              {reason.length}/500 کاراکتر
            </div>
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
            variant="gradient-blue"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'در حال شروع...' : 'شروع جانشینی'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImpersonationStartDialog;