import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Coins,
  TrendingUp,
  DollarSign,
  Target,
  Award
} from 'lucide-react';
import { InstallmentDetail, OutstandingBalance } from '@/services/installmentService';

interface GoldInstallmentOverviewProps {
  installments: InstallmentDetail[];
  outstandingBalance?: OutstandingBalance;
  currentGoldPrice?: number;
  isLoading?: boolean;
}

const GoldInstallmentOverview: React.FC<GoldInstallmentOverviewProps> = ({
  installments,
  outstandingBalance,
  currentGoldPrice = 0,
  isLoading = false,
}) => {
  // Filter gold installments
  const goldInstallments = installments.filter(inst => inst.installment_type === 'gold');
  
  // Calculate gold-specific statistics
  const totalGoldWeight = goldInstallments.reduce((sum, inst) => sum + (inst.gold_weight_due || 0), 0);
  const paidGoldWeight = goldInstallments.reduce((sum, inst) => sum + (inst.gold_weight_paid || 0), 0);
  const remainingGoldWeight = totalGoldWeight - paidGoldWeight;
  const completionPercentage = totalGoldWeight > 0 ? (paidGoldWeight / totalGoldWeight) * 100 : 0;

  // Get status badge for installment status
  const getStatusBadge = (installment: InstallmentDetail) => {
    if (installment.status === 'paid') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
        <CheckCircle className="h-3 w-3 ml-1" />
        پرداخت شده
      </Badge>;
    }

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

    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
      <Clock className="h-3 w-3 ml-1" />
      در انتظار
    </Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} variant="professional">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gold Weight Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="gradient-green">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <p className="text-white/80 text-sm">وزن کل طلا</p>
                <p className="text-lg font-semibold">{totalGoldWeight.toFixed(3)} گرم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-blue">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <p className="text-white/80 text-sm">پرداخت شده</p>
                <p className="text-lg font-semibold">{paidGoldWeight.toFixed(3)} گرم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-purple">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="text-white">
                <p className="text-white/80 text-sm">مانده به گرم</p>
                <p className="text-lg font-semibold text-yellow-200">{remainingGoldWeight.toFixed(3)} گرم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">درصد تکمیل</p>
                <p className="text-lg font-semibold text-green-600">{completionPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">پیشرفت پرداخت طلا</h3>
              <span className="text-sm text-gray-500">{completionPercentage.toFixed(1)}% تکمیل شده</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>پرداخت شده: {paidGoldWeight.toFixed(3)} گرم</span>
              <span>باقی‌مانده: {remainingGoldWeight.toFixed(3)} گرم</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Gold Price */}
      {currentGoldPrice > 0 && (
        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="text-white">
                  <p className="text-white/80 text-sm">قیمت فعلی طلا</p>
                  <p className="text-2xl font-bold">{currentGoldPrice.toLocaleString()} ریال/گرم</p>
                </div>
              </div>
              <div className="text-white text-right">
                <p className="text-white/80 text-sm">ارزش مانده</p>
                <p className="text-xl font-semibold">
                  {(remainingGoldWeight * currentGoldPrice).toLocaleString()} ریال
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installments List */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            جدول اقساط طلا
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goldInstallments.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">هیچ قسط طلایی یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goldInstallments.map((installment) => (
                <div
                  key={installment.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    installment.is_overdue ? 'border-red-200 bg-red-50' : 
                    installment.status === 'paid' ? 'border-green-200 bg-green-50' : 
                    'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        installment.status === 'paid' ? 'bg-green-100' :
                        installment.is_overdue ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <Coins className={`h-5 w-5 ${
                          installment.status === 'paid' ? 'text-green-600' :
                          installment.is_overdue ? 'text-red-600' : 'text-yellow-600'
                        }`} />
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

                    <div className="text-left space-y-2">
                      {/* Gold Weight Due */}
                      <div>
                        <p className="text-sm text-gray-500">وزن قسط</p>
                        <p className="font-semibold text-yellow-600">
                          {installment.gold_weight_due?.toFixed(3)} گرم
                        </p>
                      </div>

                      {/* Gold Weight Paid */}
                      {(installment.gold_weight_paid || 0) > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">پرداخت شده</p>
                          <p className="font-semibold text-green-600">
                            {installment.gold_weight_paid?.toFixed(3)} گرم
                          </p>
                          {installment.gold_price_at_payment && (
                            <p className="text-xs text-gray-500">
                              قیمت: {installment.gold_price_at_payment.toLocaleString()} ریال/گرم
                            </p>
                          )}
                        </div>
                      )}

                      {/* Remaining Gold Weight */}
                      {installment.status !== 'paid' && (
                        <div>
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
                      )}

                      {/* Payment Date */}
                      {installment.paid_at && (
                        <div>
                          <p className="text-sm text-gray-500">تاریخ پرداخت</p>
                          <p className="text-sm font-medium text-green-600">
                            {new Date(installment.paid_at).toLocaleDateString('fa-IR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for partial payments */}
                  {installment.status !== 'paid' && (installment.gold_weight_paid || 0) > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                        <span>پیشرفت پرداخت</span>
                        <span>
                          {installment.gold_weight_due ? 
                            (((installment.gold_weight_paid || 0) / installment.gold_weight_due) * 100).toFixed(1) : 0
                          }%
                        </span>
                      </div>
                      <Progress 
                        value={installment.gold_weight_due ? 
                          ((installment.gold_weight_paid || 0) / installment.gold_weight_due) * 100 : 0
                        } 
                        className="h-2" 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoldInstallmentOverview;