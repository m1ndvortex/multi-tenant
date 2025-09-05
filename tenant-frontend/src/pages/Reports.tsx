import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarIcon, 
  DownloadIcon, 
  RefreshCwIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  DollarSignIcon, 
  ClockIcon,
  BarChart3Icon,
  LineChartIcon,
  PieChartIcon
} from 'lucide-react';
import SalesTrendChart from '@/components/reports/SalesTrendChart';
import ProfitLossChart from '@/components/reports/ProfitLossChart';
import CustomerAnalyticsChart from '@/components/reports/CustomerAnalyticsChart';
import AgingReportChart from '@/components/reports/AgingReportChart';
import { reportService } from '@/services/reportService';
import { cn } from '@/lib/utils';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sales-trend');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [chartTypes, setChartTypes] = useState({
    sales: 'line' as 'line' | 'bar',
    profitLoss: 'bar' as 'bar' | 'doughnut',
    customer: 'top-customers' as 'top-customers' | 'segmentation' | 'purchase-patterns',
    aging: 'bar' as 'bar' | 'doughnut',
  });

  // Queries for different report types
  const salesTrendQuery = useQuery({
    queryKey: ['sales-trend', salesPeriod, dateRange.startDate, dateRange.endDate],
    queryFn: () => reportService.getSalesTrend(salesPeriod, dateRange.startDate, dateRange.endDate),
    enabled: activeTab === 'sales-trend',
  });

  const profitLossQuery = useQuery({
    queryKey: ['profit-loss', dateRange.startDate, dateRange.endDate],
    queryFn: () => reportService.getProfitLoss(dateRange.startDate, dateRange.endDate),
    enabled: activeTab === 'profit-loss',
  });

  const customerAnalyticsQuery = useQuery({
    queryKey: ['customer-analytics', dateRange.startDate, dateRange.endDate],
    queryFn: () => reportService.getCustomerAnalytics(dateRange.startDate, dateRange.endDate),
    enabled: activeTab === 'customer-analytics',
  });

  const agingReportQuery = useQuery({
    queryKey: ['aging-report'],
    queryFn: () => reportService.getAgingReport(),
    enabled: activeTab === 'aging-report',
  });

  const handleExport = async (reportType: string, format: 'csv' | 'pdf' | 'json') => {
    try {
      const blob = await reportService.exportReport(
        reportType as any,
        format,
        { ...dateRange, period: salesPeriod }
      );
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRefresh = () => {
    switch (activeTab) {
      case 'sales-trend':
        salesTrendQuery.refetch();
        break;
      case 'profit-loss':
        profitLossQuery.refetch();
        break;
      case 'customer-analytics':
        customerAnalyticsQuery.refetch();
        break;
      case 'aging-report':
        agingReportQuery.refetch();
        break;
    }
  };

  const renderChartTypeSelector = (reportType: string) => {
    const options = {
      sales: [
        { value: 'line', label: 'نمودار خطی', icon: LineChartIcon },
        { value: 'bar', label: 'نمودار ستونی', icon: BarChart3Icon },
      ],
      profitLoss: [
        { value: 'bar', label: 'نمودار ستونی', icon: BarChart3Icon },
        { value: 'doughnut', label: 'نمودار دایره‌ای', icon: PieChartIcon },
      ],
      customer: [
        { value: 'top-customers', label: 'برترین مشتریان', icon: UsersIcon },
        { value: 'segmentation', label: 'تقسیم‌بندی', icon: PieChartIcon },
        { value: 'purchase-patterns', label: 'الگوی خرید', icon: LineChartIcon },
      ],
      aging: [
        { value: 'bar', label: 'نمودار ستونی', icon: BarChart3Icon },
        { value: 'doughnut', label: 'نمودار دایره‌ای', icon: PieChartIcon },
      ],
    };

    const currentOptions = options[reportType as keyof typeof options] || [];

    return (
      <div className="flex gap-2">
        {currentOptions.map((option) => {
          const IconComponent = option.icon;
          const isActive = chartTypes[reportType as keyof typeof chartTypes] === option.value;
          
          return (
            <Button
              key={option.value}
              variant={isActive ? "gradient-green" : "outline"}
              size="sm"
              onClick={() => setChartTypes(prev => ({ ...prev, [reportType]: option.value }))}
              className="flex items-center gap-2"
            >
              <IconComponent className="h-4 w-4" />
              {option.label}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <TrendingUpIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">گزارشات و تحلیل‌ها</h1>
              <p className="text-gray-600 mt-1">تحلیل جامع عملکرد کسب‌وکار شما</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="h-4 w-4" />
              بروزرسانی
            </Button>
            <Button
              variant="gradient-green"
              size="sm"
              onClick={() => handleExport(activeTab, 'pdf')}
              className="flex items-center gap-2"
            >
              <DownloadIcon className="h-4 w-4" />
              دانلود PDF
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card variant="filter" className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">بازه زمانی:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <span className="text-gray-500">تا</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {activeTab === 'sales-trend' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">دوره:</span>
                <div className="flex gap-1">
                  {[
                    { value: 'daily', label: 'روزانه' },
                    { value: 'weekly', label: 'هفتگی' },
                    { value: 'monthly', label: 'ماهانه' },
                  ].map((period) => (
                    <Button
                      key={period.value}
                      variant={salesPeriod === period.value ? "gradient-green" : "outline"}
                      size="sm"
                      onClick={() => setSalesPeriod(period.value as any)}
                    >
                      {period.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-green-50 via-teal-50 to-blue-50 p-1 rounded-xl">
            <TabsTrigger 
              value="sales-trend" 
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-green-300"
            >
              <TrendingUpIcon className="h-4 w-4" />
              روند فروش
            </TabsTrigger>
            <TabsTrigger 
              value="profit-loss"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-blue-300"
            >
              <DollarSignIcon className="h-4 w-4" />
              سود و زیان
            </TabsTrigger>
            <TabsTrigger 
              value="customer-analytics"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-purple-300"
            >
              <UsersIcon className="h-4 w-4" />
              تحلیل مشتریان
            </TabsTrigger>
            <TabsTrigger 
              value="aging-report"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border-2 data-[state=active]:border-orange-300"
            >
              <ClockIcon className="h-4 w-4" />
              گزارش سنی
            </TabsTrigger>
          </TabsList>

          {/* Sales Trend Tab */}
          <TabsContent value="sales-trend" className="space-y-6">
            <Card variant="gradient-green" className="p-6">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">
                  روند فروش {salesPeriod === 'daily' ? 'روزانه' : salesPeriod === 'weekly' ? 'هفتگی' : 'ماهانه'}
                </CardTitle>
                {renderChartTypeSelector('sales')}
              </CardHeader>
              <CardContent>
                {salesTrendQuery.isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" role="status"></div>
                  </div>
                ) : salesTrendQuery.error ? (
                  <div className="h-96 flex items-center justify-center text-red-600">
                    خطا در بارگذاری داده‌ها
                  </div>
                ) : salesTrendQuery.data ? (
                  <SalesTrendChart 
                    data={salesTrendQuery.data} 
                    period={salesPeriod}
                    chartType={chartTypes.sales}
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profit & Loss Tab */}
          <TabsContent value="profit-loss" className="space-y-6">
            <Card variant="gradient-blue" className="p-6">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">
                  تحلیل سود و زیان
                </CardTitle>
                {renderChartTypeSelector('profitLoss')}
              </CardHeader>
              <CardContent>
                {profitLossQuery.isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" role="status"></div>
                  </div>
                ) : profitLossQuery.error ? (
                  <div className="h-96 flex items-center justify-center text-red-600">
                    خطا در بارگذاری داده‌ها
                  </div>
                ) : profitLossQuery.data ? (
                  <ProfitLossChart 
                    data={profitLossQuery.data}
                    chartType={chartTypes.profitLoss}
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Analytics Tab */}
          <TabsContent value="customer-analytics" className="space-y-6">
            <Card variant="gradient-purple" className="p-6">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">
                  تحلیل مشتریان
                </CardTitle>
                {renderChartTypeSelector('customer')}
              </CardHeader>
              <CardContent>
                {customerAnalyticsQuery.isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" role="status"></div>
                  </div>
                ) : customerAnalyticsQuery.error ? (
                  <div className="h-96 flex items-center justify-center text-red-600">
                    خطا در بارگذاری داده‌ها
                  </div>
                ) : customerAnalyticsQuery.data ? (
                  <CustomerAnalyticsChart 
                    data={customerAnalyticsQuery.data}
                    chartType={chartTypes.customer}
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aging Report Tab */}
          <TabsContent value="aging-report" className="space-y-6">
            <Card variant="professional" className="p-6 border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">
                  گزارش سنی حساب‌های دریافتنی
                </CardTitle>
                {renderChartTypeSelector('aging')}
              </CardHeader>
              <CardContent>
                {agingReportQuery.isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" role="status"></div>
                  </div>
                ) : agingReportQuery.error ? (
                  <div className="h-96 flex items-center justify-center text-red-600">
                    خطا در بارگذاری داده‌ها
                  </div>
                ) : agingReportQuery.data ? (
                  <AgingReportChart 
                    data={agingReportQuery.data}
                    chartType={chartTypes.aging}
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;