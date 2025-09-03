import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WhoIsOnlineWidget from '@/components/WhoIsOnlineWidget';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  gradient, 
  trend,
  link 
}) => {
  const CardWrapper = link ? Link : 'div';
  const cardProps = link ? { to: link } : {};

  return (
    <CardWrapper {...cardProps} className={link ? 'block' : ''}>
      <Card variant="professional" className={cn(
        "h-full transition-all duration-300",
        link && "hover:shadow-xl hover:scale-[1.02] cursor-pointer"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
              {subtitle && (
                <p className="text-sm text-slate-500">{subtitle}</p>
              )}
              {trend && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-sm",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={trend.isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} 
                    />
                  </svg>
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br",
              gradient
            )}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

const Dashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useDashboardStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">خطا در دریافت اطلاعات</h3>
            <p className="text-slate-600 mb-4">امکان دریافت آمار داشبورد وجود ندارد</p>
            <Button variant="gradient-green" onClick={() => window.location.reload()}>
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          خوش آمدید به پلتفرم HesaabPlus
        </h1>
        <p className="text-lg text-slate-600">
          مدیریت و نظارت بر تمامی عملیات سیستم حسابداری
        </p>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="کل تنانت‌ها"
          value={isLoading ? "..." : stats?.total_tenants || 0}
          subtitle={`${stats?.active_tenants || 0} فعال`}
          gradient="from-blue-500 to-indigo-600"
          link="/tenants"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <StatCard
          title="کاربران فعال امروز"
          value={isLoading ? "..." : stats?.active_users_today || 0}
          subtitle={`از ${stats?.total_users || 0} کل کاربر`}
          gradient="from-green-500 to-teal-600"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          title="فاکتورهای این ماه"
          value={isLoading ? "..." : stats?.total_invoices_this_month || 0}
          gradient="from-purple-500 to-violet-600"
          link="/analytics"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <StatCard
          title="درآمد ماهانه (MRR)"
          value={isLoading ? "..." : `$${stats?.mrr || 0}`}
          gradient="from-orange-500 to-red-600"
          link="/analytics"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="اشتراک رایگان"
          value={isLoading ? "..." : stats?.free_tier_tenants || 0}
          gradient="from-gray-500 to-slate-600"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />

        <StatCard
          title="اشتراک حرفه‌ای"
          value={isLoading ? "..." : stats?.pro_tier_tenants || 0}
          gradient="from-yellow-500 to-orange-600"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
        />

        <StatCard
          title="در انتظار پرداخت"
          value={isLoading ? "..." : stats?.pending_payment_tenants || 0}
          gradient="from-amber-500 to-yellow-600"
          icon={
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* System Health and Online Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="lg:col-span-2">
          <Card variant="professional" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                سلامت سیستم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">CPU Usage</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{stats?.system_health?.cpu_usage || 0}%</span>
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-teal-600 transition-all duration-300"
                            style={{ width: `${Math.min(stats?.system_health?.cpu_usage || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">Memory Usage</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{stats?.system_health?.memory_usage || 0}%</span>
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                            style={{ width: `${Math.min(stats?.system_health?.memory_usage || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">Database</span>
                      <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        getStatusColor(stats?.system_health?.database_status || 'unknown')
                      )}>
                        {getStatusIcon(stats?.system_health?.database_status || 'unknown')}
                        <span className="capitalize">{stats?.system_health?.database_status || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">Redis</span>
                      <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        getStatusColor(stats?.system_health?.redis_status || 'unknown')
                      )}>
                        {getStatusIcon(stats?.system_health?.redis_status || 'unknown')}
                        <span className="capitalize">{stats?.system_health?.redis_status || 'Unknown'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-sm font-medium text-slate-700">Celery</span>
                      <div className={cn(
                        "flex items-center gap-1 text-sm font-medium",
                        getStatusColor(stats?.system_health?.celery_status || 'unknown')
                      )}>
                        {getStatusIcon(stats?.system_health?.celery_status || 'unknown')}
                        <span className="capitalize">{stats?.system_health?.celery_status || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-200">
                <Link to="/system-health">
                  <Button variant="gradient-blue" className="w-full">
                    مشاهده جزئیات سلامت سیستم
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Who is Online Widget */}
        <div>
          <WhoIsOnlineWidget />
        </div>
      </div>

      {/* Quick Actions */}
      <Card variant="filter">
        <CardHeader>
          <CardTitle>عملیات سریع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/tenants">
              <Button variant="gradient-blue" className="w-full h-12">
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                مدیریت تنانت‌ها
              </Button>
            </Link>

            <Link to="/analytics">
              <Button variant="gradient-purple" className="w-full h-12">
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                آنالیتیکس پلتفرم
              </Button>
            </Link>

            <Link to="/backup-recovery">
              <Button variant="gradient-green" className="w-full h-12">
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                پشتیبان‌گیری
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;