/**
 * Enhanced Tenant Table
 * Enhanced table with improved styling, high-contrast tenant names, and new functionality
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle,
  UserCheck,
  Key,
  Settings,
  Eye,
  Calendar,
  Users
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface EnhancedTenantTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onFullEdit: (tenant: Tenant) => void;
  onCredentialsUpdate: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
  onSuspend: (tenant: Tenant) => void;
  onActivate: (tenant: Tenant) => void;
  onConfirmPayment: (tenant: Tenant) => void;
  onImpersonate?: (tenant: Tenant) => void;
  onViewDetails?: (tenant: Tenant) => void;
  isLoading?: boolean;
}

const EnhancedTenantTable: React.FC<EnhancedTenantTableProps> = ({
  tenants,
  onEdit,
  onFullEdit,
  onCredentialsUpdate,
  onDelete,
  onSuspend,
  onActivate,
  onConfirmPayment,
  onImpersonate,
  onViewDetails,
  isLoading = false,
}) => {
  const getSubscriptionBadge = (subscription_type: string) => {
    switch (subscription_type) {
      case 'free':
        return <Badge variant="secondary">رایگان</Badge>;
      case 'pro':
        return <Badge variant="gradient-green">حرفه‌ای</Badge>;
      case 'enterprise':
        return <Badge variant="gradient-purple">سازمانی</Badge>;
      default:
        return <Badge variant="secondary">{subscription_type}</Badge>;
    }
  };

  const getStatusBadge = (status: string | undefined, is_active: boolean) => {
    // Use status if available, otherwise fall back to is_active
    const actualStatus = status || (is_active ? 'active' : 'suspended');
    
    switch (actualStatus) {
      case 'active':
        return <Badge variant="success">فعال</Badge>;
      case 'suspended':
        return <Badge variant="error">تعلیق</Badge>;
      case 'pending':
        return <Badge variant="secondary">در انتظار</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">لغو شده</Badge>;
      default:
        return <Badge variant="secondary">نامشخص</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: faIR,
      });
    } catch {
      return 'نامشخص';
    }
  };

  const getExpirationStatus = (tenant: Tenant) => {
    if (tenant.subscription_type === 'free') {
      return null;
    }

    if (!tenant.subscription_expires_at) {
      return <Badge variant="secondary">نامحدود</Badge>;
    }

    const expirationDate = new Date(tenant.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">منقضی شده</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="error">{daysUntilExpiry} روز باقی‌مانده</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="secondary">{daysUntilExpiry} روز باقی‌مانده</Badge>;
    } else {
      return <Badge variant="success">{daysUntilExpiry} روز باقی‌مانده</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card variant="professional" className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-slate-500">در حال بارگذاری...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tenants.length === 0) {
    return (
      <Card variant="professional" className="shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-slate-500">هیچ تنانتی یافت نشد</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className="shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <TableRow>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  نام تنانت
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  دامنه
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  نوع اشتراک
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  وضعیت
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  انقضای اشتراک
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  تعداد کاربران
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  آخرین فعالیت
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  تاریخ ایجاد
                </TableHead>
                <TableHead className="px-6 py-4 text-right text-sm font-semibold text-gray-900 tracking-wider">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant, index) => (
                <TableRow 
                  key={tenant.id}
                  className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                  }`}
                >
                  {/* Enhanced Tenant Name Cell with High Contrast */}
                  <TableCell className="px-6 py-4 text-sm font-semibold text-indigo-700 bg-indigo-50/30 border-r-2 border-indigo-200">
                    <div className="flex flex-col">
                      <span className="font-bold text-indigo-800 text-base">
                        {tenant.name}
                      </span>
                      {tenant.email && (
                        <span className="text-xs text-indigo-600 mt-1">
                          {tenant.email}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {tenant.domain ? (
                      <span className="text-blue-600 font-medium">{tenant.domain}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {getSubscriptionBadge(tenant.subscription_type)}
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {getStatusBadge(tenant.status, tenant.is_active)}
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {getExpirationStatus(tenant)}
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span>{tenant.user_count || 0}</span>
                    </div>
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    <span className="text-slate-600">
                      {tenant.last_activity || tenant.last_activity_at
                        ? formatDate(tenant.last_activity || (tenant.last_activity_at as string))
                        : 'هرگز'}
                    </span>
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-600">
                        {formatDate(tenant.created_at)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm text-gray-900 font-medium">
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* View Details Button */}
                      {onViewDetails && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(tenant)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="مشاهده جزئیات کامل"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Credentials Update Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCredentialsUpdate(tenant)}
                        className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        title="به‌روزرسانی اطلاعات ورود"
                      >
                        <Key className="h-4 w-4" />
                      </Button>

                      {/* Full Edit Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFullEdit(tenant)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="ویرایش جامع"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>

                      {/* Basic Edit Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(tenant)}
                        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                        title="ویرایش ساده"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* Suspend/Activate Button */}
                      {tenant.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSuspend(tenant)}
                          className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          title="تعلیق تنانت"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onActivate(tenant)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="فعال‌سازی تنانت"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Confirm Payment Button */}
                      {tenant.subscription_type === 'pro' && tenant.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onConfirmPayment(tenant)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="تأیید پرداخت"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Impersonate Button */}
                      {onImpersonate && tenant.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onImpersonate(tenant)}
                          className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="جانشینی کاربران تنانت"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(tenant)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="حذف تنانت"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedTenantTable;