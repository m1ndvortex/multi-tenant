import React from 'react';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  CreditCard,
  Settings,
  History,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pause,
  Play,
  ArrowUpDown
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { Tenant } from '@/types/tenant';
import { subscriptionService } from '@/services/subscriptionService';

interface TenantSubscriptionTableProps {
  tenants: Tenant[];
  onExtendSubscription: (tenant: Tenant) => void;
  onSwitchPlan: (tenant: Tenant) => void;
  onUpdateStatus: (tenant: Tenant) => void;
  onViewHistory: (tenant: Tenant) => void;
  isLoading: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  currentPage: number;
  onPageChange: (page: number) => void;
}

const TenantSubscriptionTable: React.FC<TenantSubscriptionTableProps> = ({
  tenants,
  onExtendSubscription,
  onSwitchPlan,
  onUpdateStatus,
  onViewHistory,
  isLoading,
  pagination,
  currentPage,
  onPageChange
}) => {
  const getSubscriptionStatusBadge = (tenant: Tenant) => {
    const status = tenant.status || (tenant.is_active ? 'active' : 'suspended');
    const expiryDate = tenant.subscription_expires_at;
    
    if (status === 'suspended') {
      return <Badge variant="destructive">تعلیق</Badge>;
    }
    
    if (expiryDate) {
      const now = new Date();
      const expiry = new Date(expiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return <Badge variant="destructive">منقضی شده</Badge>;
      } else if (diffDays <= 7) {
        return <Badge variant="destructive">به زودی منقضی</Badge>;
      } else if (diffDays <= 30) {
        return <Badge variant="secondary">نزدیک به انقضا</Badge>;
      }
    }
    
    return <Badge variant="default" className="bg-green-600">فعال</Badge>;
  };

  const getSubscriptionTypeBadge = (type: string) => {
    switch (type) {
      case 'pro':
        return <Badge variant="default" className="bg-purple-600">حرفه‌ای</Badge>;
      case 'enterprise':
        return <Badge variant="default" className="bg-indigo-600">سازمانی</Badge>;
      default:
        return <Badge variant="outline">رایگان</Badge>;
    }
  };

  const formatExpiryInfo = (tenant: Tenant) => {
    if (!tenant.subscription_expires_at) {
      return (
        <div className="text-sm text-slate-500">
          <div>نامحدود</div>
        </div>
      );
    }

    const expiryText = subscriptionService.formatExpiryDate(tenant.subscription_expires_at);
    const colorClass = subscriptionService.getSubscriptionStatusColor(
      tenant.status || (tenant.is_active ? 'active' : 'suspended'),
      tenant.subscription_expires_at
    );

    return (
      <div className="text-sm">
        <div className={colorClass}>{expiryText}</div>
        <div className="text-xs text-slate-400 mt-1">
          {new Date(tenant.subscription_expires_at).toLocaleDateString('fa-IR')}
        </div>
      </div>
    );
  };

  const getActionButtons = (tenant: Tenant) => {
    const isActive = tenant.status === 'active' || (tenant.status === undefined && tenant.is_active);
    const isPro = tenant.subscription_type === 'pro';
    
    return (
      <div className="flex items-center gap-2">
        {/* Extend Subscription - only for Pro */}
        {isPro && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExtendSubscription(tenant)}
            className="flex items-center gap-1"
            title="تمدید اشتراک"
          >
            <Calendar className="h-3 w-3" />
            تمدید
          </Button>
        )}

        {/* Switch Plan */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSwitchPlan(tenant)}
          className="flex items-center gap-1"
          title="تغییر نوع اشتراک"
        >
          <ArrowUpDown className="h-3 w-3" />
          تغییر نوع
        </Button>

        {/* Activate/Deactivate */}
        <Button
          variant={isActive ? "outline" : "default"}
          size="sm"
          onClick={() => onUpdateStatus(tenant)}
          className="flex items-center gap-1"
          title={isActive ? "تعلیق اشتراک" : "فعال‌سازی اشتراک"}
        >
          {isActive ? (
            <>
              <Pause className="h-3 w-3" />
              تعلیق
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              فعال‌سازی
            </>
          )}
        </Button>

        {/* View History */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewHistory(tenant)}
          className="flex items-center gap-1"
          title="تاریخچه اشتراک"
        >
          <History className="h-3 w-3" />
          تاریخچه
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tenants.length) {
    return (
      <Card variant="professional">
        <CardContent className="p-12 text-center">
          <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">هیچ تنانتی یافت نشد</h3>
          <p className="text-slate-500">با فیلترهای مختلف جستجو کنید یا فیلترها را پاک کنید.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card variant="professional">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">تنانت</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">نوع اشتراک</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">وضعیت</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">انقضا</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">آخرین فعالیت</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Tenant Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {tenant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-indigo-700 bg-indigo-50/30 px-2 py-1 rounded">
                            {tenant.name}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">{tenant.email}</div>
                          {tenant.domain && (
                            <div className="text-xs text-slate-400">{tenant.domain}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Subscription Type */}
                    <td className="px-6 py-4">
                      {getSubscriptionTypeBadge(tenant.subscription_type)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {getSubscriptionStatusBadge(tenant)}
                    </td>

                    {/* Expiry Info */}
                    <td className="px-6 py-4">
                      {formatExpiryInfo(tenant)}
                    </td>

                    {/* Last Activity */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-500">
                        {tenant.last_activity_at ? (
                          <>
                            <div>{new Date(tenant.last_activity_at).toLocaleDateString('fa-IR')}</div>
                            <div className="text-xs text-slate-400">
                              {new Date(tenant.last_activity_at).toLocaleTimeString('fa-IR')}
                            </div>
                          </>
                        ) : (
                          'هیچ فعالیتی ثبت نشده'
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {getActionButtons(tenant)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {/* Summary */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div>
              نمایش {tenants.length} تنانت از {pagination?.totalItems || tenants.length} تنانت
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{tenants.filter(t => t.status === 'active' || (t.status === undefined && t.is_active)).length} فعال</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                <span>{tenants.filter(t => t.subscription_type === 'pro').length} حرفه‌ای</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span>
                  {tenants.filter(t => {
                    if (!t.subscription_expires_at) return false;
                    const now = new Date();
                    const expiry = new Date(t.subscription_expires_at);
                    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays <= 30 && diffDays >= 0;
                  }).length} نزدیک به انقضا
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantSubscriptionTable;