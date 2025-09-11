import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ErrorLog, ErrorSeverity, ErrorCategory } from '@/services/errorLoggingService';
import { cn } from '@/lib/utils';

interface ErrorLogTableProps {
  errorLogs: ErrorLog[];
  isLoading: boolean;
  total?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onErrorClick: (errorId: string) => void;
  selectedErrorIds?: string[];
  onErrorSelect?: (errorId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  compact?: boolean;
}

export const ErrorLogTable: React.FC<ErrorLogTableProps> = ({
  errorLogs,
  isLoading,
  total = 0,
  currentPage = 0,
  pageSize = 50,
  onPageChange,
  onErrorClick,
  selectedErrorIds = [],
  onErrorSelect,
  onSelectAll,
  compact = false,
}) => {
  const getSeverityBadgeVariant = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'destructive';
      case ErrorSeverity.HIGH:
        return 'secondary';
      case ErrorSeverity.MEDIUM:
        return 'outline';
      case ErrorSeverity.LOW:
        return 'default';
      default:
        return 'outline';
    }
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 bg-red-50';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 bg-orange-50';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-50';
      case ErrorSeverity.LOW:
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryColor = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
        return 'text-red-700 bg-red-100';
      case ErrorCategory.AUTHORIZATION:
        return 'text-orange-700 bg-orange-100';
      case ErrorCategory.VALIDATION:
        return 'text-yellow-700 bg-yellow-100';
      case ErrorCategory.DATABASE:
        return 'text-purple-700 bg-purple-100';
      case ErrorCategory.EXTERNAL_API:
        return 'text-blue-700 bg-blue-100';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'text-indigo-700 bg-indigo-100';
      case ErrorCategory.SYSTEM:
        return 'text-pink-700 bg-pink-100';
      case ErrorCategory.NETWORK:
        return 'text-cyan-700 bg-cyan-100';
      case ErrorCategory.PERFORMANCE:
        return 'text-teal-700 bg-teal-100';
      case ErrorCategory.SECURITY:
        return 'text-red-800 bg-red-200';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusBadgeVariant = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'default';
    if (statusCode >= 400 && statusCode < 500) return 'secondary';
    if (statusCode >= 500) return 'destructive';
    return 'outline';
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-700 bg-green-100';
      case 'POST': return 'text-blue-700 bg-blue-100';
      case 'PUT': return 'text-yellow-700 bg-yellow-100';
      case 'DELETE': return 'text-red-700 bg-red-100';
      case 'PATCH': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCategoryName = (category: ErrorCategory) => {
    const categoryNames: Record<string, string> = {
      [ErrorCategory.AUTHENTICATION]: 'احراز هویت',
      [ErrorCategory.AUTHORIZATION]: 'مجوز دسترسی',
      [ErrorCategory.VALIDATION]: 'اعتبارسنجی',
      [ErrorCategory.DATABASE]: 'پایگاه داده',
      [ErrorCategory.API]: 'API',
      [ErrorCategory.EXTERNAL_API]: 'API خارجی',
      [ErrorCategory.BUSINESS_LOGIC]: 'منطق کسب‌وکار',
      [ErrorCategory.SYSTEM]: 'سیستم',
      [ErrorCategory.NETWORK]: 'شبکه',
      [ErrorCategory.PERFORMANCE]: 'عملکرد',
      [ErrorCategory.SECURITY]: 'امنیت',
      [ErrorCategory.UNKNOWN]: 'نامشخص',
    };
    return categoryNames[category as string] || category;
  };

  const formatSeverityName = (severity: ErrorSeverity) => {
    const severityNames = {
      [ErrorSeverity.CRITICAL]: 'بحرانی',
      [ErrorSeverity.HIGH]: 'بالا',
      [ErrorSeverity.MEDIUM]: 'متوسط',
      [ErrorSeverity.LOW]: 'پایین',
    };
    return severityNames[severity] || severity;
  };

  const totalPages = Math.ceil(total / pageSize);
  const allSelected = selectedErrorIds.length === errorLogs.length && errorLogs.length > 0;
  const someSelected = selectedErrorIds.length > 0 && selectedErrorIds.length < errorLogs.length;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(compact ? 3 : 10)].map((_, i) => (
          <div key={i} className="p-4 border border-slate-200 rounded-lg animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/6"></div>
            </div>
            <div className="h-3 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (errorLogs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">خطایی یافت نشد</h3>
        <p className="text-slate-600">هیچ خطای API با فیلترهای انتخابی یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {!compact && onSelectAll && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>زمان</TableHead>
              <TableHead>شدت</TableHead>
              <TableHead>دسته‌بندی</TableHead>
              <TableHead>روش</TableHead>
              <TableHead>کد وضعیت</TableHead>
              <TableHead>مسیر</TableHead>
              <TableHead>پیام خطا</TableHead>
              {!compact && <TableHead>تعداد تکرار</TableHead>}
              <TableHead>وضعیت</TableHead>
              <TableHead>عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errorLogs.map((error) => (
              <TableRow 
                key={error.id}
                className={cn(
                  'hover:bg-slate-50 cursor-pointer transition-colors',
                  error.severity === ErrorSeverity.CRITICAL && 'bg-red-50/50',
                  error.is_resolved && 'opacity-60'
                )}
                onClick={() => onErrorClick(error.id)}
              >
                {!compact && onErrorSelect && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedErrorIds.includes(error.id)}
                      onCheckedChange={(checked) => onErrorSelect(error.id, !!checked)}
                    />
                  </TableCell>
                )}
                
                <TableCell className="text-sm">
                  {formatTimestamp(error.created_at)}
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant={getSeverityBadgeVariant(error.severity)}
                    className={cn('text-xs', getSeverityColor(error.severity))}
                  >
                    {formatSeverityName(error.severity)}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={cn('text-xs', getCategoryColor(error.category))}
                  >
                    {formatCategoryName(error.category)}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={cn('text-xs', getMethodBadgeColor(error.method))}
                  >
                    {error.method}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(error.status_code)}>
                    {error.status_code}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-sm font-mono max-w-xs truncate">
                  {error.endpoint}
                </TableCell>
                
                <TableCell className="text-sm max-w-md truncate">
                  {error.error_message}
                </TableCell>
                
                {!compact && (
                  <TableCell className="text-sm">
                    {error.occurrence_count > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {error.occurrence_count}x
                      </Badge>
                    )}
                  </TableCell>
                )}
                
                <TableCell>
                  {error.is_resolved ? (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      حل شده
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      در انتظار
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onErrorClick(error.id)}
                    className="text-xs"
                  >
                    جزئیات
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!compact && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            نمایش {(currentPage * pageSize) + 1} تا {Math.min((currentPage + 1) * pageSize, total)} از {total} خطا
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 0}
            >
              قبلی
            </Button>
            <span className="text-sm text-slate-600">
              صفحه {currentPage + 1} از {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              بعدی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};