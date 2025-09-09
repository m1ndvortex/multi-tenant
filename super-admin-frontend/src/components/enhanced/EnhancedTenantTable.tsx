import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { EnhancedTable, EnhancedTableBody, EnhancedTableCell, EnhancedTableHead, EnhancedTableHeader, EnhancedTableRow } from '@/components/ui/enhanced-table';
import { 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle,
  UserCheck,
  Key,
  Settings
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface EnhancedTenantTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
  onSuspend: (tenant: Tenant) => void;
  onActivate: (tenant: Tenant) => void;
  onConfirmPayment: (tenant: Tenant) => void;
  onImpersonate?: (tenant: Tenant) => void;
  onUpdateCredentials: (tenant: Tenant) => void;
  onManageSubscription: (tenant: Tenant) => void;
  isLoading?: boolean;
}

const EnhancedTenantTable: React.FC<EnhancedTenantTableProps> = ({
  tenants,
  onEdit,
  onDelete,
  onSuspend,
  onActivate,
  onConfirmPayment,
  onImpersonate,
  onUpdateCredentials,
  onManageSubscription,
  isLoading = false,
}) => {
  const getSubscriptionBadge = (subscription_type: string) => {
    switch (subscription_type) {
      case 'free':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium">رایگان</Badge>;
      case 'pro':
        return <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium">حرفه‌ای</Badge>;
      case 'enterprise':
        return <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium">سازمانی</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium">{subscription_type}</Badge>;
    }
  };

  const getStatusBadge = (tenant: Tenant) => {
    const status = tenant.status || (tenant.is_active ? 'active' : 'suspended');
    
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 font-medium">فعال</Badge>;
      case 'suspended':
        return <Badge variant="default" className="bg-orange-100 text-orange-800 font-medium">تعلیق</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 font-medium">در انتظار</Badge>;
      case 'cancelled':
        return <Badge variant="default" className="bg-red-100 text-red-800 font-medium">لغو شده</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium">نامشخص</Badge>;
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
    if (tenant.subscription_type === 'free') return null;
    
    if (!tenant.subscription_expires_at) {
      return <span className="text-orange-600 text-sm">بدون تاریخ انقضا</span>;
    }

    const expirationDate = new Date(tenant.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return <span className="text-red-600 text-sm font-medium">منقضی شده</span>;
    } else if (daysUntilExpiration <= 7) {
      return <span className="text-orange-600 text-sm font-medium">{daysUntilExpiration} روز باقی‌مانده</span>;
    } else if (daysUntilExpiration <= 30) {
      return <span className="text-yellow-600 text-sm">{daysUntilExpiration} روز باقی‌مانده</span>;
    } else {
      return <span className="text-green-600 text-sm">{daysUntilExpiration} روز باقی‌مانده</span>;
    }
  };

  if (isLoading) {
    return (
      <Card variant="professional">
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
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-slate-500">هیچ تنانتی یافت نشد</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional">
      <CardContent className="p-0">
        <EnhancedTable>
          <EnhancedTableHeader>
            <EnhancedTableRow>
              <EnhancedTableHead>نام تنانت</EnhancedTableHead>
              <EnhancedTableHead>دامنه</EnhancedTableHead>
              <EnhancedTableHead>نوع اشتراک</EnhancedTableHead>
              <EnhancedTableHead>وضعیت</EnhancedTableHead>
              <EnhancedTableHead>انقضای اشتراک</EnhancedTableHead>
              <EnhancedTableHead>تعداد کاربران</EnhancedTableHead>
              <EnhancedTableHead>آخرین فعالیت</EnhancedTableHead>
              <EnhancedTableHead>تاریخ ایجاد</EnhancedTableHead>
              <EnhancedTableHead>عملیات</EnhancedTableHead>
            </EnhancedTableRow>
          </EnhancedTableHeader>
          <EnhancedTableBody>
            {tenants.map((tenant) => (
              <EnhancedTableRow key={tenant.id}>
                <EnhancedTableCell variant="tenantName">
                  <div className="flex flex-col">
                    <span className="font-bold text-indigo-700 text-sm">
                      {tenant.name}
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      ID: {tenant.id.slice(0, 8)}...
                    </span>
                  </div>
                </EnhancedTableCell>
                <EnhancedTableCell>
                  {tenant.domain ? (
                    <span className="text-blue-600 font-medium">{tenant.domain}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </EnhancedTableCell>
                <EnhancedTableCell>
                  {getSubscriptionBadge(tenant.subscription_type)}
                </EnhancedTableCell>
                <EnhancedTableCell>
                  {getStatusBadge(tenant)}
                </EnhancedTableCell>
                <EnhancedTableCell>
                  <div className="flex flex-col">
                    {tenant.subscription_expires_at ? (
                      <>
                        <span className="text-sm text-slate-600">
                          {formatDate(tenant.subscription_expires_at)}
                        </span>
                        {getExpirationStatus(tenant)}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </EnhancedTableCell>
                <EnhancedTableCell>
                  <span className="text-slate-600 font-medium">
                    {tenant.user_count || 0}
                  </span>
                </EnhancedTableCell>
                <EnhancedTableCell>
                  <span className="text-slate-600">
                    {tenant.last_activity || tenant.last_activity_at
                      ? formatDate(tenant.last_activity || (tenant.last_activity_at as string))
                      : 'هرگز'}
                  </span>
                </EnhancedTableCell>
                <EnhancedTableCell>
                  <span className="text-slate-600">
                    {formatDate(tenant.created_at)}
                  </span>
                </EnhancedTableCell>
                <EnhancedTableCell>
                  <div className="flex items-center gap-1">
                    {/* Update Credentials Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateCredentials(tenant)}
                      className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      title="تغییر اطلاعات ورود"
                    >
                      <Key className="h-4 w-4" />
                    </Button>

                    {/* Manage Subscription Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onManageSubscription(tenant)}
                      className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      title="مدیریت اشتراک"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>

                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(tenant)}
                      className="h-8 w-8 p-0 text-slate-600 hover:text-slate-700 hover:bg-slate-50"
                      title="ویرایش تنانت"
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
                </EnhancedTableCell>
              </EnhancedTableRow>
            ))}
          </EnhancedTableBody>
        </EnhancedTable>
      </CardContent>
    </Card>
  );
};

export default EnhancedTenantTable;