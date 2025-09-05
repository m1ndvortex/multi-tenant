import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  CreditCard,
  Target,
  Info
} from 'lucide-react';
import { InstallmentDetail, OutstandingBalance } from '@/services/installmentService';

interface InstallmentOverviewProps {
  installments: InstallmentDetail[];
  outstandingBalance?: OutstandingBalance;
  isLoading?: boolean;
}

const InstallmentOverview: React.FC<InstallmentOverviewProps> = ({
  installments,
  outstandingBalance,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">در حال بارگیری...</p>
        </CardContent>
      </Card>
    );
  }

  // Get status badge for installment status
  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'paid') {
      return <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 ml-1" />
        سررسید گذشته
      </Badge>;
    }

    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <Clock className="h-3 w-3 ml-1" />
          در انتظار
        </Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 ml-1" />
          پرداخت شده
        </Badge>;
      case 'overdue':
        return <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 ml-1" />
          سررسید گذشته
        </Badge>;
      case 'cancelled':
        return <Badge variant="outline">لغو شده</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get priority badge for installments
  const getPriorityBadge = (installment: InstallmentDetail) => {
    if (installment.is_overdue) {
      return <Badge variant="destructive" className="text-xs">
        فوری
      </Badge>;
    }
    
    const dueDate = new Date(installment.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 7 && daysUntilDue > 0) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
        نزدیک سررسید
      </Badge>;
    }
    
    return null;
  };

  const nextDueInstallment = installments.find(inst => 
    inst.status === 'pending' && !inst.is_fully_paid
  );

  return (
    <div className="space-y-6">
      {/* Outstanding Balance Summary */}
      {outstandingBalance && (
        <Card variant="gradient-green">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              خلاصه وضعیت اقساط
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-white">
              <div>
                <p className="text-white/80 text-sm">مجموع بدهی</p>
                <p className="text-xl font-bold">
                  {outstandingBalance.total_due.toLocaleString()} ریال
                </p>
              </div>
              <div>
                <p className="text-white/80 text-sm">پرداخت شده</p>
                <p className="text-xl font-bold">
                  {outstandingBalance.total_paid.toLocaleString()} ریال
                </p>
              </div>
              <div>
                <p className="text-white/80 text-sm">مانده بدهی</p>
                <p className="text-xl font-bold">
                  {outstandingBalance.outstanding_balance.toLocaleString()} ریال
                </p>
              </div>
              <div>
                <p className="text-white/80 text-sm">درصد پرداخت</p>
                <p className="text-xl font-bold">
                  {outstandingBalance.total_due > 0 
                    ? Math.round((outstandingBalance.total_paid / outstandingBalance.total_due) * 100)
                    : 0}%
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${outstandingBalance.total_due > 0 
                      ? (outstandingBalance.total_paid / outstandingBalance.total_due) * 100
                      : 0}%`
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Due Installment Alert */}
      {nextDueInstallment && (
        <Card variant="professional" className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">قسط بعدی</p>
                  <p className="text-sm text-gray-500">
                    قسط شماره {nextDueInstallment.installment_number} - 
                    سررسید: {new Date(nextDueInstallment.due_date).toLocaleDateString('fa-IR')}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-lg font-semibold text-orange-600">
                  {nextDueInstallment.remaining_amount.toLocaleString()} ریال
                </p>
                {nextDueInstallment.is_overdue && (
                  <p className="text-sm text-red-600">
                    {nextDueInstallment.days_overdue} روز سررسید گذشته
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installments Table */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            جدول اقساط
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {installments.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">هیچ قسطی یافت نشد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شماره قسط</TableHead>
                  <TableHead>مبلغ قسط</TableHead>
                  <TableHead>پرداخت شده</TableHead>
                  <TableHead>مانده</TableHead>
                  <TableHead>سررسید</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>اولویت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow 
                    key={installment.id}
                    className={installment.is_overdue ? 'bg-red-50' : ''}
                  >
                    <TableCell className="font-medium">
                      قسط {installment.installment_number}
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <p className="font-medium">
                          {installment.amount_due?.toLocaleString()} ریال
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          {installment.amount_paid.toLocaleString()} ریال
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <p className={`font-medium ${
                          installment.remaining_amount > 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {installment.remaining_amount.toLocaleString()} ریال
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {new Date(installment.due_date).toLocaleDateString('fa-IR')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(installment.due_date).toLocaleDateString('fa-IR', { 
                            weekday: 'long' 
                          })}
                        </p>
                        {installment.is_overdue && (
                          <p className="text-xs text-red-600">
                            {installment.days_overdue} روز گذشته
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(installment.status, installment.is_overdue)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(installment)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="professional">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">میانگین مبلغ قسط</p>
                <p className="text-lg font-semibold">
                  {installments.length > 0 
                    ? Math.round(installments.reduce((sum, inst) => sum + (inst.amount_due || 0), 0) / installments.length).toLocaleString()
                    : 0} ریال
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">نرخ پرداخت</p>
                <p className="text-lg font-semibold">
                  {installments.length > 0 
                    ? Math.round((installments.filter(inst => inst.is_fully_paid).length / installments.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">اقساط باقی‌مانده</p>
                <p className="text-lg font-semibold">
                  {installments.filter(inst => !inst.is_fully_paid).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Instructions */}
      {outstandingBalance && outstandingBalance.outstanding_balance > 0 && (
        <Card variant="gradient-blue">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 text-white">
              <Info className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium mb-1">راهنمای پرداخت</p>
                <p className="text-white/90 text-sm">
                  برای ثبت پرداخت، به تب "ثبت پرداخت" بروید و قسط مورد نظر را انتخاب کنید.
                  می‌توانید پرداخت کامل یا جزئی انجام دهید.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InstallmentOverview;