import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { qrSharingService, PublicInvoiceResponse } from '@/services/qrSharingService';

interface PublicInvoiceViewProps {
  qrToken?: string;
}

export const PublicInvoiceView: React.FC<PublicInvoiceViewProps> = ({ qrToken: propToken }) => {
  const { qrToken: paramToken } = useParams<{ qrToken: string }>();
  const qrToken = propToken || paramToken;
  
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<PublicInvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (qrToken) {
      loadPublicInvoice();
    }
  }, [qrToken]);

  const loadPublicInvoice = async () => {
    if (!qrToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // First validate the token
      const validation = await qrSharingService.validateQRToken(qrToken);
      if (!validation.valid) {
        setError(validation.error || 'لینک نامعتبر یا منقضی شده است');
        return;
      }

      // Load the invoice
      const invoiceData = await qrSharingService.getPublicInvoice(qrToken);
      setInvoice(invoiceData);
    } catch (error) {
      setError('فاکتور یافت نشد یا قابل مشاهده نیست');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!qrToken) return;
    
    try {
      const blob = await qrSharingService.getPublicInvoicePDF(qrToken);
      qrSharingService.downloadBlob(blob, `invoice_${invoice?.invoice_number}.pdf`);
      
      toast({
        title: 'موفق',
        description: 'فاکتور دانلود شد',
      });
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در دانلود فاکتور',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'پیش‌نویس', variant: 'secondary' as const, icon: FileText },
      sent: { label: 'ارسال شده', variant: 'default' as const, icon: CheckCircle },
      paid: { label: 'پرداخت شده', variant: 'default' as const, icon: CheckCircle },
      overdue: { label: 'معوقه', variant: 'destructive' as const, icon: AlertCircle },
      cancelled: { label: 'لغو شده', variant: 'secondary' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white flex items-center justify-center">
        <Card variant="professional" className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">در حال بارگذاری فاکتور...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50/30 to-white flex items-center justify-center">
        <Card variant="professional" className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">خطا در بارگذاری</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadPublicInvoice} variant="outline">
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50/30 to-white flex items-center justify-center">
        <Card variant="professional" className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">فاکتور یافت نشد</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <Card variant="gradient-green" className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  فاکتور شماره {invoice.invoice_number}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {invoice.invoice_type === 'GOLD' ? 'فاکتور طلا' : 'فاکتور عمومی'}
                  </Badge>
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
              <Button onClick={downloadPDF} variant="gradient-blue">
                <Download className="h-4 w-4 mr-2" />
                دانلود PDF
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card variant="professional">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">تاریخ فاکتور</h3>
              </div>
              <p className="text-lg">{formatDate(invoice.invoice_date)}</p>
            </CardContent>
          </Card>

          {invoice.due_date && (
            <Card variant="professional">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold">تاریخ سررسید</h3>
                </div>
                <p className="text-lg">{formatDate(invoice.due_date)}</p>
              </CardContent>
            </Card>
          )}

          <Card variant="professional">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">مبلغ کل</h3>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(invoice.total_amount)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Items */}
        <Card variant="professional" className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              اقلام فاکتور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4">شرح</th>
                    <th className="text-center py-3 px-4">تعداد</th>
                    <th className="text-center py-3 px-4">قیمت واحد</th>
                    {invoice.invoice_type === 'GOLD' && (
                      <th className="text-center py-3 px-4">وزن (گرم)</th>
                    )}
                    <th className="text-center py-3 px-4">مبلغ کل</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="text-center py-3 px-4">
                        {new Intl.NumberFormat('fa-IR').format(item.quantity)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {formatCurrency(item.unit_price)}
                      </td>
                      {invoice.invoice_type === 'GOLD' && (
                        <td className="text-center py-3 px-4">
                          {item.weight ? new Intl.NumberFormat('fa-IR').format(item.weight) : '-'}
                        </td>
                      )}
                      <td className="text-center py-3 px-4 font-semibold">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-end">
              <div className="text-right space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  مبلغ کل: {formatCurrency(invoice.total_amount)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes and Terms */}
        {(invoice.customer_notes || invoice.terms_and_conditions) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {invoice.customer_notes && (
              <Card variant="professional">
                <CardHeader>
                  <CardTitle className="text-lg">یادداشت برای مشتری</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {invoice.customer_notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {invoice.terms_and_conditions && (
              <Card variant="professional">
                <CardHeader>
                  <CardTitle className="text-lg">شرایط و ضوابط</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {invoice.terms_and_conditions}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>این فاکتور از طریق سیستم حسابداری آنلاین تولید شده است</p>
        </div>
      </div>
    </div>
  );
};