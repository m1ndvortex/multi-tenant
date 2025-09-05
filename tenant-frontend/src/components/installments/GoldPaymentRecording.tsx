import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Plus,
  Calculator,
  Receipt,
  Coins,
  TrendingUp,
  Info
} from 'lucide-react';
import { InstallmentDetail, PaymentCreate, installmentService } from '@/services/installmentService';
import { useToast } from '@/hooks/use-toast';

interface GoldPaymentRecordingProps {
  installments: InstallmentDetail[];
  onRecordPayment: (paymentData: PaymentCreate) => void;
  isLoading?: boolean;
}

const GoldPaymentRecording: React.FC<GoldPaymentRecordingProps> = ({
  installments,
  onRecordPayment,
  isLoading = false,
}) => {
  const { toast } = useToast();
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentDetail | null>(null);
  const [currentGoldPrice, setCurrentGoldPrice] = useState<number>(0);
  const [isLoadingGoldPrice, setIsLoadingGoldPrice] = useState(false);
  const [paymentData, setPaymentData] = useState<Omit<PaymentCreate, 'installment_id'>>({
    payment_amount: 0,
    payment_method: '',
    payment_reference: '',
    notes: '',
    gold_weight_paid: 0,
    gold_price_at_payment: 0,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter unpaid gold installments
  const unpaidInstallments = installments.filter(inst => 
    inst.installment_type === 'gold' &&
    inst.status !== 'paid' && 
    inst.status !== 'cancelled' && 
    (inst.remaining_gold_weight || 0) > 0
  );

  // Sort by due date (overdue first, then by date)
  const sortedInstallments = unpaidInstallments.sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1;
    if (!a.is_overdue && b.is_overdue) return 1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Load current gold price on component mount
  useEffect(() => {
    loadCurrentGoldPrice();
  }, []);

  // Update payment amount when gold weight or price changes
  useEffect(() => {
    if (paymentData.gold_weight_paid && paymentData.gold_price_at_payment) {
      const calculatedAmount = paymentData.gold_weight_paid * paymentData.gold_price_at_payment;
      setPaymentData(prev => ({
        ...prev,
        payment_amount: calculatedAmount,
      }));
    }
  }, [paymentData.gold_weight_paid, paymentData.gold_price_at_payment]);

  const loadCurrentGoldPrice = async () => {
    try {
      setIsLoadingGoldPrice(true);
      const response = await installmentService.getCurrentGoldPrice();
      setCurrentGoldPrice(response.price);
    } catch (error) {
      console.error('Failed to load gold price:', error);
      toast({
        title: 'خطا در بارگیری قیمت طلا',
        description: 'نتوانستیم قیمت فعلی طلا را دریافت کنیم',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGoldPrice(false);
    }
  };

  const handleInstallmentSelect = (installment: InstallmentDetail) => {
    setSelectedInstallment(installment);
    setPaymentData({
      payment_amount: 0,
      payment_method: '',
      payment_reference: '',
      notes: '',
      gold_weight_paid: installment.remaining_gold_weight || 0,
      gold_price_at_payment: currentGoldPrice,
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
      gold_weight_paid: 0,
      gold_price_at_payment: 0,
    });
  };

  const handleInputChange = (field: keyof Omit<PaymentCreate, 'installment_id'>, value: any) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGoldWeightChange = (weight: number) => {
    setPaymentData(prev => ({
      ...prev,
      gold_weight_paid: weight,
      payment_amount: weight * (prev.gold_price_at_payment || 0),
    }));
  };

  const handleGoldPriceChange = (price: number) => {
    setPaymentData(prev => ({
      ...prev,
      gold_price_at_payment: price,
      payment_amount: (prev.gold_weight_paid || 0) * price,
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
    { value: 'gold_exchange', label: 'تهاتر طلا' },
    { value: 'other', label: 'سایر' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="gradient-purple">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="h-5 w-5" />
            ثبت پرداخت اقساط طلا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-white">
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
              <p className="text-white/80 text-sm">مجموع مانده (گرم)</p>
              <p className="text-xl font-bold">
                {unpaidInstallments.reduce((sum, inst) => sum + (inst.remaining_gold_weight || 0), 0).toFixed(3)} گرم
              </p>
            </div>
            <div>
              <p className="text-white/80 text-sm">قیمت فعلی طلا</p>
              <p className="text-xl font-bold">
                {currentGoldPrice > 0 ? `${currentGoldPrice.toLocaleString()} ریال/گرم` : 'بارگیری...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Gold Price Card */}
      <Card variant="gradient-green">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <p className="text-white/80 text-sm">قیمت فعلی طلا</p>
                <p className="text-2xl font-bold">
                  {currentGoldPrice > 0 ? `${currentGoldPrice.toLocaleString()} ریال/گرم` : 'در حال بارگیری...'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={loadCurrentGoldPrice}
              disabled={isLoadingGoldPrice}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {isLoadingGoldPrice ? 'بارگیری...' : 'بروزرسانی'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installments List */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            اقساط طلا قابل پرداخت
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedInstallments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">همه اقساط طلا پرداخت شده‌اند!</p>
              <p className="text-sm text-gray-400">تبریک! تمام اقساط طلا این فاکتور تسویه شده است.</p>
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
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Coins className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">قسط طلا شماره {installment.installment_number}</p>
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
                        <p className="text-sm text-gray-500">وزن قسط</p>
                        <p className="font-semibold text-yellow-600">
                          {installment.gold_weight_due?.toFixed(3)} گرم
                        </p>
                      </div>
                      {(installment.gold_weight_paid || 0) > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="text-sm text-gray-500">پرداخت شده</p>
                          <p className="font-semibold text-green-600">
                            {installment.gold_weight_paid?.toFixed(3)} گرم
                          </p>
                        </div>
                      )}
                      <div className="space-y-1 mt-2">
                        <p className="text-sm text-gray-500">مانده به گرم</p>
                        <p className="font-semibold text-orange-600">
                          {installment.remaining_gold_weight?.toFixed(3)} گرم
                        </p>
                        {currentGoldPrice > 0 && (
                          <p className="text-xs text-gray-500">
                            ≈ {((installment.remaining_gold_weight || 0) * currentGoldPrice).toLocaleString()} ریال
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleInstallmentSelect(installment)}
                      variant={installment.is_overdue ? "destructive" : "gradient-purple"}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              ثبت پرداخت قسط طلا {selectedInstallment?.installment_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInstallment && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* Installment Info */}
              <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">وزن قسط</p>
                    <p className="font-semibold text-yellow-700">
                      {selectedInstallment.gold_weight_due?.toFixed(3)} گرم
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">مانده به گرم</p>
                    <p className="font-semibold text-orange-600">
                      {selectedInstallment.remaining_gold_weight?.toFixed(3)} گرم
                    </p>
                  </div>
                </div>
              </div>

              {/* Gold Price Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  قیمت طلا در روز پرداخت (ریال/گرم)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={paymentData.gold_price_at_payment || ''}
                    onChange={(e) => handleGoldPriceChange(parseFloat(e.target.value) || 0)}
                    placeholder="قیمت طلا"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGoldPriceChange(currentGoldPrice)}
                    disabled={currentGoldPrice === 0}
                  >
                    قیمت فعلی
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  قیمت فعلی: {currentGoldPrice.toLocaleString()} ریال/گرم
                </p>
              </div>

              {/* Gold Weight Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  وزن پرداختی (گرم)
                </Label>
                <Input
                  type="number"
                  min="0.001"
                  max={selectedInstallment.remaining_gold_weight}
                  step="0.001"
                  value={paymentData.gold_weight_paid || ''}
                  onChange={(e) => handleGoldWeightChange(parseFloat(e.target.value) || 0)}
                  placeholder="وزن پرداختی"
                  required
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGoldWeightChange(selectedInstallment.remaining_gold_weight || 0)}
                  >
                    پرداخت کامل
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGoldWeightChange((selectedInstallment.remaining_gold_weight || 0) / 2)}
                  >
                    نصف وزن
                  </Button>
                </div>
              </div>

              {/* Calculated Amount Display */}
              {paymentData.gold_weight_paid && paymentData.gold_price_at_payment && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-green-600" />
                    <Label className="text-green-700">مبلغ محاسبه شده</Label>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {paymentData.payment_amount.toLocaleString()} ریال
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    {paymentData.gold_weight_paid.toFixed(3)} گرم × {paymentData.gold_price_at_payment.toLocaleString()} ریال/گرم
                  </p>
                </div>
              )}

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
                  variant="gradient-purple"
                  disabled={isLoading || !paymentData.gold_weight_paid || !paymentData.gold_price_at_payment}
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

export default GoldPaymentRecording;