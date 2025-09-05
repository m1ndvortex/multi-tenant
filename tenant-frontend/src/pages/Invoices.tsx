import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import InvoiceList from '@/components/invoices/InvoiceList';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { 
  Invoice, 
  InvoiceCreate, 
  InvoiceSearchParams, 
  invoiceService 
} from '@/services/invoiceService';
import { customerService } from '@/services/customerService';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useState<InvoiceSearchParams>({
    page: 1,
    per_page: 20,
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices', searchParams],
    queryFn: () => invoiceService.getInvoices(searchParams),
  });

  // Fetch customers for form
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getCustomers({ per_page: 1000 }),
  });

  // Fetch products for form
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts({ page_size: 1000 }),
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: invoiceService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'موفقیت',
        description: 'فاکتور با موفقیت ایجاد شد',
      });
      navigate('/invoices');
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در ایجاد فاکتور',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: invoiceService.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'موفقیت',
        description: 'فاکتور با موفقیت حذف شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در حذف فاکتور',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: invoiceService.sendInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'موفقیت',
        description: 'فاکتور با موفقیت ارسال شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا در ارسال فاکتور',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleSearch = (params: InvoiceSearchParams) => {
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }));
  };

  const handleCreateInvoice = async (data: InvoiceCreate) => {
    await createInvoiceMutation.mutateAsync(data);
  };

  const handleView = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleEdit = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}/edit`);
  };

  const handleDelete = async (invoice: Invoice) => {
    if (window.confirm(`آیا از حذف فاکتور ${invoice.invoice_number} اطمینان دارید؟`)) {
      await deleteInvoiceMutation.mutateAsync(invoice.id);
    }
  };

  const handleSend = async (invoice: Invoice) => {
    await sendInvoiceMutation.mutateAsync(invoice.id);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const blob = await invoiceService.downloadPDF(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'خطا در دانلود PDF',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateQR = async (invoice: Invoice) => {
    try {
      const result = await invoiceService.generateQRCode(invoice.id);
      toast({
        title: 'موفقیت',
        description: 'QR Code با موفقیت ایجاد شد',
      });
      // You could show the QR code in a modal here
    } catch (error) {
      toast({
        title: 'خطا در ایجاد QR Code',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    }
  };

  const handleCreateNew = () => {
    navigate('/invoices/new');
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <InvoiceList
            invoices={invoicesData?.invoices || []}
            customers={customersData?.customers || []}
            total={invoicesData?.total || 0}
            page={invoicesData?.page || 1}
            perPage={invoicesData?.per_page || 20}
            isLoading={isLoadingInvoices}
            onSearch={handleSearch}
            onPageChange={handlePageChange}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSend={handleSend}
            onDownloadPDF={handleDownloadPDF}
            onGenerateQR={handleGenerateQR}
            onCreateNew={handleCreateNew}
          />
        }
      />
      <Route
        path="/new"
        element={
          <div className="space-y-6">
            <Card variant="filter">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/invoices')}
                  >
                    <ArrowLeft className="h-4 w-4 ml-2" />
                    بازگشت
                  </Button>
                  <CardTitle>ایجاد فاکتور جدید</CardTitle>
                </div>
              </CardHeader>
            </Card>
            
            <InvoiceForm
              customers={customersData?.customers || []}
              products={productsData?.products || []}
              onSubmit={handleCreateInvoice}
              onCancel={() => navigate('/invoices')}
              isLoading={createInvoiceMutation.isPending}
            />
          </div>
        }
      />
      <Route
        path="/:id"
        element={
          <Card variant="professional">
            <CardHeader>
              <CardTitle>مشاهده فاکتور</CardTitle>
            </CardHeader>
            <CardContent>
              <p>صفحه مشاهده فاکتور در حال توسعه است...</p>
            </CardContent>
          </Card>
        }
      />
      <Route
        path="/:id/edit"
        element={
          <Card variant="professional">
            <CardHeader>
              <CardTitle>ویرایش فاکتور</CardTitle>
            </CardHeader>
            <CardContent>
              <p>صفحه ویرایش فاکتور در حال توسعه است...</p>
            </CardContent>
          </Card>
        }
      />
    </Routes>
  );
};

export default Invoices;