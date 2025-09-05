import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductList from '@/components/products/ProductList';
import ProductForm from '@/components/products/ProductForm';
import CategoryManagement from '@/components/products/CategoryManagement';
import InventoryDashboard from '@/components/products/InventoryDashboard';
import LowStockAlerts from '@/components/products/LowStockAlerts';
import { Package, FolderTree, AlertTriangle, BarChart3 } from 'lucide-react';

const Products: React.FC = () => {
  return (
    <div className="space-y-6">
      <Routes>
        <Route path="/new" element={<ProductForm />} />
        <Route path="/edit/:id" element={<ProductForm />} />
        <Route path="/" element={<ProductsMain />} />
      </Routes>
    </div>
  );
};

const ProductsMain: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Card variant="gradient-green">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">
                مدیریت محصولات و موجودی
              </CardTitle>
              <p className="text-slate-600 mt-1">
                مدیریت محصولات، دسته‌بندی‌ها و کنترل موجودی
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Card variant="professional">
        <Tabs defaultValue="products" className="w-full">
          <div className="border-b border-slate-200 bg-gradient-to-r from-green-50 via-teal-50 to-blue-50 rounded-t-xl">
            <TabsList className="grid w-full grid-cols-4 bg-transparent p-1">
              <TabsTrigger 
                value="products" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
              >
                <Package className="h-4 w-4" />
                محصولات
              </TabsTrigger>
              <TabsTrigger 
                value="categories"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-teal-300"
              >
                <FolderTree className="h-4 w-4" />
                دسته‌بندی‌ها
              </TabsTrigger>
              <TabsTrigger 
                value="inventory"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
              >
                <BarChart3 className="h-4 w-4" />
                گزارش موجودی
              </TabsTrigger>
              <TabsTrigger 
                value="alerts"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-orange-300"
              >
                <AlertTriangle className="h-4 w-4" />
                هشدارهای موجودی
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products" className="mt-0">
            <ProductList />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="inventory" className="mt-0">
            <InventoryDashboard />
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <LowStockAlerts />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Products;