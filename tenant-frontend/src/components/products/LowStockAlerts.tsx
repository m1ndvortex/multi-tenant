import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { productService, StockAdjustment } from '@/services/productService';
import { 
  AlertTriangle, 
  Package, 
  Plus,
  Minus,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

const LowStockAlerts: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [adjustStockDialog, setAdjustStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment>({
    quantity: 0,
    reason: '',
  });

  // Fetch low stock alerts
  const { data: lowStockAlerts, isLoading, error, refetch } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => productService.getLowStockAlerts(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch product stats for summary
  const { data: stats } = useQuery({
    queryKey: ['product-stats'],
    queryFn: () => productService.getProductStats(),
  });

  // Stock adjustment mutation
  const adjustStockMutation = useMutation({
    mutationFn: ({ productId, adjustment }: { productId: string; adjustment: StockAdjustment }) =>
      productService.adjustStock(productId, adjustment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
      toast({
        title: 'موفقیت',
        description: 'موجودی با موفقیت تنظیم شد',
      });
      setAdjustStockDialog(false);
      setSelectedProduct(null);
      setStockAdjustment({ quantity: 0, reason: '' });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAdjustStock = (product: any) => {
    setSelectedProduct(product);
    setStockAdjustment({ quantity: 0, reason: '' });
    setAdjustStockDialog(true);
  };

  const handleSubmitAdjustment = () => {
    if (selectedProduct && stockAdjustment.quantity !== 0) {
      adjustStockMutation.mutate({
        productId: selectedProduct.product_id,
        adjustment: stockAdjustment,
      });
    }
  };

  const getAlertSeverity = (alert: any) => {
    if (alert.stock_status === 'out_of_stock') {
      return { color: 'bg-red-100 text-red-800', label: 'ناموجود', icon: AlertTriangle };
    } else if (alert.current_stock === 0) {
      return { color: 'bg-red-100 text-red-800', label: 'تمام شده', icon: AlertTriangle };
    } else if (alert.current_stock <= alert.min_stock_level / 2) {
      return { color: 'bg-orange-100 text-orange-800', label: 'بحرانی', icon: AlertTriangle };
    } else {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'کم موجود', icon: TrendingUp };
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  if (error) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            خطا در بارگذاری هشدارهای موجودی: {(error as Error).message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">محصولات ناموجود</p>
                <p className="text-2xl font-bold text-slate-800">
                  {isLoading ? '...' : formatNumber(stats?.out_of_stock_products || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">محصولات کم موجود</p>
                <p className="text-2xl font-bold text-slate-800">
                  {isLoading ? '...' : formatNumber(stats?.low_stock_products || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">کل هشدارها</p>
                <p className="text-2xl font-bold text-slate-800">
                  {isLoading ? '...' : formatNumber(lowStockAlerts?.length || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card variant="professional">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              هشدارهای موجودی
              {lowStockAlerts && (
                <Badge variant="secondary" className="mr-2">
                  {lowStockAlerts.length} هشدار
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              به‌روزرسانی
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">در حال بارگذاری...</p>
            </div>
          ) : !lowStockAlerts || lowStockAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">هیچ هشداری وجود ندارد</p>
              <p className="text-sm text-gray-500 mt-1">
                همه محصولات موجودی کافی دارند
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>نام محصول</TableHead>
                    <TableHead>کد محصول</TableHead>
                    <TableHead>موجودی فعلی</TableHead>
                    <TableHead>موجودی در دسترس</TableHead>
                    <TableHead>حداقل موجودی</TableHead>
                    <TableHead>کمبود</TableHead>
                    <TableHead>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockAlerts.map((alert) => {
                    const severity = getAlertSeverity(alert);
                    const shortage = Math.max(0, alert.min_stock_level - alert.available_quantity);
                    
                    return (
                      <TableRow key={alert.product_id} className="hover:bg-gray-50">
                        <TableCell>
                          <Badge className={severity.color}>
                            {severity.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{alert.product_name}</div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {alert.sku || 'بدون کد'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className={alert.current_stock === 0 ? 'text-red-600 font-medium' : ''}>
                            {formatNumber(alert.current_stock)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={alert.available_quantity === 0 ? 'text-red-600 font-medium' : ''}>
                            {formatNumber(alert.available_quantity)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600">{formatNumber(alert.min_stock_level)}</span>
                        </TableCell>
                        <TableCell>
                          {shortage > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              -{formatNumber(shortage)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="gradient-green"
                            size="sm"
                            onClick={() => handleAdjustStock(alert)}
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            تنظیم موجودی
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustStockDialog} onOpenChange={setAdjustStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تنظیم موجودی</DialogTitle>
            <DialogDescription>
              موجودی محصول "{selectedProduct?.product_name}" را تنظیم کنید
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Stock Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">موجودی فعلی:</span>
                  <span className="font-medium mr-2">{formatNumber(selectedProduct?.current_stock || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">موجودی در دسترس:</span>
                  <span className="font-medium mr-2">{formatNumber(selectedProduct?.available_quantity || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">حداقل موجودی:</span>
                  <span className="font-medium mr-2">{formatNumber(selectedProduct?.min_stock_level || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-600">کمبود:</span>
                  <span className="font-medium mr-2 text-red-600">
                    {formatNumber(Math.max(0, (selectedProduct?.min_stock_level || 0) - (selectedProduct?.available_quantity || 0)))}
                  </span>
                </div>
              </div>
            </div>

            {/* Adjustment Input */}
            <div>
              <Label htmlFor="quantity">تغییر موجودی</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setStockAdjustment(prev => ({ 
                    ...prev, 
                    quantity: Math.max(prev.quantity - 1, -(selectedProduct?.current_stock || 0))
                  }))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  value={stockAdjustment.quantity}
                  onChange={(e) => setStockAdjustment(prev => ({ 
                    ...prev, 
                    quantity: parseInt(e.target.value) || 0 
                  }))}
                  className="text-center"
                  placeholder="0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setStockAdjustment(prev => ({ 
                    ...prev, 
                    quantity: prev.quantity + 1 
                  }))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                موجودی جدید: {formatNumber((selectedProduct?.current_stock || 0) + stockAdjustment.quantity)}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const shortage = Math.max(0, (selectedProduct?.min_stock_level || 0) - (selectedProduct?.available_quantity || 0));
                  setStockAdjustment(prev => ({ ...prev, quantity: shortage }));
                }}
              >
                پر کردن کمبود
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const recommended = Math.max(10, (selectedProduct?.min_stock_level || 0) * 2);
                  const needed = recommended - (selectedProduct?.current_stock || 0);
                  setStockAdjustment(prev => ({ ...prev, quantity: Math.max(0, needed) }));
                }}
              >
                موجودی توصیه شده
              </Button>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason">دلیل تغییر</Label>
              <Input
                id="reason"
                value={stockAdjustment.reason}
                onChange={(e) => setStockAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="دلیل تنظیم موجودی"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustStockDialog(false)}
            >
              انصراف
            </Button>
            <Button
              variant="gradient-green"
              onClick={handleSubmitAdjustment}
              disabled={adjustStockMutation.isPending || stockAdjustment.quantity === 0}
            >
              {adjustStockMutation.isPending ? 'در حال تنظیم...' : 'تنظیم موجودی'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LowStockAlerts;