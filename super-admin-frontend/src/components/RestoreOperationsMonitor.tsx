import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBackups } from '@/hooks/useBackups';

import { formatBytes, formatDate } from '@/lib/utils';
import { 
  PlayIcon, 
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  RefreshCwIcon,
  StopCircleIcon
} from 'lucide-react';

const RestoreOperationsMonitor: React.FC = () => {
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { useRestoreOperations, useCancelRestoreOperation } = useBackups();
  const { data: operationsData, isLoading, refetch } = useRestoreOperations(page, 10);
  const cancelMutation = useCancelRestoreOperation();

  // Auto-refresh for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const handleCancelOperation = (operationId: string) => {
    cancelMutation.mutate(operationId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 ml-1" />
            تکمیل شده
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            <PlayIcon className="w-3 h-3 ml-1" />
            در حال اجرا
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <ClockIcon className="w-3 h-3 ml-1" />
            در انتظار
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircleIcon className="w-3 h-3 ml-1" />
            ناموفق
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary">
            <StopCircleIcon className="w-3 h-3 ml-1" />
            لغو شده
          </Badge>
        );
      default:
        return <Badge variant="secondary">نامشخص</Badge>;
    }
  };

  const getOperationTypeLabel = (type: string) => {
    switch (type) {
      case 'tenant_restore':
        return 'بازیابی تنانت';
      case 'disaster_recovery':
        return 'بازیابی فاجعه';
      default:
        return 'نامشخص';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const activeOperations = operationsData?.operations.filter(op => 
    op.status === 'in_progress' || op.status === 'pending'
  ) || [];



  return (
    <div className="space-y-6">
      {/* Active Operations */}
      {activeOperations.length > 0 && (
        <Card variant="gradient-blue">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PlayIcon className="w-5 h-5 text-blue-600" />
                عملیات‌های فعال ({activeOperations.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? (
                    <>
                      <PauseIcon className="w-4 h-4 ml-2" />
                      توقف بروزرسانی
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-4 h-4 ml-2" />
                      شروع بروزرسانی
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCwIcon className="w-4 h-4 ml-2" />
                  بروزرسانی
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOperations.map((operation) => (
                <div key={operation.id} className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-semibold">{getOperationTypeLabel(operation.operation_type)}</h4>
                        <p className="text-sm text-slate-600">
                          شروع: {formatDate(operation.started_at)}
                        </p>
                      </div>
                      {getStatusBadge(operation.status)}
                    </div>
                    {operation.status === 'in_progress' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOperation(operation.id)}
                        disabled={cancelMutation.isPending}
                      >
                        <StopCircleIcon className="w-4 h-4 ml-2" />
                        لغو
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>پیشرفت:</span>
                      <span>{operation.progress_percentage}%</span>
                    </div>
                    <Progress 
                      value={operation.progress_percentage} 
                      className="h-2"
                    />
                  </div>

                  {operation.tenant_ids && operation.tenant_ids.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-slate-600">
                        تنانت‌ها: {operation.tenant_ids.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operations History */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-slate-600" />
            تاریخچه عملیات‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <TableHead>نوع عملیات</TableHead>
                  <TableHead>تاریخ شروع</TableHead>
                  <TableHead>مدت زمان</TableHead>
                  <TableHead>حجم داده</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>پیشرفت</TableHead>
                  <TableHead>جزئیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCwIcon className="w-4 h-4 animate-spin ml-2" />
                        در حال بارگذاری...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : operationsData?.operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      هیچ عملیات بازیابی یافت نشد
                    </TableCell>
                  </TableRow>
                ) : (
                  operationsData?.operations.map((operation) => (
                    <TableRow key={operation.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">
                        {getOperationTypeLabel(operation.operation_type)}
                      </TableCell>
                      <TableCell>{formatDate(operation.started_at)}</TableCell>
                      <TableCell>
                        {operation.completed_at ? (
                          <span>
                            {Math.round(
                              (new Date(operation.completed_at).getTime() - 
                               new Date(operation.started_at).getTime()) / 60000
                            )} دقیقه
                          </span>
                        ) : operation.status === 'in_progress' ? (
                          <span className="text-blue-600">در حال اجرا...</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {operation.restored_data_size ? 
                          formatBytes(operation.restored_data_size) : 
                          <span className="text-slate-400">-</span>
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(operation.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(operation.status)}`}
                              style={{ width: `${operation.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">
                            {operation.progress_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {operation.error_message ? (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangleIcon className="w-4 h-4" />
                            <span className="text-sm truncate max-w-32" title={operation.error_message}>
                              {operation.error_message}
                            </span>
                          </div>
                        ) : operation.tenant_ids && operation.tenant_ids.length > 0 ? (
                          <span className="text-sm text-slate-600">
                            {operation.tenant_ids.length} تنانت
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {operationsData && operationsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-600">
                نمایش {((page - 1) * 10) + 1} تا {Math.min(page * 10, operationsData.pagination.total)} از {operationsData.pagination.total} مورد
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(operationsData.pagination.totalPages, p + 1))}
                  disabled={page === operationsData.pagination.totalPages}
                >
                  بعدی
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RestoreOperationsMonitor;