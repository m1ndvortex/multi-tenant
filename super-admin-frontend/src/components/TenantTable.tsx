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
  CheckCircle
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface TenantTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
  onSuspend: (tenant: Tenant) => void;
  onActivate: (tenant: Tenant) => void;
  onConfirmPayment: (tenant: Tenant) => void;
  isLoading?: boolean;
}

const TenantTable: React.FC<TenantTableProps> = ({
  tenants,
  onEdit,
  onDelete,
  onSuspend,
  onActivate,
  onConfirmPayment,
  isLoading = false,
}) => {
  const getSubscriptionBadge = (subscription_type: string) => {
    switch (subscription_type) {
      case 'free':
        return <Badge variant="secondary">رایگان</Badge>;
      case 'pro':
        return <Badge variant="gradient-green">حرفه‌ای</Badge>;
      case 'pending_payment':
        return <Badge variant="warning">در انتظار پرداخت</Badge>;
      case 'expired':
        return <Badge variant="error">منقضی شده</Badge>;
      default:
        return <Badge variant="secondary">{subscription_type}</Badge>;
    }
  };

  const getStatusBadge = (is_active: boolean) => {
    return is_active ? (
      <Badge variant="success">فعال</Badge>
    ) : (
      <Badge variant="error">غیرفعال</Badge>
    );
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>دامنه</TableHead>
              <TableHead>نوع اشتراک</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>تعداد کاربران</TableHead>
              <TableHead>آخرین فعالیت</TableHead>
              <TableHead>تاریخ ایجاد</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">
                  {tenant.name}
                </TableCell>
                <TableCell>
                  {tenant.domain ? (
                    <span className="text-blue-600">{tenant.domain}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {getSubscriptionBadge(tenant.subscription_type)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(tenant.is_active)}
                </TableCell>
                <TableCell>
                  <span className="text-slate-600">
                    {tenant.user_count || 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-slate-600">
                    {tenant.last_activity ? formatDate(tenant.last_activity) : 'هرگز'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-slate-600">
                    {formatDate(tenant.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(tenant)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {/* Suspend/Activate Button */}
                    {tenant.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSuspend(tenant)}
                        className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onActivate(tenant)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Confirm Payment Button */}
                    {tenant.subscription_type === 'pending_payment' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onConfirmPayment(tenant)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(tenant)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TenantTable;