/**
 * Subscription Overview Dashboard Component
 * Displays subscription statistics and overview
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubscriptionOverview } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface SubscriptionOverviewDashboardProps {
  overview?: SubscriptionOverview | null;
  loading: boolean;
  onRefresh: () => void;
}

const SubscriptionOverviewDashboard: React.FC<SubscriptionOverviewDashboardProps> = ({
  overview,
  loading,
  onRefresh
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>خطا در بارگذاری</CardTitle>
          <CardDescription>
            اطلاعات آماری اشتراک‌ها در دسترس نیست
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onRefresh}>تلاش مجدد</Button>
        </CardContent>
      </Card>
    );
  }

  const formatLastUpdated = (dateString: string) => {
    return new Date(dateString).toLocaleString('fa-IR');
  };

  const getConversionRateColor = (rate: number) => {
    if (rate >= 20) return 'text-green-600';
    if (rate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">آمار کلی اشتراک‌ها</h2>
          <p className="text-sm text-gray-600">
            آخرین به‌روزرسانی: {formatLastUpdated(overview.last_updated)}
          </p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          به‌روزرسانی
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tenants */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              کل تنانت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {overview.total_tenants.toLocaleString('fa-IR')}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              تمام تنانت‌های ثبت شده
            </p>
          </CardContent>
        </Card>

        {/* Pro Subscriptions */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              اشتراک حرفه‌ای
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {overview.pro_subscriptions.toLocaleString('fa-IR')}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-green-600">
                فعال: {overview.active_pro_subscriptions.toLocaleString('fa-IR')}
              </p>
              <Badge variant="secondary" className="text-xs">
                {((overview.active_pro_subscriptions / overview.pro_subscriptions) * 100).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Free Subscriptions */}
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              اشتراک رایگان
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {overview.free_subscriptions.toLocaleString('fa-IR')}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {((overview.free_subscriptions / overview.total_tenants) * 100).toFixed(1)}% از کل
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              نرخ تبدیل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              getConversionRateColor(overview.conversion_rate)
            )}>
              {overview.conversion_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-purple-600 mt-1">
              رایگان به حرفه‌ای
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Expiring Soon */}
        {overview.expiring_soon > 0 && (
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                در حال انقضا
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">
                {overview.expiring_soon.toLocaleString('fa-IR')}
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                اشتراک در ۳۰ روز آینده منقضی می‌شود
              </p>
            </CardContent>
          </Card>
        )}

        {/* Expired */}
        {overview.expired_subscriptions > 0 && (
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                منقضی شده
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {overview.expired_subscriptions.toLocaleString('fa-IR')}
              </div>
              <p className="text-xs text-red-600 mt-1">
                اشتراک منقضی شده که نیاز به تمدید دارد
              </p>
            </CardContent>
          </Card>
        )}

        {/* Recent Upgrades */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              ارتقاء اخیر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">
              {overview.recent_upgrades.toLocaleString('fa-IR')}
            </div>
            <p className="text-xs text-indigo-600 mt-1">
              ارتقاء به حرفه‌ای در ۳۰ روز گذشته
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionOverviewDashboard;