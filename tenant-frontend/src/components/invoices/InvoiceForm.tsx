import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Calculator, Package, Coins, AlertCircle, Info } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { Product } from '@/services/productService';
import { InvoiceCreate, InvoiceItem, invoiceService } from '@/services/invoiceService';
import { useToast } from '@/hooks/use-toast';

// Validation schemas
const invoiceItemSchema = z.object({
  product_id: z.string().optional(),
  description: z.string().min(1, 'توضیحات الزامی است'),
  quantity: z.number().min(0.001, 'مقدار باید بیشتر از صفر باشد'),
  unit_price: z.number().min(0, 'قیمت نمی‌تواند منفی باشد'),
  tax_rate: z.number().min(0).max(100).optional(),
  discount_rate: z.number().min(0).max(100).optional(),
  discount_amount: z.number().min(0).optional(),
  
  // Gold-specific fields
  weight: z.number().min(0).optional(),
  labor_fee: z.number().min(0).optional(),
  profit: z.number().min(0).optional(),
  vat_amount: z.number().min(0).optional(),
  gold_purity: z.number().min(0).max(24).optional(),
  
  notes: z.string().optional(),
});

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'انتخاب مشتری الزامی است'),
  invoice_type: z.enum(['GENERAL', 'GOLD'], {
    required_error: 'انتخاب نوع فاکتور الزامی است',
  }),
  items: z.array(invoiceItemSchema).min(1, 'حداقل یک آیتم الزامی است'),
  discount_amount: z.number().min(0).optional(),
  gold_price_at_creation: z.number().min(0).optional(),
  is_installment: z.boolean().default(false),
  installment_type: z.enum(['NONE', 'GENERAL', 'GOLD']).default('NONE'),
  due_date: z.string().optional(),
  is_shareable: z.boolean().default(true),
  notes: z.string().optional(),
  customer_notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  customers: Customer[];
  products: Product[];
  onSubmit: (data: InvoiceCreate) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<InvoiceCreate>;
  isLoading?: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  customers,
  products,
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}) => {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [goldPrice, setGoldPrice] = useState<number>(0);
  const [isLoadingGoldPrice, setIsLoadingGoldPrice] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_type: 'GENERAL',
      items: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: 0,
          discount_rate: 0,
          discount_amount: 0,
        },
      ],
      discount_amount: 0,
      is_installment: false,
      installment_type: 'NONE',
      is_shareable: true,
      ...initialData,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedInvoiceType = watch('invoice_type');
  const watchedItems = watch('items');
  const watchedDiscountAmount = watch('discount_amount') || 0;

  // Load current gold price when invoice type changes to GOLD
  useEffect(() => {
    if (watchedInvoiceType === 'GOLD' && goldPrice === 0) {
      loadCurrentGoldPrice();
    }
  }, [watchedInvoiceType]);

  const loadCurrentGoldPrice = async () => {
    try {
      setIsLoadingGoldPrice(true);
      const response = await invoiceService.getCurrentGoldPrice();
      setGoldPrice(response.price);
    } catch (error) {
      console.error('Failed to load gold price:', error);
      toast({
        title: 'خطا در بارگیری قیمت طلا',
        description: 'قیمت طلا را به صورت دستی وارد کنید',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGoldPrice(false);
    }
  };

  // Calculate totals with enhanced gold calculations
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalGoldWeight = 0;
    let totalLaborFee = 0;
    let totalProfit = 0;
    let totalVAT = 0;

    watchedItems.forEach((item) => {
      if (watchedInvoiceType === 'GOLD') {
        // Gold invoice calculations
        const weight = item.weight || 0;
        const laborFee = item.labor_fee || 0;
        const profit = item.profit || 0;
        const vatAmount = item.vat_amount || 0;
        const quantity = item.quantity || 0;
        
        // For gold items, calculate based on weight * gold price + labor + profit
        const goldValue = weight * goldPrice * quantity;
        const itemTotal = goldValue + (laborFee * quantity) + (profit * quantity);
        
        subtotal += itemTotal;
        totalGoldWeight += weight * quantity;
        totalLaborFee += laborFee * quantity;
        totalProfit += profit * quantity;
        totalVAT += vatAmount * quantity;
      } else {
        // General invoice calculations
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
        const discountAmount = item.discount_amount || 0;
        const discountRate = item.discount_rate || 0;
        const lineDiscount = discountAmount + (lineTotal * discountRate / 100);
        const lineSubtotal = lineTotal - lineDiscount;
        
        subtotal += lineSubtotal;
        
        const taxRate = item.tax_rate || 0;
        const lineTax = lineSubtotal * taxRate / 100;
        totalTax += lineTax;
      }
    });

    const totalAfterDiscount = subtotal - watchedDiscountAmount;
    const finalTotal = watchedInvoiceType === 'GOLD' 
      ? totalAfterDiscount + totalVAT 
      : totalAfterDiscount + totalTax;

    return {
      subtotal,
      totalTax,
      totalAfterDiscount,
      finalTotal,
      totalGoldWeight,
      totalLaborFee,
      totalProfit,
      totalVAT,
    };
  }, [watchedItems, watchedDiscountAmount, watchedInvoiceType, goldPrice]);

  // Handle customer selection
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
    setValue('customer_id', customerId);
  };

  // Handle product selection for an item
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.product_id`, productId);
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.unit_price`, product.selling_price);
      
      if (product.is_gold_product) {
        setValue(`items.${index}.weight`, product.weight_per_unit || 0);
        setValue(`items.${index}.gold_purity`, product.gold_purity || 18);
      }
    }
  };

  // Add new item
  const addItem = () => {
    append({
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      discount_rate: 0,
      discount_amount: 0,
    });
  };

  // Remove item
  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast({
        title: 'خطا',
        description: 'حداقل یک آیتم باید وجود داشته باشد',
        variant: 'destructive',
      });
    }
  };

  // Handle form submission
  const onFormSubmit = async (data: InvoiceFormData) => {
    try {
      // Add gold price if it's a gold invoice
      if (data.invoice_type === 'GOLD' && goldPrice > 0) {
        data.gold_price_at_creation = goldPrice;
      }

      await onSubmit(data);
    } catch (error) {
      toast({
        title: 'خطا در ایجاد فاکتور',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoice Type Selection */}
      <Card variant="gradient-blue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            ایجاد فاکتور جدید
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">انتخاب نوع فاکتور</Label>
              <Tabs
                value={watchedInvoiceType}
                onValueChange={(value) => setValue('invoice_type', value as 'GENERAL' | 'GOLD')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-auto p-1">
                  <TabsTrigger 
                    value="GENERAL" 
                    className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-white data-[state=active]:shadow-md"
                  >
                    <Package className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">فاکتور عمومی</div>
                      <div className="text-xs text-gray-500">کالاها و خدمات معمولی</div>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="GOLD" 
                    className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-white data-[state=active]:shadow-md"
                  >
                    <Coins className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">فاکتور طلا</div>
                      <div className="text-xs text-gray-500">محصولات طلا با وزن و عیار</div>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Invoice Type Information */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  {watchedInvoiceType === 'GENERAL' ? (
                    <div>
                      <p className="font-medium mb-1">فاکتور عمومی:</p>
                      <p>برای کالاها و خدمات معمولی با قیمت ثابت، شامل تخفیف و مالیات</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium mb-1">فاکتور طلا:</p>
                      <p>برای محصولات طلا با محاسبه بر اساس وزن، عیار، اجرت و سود</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Gold Price Section */}
            {watchedInvoiceType === 'GOLD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="space-y-2">
                  <Label htmlFor="gold_price" className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    قیمت طلا (ریال در گرم)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="gold_price"
                      type="number"
                      value={goldPrice}
                      onChange={(e) => setGoldPrice(Number(e.target.value))}
                      placeholder="قیمت فعلی طلا"
                      disabled={isLoadingGoldPrice}
                    />
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
                </div>
                
                {goldPrice > 0 && (
                  <div className="space-y-2">
                    <Label>قیمت فعلی</Label>
                    <div className="p-3 bg-white rounded border">
                      <div className="text-lg font-bold text-yellow-600">
                        {goldPrice.toLocaleString()} ریال/گرم
                      </div>
                      <div className="text-xs text-gray-500">
                        این قیمت برای محاسبه کل فاکتور استفاده می‌شود
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Customer Selection */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle>اطلاعات مشتری</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">انتخاب مشتری *</Label>
                <Select onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="مشتری را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex flex-col">
                          <span>{customer.name}</span>
                          {customer.phone && (
                            <span className="text-sm text-gray-500">{customer.phone}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && (
                  <p className="text-sm text-red-500">{errors.customer_id.message}</p>
                )}
              </div>

              {selectedCustomer && (
                <div className="space-y-2">
                  <Label>اطلاعات مشتری</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-gray-600">تلفن: {selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer.total_debt > 0 && (
                      <Badge variant="destructive" className="mt-1">
                        بدهی: {selectedCustomer.total_debt.toLocaleString()} ریال
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card variant="professional">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>آیتم‌های فاکتور</CardTitle>
              <Button
                type="button"
                variant="gradient-green"
                size="sm"
                onClick={addItem}
              >
                <Plus className="h-4 w-4 ml-2" />
                افزودن آیتم
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} variant="gradient-green" className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">آیتم {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Product Selection */}
                    <div className="space-y-2">
                      <Label>انتخاب محصول</Label>
                      <Select onValueChange={(value) => handleProductSelect(index, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="محصول را انتخاب کنید" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex flex-col">
                                <span>{product.name}</span>
                                <span className="text-sm text-gray-500">
                                  {product.selling_price.toLocaleString()} ریال
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`}>توضیحات *</Label>
                      <Input
                        id={`description-${index}`}
                        {...register(`items.${index}.description`)}
                        placeholder="توضیحات آیتم"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-sm text-red-500">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${index}`}>مقدار *</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        step="0.001"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        placeholder="مقدار"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="text-sm text-red-500">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="space-y-2">
                      <Label htmlFor={`unit-price-${index}`}>قیمت واحد *</Label>
                      <Input
                        id={`unit-price-${index}`}
                        type="number"
                        {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                        placeholder="قیمت واحد (ریال)"
                      />
                      {errors.items?.[index]?.unit_price && (
                        <p className="text-sm text-red-500">
                          {errors.items[index]?.unit_price?.message}
                        </p>
                      )}
                    </div>

                    {/* Tax Rate */}
                    <div className="space-y-2">
                      <Label>نرخ مالیات (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...register(`items.${index}.tax_rate`, { valueAsNumber: true })}
                        placeholder="نرخ مالیات"
                      />
                    </div>

                    {/* Discount */}
                    <div className="space-y-2">
                      <Label>تخفیف (ریال)</Label>
                      <Input
                        type="number"
                        min="0"
                        {...register(`items.${index}.discount_amount`, { valueAsNumber: true })}
                        placeholder="مبلغ تخفیف"
                      />
                    </div>

                    {/* Gold-specific fields */}
                    {watchedInvoiceType === 'GOLD' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor={`weight-${index}`}>وزن (گرم)</Label>
                          <Input
                            id={`weight-${index}`}
                            type="number"
                            step="0.001"
                            {...register(`items.${index}.weight`, { valueAsNumber: true })}
                            placeholder="وزن به گرم"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`labor-fee-${index}`}>اجرت (ریال)</Label>
                          <Input
                            id={`labor-fee-${index}`}
                            type="number"
                            {...register(`items.${index}.labor_fee`, { valueAsNumber: true })}
                            placeholder="اجرت"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`profit-${index}`}>سود (ریال)</Label>
                          <Input
                            id={`profit-${index}`}
                            type="number"
                            {...register(`items.${index}.profit`, { valueAsNumber: true })}
                            placeholder="سود"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`vat-amount-${index}`}>مالیات (ریال)</Label>
                          <Input
                            id={`vat-amount-${index}`}
                            type="number"
                            {...register(`items.${index}.vat_amount`, { valueAsNumber: true })}
                            placeholder="مالیات"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>عیار طلا</Label>
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.001"
                            {...register(`items.${index}.gold_purity`, { valueAsNumber: true })}
                            placeholder="عیار (مثلاً 18)"
                          />
                        </div>
                      </>
                    )}

                    {/* Notes */}
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <Label>یادداشت</Label>
                      <Textarea
                        {...register(`items.${index}.notes`)}
                        placeholder="یادداشت برای این آیتم"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Item Total Display */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      {watchedInvoiceType === 'GOLD' ? (
                        // Gold item calculations
                        <>
                          {watchedItems[index]?.weight && (
                            <div className="flex justify-between text-sm">
                              <span>وزن × قیمت طلا:</span>
                              <span>
                                {((watchedItems[index]?.weight || 0) * (watchedItems[index]?.quantity || 0) * goldPrice).toLocaleString()} ریال
                              </span>
                            </div>
                          )}
                          {watchedItems[index]?.labor_fee && (
                            <div className="flex justify-between text-sm">
                              <span>اجرت:</span>
                              <span>
                                {((watchedItems[index]?.labor_fee || 0) * (watchedItems[index]?.quantity || 0)).toLocaleString()} ریال
                              </span>
                            </div>
                          )}
                          {watchedItems[index]?.profit && (
                            <div className="flex justify-between text-sm">
                              <span>سود:</span>
                              <span>
                                {((watchedItems[index]?.profit || 0) * (watchedItems[index]?.quantity || 0)).toLocaleString()} ریال
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center border-t pt-2">
                            <span className="font-medium">جمع این آیتم:</span>
                            <span className="font-bold text-lg text-yellow-600">
                              {(
                                ((watchedItems[index]?.weight || 0) * (watchedItems[index]?.quantity || 0) * goldPrice) +
                                ((watchedItems[index]?.labor_fee || 0) * (watchedItems[index]?.quantity || 0)) +
                                ((watchedItems[index]?.profit || 0) * (watchedItems[index]?.quantity || 0))
                              ).toLocaleString()} ریال
                            </span>
                          </div>
                        </>
                      ) : (
                        // General item calculations
                        <div className="flex justify-between items-center">
                          <span className="font-medium">جمع این آیتم:</span>
                          <span className="font-bold text-lg">
                            {(
                              ((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_price || 0)) -
                              (watchedItems[index]?.discount_amount || 0)
                            ).toLocaleString()} ریال
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Totals */}
        <Card variant="gradient-purple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              خلاصه فاکتور {watchedInvoiceType === 'GOLD' ? 'طلا' : 'عمومی'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {watchedInvoiceType === 'GOLD' ? (
                // Gold invoice totals
                <>
                  {totals.totalGoldWeight > 0 && (
                    <div className="flex justify-between text-yellow-600 font-medium">
                      <span>وزن کل طلا:</span>
                      <span>{totals.totalGoldWeight.toFixed(3)} گرم</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>ارزش طلا:</span>
                    <span>{(totals.totalGoldWeight * goldPrice).toLocaleString()} ریال</span>
                  </div>
                  
                  {totals.totalLaborFee > 0 && (
                    <div className="flex justify-between">
                      <span>اجرت کل:</span>
                      <span>{totals.totalLaborFee.toLocaleString()} ریال</span>
                    </div>
                  )}
                  
                  {totals.totalProfit > 0 && (
                    <div className="flex justify-between">
                      <span>سود کل:</span>
                      <span>{totals.totalProfit.toLocaleString()} ریال</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>جمع کل:</span>
                    <span>{totals.subtotal.toLocaleString()} ریال</span>
                  </div>
                  
                  {watchedDiscountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>تخفیف کل:</span>
                      <span>-{watchedDiscountAmount.toLocaleString()} ریال</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>پس از تخفیف:</span>
                    <span>{totals.totalAfterDiscount.toLocaleString()} ریال</span>
                  </div>
                  
                  {totals.totalVAT > 0 && (
                    <div className="flex justify-between">
                      <span>مالیات بر ارزش افزوده:</span>
                      <span>{totals.totalVAT.toLocaleString()} ریال</span>
                    </div>
                  )}
                </>
              ) : (
                // General invoice totals
                <>
                  <div className="flex justify-between">
                    <span>جمع کل:</span>
                    <span>{totals.subtotal.toLocaleString()} ریال</span>
                  </div>
                  
                  {watchedDiscountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>تخفیف کل:</span>
                      <span>-{watchedDiscountAmount.toLocaleString()} ریال</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>پس از تخفیف:</span>
                    <span>{totals.totalAfterDiscount.toLocaleString()} ریال</span>
                  </div>
                  
                  {totals.totalTax > 0 && (
                    <div className="flex justify-between">
                      <span>مالیات:</span>
                      <span>{totals.totalTax.toLocaleString()} ریال</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>مبلغ نهایی:</span>
                <span className="text-green-600">{totals.finalTotal.toLocaleString()} ریال</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle>اطلاعات تکمیلی</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تخفیف کل (ریال)</Label>
                <Input
                  type="number"
                  min="0"
                  {...register('discount_amount', { valueAsNumber: true })}
                  placeholder="تخفیف کل فاکتور"
                />
              </div>

              <div className="space-y-2">
                <Label>تاریخ سررسید</Label>
                <Input
                  type="date"
                  {...register('due_date')}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>یادداشت داخلی</Label>
                <Textarea
                  {...register('notes')}
                  placeholder="یادداشت داخلی (قابل مشاهده توسط مشتری نیست)"
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>یادداشت مشتری</Label>
                <Textarea
                  {...register('customer_notes')}
                  placeholder="یادداشت برای مشتری (در فاکتور نمایش داده می‌شود)"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            انصراف
          </Button>
          <Button
            type="submit"
            variant="gradient-green"
            disabled={isLoading}
          >
            {isLoading ? 'در حال ایجاد...' : 'ایجاد فاکتور'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;