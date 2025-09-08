import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  User,
  Shield,
  Globe
} from 'lucide-react';
import { AuditLogEntry } from '@/types/impersonation';
import { format } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface AuditTrailTableProps {
  auditLogs: AuditLogEntry[];
  isLoading?: boolean;
}

const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  auditLogs,
  isLoading = false,
}) => {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'impersonation_started':
        return <Badge variant="gradient-green">شروع جانشینی</Badge>;
      case 'impersonation_ended':
        return <Badge variant="gradient-blue">پایان جانشینی</Badge>;
      case 'impersonation_terminated':
        return <Badge variant="destructive">خاتمه اجباری</Badge>;
      case 'impersonation_failed':
        return <Badge variant="error">شکست جانشینی</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Badge variant="success">موفق</Badge>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <Badge variant="error">ناموفق</Badge>
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <Badge variant="warning">هشدار</Badge>
          </div>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd HH:mm:ss', {
        locale: faIR,
      });
    } catch {
      return 'نامشخص';
    }
  };

  const formatDetails = (details: Record<string, any>) => {
    const importantFields = ['reason', 'duration_hours', 'error_message', 'session_duration'];
    const formatted = [];

    for (const [key, value] of Object.entries(details)) {
      if (importantFields.includes(key) && value) {
        let label = key;
        switch (key) {
          case 'reason':
            label = 'دلیل';
            break;
          case 'duration_hours':
            label = 'مدت (ساعت)';
            break;
          case 'error_message':
            label = 'پیام خطا';
            break;
          case 'session_duration':
            label = 'مدت جلسه';
            break;
        }
        formatted.push(`${label}: ${value}`);
      }
    }

    return formatted.length > 0 ? formatted.join(' | ') : '-';
  };

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            سابقه عملیات جانشینی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-slate-500">در حال بارگذاری سابقه...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          سابقه عملیات جانشینی
          <Badge variant="secondary" className="mr-2">
            {auditLogs?.length || 0} رکورد
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!auditLogs || auditLogs.length === 0 ? (
          <div className="flex items-center justify-center h-32 p-6">
            <div className="text-slate-500">هیچ رکوردی در سابقه وجود ندارد</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ و زمان</TableHead>
                <TableHead>عملیات</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>ادمین</TableHead>
                <TableHead>کاربر هدف</TableHead>
                <TableHead>شناسه جلسه</TableHead>
                <TableHead>IP آدرس</TableHead>
                <TableHead>جزئیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-mono">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-mono">
                        {log.admin_user_id.substring(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {log.target_user_id ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-mono">
                          {log.target_user_id.substring(0, 8)}...
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.session_id ? (
                      <span className="text-sm font-mono text-slate-600">
                        {log.session_id.substring(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.ip_address ? (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {log.ip_address}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <span className="text-sm text-slate-600">
                        {formatDetails(log.details)}
                      </span>
                      {log.reason && (
                        <div className="text-xs text-slate-500 mt-1">
                          دلیل: {log.reason}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditTrailTable;