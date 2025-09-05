import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CreditCard, 
  Calculator, 
  Info, 
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
  TrendingUp,
  Coins
} from 'lucide-react';
import { Invoice } from '@/services/invoiceService';
import { InstallmentPlanCreate, installmentService } from '@/services/installmentService';
import { useToast } from '@/hooks/use-toast';

interface GoldInstallmentPlanSetupProps {
  invoice: Invoice;
  onCreatePlan: (planData: InstallmentPlanCreate) => void;
  isLoading?: boolean;
}

const GoldInstallmentPlanSetup: React.FC<GoldInstallmentPlanSetupProps> = ({
  invoice,
  onCreatePlan,
  isLoading = false,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<InstallmentPlanCreate>({
    invoice_id: invoice.id,
    number_of_installments: 3,
    interval_days: 30,
    interest_rate: 0,
  });

  const [currentGoldPrice, setCurrentGoldPrice] = useState<number>(0);
  const [isLoadingGoldPrice, setIsLoadingGoldPrice] = useState(false);
  const [goldPriceHistory, setGoldPriceHistory] = useState<Array<{
    date: string;
    price: number;
  }>>([]);

  const [previewData, setPreviewData] = useState<{
    installments: Array<{
      number: number;
      goldWeightDue: number;
      dueDate: Date;
    }>;
    totalGoldWeight: number;
  } | null>(null);

  // Load current gold price on component mount
  useEffect(() => {
    loadCurrentGoldPrice();
    loadGoldPriceHistory();
  }, []);

  // Calculate preview when form data changes
  useEffect(() => {
    if (formData.number_of_installments >= 2 && invoice.total_gold_weight) {
      const totalGoldWeight = invoice.total_gold_weight;
      const baseWeight = totalGoldWeight / formData.number_of_installments;
      const startDate = formData.start_date ? new Date(formData.start_date) : new Date();
      
      const installments = Array.from({ length: formData.number_of_installments }, (_, index) => {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (index * formData.interval_days));
        
        return {
          number: index + 1,
          goldWeightDue: baseWeight,
          dueDate,
        };
      });

      // Adjust last installment for rounding differences
      const totalCalculated = installments.reduce((sum, inst) => sum + inst.goldWeightDue, 0);
      const difference = totalGoldWeight - totalCalculated;
      if (Math.abs(difference) > 0.001) {
        installments[installments.length - 1].goldWeightDue += difference;
      }

      setPreviewData({
        installments,
        totalGoldWeight,
      });
    } else {
      setPreviewData(null);
    }
  }, [formData, invoice.total_gold_weight]);

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

  const loadGoldPriceHistory = async () => {
    try {
      const history = await installmentService.getGoldPriceHistory(30);
      setGoldPriceHistory(history);
    } catch (error) {
      console.error('Failed to load gold price history:', error);
    }
  };

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

  const commonInstallmentCounts = [2, 3, 4, 6, 12];

  return (
    <div className="space-y-6">
      {/* Invoice Summary */}
      <Card variant="gradient-purple">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="h-5 w-5" />
            تنظیم طرح اقساط طلا
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-white">
            <div>
              <p className="text-white/80 text-sm">فاکتور</p>
              <p className="font-semibold">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">مشتری</p>
              <p className="font-semibold">{invoice.customer_name}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">وزن کل طلا</p>
              <p className="font-semibold">{invoice.total_gold_weight?.toFixed(3)} گرم</p>
            </div>
            <div>
              <p className="text-white/80 text-sm">قیمت طلا هنگام فروش</p>
              <p className="font-semibold">{invoice.gold_price_at_creation?.toLocaleString()} ریال/گرم</p>
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
              تنظیمات طرح اقساط طلا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Gold Price Display */}
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    قیمت فعلی طلا
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadCurrentGoldPrice}
                    disabled={isLoadingGoldPrice}
                  >
                    {isLoadingGoldPrice ? 'بارگیری...' : 'بروزرسانی'}
                  </Button>
                </div>
                <div className="text-2xl font-bold text-yellow-700">
                  {currentGoldPrice > 0 ? `${currentGoldPrice.toLocaleString()} ریال/گرم` : 'در حال بارگیری...'}
                </div>
                <p className="text-sm text-yellow-600 mt-1">
                  پرداخت‌ها بر اساس قیمت طلا در روز پرداخت محاسبه می‌شود
                </p>
              </div>

              {/* Number of Installments */}
              <div className="space-y-2">
                <Label>تعداد اقساط</Label>
                <div className="flex gap-2 mb-2">
                  {commonInstallmentCounts.map((count) => (
                    <Button
                      key={count}
                      type="button"
                      variant={formData.number_of_installments === count ? "gradient-purple" : "outline"}
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
                      variant={formData.interval_days === interval.value ? "gradient-purple" : "outline"}
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
                <Label htmlFor="start-date">تاریخ شروع (اختیاری)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value || undefined)}
                />
                <p className="text-sm text-gray-500">
                  در صورت خالی گذاشتن، از امروز شروع می‌شود
                </p>
              </div>

              {/* Gold Price History */}
              {goldPriceHistory.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    تاریخچه قیمت طلا (30 روز اخیر)
                  </Label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg">
                    <div className="space-y-1 p-2">
                      {goldPriceHistory.slice(0, 5).map((entry, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{new Date(entry.date).toLocaleDateString('fa-IR')}</span>
                          <span className="font-medium">{entry.price.toLocaleString()} ریال/گرم</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="gradient-purple"
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
                    ایجاد طرح اقساط طلا
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
              پیش‌نمایش طرح اقساط طلا
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewData ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">وزن کل طلا</p>
                    <p className="font-semibold text-yellow-700">{previewData.totalGoldWeight.toFixed(3)} گرم</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ارزش فعلی (تقریبی)</p>
                    <p className="font-semibold text-green-600">
                      {currentGoldPrice > 0 ? 
                        (previewData.totalGoldWeight * currentGoldPrice).toLocaleString() : 
                        'نامشخص'
                      } ریال
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-700">
                    مبلغ هر قسط بر اساس قیمت طلا در روز پرداخت محاسبه می‌شود
                  </p>
                </div>

                {/* Installments List */}
                <div className="space-y-2">
                  <h4 className="font-medium">جدول اقساط (بر اساس وزن):</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {previewData.installments.map((installment) => (
                      <div
                        key={installment.number}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
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
                          <p className="font-semibold text-yellow-700">
                            {installment.goldWeightDue.toFixed(3)} گرم
                          </p>
                          {currentGoldPrice > 0 && (
                            <p className="text-xs text-gray-500">
                              ≈ {(installment.goldWeightDue * currentGoldPrice).toLocaleString()} ریال
                            </p>
                          )}
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

export default GoldInstallmentPlanSetup;