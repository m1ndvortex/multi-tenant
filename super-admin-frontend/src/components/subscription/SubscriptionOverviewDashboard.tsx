import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/enhanced-card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react';
import { SubscriptionOverview, SubscriptionStats } from '@/services/subscriptionService';

interface SubscriptionOverviewDashboardProps {
  overview?: SubscriptionOverview;
  stats?: SubscriptionStats;
  isLoading: boolean;
}

const SubscriptionOverviewDashboard: React.FC<SubscriptionOverviewDashboardProps> = ({
  overview,
  stats,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} variant="professional">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: 'IRR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <Card variant="gradient-super-admin">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-800">کل تنانت‌ها</p>
                <p className="text-2xl font-bold text-indigo-900">{overview?.total_tenants || 0}</p>
                <p className="text-xs text-indigo-600 mt-1">
                  {stats?.total_active_subscriptions || 0} فعال
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* Pro Subscriptions */}
        <Card variant="success">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">اشتراک حرفه‌ای</p>
                <p className="text-2xl font-bold text-green-900">{overview?.pro_subscriptions || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  {formatPercentage(overview?.conversion_rate || 0)} نرخ تبدیل
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card variant="warning">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">به زودی منقضی</p>
                <p className="text-2xl font-bold text-orange-900">{overview?.expiring_soon || 0}</p>
                <p className="text-xs text-orange-600 mt-1">30 روز آینده</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Expired */}
        <Card variant="error">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">منقضی شده</p>
                <p className="text-2xl font-bold text-red-900">{overview?.expired || 0}</p>
                <p className="text-xs text-red-600 mt-1">نیاز به تمدید</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue and Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <Card variant="gradient-tenant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">درآمد ماهانه</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatCurrency(stats?.revenue_metrics?.monthly_recurring_revenue || 0)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">MRR</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Annual Revenue */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">درآمد سالانه</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats?.revenue_metrics?.annual_recurring_revenue || 0)}
                </p>
                <p className="text-xs text-slate-600 mt-1">ARR</p>
              </div>
              <TrendingUp className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        {/* New Subscriptions */}
        <Card variant="gradient-super-admin">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-800">اشتراک جدید</p>
                <p className="text-2xl font-bold text-indigo-900">{stats?.new_subscriptions_this_month || 0}</p>
                <p className="text-xs text-indigo-600 mt-1">این ماه</p>
              </div>
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card variant={stats?.churn_rate && stats.churn_rate > 10 ? "error" : "success"}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">نرخ ترک</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatPercentage(stats?.churn_rate || 0)}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  میانگین: {stats?.average_subscription_duration?.toFixed(1) || 0} ماه
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تفکیک اشتراک‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Subscriptions */}
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-600 mb-2">
                {overview?.free_subscriptions || 0}
              </div>
              <Badge variant="secondary" className="mb-2">رایگان</Badge>
              <div className="text-sm text-slate-500">
                {overview?.total_tenants ? 
                  formatPercentage((overview.free_subscriptions / overview.total_tenants) * 100) : 
                  '0%'
                } از کل
              </div>
            </div>

            {/* Pro Subscriptions */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {overview?.pro_subscriptions || 0}
              </div>
              <Badge variant="default" className="mb-2 bg-green-600">حرفه‌ای</Badge>
              <div className="text-sm text-slate-500">
                {overview?.total_tenants ? 
                  formatPercentage((overview.pro_subscriptions / overview.total_tenants) * 100) : 
                  '0%'
                } از کل
              </div>
            </div>

            {/* Enterprise Subscriptions */}
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {overview?.enterprise_subscriptions || 0}
              </div>
              <Badge variant="default" className="mb-2 bg-purple-600">سازمانی</Badge>
              <div className="text-sm text-slate-500">
                {overview?.total_tenants ? 
                  formatPercentage((overview.enterprise_subscriptions / overview.total_tenants) * 100) : 
                  '0%'
                } از کل
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle>اقدامات سریع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">اشتراک‌های در معرض خطر</span>
              </div>
              <p className="text-sm text-orange-700 mb-3">
                {(overview?.expiring_soon || 0) + (overview?.expired || 0)} اشتراک نیاز به توجه دارد
              </p>
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                بررسی فوری
              </Badge>
            </div>

            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">رشد اشتراک‌ها</span>
              </div>
              <p className="text-sm text-green-700 mb-3">
                {stats?.new_subscriptions_this_month || 0} اشتراک جدید این ماه
              </p>
              <Badge variant="outline" className="text-green-600 border-green-600">
                عملکرد مثبت
              </Badge>
            </div>

            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">درآمد پیش‌بینی</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                بر اساس اشتراک‌های فعلی
              </p>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                تحلیل مالی
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionOverviewDashboard;