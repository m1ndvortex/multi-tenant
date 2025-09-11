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
import { UserCheck, Eye, Clock, ExternalLink } from 'lucide-react';
import { User } from '@/types/impersonation';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface UserSelectionTableProps {
  users: User[];
  onImpersonate: (user: User) => void;
  isLoading?: boolean;
  impersonatingUserId?: string;
}

const UserSelectionTable: React.FC<UserSelectionTableProps> = ({
  users,
  onImpersonate,
  isLoading = false,
  impersonatingUserId,
}) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="gradient-purple">مدیر</Badge>;
      case 'manager':
        return <Badge variant="gradient-blue">مدیر کل</Badge>;
      case 'user':
        return <Badge variant="secondary">کاربر</Badge>;
      case 'accountant':
        return <Badge variant="gradient-green">حسابدار</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (is_active: boolean) => {
    return is_active ? (
      <Badge variant="success">فعال</Badge>
    ) : (
      <Badge variant="error">غیرفعال</Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'هرگز';
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
            <div className="text-slate-500">در حال بارگذاری کاربران...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-slate-500">هیچ کاربری یافت نشد</div>
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
              <TableHead>ایمیل</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>تنانت</TableHead>
              <TableHead>نقش</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>آخرین ورود</TableHead>
              <TableHead>تاریخ ایجاد</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.email}
                </TableCell>
                <TableCell>
                  {user.name || (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user.tenant_name || 'نامشخص'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {user.tenant_id}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {getRoleBadge(user.role)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(user.is_active)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      {formatDate(user.last_login)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-slate-600">
                    {formatDate(user.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* Enhanced Impersonate Button */}
                    <Button
                      variant="gradient-blue"
                      size="sm"
                      onClick={() => onImpersonate(user)}
                      disabled={!user.is_active || impersonatingUserId === user.id}
                      className="h-8 px-3 flex items-center gap-1"
                    >
                      {impersonatingUserId === user.id ? (
                        <>
                          <Eye className="h-4 w-4" />
                          در حال جانشینی
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          جایگزینی
                        </>
                      )}
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

export default UserSelectionTable;