import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Plus,
  Calculator,
  Receipt
} from 'lucide-react';
import { InstallmentDetail, PaymentCreate } from '@/services/installmentService';

interface PaymentRecordingProps {
  installments: InstallmentDetail[];
  onRecordPayment: (paymentData: PaymentCreate) => void;
  isLoading?: boolean;
}

const PaymentRecording: React.FC<PaymentRecordingProps> = ({
  installments,
  onRecordPayment,
  isLoading = false,
}) => {
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentDetail | null>(null);
  const [paymentData, setPaymentData] = useState<Omit<PaymentCreate, 'installment_id'>>({
    payment_amount: 0,
    payment_method: '',
    payment_reference: '',
    notes: '',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter unpaid installments
  const unpaidInstallments = installments.filter(inst => 
    inst.status !== 'paid' && inst.status !== 'cancelled' && inst.remaining_amount > 0
  );

  // Sort by due date (overdue first, then by date)
  const sortedInstallments = unpaidInstallments.sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1;
    if (!a.is_overdue && b.is_overdue) return 1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const handleInstallmentSelect = (installment: InstallmentDetail) => {
    setSelectedInstallment(installment);
    setPaymentData({
      payment_amount: installment.remaining_amount,
      payment_method: '',
      payment_reference: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;

    onRecordPayment({
      installment_id: selectedInstallment.id,
      ...paymentData,
    });

    setIsDialogOpen(false);
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

  // Get status badge for installment status
  const getStatusBadge = (installment: InstallmentDetail) => {
    if (installment.is_overdue) {
      return <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 ml-1" />
        سررسید گذشته ({installment.days_overdue} روز)
      </Badge>;
    }

    const dueDate = new Date(installment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 7 && daysUntilDue > 0) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
        <Clock className="h-3 w-3 ml-1" />
        {daysUntilDue} روز تا سررسید
      </Badge>;
    }

    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
      <CheckCircle className="h-3 w-3 ml-1" />
      در موعد
    </Badge>;
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
      {/* Header */}
      <Card variant="gradient-green">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            ثبت پرداخت اقساط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
            <div>
              <p className="text-white/80 text-sm">اقساط باقی‌مانده</p>
              <p className="text-xl font-bold">{unpaidInstallments.length}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">اقساط سررسید گذشته</p>
              <p className="text-xl font-bold text-red-200">
                {unpaidInstallments.filter(inst => inst.is_overdue).length}
              </p>
            </div>
            <div>
              <p className="text-white/80 text-sm">مجموع مانده</p>
              <p className="text-xl font-bold">
                {unpaidInstallments.reduce((sum, inst) => sum + inst.remaining_amount, 0).toLocaleString()} ریال
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installments List */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            اقساط قابل پرداخت
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedInstallments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">همه اقساط پرداخت شده‌اند!</p>
              <p className="text-sm text-gray-400">تبریک! تمام اقساط این فاکتور تسویه شده است.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedInstallments.map((installment) => (
                <div
                  key={installment.id}
                  className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                    installment.is_overdue ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">قسط شماره {installment.installment_number}</p>
                        <p className="text-sm text-gray-500">
                          سررسید: {new Date(installment.due_date).toLocaleDateString('fa-IR')}
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(installment)}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">مبلغ قسط</p>
                        <p className="font-semibold">
                          {installment.amount_due?.toLocaleString()} ریال
                        </p>
                      </div>
                      {installment.amount_paid > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="text-sm text-gray-500">پرداخت شده</p>
                          <p className="font-semibold text-green-600">
                            {installment.amount_paid.toLocaleString()} ریال
                          </p>
                        </div>
                      )}
                      <div className="space-y-1 mt-2">
                        <p className="text-sm text-gray-500">مانده</p>
                        <p className="font-semibold text-orange-600">
                          {installment.remaining_amount.toLocaleString()} ریال
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleInstallmentSelect(installment)}
                      variant={installment.is_overdue ? "destructive" : "gradient-green"}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      ثبت پرداخت
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              ثبت پرداخت قسط {selectedInstallment?.installment_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInstallment && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Installment Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">مبلغ قسط</p>
                    <p className="font-semibold">
                      {selectedInstallment.amount_due?.toLocaleString()} ریال
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">مانده</p>
                    <p className="font-semibold text-orange-600">
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('payment_amount', selectedInstallment.remaining_amount)}
                  >
                    پرداخت کامل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleInputChange('payment_amount', selectedInstallment.remaining_amount / 2)}
                  >
                    نصف مبلغ
                  </Button>
                </div>
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
                <Label>شماره مرجع (اختیاری)</Label>
                <Input
                  value={paymentData.payment_reference}
                  onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                  placeholder="شماره تراکنش، چک، و غیره"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>یادداشت (اختیاری)</Label>
                <Textarea
                  value={paymentData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="توضیحات اضافی..."
                  rows={3}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="gradient-green"
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
                      ثبت پرداخت
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentRecording;