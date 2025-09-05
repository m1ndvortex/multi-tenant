import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { productService, ProductSearchParams } from '@/services/productService';
import { 
  Package, 
  TrendingDown, 
  AlertTriangle,
  BarChart3,
  DollarSign,
  Archive,
  Search
} from 'lucide-react';

const InventoryDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useState<ProductSearchParams>({
    page: 1,
    page_size: 50,
    sort_by: 'stock_quantity',
    sort_order: 'asc'
  });

  // Fetch product stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['product-stats'],
    queryFn: () => productService.getProductStats(),
  });

  // Fetch products for inventory table
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-inventory', searchParams],
    queryFn: () => productService.getProducts({
      ...searchParams,
      is_service: false
    }),
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productService.getCategories(),
  });

  const handleSearch = (query: string) => {
    setSearchParams(prev => ({ ...prev, query, page: 1 }));
  };

  const handleFilterChange = (key: keyof ProductSearchParams, value: any) => {
    setSearchParams(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const getStockStatusBadge = (product: any) => {
    switch (product.stock_status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">موجود</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">کم موجود</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">ناموجود</Badge>;
      default:
        return <Badge variant="secondary">نامشخص</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">کل محصولات</p>
                <p className="text-2xl font-bold text-slate-800">
                  {statsLoading ? '...' : formatNumber(stats?.total_products || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-blue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">ارزش کل موجودی</p>
                <p className="text-2xl font-bold text-slate-800">
                  {statsLoading ? '...' : formatPrice(stats?.total_inventory_value || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-purple">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">کم موجود</p>
                <p className="text-2xl font-bold text-slate-800">
                  {statsLoading ? '...' : formatNumber(stats?.low_stock_products || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">ناموجود</p>
                <p className="text-2xl font-bold text-slate-800">
                  {statsLoading ? '...' : formatNumber(stats?.out_of_stock_products || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card variant="filter">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="جستجو در محصولات..."
                  value={searchParams.query || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select
                value={searchParams.category_id || 'all'}
                onValueChange={(value) => handleFilterChange('category_id', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="دسته‌بندی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه دسته‌ها</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={searchParams.stock_status || 'all'}
                onValueChange={(value) => handleFilterChange('stock_status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="وضعیت موجودی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="in_stock">موجود</SelectItem>
                  <SelectItem value="low_stock">کم موجود</SelectItem>
                  <SelectItem value="out_of_stock">ناموجود</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={searchParams.sort_by || 'stock_quantity'}
                onValueChange={(value) => handleFilterChange('sort_by', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="مرتب‌سازی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">نام محصول</SelectItem>
                  <SelectItem value="stock_quantity">موجودی</SelectItem>
                  <SelectItem value="selling_price">قیمت</SelectItem>
                  <SelectItem value="created_at">تاریخ ایجاد</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={searchParams.sort_order || 'asc'}
                onValueChange={(value) => handleFilterChange('sort_order', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">صعودی</SelectItem>
                  <SelectItem value="desc">نزولی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            گزارش موجودی
            {productsData && (
              <Badge variant="secondary" className="mr-2">
                {productsData.total} محصول
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">در حال بارگذاری...</p>
            </div>
          ) : productsData?.products.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">هیچ محصولی یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام محصول</TableHead>
                    <TableHead>کد محصول</TableHead>
                    <TableHead>دسته‌بندی</TableHead>
                    <TableHead>موجودی فعلی</TableHead>
                    <TableHead>موجودی رزرو شده</TableHead>
                    <TableHead>موجودی در دسترس</TableHead>
                    <TableHead>حداقل موجودی</TableHead>
                    <TableHead>وضعیت موجودی</TableHead>
                    <TableHead>قیمت واحد</TableHead>
                    <TableHead>ارزش موجودی</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsData?.products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.is_gold_product && (
                          <Badge className="bg-yellow-100 text-yellow-800 text-xs mt-1">
                            طلا
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {product.sku || 'بدون کد'}
                        </code>
                      </TableCell>
                      <TableCell>
                        {categories?.find(c => c.id === product.category_id)?.name || 'بدون دسته‌بندی'}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatNumber(product.stock_quantity)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-orange-600">{formatNumber(product.reserved_quantity)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatNumber(product.available_quantity)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">{formatNumber(product.min_stock_level)}</span>
                      </TableCell>
                      <TableCell>{getStockStatusBadge(product)}</TableCell>
                      <TableCell>{formatPrice(product.selling_price)}</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatPrice(product.stock_quantity * product.selling_price)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {productsData && productsData.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                نمایش {((productsData.page - 1) * productsData.page_size) + 1} تا{' '}
                {Math.min(productsData.page * productsData.page_size, productsData.total)} از{' '}
                {productsData.total} محصول
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page! - 1 }))}
                  disabled={productsData.page <= 1}
                >
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page! + 1 }))}
                  disabled={productsData.page >= productsData.total_pages}
                >
                  بعدی
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDashboard;