import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CreditCard, 
  Calculator, 
  Info, 
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock
} from 'lucide-react';
import { Invoice } from '@/services/invoiceService';
import { InstallmentPlanCreate } from '@/services/installmentService';

interface InstallmentPlanSetupProps {
  invoice: Invoice;
  onCreatePlan: (planData: InstallmentPlanCreate) => void;
  isLoading?: boolean;
}

const InstallmentPlanSetup: React.FC<InstallmentPlanSetupProps> = ({
  invoice,
  onCreatePlan,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<InstallmentPlanCreate>({
    invoice_id: invoice.id,
    number_of_installments: 3,
    interval_days: 30,
    interest_rate: 0,
  });

  const [previewData, setPreviewData] = useState<{
    installments: Array<{
      number: number;
      amount: number;
      dueDate: Date;
    }>;
    totalAmount: number;
  } | null>(null);

  // Calculate preview when form data changes
  React.useEffect(() => {
    if (formData.number_of_installments >= 2) {
      const totalAmount = invoice.total_amount * (1 + (formData.interest_rate || 0) / 100);
      const baseAmount = totalAmount / formData.number_of_installments;
      const startDate = formData.start_date ? new Date(formData.start_date) : new Date();
      
      const installments = Array.from({ length: formData.number_of_installments }, (_, index) => {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (index * formData.interval_days));
        
        return {
          number: index + 1,
          amount: Math.round(baseAmount),
          dueDate,
        };
      });

      // Adjust last installment for rounding differences
      const totalCalculated = installments.reduce((sum, inst) => sum + inst.amount, 0);
      const difference = Math.round(totalAmount) - totalCalculated;
      if (difference !== 0) {
        installments[installments.length - 1].amount += difference;
      }

      setPreviewData({
        installments,
        totalAmount: Math.round(totalAmount),
      });
    } else {
      setPreviewData(null);
    }
  }, [formData, invoice.total_amount]);

  const handleInputChange = (field: keyof InstallmentPlanCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreatePlan(formData);
  };

  const commonIntervals = [
    { value: 7, label: 'هفتگی (7 روز)' },
    { value: 15, label: 'دو هفته‌ای (15 روز)' },
    { value: 30, label: 'ماهانه (30 روز)' },
    { value: 60, label: 'دو ماهه (60 روز)' },
    { value: 90, label: 'سه ماهه (90 روز)' },
  ];

  const commonInstallmentCounts = [2, 3, 4, 6, 12, 24];

  return (
    <div className="space-y-6">
      {/* Invoice Summary */}
      <Card variant="gradient-blue">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            تنظیم طرح اقساط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
            <div>
              <p className="text-white/80 text-sm">فاکتور</p>
              <p className="font-semibold">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">مشتری</p>
              <p className="font-semibold">{invoice.customer_name}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">مبلغ اصلی</p>
              <p className="font-semibold">{invoice.total_amount.toLocaleString()} ریال</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Form */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              تنظیمات طرح اقساط
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Number of Installments */}
              <div className="space-y-2">
                <Label>تعداد اقساط</Label>
                <div className="flex gap-2 mb-2">
                  {commonInstallmentCounts.map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={formData.number_of_installments === count ? "gradient-green" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange('number_of_installments', count)}
                    >
                      {count}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="2"
                  max="60"
                  value={formData.number_of_installments}
                  onChange={(e) => handleInputChange('number_of_installments', parseInt(e.target.value))}
                  placeholder="تعداد اقساط (2-60)"
                />
                <p className="text-sm text-gray-500">
                  حداقل 2 و حداکثر 60 قسط
                </p>
              </div>

              {/* Interval Days */}
              <div className="space-y-2">
                <Label>فاصله بین اقساط</Label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {commonIntervals.map((interval) => (
                    <Button
                      key={interval.value}
                      type="button"
                      variant={formData.interval_days === interval.value ? "gradient-green" : "outline"}
                      size="sm"
                      onClick={() => handleInputChange('interval_days', interval.value)}
                    >
                      {interval.label}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.interval_days}
                  onChange={(e) => handleInputChange('interval_days', parseInt(e.target.value))}
                  placeholder="تعداد روز بین اقساط"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label>تاریخ شروع (اختیاری)</Label>
                <Input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value || undefined)}
                />
                <p className="text-sm text-gray-500">
                  در صورت خالی گذاشتن، از امروز شروع می‌شود
                </p>
              </div>

              {/* Interest Rate */}
              <div className="space-y-2">
                <Label>نرخ سود (درصد)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.interest_rate || ''}
                  onChange={(e) => handleInputChange('interest_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="نرخ سود (اختیاری)"
                />
                <p className="text-sm text-gray-500">
                  نرخ سود سالانه که به مبلغ اصلی اضافه می‌شود
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="gradient-green"
                className="w-full"
                disabled={isLoading || !previewData}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    در حال ایجاد...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 ml-2" />
                    ایجاد طرح اقساط
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              پیش‌نمایش طرح اقساط
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewData ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">مبلغ اصلی</p>
                    <p className="font-semibold">{invoice.total_amount.toLocaleString()} ریال</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">مبلغ کل با سود</p>
                    <p className="font-semibold text-green-600">
                      {previewData.totalAmount.toLocaleString()} ریال
                    </p>
                  </div>
                </div>

                {formData.interest_rate && formData.interest_rate > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600" />
                    <p className="text-sm text-blue-700">
                      سود {formData.interest_rate}%: {(previewData.totalAmount - invoice.total_amount).toLocaleString()} ریال
                    </p>
                  </div>
                )}

                {/* Installments List */}
                <div className="space-y-2">
                  <h4 className="font-medium">جدول اقساط:</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {previewData.installments.map((installment) => (
                      <div
                        key={installment.number}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            قسط {installment.number}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">
                              {installment.dueDate.toLocaleDateString('fa-IR')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {installment.dueDate.toLocaleDateString('fa-IR', { 
                                weekday: 'long' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">
                            {installment.amount.toLocaleString()} ریال
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                <div className="space-y-2">
                  {previewData.installments.some(inst => inst.dueDate < new Date()) && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm text-yellow-700">
                        برخی از اقساط در گذشته قرار دارند
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  لطفاً تعداد اقساط را وارد کنید تا پیش‌نمایش نمایش داده شود
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstallmentPlanSetup;