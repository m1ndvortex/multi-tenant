import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
  Coins,
  Calculator,
  Weight,
  Wrench,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Invoice, InvoiceUpdate, InvoiceItem } from '@/services/invoiceService';
import { Customer } from '@/services/customerService';
import { Product } from '@/services/productService';

interface InvoiceEditProps {
  invoice: Invoice;
  customers: Customer[];
  products: Product[];
  onSave: (data: InvoiceUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const InvoiceEdit: React.FC<InvoiceEditProps> = ({
  invoice,
  customers,
  products,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<InvoiceUpdate>({
    customer_id: invoice.customer_id,
    items: invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.line_total,
      weight: item.weight,
      labor_fee: item.labor_fee,
      profit: item.profit,
      vat_amount: item.vat_amount,
      notes: item.notes,
      product_id: item.product_id,
    })),
    discount_amount: invoice.discount_amount,
    gold_price_at_creation: invoice.gold_price_at_creation,
    due_date: invoice.due_date,
    is_shareable: invoice.is_shareable,
    notes: invoice.notes,
    customer_notes: invoice.customer_notes,
    terms_and_conditions: invoice.terms_and_conditions,
    status: invoice.status,
  });

  const [totals, setTotals] = useState({
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    total_gold_weight: 0,
  });

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = formData.items?.reduce((sum, item) => sum + item.line_total, 0) || 0;
    const tax_amount = formData.items?.reduce((sum, item) => sum + (item.vat_amount || 0), 0) || 0;
    const discount = formData.discount_amount || 0;
    const total_amount = subtotal + tax_amount - discount;
    const total_gold_weight = formData.items?.reduce((sum, item) => sum + (item.weight || 0), 0) || 0;

    setTotals({
      subtotal,
      tax_amount,
      total_amount,
      total_gold_weight,
    });
  }, [formData.items, formData.discount_amount]);

  // Handle form field changes
  const handleFieldChange = (field: keyof InvoiceUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle item changes
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate line total
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity;
      const unit_price = field === 'unit_price' ? value : newItems[index].unit_price;
      newItems[index].line_total = quantity * unit_price;
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Add new item
  const handleAddItem = () => {
    const newItem: Omit<InvoiceItem, 'id'> = {
      description: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0,
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      handleItemChange(index, 'product_id', productId);
      handleItemChange(index, 'description', product.name);
      handleItemChange(index, 'unit_price', (product as any).price || 0);
      handleItemChange(index, 'line_total', ((product as any).price || 0) * (formData.items?.[index]?.quantity || 1));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <Card variant="gradient-green">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                بازگشت
              </Button>
              <div>
                <CardTitle className="text-white">
                  ویرایش فاکتور {invoice.invoice_number}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  {getTypeBadge(invoice.invoice_type)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Save className="h-4 w-4 ml-2" />
                {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer and Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card variant="professional">
            <CardHeader>
              <CardTitle>اطلاعات مشتری</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>مشتری</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => handleFieldChange('customer_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب مشتری" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.phone && (
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>سررسید</Label>
                  <Input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => handleFieldChange('due_date', e.target.value || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>وضعیت</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleFieldChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">پیش‌نویس</SelectItem>
                      <SelectItem value="sent">ارسال شده</SelectItem>
                      <SelectItem value="paid">پرداخت شده</SelectItem>
                      <SelectItem value="overdue">سررسید گذشته</SelectItem>
                      <SelectItem value="cancelled">لغو شده</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="shareable"
                  checked={formData.is_shareable}
                  onCheckedChange={(checked) => handleFieldChange('is_shareable', checked)}
                />
                <Label htmlFor="shareable">قابل اشتراک‌گذاری</Label>
              </div>
            </CardContent>
          </Card>

          {/* Gold Price (for Gold invoices) */}
          {invoice.invoice_type === 'GOLD' && (
            <Card variant="default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  قیمت طلا
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>قیمت طلا در زمان ایجاد (ریال/گرم)</Label>
                  <Input
                    type="number"
                    value={formData.gold_price_at_creation || ''}
                    onChange={(e) => handleFieldChange('gold_price_at_creation', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="قیمت طلا"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Financial Summary */}
        <Card variant="gradient-blue">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="h-5 w-5" />
              خلاصه مالی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-white">
              <div className="flex justify-between">
                <span>جمع کل:</span>
                <span className="font-bold">
                  {totals.subtotal.toLocaleString()} ریال
                </span>
              </div>
              {totals.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>مالیات:</span>
                  <span>{totals.tax_amount.toLocaleString()} ریال</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white">تخفیف (ریال)</Label>
                <Input
                  type="number"
                  value={formData.discount_amount || ''}
                  onChange={(e) => handleFieldChange('discount_amount', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="مبلغ تخفیف"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>

              <Separator className="bg-white/20" />
              <div className="flex justify-between text-lg font-bold">
                <span>مبلغ نهایی:</span>
                <span>{totals.total_amount.toLocaleString()} ریال</span>
              </div>

              {invoice.invoice_type === 'GOLD' && totals.total_gold_weight > 0 && (
                <>
                  <Separator className="bg-white/20" />
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Weight className="h-4 w-4" />
                      وزن کل:
                    </span>
                    <span className="font-medium">
                      {totals.total_gold_weight.toFixed(3)} گرم
                    </span>
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              اقلام فاکتور
            </CardTitle>
            <Button
              type="button"
              variant="gradient-green"
              size="sm"
              onClick={handleAddItem}
            >
              <Plus className="h-4 w-4 ml-2" />
              افزودن قلم
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>محصول</TableHead>
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
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items?.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={item.product_id || ''}
                      onValueChange={(value) => handleProductSelect(index, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="انتخاب محصول" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">بدون محصول</SelectItem>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="شرح قلم"
                      className="w-40"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-20"
                      min="0"
                      step="0.001"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                      className="w-32"
                      min="0"
                    />
                  </TableCell>

                  {invoice.invoice_type === 'GOLD' && (
                    <>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.weight || ''}
                          onChange={(e) => handleItemChange(index, 'weight', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-24"
                          min="0"
                          step="0.001"
                          placeholder="0.000"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.labor_fee || ''}
                          onChange={(e) => handleItemChange(index, 'labor_fee', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-28"
                          min="0"
                          placeholder="اجرت"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.profit || ''}
                          onChange={(e) => handleItemChange(index, 'profit', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-28"
                          min="0"
                          placeholder="سود"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.vat_amount || ''}
                          onChange={(e) => handleItemChange(index, 'vat_amount', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-28"
                          min="0"
                          placeholder="مالیات"
                        />
                      </TableCell>
                    </>
                  )}

                  <TableCell className="font-medium">
                    {item.line_total.toLocaleString()} ریال
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle>یادداشت‌ها</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>یادداشت داخلی</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value || undefined)}
              placeholder="یادداشت داخلی..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>یادداشت مشتری</Label>
            <Textarea
              value={formData.customer_notes || ''}
              onChange={(e) => handleFieldChange('customer_notes', e.target.value || undefined)}
              placeholder="یادداشت برای مشتری..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>شرایط و ضوابط</Label>
            <Textarea
              value={formData.terms_and_conditions || ''}
              onChange={(e) => handleFieldChange('terms_and_conditions', e.target.value || undefined)}
              placeholder="شرایط و ضوابط..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default InvoiceEdit;