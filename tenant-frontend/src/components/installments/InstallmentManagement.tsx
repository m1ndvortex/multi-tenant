import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Calculator,
  TrendingUp,
  Users,
  FileText,
  Coins
} from 'lucide-react';
import { installmentService, InstallmentDetail, OutstandingBalance } from '@/services/installmentService';
import { Invoice } from '@/services/invoiceService';
import { useToast } from '@/hooks/use-toast';
import InstallmentPlanSetup from './InstallmentPlanSetup';
import GoldInstallmentPlanSetup from './GoldInstallmentPlanSetup';
import InstallmentOverview from './InstallmentOverview';
import GoldInstallmentOverview from './GoldInstallmentOverview';
import PaymentRecording from './PaymentRecording';
import GoldPaymentRecording from './GoldPaymentRecording';
import GoldPriceManagement from './GoldPriceManagement';
import OverdueAlerts from './OverdueAlerts';

interface InstallmentManagementProps {
  invoice: Invoice;
  onBack: () => void;
}

const InstallmentManagement: React.FC<InstallmentManagementProps> = ({
  invoice,
  onBack,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentGoldPrice, setCurrentGoldPrice] = useState<number>(0);

  // Check if this is a gold invoice
  const isGoldInvoice = invoice.invoice_type === 'GOLD';

  // Fetch installments for the invoice
  const { data: installments, isLoading: isLoadingInstallments } = useQuery({
    queryKey: ['installments', invoice.id],
    queryFn: () => installmentService.getInstallmentsForInvoice(invoice.id),
    enabled: !!invoice.id,
  });

  // Fetch outstanding balance
  const { data: outstandingBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['outstanding-balance', invoice.id],
    queryFn: () => installmentService.getOutstandingBalance(invoice.id),
    enabled: !!invoice.id && invoice.is_installment,
  });

  // Fetch payment history
  const { data: paymentHistory } = useQuery({
    queryKey: ['payment-history', invoice.id],
    queryFn: () => installmentService.getPaymentHistory(invoice.id),
    enabled: !!invoice.id && invoice.is_installment,
  });

  // Create installment plan mutation
  const createPlanMutation = useMutation({
    mutationFn: installmentService.createInstallmentPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-balance', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'موفقیت',
        description: 'طرح اقساط با موفقیت ایجاد شد',
      });
      setActiveTab('overview');
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در ایجاد طرح اقساط',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: installmentService.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-balance', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-history', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'موفقیت',
        description: 'پرداخت با موفقیت ثبت شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در ثبت پرداخت',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel installment plan mutation
  const cancelPlanMutation = useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason?: string }) =>
      installmentService.cancelInstallmentPlan(invoiceId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-balance', invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'موفقیت',
        description: 'طرح اقساط لغو شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در لغو طرح اقساط',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const hasInstallments = installments && installments.length > 0;
  const hasOverdueInstallments = installments?.some(inst => inst.is_overdue) || false;

  // Load current gold price for gold invoices
  React.useEffect(() => {
    if (isGoldInvoice) {
      loadCurrentGoldPrice();
    }
  }, [isGoldInvoice]);

  const loadCurrentGoldPrice = async () => {
    try {
      const response = await installmentService.getCurrentGoldPrice();
      setCurrentGoldPrice(response.price);
    } catch (error) {
      console.error('Failed to load gold price:', error);
    }
  };

  // Get status badge for installment status
  const getStatusBadge = (status: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant={isGoldInvoice ? "gradient-purple" : "gradient-green"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-white hover:bg-white/20"
              >
                ← بازگشت
              </Button>
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  {isGoldInvoice ? <Coins className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
                  مدیریت اقساط {isGoldInvoice ? 'طلا' : ''} فاکتور {invoice.invoice_number}
                </CardTitle>
                <p className="text-white/80 mt-1">
                  مشتری: {invoice.customer_name} | 
                  {isGoldInvoice ? (
                    <>
                      {' '}وزن کل: {invoice.total_gold_weight?.toFixed(3)} گرم |
                      {' '}قیمت فروش: {invoice.gold_price_at_creation?.toLocaleString()} ریال/گرم
                    </>
                  ) : (
                    <> مبلغ کل: {invoice.total_amount.toLocaleString()} ریال</>
                  )}
                </p>
              </div>
            </div>
            
            {hasInstallments && (
              <div className="flex items-center gap-2">
                {hasOverdueInstallments && (
                  <Badge variant="destructive" className="animate-pulse">
                    <AlertTriangle className="h-3 w-3 ml-1" />
                    اقساط سررسید گذشته
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelPlanMutation.mutate({ invoiceId: invoice.id })}
                  disabled={cancelPlanMutation.isPending}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  لغو طرح اقساط
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      {outstandingBalance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="professional">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">کل اقساط</p>
                  <p className="text-lg font-semibold">{outstandingBalance.total_installments}</p>
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
                  <p className="text-sm text-gray-500">پرداخت شده</p>
                  <p className="text-lg font-semibold">{outstandingBalance.paid_installments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="professional">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">سررسید گذشته</p>
                  <p className="text-lg font-semibold">{outstandingBalance.overdue_installments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="professional">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">مانده بدهی</p>
                  <p className="text-lg font-semibold">
                    {outstandingBalance.outstanding_balance.toLocaleString()} ریال
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {!hasInstallments ? (
        // Show installment plan setup if no installments exist
        isGoldInvoice ? (
          <GoldInstallmentPlanSetup
            invoice={invoice}
            onCreatePlan={(planData) => createPlanMutation.mutate(planData)}
            isLoading={createPlanMutation.isPending}
          />
        ) : (
          <InstallmentPlanSetup
            invoice={invoice}
            onCreatePlan={(planData) => createPlanMutation.mutate(planData)}
            isLoading={createPlanMutation.isPending}
          />
        )
      ) : (
        // Show installment management tabs if installments exist
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Card variant="filter">
            <CardContent className="pt-6">
              <TabsList className={`grid w-full ${isGoldInvoice ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  نمای کلی
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex items-center gap-2">
                  {isGoldInvoice ? <Coins className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  ثبت پرداخت
                </TabsTrigger>
                {isGoldInvoice && (
                  <TabsTrigger value="gold-price" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    قیمت طلا
                  </TabsTrigger>
                )}
                <TabsTrigger value="overdue" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  سررسید گذشته
                  {hasOverdueInstallments && (
                    <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">
                      !
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  تاریخچه پرداخت
                </TabsTrigger>
              </TabsList>
            </CardContent>
          </Card>

          <TabsContent value="overview">
            {isGoldInvoice ? (
              <GoldInstallmentOverview
                installments={installments || []}
                outstandingBalance={outstandingBalance}
                currentGoldPrice={currentGoldPrice}
                isLoading={isLoadingInstallments || isLoadingBalance}
              />
            ) : (
              <InstallmentOverview
                installments={installments || []}
                outstandingBalance={outstandingBalance}
                isLoading={isLoadingInstallments || isLoadingBalance}
              />
            )}
          </TabsContent>

          <TabsContent value="payment">
            {isGoldInvoice ? (
              <GoldPaymentRecording
                installments={installments || []}
                onRecordPayment={(paymentData) => recordPaymentMutation.mutate(paymentData)}
                isLoading={recordPaymentMutation.isPending}
              />
            ) : (
              <PaymentRecording
                installments={installments || []}
                onRecordPayment={(paymentData) => recordPaymentMutation.mutate(paymentData)}
                isLoading={recordPaymentMutation.isPending}
              />
            )}
          </TabsContent>

          {isGoldInvoice && (
            <TabsContent value="gold-price">
              <GoldPriceManagement
                onPriceUpdate={(newPrice) => setCurrentGoldPrice(newPrice)}
              />
            </TabsContent>
          )}

          <TabsContent value="overdue">
            <OverdueAlerts
              installments={installments?.filter(inst => inst.is_overdue) || []}
              onRecordPayment={(paymentData) => recordPaymentMutation.mutate(paymentData)}
              isLoading={recordPaymentMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="history">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  تاریخچه پرداخت‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentHistory && paymentHistory.payments.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">تعداد پرداخت‌ها</p>
                        <p className="text-lg font-semibold">{paymentHistory.total_payments}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">مجموع پرداخت‌ها</p>
                        <p className="text-lg font-semibold">
                          {paymentHistory.total_amount_paid.toLocaleString()} ریال
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">میانگین پرداخت</p>
                        <p className="text-lg font-semibold">
                          {(paymentHistory.total_amount_paid / paymentHistory.total_payments).toLocaleString()} ریال
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {paymentHistory.payments.map((payment) => (
                        <div
                          key={`${payment.installment_id}-${payment.payment_date}`}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">قسط شماره {payment.installment_number}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(payment.payment_date).toLocaleDateString('fa-IR')}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-green-600">
                              {payment.amount_paid.toLocaleString()} ریال
                            </p>
                            {payment.payment_method && (
                              <p className="text-sm text-gray-500">{payment.payment_method}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">هنوز پرداختی ثبت نشده است</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default InstallmentManagement;