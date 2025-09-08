/**
 * Enhanced Dashboard Page
 * Main tenant dashboard with business insights, metrics, alerts, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  Eye
} from 'lucide-react';

// Import dashboard components
import BusinessInsightsWidget from '@/components/dashboard/BusinessInsightsWidget';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivities from '@/components/dashboard/RecentActivities';
import SalesChart from '@/components/dashboard/SalesChart';

// Import dashboard service
import { dashboardService, DashboardResponse, QuickStats } from '@/services/dashboardService';

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [salesChartPeriod, setSalesChartPeriod] = useState(30);

  // Fetch complete dashboard data
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['dashboard', salesChartPeriod],
    queryFn: () => dashboardService.getDashboardData({
      include_insights: true,
      include_alerts: true,
      include_activities: true,
      activities_limit: 10,
      sales_chart_days: salesChartPeriod
    }),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  // Handle errors
  useEffect(() => {
    if (dashboardError) {
      toast({
        title: 'خطا در بارگذاری داشبورد',
        description: 'امکان دریافت اطلاعات داشبورد وجود ندارد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  }, [dashboardError, toast]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  // Format growth rate
  const formatGrowthRate = (rate: any) => {
    const n = typeof rate === 'number' ? rate : Number(rate ?? 0);
    const isPositive = n >= 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{n.toFixed(1)}%
        </span>
      </div>
    );
  };

  // Handle sales chart period change
  const handleSalesChartPeriodChange = (days: number) => {
    setSalesChartPeriod(days);
  };

  // Handle alert click
  const handleAlertClick = (alertType: string) => {
    switch (alertType) {
      case 'overdue_payments':
        navigate('/invoices?filter=overdue');
        break;
      case 'upcoming_installments':
      case 'upcoming_gold_installments':
        navigate('/installments?filter=upcoming');
        break;
      case 'low_stock':
        navigate('/products?filter=low_stock');
        break;
      default:
        break;
    }
  };

  // Handle business insights details
  const handleViewInsightsDetails = () => {
    navigate('/business-intelligence');
  };

  // Handle view all activities
  const handleViewAllActivities = () => {
    navigate('/reports?tab=activities');
  };

  // Manual refresh
  const handleRefresh = () => {
    refetchDashboard();
    toast({
      title: 'داشبورد بروزرسانی شد',
      description: 'اطلاعات داشبورد با موفقیت بروزرسانی شد.',
    });
  };

  if (isDashboardLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-white/20 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index} variant="professional">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (dashboardError || !dashboardData) {
    return (
      <div className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-6 text-center">
            <div className="py-8">
              <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                خطا در بارگذاری داشبورد
              </h3>
              <p className="text-slate-500 mb-4">
                امکان دریافت اطلاعات داشبورد وجود ندارد.
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                تلاش مجدد
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, quick_stats, business_insights, alerts, recent_activities, sales_chart } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Welcome Section with Refresh */}
      <Card variant="gradient-green">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                خوش آمدید به داشبورد
              </h1>
              <p className="text-slate-600">
                مدیریت کسب و کار خود را از اینجا شروع کنید
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm text-slate-600">
                <Calendar className="h-4 w-4" />
                <span>
                  آخرین بروزرسانی: {new Date().toLocaleDateString('fa-IR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="bg-white/20 border-white/30 text-slate-700 hover:bg-white/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                بروزرسانی
              </Button>
              <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-green-600 to-teal-700 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Revenue */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">فروش امروز</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(quick_stats.today_revenue)}
                </p>
                {summary.metrics.total_revenue && (
                  formatGrowthRate(summary.metrics.total_revenue.growth_rate || 0)
                )}
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Invoices */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">فاکتورهای امروز</p>
                <p className="text-2xl font-bold text-slate-900">
                  {quick_stats.today_invoices}
                </p>
                {summary.metrics.invoice_count && (
                  formatGrowthRate(summary.metrics.invoice_count.growth_rate || 0)
                )}
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">مشتریان فعال</p>
                <p className="text-2xl font-bold text-slate-900">
                  {quick_stats.total_customers}
                </p>
                {summary.metrics.active_customers && (
                  formatGrowthRate(summary.metrics.active_customers.growth_rate || 0)
                )}
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">محصولات</p>
                <p className="text-2xl font-bold text-slate-900">
                  {quick_stats.total_products}
                </p>
                <div className="flex items-center mt-2">
                  <Package className="h-3 w-3 text-orange-500 ml-1" />
                  <span className="text-xs text-slate-500">
                    {quick_stats.pending_invoices} در انتظار
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Business Insights and Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Business Insights Widget */}
          <BusinessInsightsWidget
            insights={business_insights}
            onViewDetails={handleViewInsightsDetails}
          />

          {/* Alerts Panel */}
          <AlertsPanel
            alerts={alerts}
            onViewAlert={handleAlertClick}
          />
        </div>

        {/* Right Column - Charts and Activities */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Chart */}
          <SalesChart
            data={sales_chart}
            onPeriodChange={handleSalesChartPeriodChange}
          />

          {/* Recent Activities */}
          <RecentActivities
            activities={recent_activities}
            onViewAll={handleViewAllActivities}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
};

export default Dashboard;