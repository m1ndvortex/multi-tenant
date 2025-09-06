import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Send, 
  Download, 
  QrCode, 
  Printer,
  Package,
  Coins,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Weight,
  Wrench,
  TrendingUp,
  Receipt,
  CreditCard,
  Share2
} from 'lucide-react';
import { Invoice } from '@/services/invoiceService';
import InstallmentManagement from '@/components/installments/InstallmentManagement';
import { InvoiceSharing } from './InvoiceSharing';

interface InvoiceDetailProps {
  invoice: Invoice;
  onEdit: () => void;
  onSend: () => void;
  onDownloadPDF: () => void;
  onGenerateQR: () => void;
  onPrint: () => void;
  onBack: () => void;
  onInvoiceUpdate?: (updatedInvoice: Partial<Invoice>) => void;
  isLoading?: boolean;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
  onEdit,
  onSend,
  onDownloadPDF,
  onGenerateQR,
  onPrint,
  onBack,
  onInvoiceUpdate,
  isLoading = false,
}) => {
  const [showInstallments, setShowInstallments] = useState(false);
  const [showSharing, setShowSharing] = useState(false);
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">پیش‌نویس</Badge>;
      case 'sent':
        return <Badge variant="default">ارسال شده</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-500">پرداخت شده</Badge>;
      case 'overdue':
        return <Badge variant="destructive">سررسید گذشته</Badge>;
      case 'cancelled':
        return <Badge variant="outline">لغو شده</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get invoice type badge
  const getTypeBadge = (type: string) => {
    return type === 'GOLD' ? (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
        <Coins className="h-3 w-3 ml-1" />
        فاکتور طلا
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
        <Package className="h-3 w-3 ml-1" />
        فاکتور عمومی
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">در حال بارگیری...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show installment management if requested
  if (showInstallments) {
    return (
      <InstallmentManagement
        invoice={invoice}
        onBack={() => setShowInstallments(false)}
      />
    );
  }

  // Show sharing management if requested
  if (showSharing) {
    return (
      <div className="space-y-6">
        <Card variant="gradient-green">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Share2 className="h-6 w-6" />
                مدیریت اشتراک‌گذاری فاکتور {invoice.invoice_number}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSharing(false)}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                بازگشت
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <InvoiceSharing
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          initialIsShareable={invoice.is_shareable}
          initialQrToken={invoice.qr_code_token}
          onSharingChange={(isShareable, qrToken) => {
            if (onInvoiceUpdate) {
              onInvoiceUpdate({ is_shareable: isShareable, qr_code_token: qrToken });
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="gradient-green">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                بازگشت
              </Button>
              <div>
                <CardTitle className="text-white">
                  فاکتور {invoice.invoice_number}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  {getTypeBadge(invoice.invoice_type)}
                  {getStatusBadge(invoice.status)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Edit className="h-4 w-4 ml-2" />
                ویرایش
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSend}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Send className="h-4 w-4 ml-2" />
                ارسال
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadPDF}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4 ml-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Printer className="h-4 w-4 ml-2" />
                چاپ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSharing(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Share2 className="h-4 w-4 ml-2" />
                اشتراک‌گذاری
              </Button>
              {(invoice.installment_type === 'GENERAL' || (invoice as any).is_installment) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallments(true)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <CreditCard className="h-4 w-4 ml-2" />
                  مدیریت اقساط
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              اطلاعات مشتری
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-medium text-lg">{invoice.customer_name}</div>
              {invoice.customer_phone && (
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Phone className="h-4 w-4" />
                  {invoice.customer_phone}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              اطلاعات فاکتور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">تاریخ ایجاد</div>
                <div className="font-medium">
                  {new Date(invoice.created_at).toLocaleDateString('fa-IR')}
                </div>
              </div>
              {invoice.due_date && (
                <div>
                  <div className="text-gray-500">سررسید</div>
                  <div className="font-medium">
                    {new Date(invoice.due_date).toLocaleDateString('fa-IR')}
                  </div>
                </div>
              )}
              <div>
                <div className="text-gray-500">نوع قسط</div>
                <div className="font-medium">
                  {invoice.installment_type === 'NONE' ? 'نقدی' :
                   invoice.installment_type === 'GENERAL' ? 'قسط عمومی' :
                   invoice.installment_type === 'GOLD' ? 'قسط طلا' : 'نامشخص'}
                </div>
              </div>
              <div>
                <div className="text-gray-500">قابل اشتراک</div>
                <div className="font-medium">
                  {invoice.is_shareable ? 'بله' : 'خیر'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card variant="gradient-blue">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5" />
              خلاصه مالی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-white">
              <div className="flex justify-between">
                <span>جمع کل:</span>
                <span className="font-bold text-lg">
                  {invoice.subtotal.toLocaleString()} ریال
                </span>
              </div>
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>مالیات:</span>
                  <span>{invoice.tax_amount.toLocaleString()} ریال</span>
                </div>
              )}
              {invoice.discount_amount && invoice.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>تخفیف:</span>
                  <span>-{invoice.discount_amount.toLocaleString()} ریال</span>
                </div>
              )}
              <Separator className="bg-white/20" />
              <div className="flex justify-between text-lg font-bold">
                <span>مبلغ نهایی:</span>
                <span>{invoice.total_amount.toLocaleString()} ریال</span>
              </div>
              
              {/* Gold-specific information */}
              {invoice.invoice_type === 'GOLD' && (
                <>
                  <Separator className="bg-white/20" />
                  <div className="space-y-2">
                    {invoice.total_gold_weight && (
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1">
                          <Weight className="h-4 w-4" />
                          وزن کل:
                        </span>
                        <span className="font-medium">
                          {invoice.total_gold_weight.toFixed(3)} گرم
                        </span>
                      </div>
                    )}
                    {invoice.gold_price_at_creation && (
                      <div className="flex justify-between">
                        <span>قیمت طلا:</span>
                        <span className="font-medium">
                          {invoice.gold_price_at_creation.toLocaleString()} ریال/گرم
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Installment information */}
              {invoice.installment_type !== 'NONE' && (
                <>
                  <Separator className="bg-white/20" />
                  <div className="space-y-2">
                    {invoice.remaining_balance !== undefined && invoice.remaining_balance > 0 && (
                      <div className="flex justify-between">
                        <span>مانده:</span>
                        <span className="font-medium">
                          {invoice.remaining_balance.toLocaleString()} ریال
                        </span>
                      </div>
                    )}
                    {invoice.remaining_gold_weight !== undefined && invoice.remaining_gold_weight > 0 && (
                      <div className="flex justify-between">
                        <span>مانده به گرم:</span>
                        <span className="font-medium">
                          {invoice.remaining_gold_weight.toFixed(3)} گرم
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            اقلام فاکتور
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شرح</TableHead>
                <TableHead>تعداد</TableHead>
                <TableHead>قیمت واحد</TableHead>
                {invoice.invoice_type === 'GOLD' && (
                  <>
                    <TableHead>وزن (گرم)</TableHead>
                    <TableHead>اجرت</TableHead>
                    <TableHead>سود</TableHead>
                    <TableHead>مالیات</TableHead>
                  </>
                )}
                <TableHead>جمع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.description}</div>
                      {item.notes && (
                        <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity.toLocaleString()}</TableCell>
                  <TableCell>{item.unit_price.toLocaleString()} ریال</TableCell>
                  
                  {invoice.invoice_type === 'GOLD' && (
                    <>
                      <TableCell>
                        {item.weight ? (
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {item.weight.toFixed(3)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.labor_fee ? (
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {item.labor_fee.toLocaleString()} ریال
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.profit ? (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {item.profit.toLocaleString()} ریال
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.vat_amount ? (
                          <span>{item.vat_amount.toLocaleString()} ریال</span>
                        ) : '-'}
                      </TableCell>
                    </>
                  )}
                  
                  <TableCell className="font-medium">
                    {item.line_total.toLocaleString()} ریال
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {(invoice.notes || invoice.customer_notes || invoice.terms_and_conditions) && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle>یادداشت‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.notes && (
              <div>
                <div className="font-medium text-sm text-gray-500 mb-1">یادداشت داخلی:</div>
                <div className="text-sm">{invoice.notes}</div>
              </div>
            )}
            {invoice.customer_notes && (
              <div>
                <div className="font-medium text-sm text-gray-500 mb-1">یادداشت مشتری:</div>
                <div className="text-sm">{invoice.customer_notes}</div>
              </div>
            )}
            {invoice.terms_and_conditions && (
              <div>
                <div className="font-medium text-sm text-gray-500 mb-1">شرایط و ضوابط:</div>
                <div className="text-sm">{invoice.terms_and_conditions}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceDetail;