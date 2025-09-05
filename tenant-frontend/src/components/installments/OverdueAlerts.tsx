import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  Phone, 
  Mail, 
  CreditCard,
  Clock,
  TrendingDown,
  MessageSquare,
  CheckCircle,
  Send
} from 'lucide-react';
import { InstallmentDetail, PaymentCreate } from '@/services/installmentService';

interface OverdueAlertsProps {
  installments: InstallmentDetail[];
  onRecordPayment: (paymentData: PaymentCreate) => void;
  isLoading?: boolean;
}

const OverdueAlerts: React.FC<OverdueAlertsProps> = ({
  installments,
  onRecordPayment,
  isLoading = false,
}) => {
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentDetail | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<Omit<PaymentCreate, 'installment_id'>>({
    payment_amount: 0,
    payment_method: '',
    payment_reference: '',
    notes: '',
  });

  // Sort overdue installments by days overdue (most overdue first)
  const sortedOverdueInstallments = installments
    .filter(inst => inst.is_overdue)
    .sort((a, b) => b.days_overdue - a.days_overdue);

  // Calculate statistics
  const totalOverdueAmount = sortedOverdueInstallments.reduce((sum, inst) => sum + inst.remaining_amount, 0);
  const averageDaysOverdue = sortedOverdueInstallments.length > 0 
    ? Math.round(sortedOverdueInstallments.reduce((sum, inst) => sum + inst.days_overdue, 0) / sortedOverdueInstallments.length)
    : 0;

  const handlePaymentClick = (installment: InstallmentDetail) => {
    setSelectedInstallment(installment);
    setPaymentData({
      payment_amount: installment.remaining_amount,
      payment_method: '',
      payment_reference: '',
      notes: `پرداخت قسط سررسید گذشته - ${installment.days_overdue} روز تاخیر`,
    });
    setIsPaymentDialogOpen(true);
  };

  const handleReminderClick = (installment: InstallmentDetail) => {
    setSelectedInstallment(installment);
    setIsReminderDialogOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;

    onRecordPayment({
      installment_id: selectedInstallment.id,
      ...paymentData,
    });

    setIsPaymentDialogOpen(false);
    setSelectedInstallment(null);
    setPaymentData({
      payment_amount: 0,
      payment_method: '',
      payment_reference: '',
      notes: '',
    });
  };

  const handleInputChange = (field: keyof Omit<PaymentCreate, 'installment_id'>, value: any) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Get severity badge based on days overdue
  const getSeverityBadge = (daysOverdue: number) => {
    if (daysOverdue >= 30) {
      return <Badge variant="destructive" className="animate-pulse">
        <AlertTriangle className="h-3 w-3 ml-1" />
        بحرانی ({daysOverdue} روز)
      </Badge>;
    } else if (daysOverdue >= 15) {
      return <Badge variant="destructive">
        <TrendingDown className="h-3 w-3 ml-1" />
        شدید ({daysOverdue} روز)
      </Badge>;
    } else if (daysOverdue >= 7) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
        <Clock className="h-3 w-3 ml-1" />
        متوسط ({daysOverdue} روز)
      </Badge>;
    } else {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
        <AlertTriangle className="h-3 w-3 ml-1" />
        جدید ({daysOverdue} روز)
      </Badge>;
    }
  };

  const paymentMethods = [
    { value: 'cash', label: 'نقدی' },
    { value: 'card', label: 'کارت' },
    { value: 'transfer', label: 'انتقال بانکی' },
    { value: 'check', label: 'چک' },
    { value: 'online', label: 'پرداخت آنلاین' },
    { value: 'other', label: 'سایر' },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      <Card variant="professional" className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            هشدار: اقساط سررسید گذشته
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedOverdueInstallments.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">عالی! هیچ قسط سررسید گذشته‌ای وجود ندارد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">تعداد اقساط سررسید گذشته</p>
                <p className="text-2xl font-bold text-red-700">{sortedOverdueInstallments.length}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">مجموع مبلغ سررسید گذشته</p>
                <p className="text-2xl font-bold text-red-700">
                  {totalOverdueAmount.toLocaleString()} ریال
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">میانگین روزهای تاخیر</p>
                <p className="text-2xl font-bold text-red-700">{averageDaysOverdue} روز</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Installments List */}
      {sortedOverdueInstallments.length > 0 && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              فهرست اقساط سررسید گذشته
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedOverdueInstallments.map((installment) => (
                <div
                  key={installment.id}
                  className="p-4 border-2 border-red-200 bg-red-50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-red-900">
                          قسط شماره {installment.installment_number}
                        </p>
                        <p className="text-sm text-red-700">
                          سررسید: {new Date(installment.due_date).toLocaleDateString('fa-IR')}
                        </p>
                        <div className="mt-1">
                          {getSeverityBadge(installment.days_overdue)}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="space-y-1">
                        <p className="text-sm text-red-600">مانده بدهی</p>
                        <p className="text-lg font-bold text-red-700">
                          {installment.remaining_amount.toLocaleString()} ریال
                        </p>
                      </div>
                      {installment.amount_paid > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="text-sm text-red-600">پرداخت شده</p>
                          <p className="font-semibold text-green-600">
                            {installment.amount_paid.toLocaleString()} ریال
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handlePaymentClick(installment)}
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        پرداخت فوری
                      </Button>
                      <Button
                        onClick={() => handleReminderClick(installment)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Send className="h-4 w-4" />
                        ارسال یادآوری
                      </Button>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-red-600">مبلغ اصلی قسط</p>
                        <p className="font-semibold text-red-800">
                          {installment.amount_due?.toLocaleString()} ریال
                        </p>
                      </div>
                      <div>
                        <p className="text-red-600">تاریخ ایجاد</p>
                        <p className="font-semibold text-red-800">
                          {new Date(installment.created_at).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-red-600">وضعیت</p>
                        <Badge variant="destructive">سررسید گذشته</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              پرداخت فوری قسط سررسید گذشته
            </DialogTitle>
          </DialogHeader>

          {selectedInstallment && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Overdue Warning */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="font-medium">قسط سررسید گذشته</p>
                </div>
                <p className="text-sm text-red-600">
                  این قسط {selectedInstallment.days_overdue} روز سررسید گذشته است.
                  لطفاً در اسرع وقت پرداخت کنید.
                </p>
              </div>

              {/* Installment Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">شماره قسط</p>
                    <p className="font-semibold">{selectedInstallment.installment_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">مانده بدهی</p>
                    <p className="font-semibold text-red-600">
                      {selectedInstallment.remaining_amount.toLocaleString()} ریال
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="space-y-2">
                <Label>مبلغ پرداخت (ریال)</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedInstallment.remaining_amount}
                  value={paymentData.payment_amount}
                  onChange={(e) => handleInputChange('payment_amount', parseFloat(e.target.value))}
                  placeholder="مبلغ پرداخت"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('payment_amount', selectedInstallment.remaining_amount)}
                  className="w-full"
                >
                  پرداخت کامل ({selectedInstallment.remaining_amount.toLocaleString()} ریال)
                </Button>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>روش پرداخت</Label>
                <Select
                  value={paymentData.payment_method}
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب روش پرداخت" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Reference */}
              <div className="space-y-2">
                <Label>شماره مرجع</Label>
                <Input
                  value={paymentData.payment_reference}
                  onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                  placeholder="شماره تراکنش، چک، و غیره"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>یادداشت</Label>
                <Textarea
                  value={paymentData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="توضیحات پرداخت..."
                  rows={3}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  className="flex-1"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isLoading || paymentData.payment_amount <= 0}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      در حال ثبت...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 ml-2" />
                      ثبت پرداخت فوری
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              ارسال یادآوری پرداخت
            </DialogTitle>
          </DialogHeader>

          {selectedInstallment && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  یادآوری برای قسط شماره {selectedInstallment.installment_number} 
                  که {selectedInstallment.days_overdue} روز سررسید گذشته است.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                  onClick={() => {
                    // Handle SMS reminder
                    setIsReminderDialogOpen(false);
                  }}
                >
                  <Phone className="h-4 w-4" />
                  پیامک
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 flex items-center gap-2"
                  onClick={() => {
                    // Handle email reminder
                    setIsReminderDialogOpen(false);
                  }}
                >
                  <Mail className="h-4 w-4" />
                  ایمیل
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setIsReminderDialogOpen(false)}
                className="w-full"
              >
                انصراف
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OverdueAlerts;