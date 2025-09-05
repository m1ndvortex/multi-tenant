import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Send, 
  Download, 
  QrCode,
  Package,
  Coins,
  Calculator
} from 'lucide-react';
import { Invoice, InvoiceSearchParams } from '@/services/invoiceService';
import { Customer } from '@/services/customerService';

interface InvoiceListProps {
  invoices: Invoice[];
  customers: Customer[];
  total: number;
  page: number;
  perPage: number;
  isLoading?: boolean;
  onSearch: (params: InvoiceSearchParams) => void;
  onPageChange: (page: number) => void;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onSend: (invoice: Invoice) => void;
  onDownloadPDF: (invoice: Invoice) => void;
  onGenerateQR: (invoice: Invoice) => void;
  onCreateNew: () => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  customers,
  total,
  page,
  perPage,
  isLoading = false,
  onSearch,
  onPageChange,
  onView,
  onEdit,
  onDelete,
  onSend,
  onDownloadPDF,
  onGenerateQR,
  onCreateNew,
}) => {
  const [searchParams, setSearchParams] = useState<InvoiceSearchParams>({
    page: 1,
    per_page: 20,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Handle search parameter changes
  const handleSearchChange = (key: keyof InvoiceSearchParams, value: any) => {
    const newParams = { ...searchParams, [key]: value, page: 1 };
    setSearchParams(newParams);
    onSearch(newParams);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const newParams = { ...searchParams, page: newPage };
    setSearchParams(newParams);
    onPageChange(newPage);
  };

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
        طلا
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
        <Package className="h-3 w-3 ml-1" />
        عمومی
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="gradient-green">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              مدیریت فاکتورها
            </CardTitle>
            <Button
              onClick={onCreateNew}
              variant="gradient-green"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              فاکتور جدید
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card variant="filter">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>جستجو</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="شماره فاکتور، نام مشتری..."
                  value={searchParams.query || ''}
                  onChange={(e) => handleSearchChange('query', e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>نوع فاکتور</Label>
              <Select
                value={searchParams.invoice_type || ''}
                onValueChange={(value) => handleSearchChange('invoice_type', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="همه انواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">همه انواع</SelectItem>
                  <SelectItem value="GENERAL">عمومی</SelectItem>
                  <SelectItem value="GOLD">طلا</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select
                value={searchParams.status || ''}
                onValueChange={(value) => handleSearchChange('status', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="همه وضعیت‌ها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="draft">پیش‌نویس</SelectItem>
                  <SelectItem value="sent">ارسال شده</SelectItem>
                  <SelectItem value="paid">پرداخت شده</SelectItem>
                  <SelectItem value="overdue">سررسید گذشته</SelectItem>
                  <SelectItem value="cancelled">لغو شده</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>مشتری</Label>
              <Select
                value={searchParams.customer_id || ''}
                onValueChange={(value) => handleSearchChange('customer_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="همه مشتریان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">همه مشتریان</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 ml-2" />
              فیلترهای بیشتر
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>از تاریخ</Label>
                <Input
                  type="date"
                  value={searchParams.date_from || ''}
                  onChange={(e) => handleSearchChange('date_from', e.target.value || undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>تا تاریخ</Label>
                <Input
                  type="date"
                  value={searchParams.date_to || ''}
                  onChange={(e) => handleSearchChange('date_to', e.target.value || undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>حداقل مبلغ</Label>
                <Input
                  type="number"
                  placeholder="حداقل مبلغ (ریال)"
                  value={searchParams.min_amount || ''}
                  onChange={(e) => handleSearchChange('min_amount', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card variant="professional">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">در حال بارگیری...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center">
              <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">هیچ فاکتوری یافت نشد</p>
              <Button onClick={onCreateNew} variant="gradient-green">
                <Plus className="h-4 w-4 ml-2" />
                ایجاد اولین فاکتور
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>شماره فاکتور</TableHead>
                  <TableHead>مشتری</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customer_name}</div>
                        {invoice.customer_phone && (
                          <div className="text-sm text-gray-500">{invoice.customer_phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(invoice.invoice_type)}
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="font-medium">
                          {invoice.total_amount.toLocaleString()} ریال
                        </div>
                        {invoice.invoice_type === 'GOLD' && invoice.total_gold_weight && (
                          <div className="text-sm text-yellow-600">
                            {invoice.total_gold_weight.toFixed(3)} گرم
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(invoice.created_at).toLocaleDateString('fa-IR')}</div>
                        {invoice.due_date && (
                          <div className="text-gray-500">
                            سررسید: {new Date(invoice.due_date).toLocaleDateString('fa-IR')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(invoice)}
                          title="مشاهده"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(invoice)}
                          title="ویرایش"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSend(invoice)}
                          title="ارسال"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadPDF(invoice)}
                          title="دانلود PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGenerateQR(invoice)}
                          title="QR Code"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(invoice)}
                          title="حذف"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > perPage && (
        <Card variant="professional">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                نمایش {((page - 1) * perPage) + 1} تا {Math.min(page * perPage, total)} از {total} فاکتور
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  قبلی
                </Button>
                <span className="text-sm">
                  صفحه {page} از {Math.ceil(total / perPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= Math.ceil(total / perPage)}
                >
                  بعدی
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceList;