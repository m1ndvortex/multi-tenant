import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  invoiceCustomizationService, 
  InvoiceTemplate,
  InvoiceBranding
} from '@/services/invoiceCustomizationService';
import { 
  FileText, 
  Eye, 
  Download, 
  Printer, 
  Loader2,
  Palette,
  Layout,
  RefreshCw
} from 'lucide-react';

interface SampleInvoiceData {
  invoice_number: string;
  date: string;
  due_date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    weight?: number;
    labor_fee?: number;
    profit?: number;
    vat_amount?: number;
  }>;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
}

const sampleGeneralInvoice: SampleInvoiceData = {
  invoice_number: 'INV-202403-0001',
  date: '1403/01/15',
  due_date: '1403/02/15',
  customer: {
    name: 'شرکت نمونه تجارت',
    email: 'info@sample-company.com',
    phone: '021-12345678',
    address: 'تهران، خیابان ولیعصر، پلاک 123'
  },
  items: [
    {
      description: 'محصول نمونه A',
      quantity: 2,
      unit_price: 150000,
      line_total: 300000
    },
    {
      description: 'محصول نمونه B',
      quantity: 1,
      unit_price: 250000,
      line_total: 250000
    }
  ],
  subtotal: 550000,
  tax_amount: 49500,
  total_amount: 599500,
  notes: 'این یک فاکتور نمونه است'
};

const sampleGoldInvoice: SampleInvoiceData = {
  invoice_number: 'GOLD-202403-0001',
  date: '1403/01/15',
  due_date: '1403/02/15',
  customer: {
    name: 'آقای احمد محمدی',
    email: 'ahmad.mohammadi@email.com',
    phone: '0912-3456789',
    address: 'تهران، بازار طلا، مغازه شماره 45'
  },
  items: [
    {
      description: 'گردنبند طلای 18 عیار',
      quantity: 1,
      unit_price: 12500000,
      line_total: 12500000,
      weight: 15.5,
      labor_fee: 2000000,
      profit: 1500000,
      vat_amount: 1440000
    },
    {
      description: 'انگشتر طلای 18 عیار',
      quantity: 1,
      unit_price: 4200000,
      line_total: 4200000,
      weight: 5.2,
      labor_fee: 800000,
      profit: 600000,
      vat_amount: 504000
    }
  ],
  subtotal: 16700000,
  tax_amount: 1944000,
  total_amount: 18644000,
  notes: 'قیمت طلا بر اساس نرخ روز محاسبه شده است'
};

const InvoicePreview: React.FC = () => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [brandingConfigs, setBrandingConfigs] = useState<InvoiceBranding[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedBrandingId, setSelectedBrandingId] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'GENERAL' | 'GOLD'>('GENERAL');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesResponse, brandingResponse] = await Promise.all([
        invoiceCustomizationService.getTemplates(),
        invoiceCustomizationService.getBrandingConfigs()
      ]);
      
      setTemplates(templatesResponse.templates);
      setBrandingConfigs(brandingResponse.branding_configs);
      
      // Set defaults
      if (templatesResponse.templates.length > 0) {
        const defaultTemplate = templatesResponse.templates.find(t => t.is_default) || templatesResponse.templates[0];
        setSelectedTemplateId(defaultTemplate.id);
      }
      
      if (brandingResponse.branding_configs.length > 0) {
        const defaultBranding = brandingResponse.branding_configs.find(b => b.is_default) || brandingResponse.branding_configs[0];
        setSelectedBrandingId(defaultBranding.id);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری داده‌ها',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSampleData = () => {
    return invoiceType === 'GOLD' ? sampleGoldInvoice : sampleGeneralInvoice;
  };

  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplateId);
  };

  const getSelectedBranding = () => {
    return brandingConfigs.find(b => b.id === selectedBrandingId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال';
  };

  const renderInvoicePreview = () => {
    const sampleData = getSampleData();
    const template = getSelectedTemplate();
    const branding = getSelectedBranding();

    if (!template || !branding) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p>لطفاً قالب و برندینگ را انتخاب کنید</p>
        </div>
      );
    }

    const styles = {
      backgroundColor: branding.background_color || '#FFFFFF',
      color: branding.text_color || '#1F2937',
      fontFamily: branding.font_family || 'Inter',
    };

    return (
      <div className="bg-white p-8 rounded-lg shadow-lg" style={styles}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {branding.logo_url && (
              <img
                src={branding.logo_url}
                alt="لوگو"
                className="rounded"
                style={{
                  width: branding.logo_width || 'auto',
                  height: branding.logo_height || '60px',
                  maxWidth: '200px',
                  maxHeight: '100px'
                }}
              />
            )}
            <div>
              <h1 
                className="font-bold"
                style={{ 
                  color: branding.primary_color || '#3B82F6',
                  fontSize: branding.header_font_size || '24px'
                }}
              >
                {branding.company_name || 'نام شرکت'}
              </h1>
              {branding.company_address && (
                <p className="text-sm mt-1">{branding.company_address}</p>
              )}
              <div className="flex gap-4 text-sm mt-2">
                {branding.company_phone && <span>تلفن: {branding.company_phone}</span>}
                {branding.company_email && <span>ایمیل: {branding.company_email}</span>}
              </div>
            </div>
          </div>
          
          <div className="text-left">
            <h2 
              className="text-2xl font-bold mb-2"
              style={{ color: branding.secondary_color || '#10B981' }}
            >
              {invoiceType === 'GOLD' ? 'فاکتور طلا' : 'فاکتور'}
            </h2>
            <div className="text-sm space-y-1">
              <p><strong>شماره:</strong> {sampleData.invoice_number}</p>
              <p><strong>تاریخ:</strong> {sampleData.date}</p>
              <p><strong>سررسید:</strong> {sampleData.due_date}</p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-8">
          <h3 
            className="text-lg font-semibold mb-3"
            style={{ color: branding.primary_color || '#3B82F6' }}
          >
            اطلاعات مشتری
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p><strong>نام:</strong> {sampleData.customer.name}</p>
            <p><strong>تلفن:</strong> {sampleData.customer.phone}</p>
            <p><strong>ایمیل:</strong> {sampleData.customer.email}</p>
            <p><strong>آدرس:</strong> {sampleData.customer.address}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <h3 
            className="text-lg font-semibold mb-3"
            style={{ color: branding.primary_color || '#3B82F6' }}
          >
            اقلام فاکتور
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr style={{ backgroundColor: branding.primary_color || '#3B82F6', color: 'white' }}>
                  <th className="border border-gray-300 p-3 text-right">شرح</th>
                  <th className="border border-gray-300 p-3 text-center">تعداد</th>
                  <th className="border border-gray-300 p-3 text-center">قیمت واحد</th>
                  {invoiceType === 'GOLD' && (
                    <>
                      <th className="border border-gray-300 p-3 text-center">وزن (گرم)</th>
                      <th className="border border-gray-300 p-3 text-center">اجرت</th>
                      <th className="border border-gray-300 p-3 text-center">سود</th>
                      <th className="border border-gray-300 p-3 text-center">مالیات</th>
                    </>
                  )}
                  <th className="border border-gray-300 p-3 text-center">مبلغ کل</th>
                </tr>
              </thead>
              <tbody>
                {sampleData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3">{item.description}</td>
                    <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 p-3 text-center">{formatCurrency(item.unit_price)}</td>
                    {invoiceType === 'GOLD' && (
                      <>
                        <td className="border border-gray-300 p-3 text-center">{item.weight || '-'}</td>
                        <td className="border border-gray-300 p-3 text-center">
                          {item.labor_fee ? formatCurrency(item.labor_fee) : '-'}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {item.profit ? formatCurrency(item.profit) : '-'}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {item.vat_amount ? formatCurrency(item.vat_amount) : '-'}
                        </td>
                      </>
                    )}
                    <td className="border border-gray-300 p-3 text-center font-semibold">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>جمع کل:</span>
                <span>{formatCurrency(sampleData.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>مالیات:</span>
                <span>{formatCurrency(sampleData.tax_amount)}</span>
              </div>
              <div 
                className="flex justify-between text-lg font-bold pt-2 border-t"
                style={{ color: branding.accent_color || '#F59E0B' }}
              >
                <span>مبلغ نهایی:</span>
                <span>{formatCurrency(sampleData.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {sampleData.notes && (
          <div className="mb-8">
            <h3 
              className="text-lg font-semibold mb-3"
              style={{ color: branding.primary_color || '#3B82F6' }}
            >
              توضیحات
            </h3>
            <p className="text-sm bg-gray-50 p-4 rounded-lg">{sampleData.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-sm text-gray-600">
          <div className="flex justify-between items-center">
            <div>
              {branding.tax_id && <span>شناسه مالیاتی: {branding.tax_id}</span>}
            </div>
            <div>
              {branding.company_website && (
                <span>وب‌سایت: {branding.company_website}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card variant="gradient-green">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            پیش‌نمایش فاکتور
          </CardTitle>
          <p className="text-sm text-gray-600">
            پیش‌نمایش فاکتور با قالب و برندینگ انتخابی
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-type">نوع فاکتور</Label>
              <Select
                value={invoiceType}
                onValueChange={(value: any) => setInvoiceType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">عمومی</SelectItem>
                  <SelectItem value="GOLD">طلا</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-select">قالب</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب قالب" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branding-select">برندینگ</Label>
              <Select
                value={selectedBrandingId}
                onValueChange={setSelectedBrandingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب برندینگ" />
                </SelectTrigger>
                <SelectContent>
                  {brandingConfigs.map((branding) => (
                    <SelectItem key={branding.id} value={branding.id}>
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        {branding.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 ml-1" />
                به‌روزرسانی
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>پیش‌نمایش</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 ml-1" />
                چاپ
              </Button>
              <Button
                variant="gradient-green"
                size="sm"
                onClick={() => {
                  // TODO: Implement PDF download
                  toast({
                    title: 'در حال توسعه',
                    description: 'قابلیت دانلود PDF به زودی اضافه خواهد شد',
                  });
                }}
              >
                <Download className="h-4 w-4 ml-1" />
                دانلود PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {renderInvoicePreview()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicePreview;