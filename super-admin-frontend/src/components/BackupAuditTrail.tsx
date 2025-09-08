import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  SearchIcon,
  RefreshCwIcon,
  FileTextIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  DatabaseIcon,
  TrashIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SettingsIcon
} from 'lucide-react';
import { BackupAuditLog } from '@/types/backupMonitoring';
import { backupMonitoringService } from '@/services/backupMonitoringService';
import { useToast } from '@/hooks/use-toast';

const BackupAuditTrail: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<BackupAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    operation_type: 'all',
    user_email: '',
    tenant_name: '',
    date_from: '',
    date_to: '',
    success: 'all',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const { toast } = useToast();

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await backupMonitoringService.getAuditLogs(
        pagination.page,
        pagination.limit,
        {
          operation_type: filters.operation_type !== 'all' ? filters.operation_type : undefined,
          user_email: filters.user_email || undefined,
          tenant_name: filters.tenant_name || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          success: filters.success !== 'all' ? filters.success === 'true' : undefined,
        }
      );

      setAuditLogs(response.logs);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast({
        title: 'خطا در دریافت گزارش‌ها',
        description: 'امکان دریافت گزارش‌های حسابرسی وجود ندارد',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, filters]);

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      setExporting(true);
      const response = await backupMonitoringService.exportAuditLogs(format, {
        operation_type: filters.operation_type !== 'all' ? filters.operation_type : undefined,
        user_email: filters.user_email || undefined,
        tenant_name: filters.tenant_name || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        success: filters.success !== 'all' ? filters.success === 'true' : undefined,
      });

      // Create download link
      const link = document.createElement('a');
      link.href = response.download_url;
      link.download = `backup_audit_logs.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'خروجی آماده شد',
        description: `فایل ${format.toUpperCase()} با موفقیت دانلود شد`,
      });
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      toast({
        title: 'خطا در خروجی‌گیری',
        description: 'امکان خروجی‌گیری گزارش‌ها وجود ندارد',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'backup_created':
        return <DatabaseIcon className="w-4 h-4 text-blue-600" />;
      case 'backup_deleted':
        return <TrashIcon className="w-4 h-4 text-red-600" />;
      case 'backup_restored':
        return <RotateCcwIcon className="w-4 h-4 text-green-600" />;
      case 'backup_verified':
        return <ShieldCheckIcon className="w-4 h-4 text-purple-600" />;
      case 'policy_changed':
        return <SettingsIcon className="w-4 h-4 text-orange-600" />;
      default:
        return <FileTextIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getOperationLabel = (operationType: string) => {
    switch (operationType) {
      case 'backup_created':
        return 'ایجاد پشتیبان';
      case 'backup_deleted':
        return 'حذف پشتیبان';
      case 'backup_restored':
        return 'بازیابی پشتیبان';
      case 'backup_verified':
        return 'تأیید پشتیبان';
      case 'policy_changed':
        return 'تغییر سیاست';
      default:
        return operationType;
    }
  };

  const getOperationBadge = (operationType: string) => {
    const colors = {
      backup_created: 'bg-blue-100 text-blue-700',
      backup_deleted: 'bg-red-100 text-red-700',
      backup_restored: 'bg-green-100 text-green-700',
      backup_verified: 'bg-purple-100 text-purple-700',
      policy_changed: 'bg-orange-100 text-orange-700',
    };

    return (
      <Badge className={colors[operationType as keyof typeof colors] || 'bg-gray-100 text-gray-700'}>
        {getOperationLabel(operationType)}
      </Badge>
    );
  };

  const getSuccessIcon = (success: boolean) => {
    return success ? (
      <CheckCircleIcon className="w-4 h-4 text-green-600" />
    ) : (
      <XCircleIcon className="w-4 h-4 text-red-600" />
    );
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.user_email.toLowerCase().includes(searchLower) ||
        (log.tenant_name && log.tenant_name.toLowerCase().includes(searchLower)) ||
        (log.backup_id && log.backup_id.toLowerCase().includes(searchLower)) ||
        getOperationLabel(log.operation_type).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                <FileTextIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">گزارش حسابرسی پشتیبان‌ها</h2>
                <p className="text-sm text-slate-600">
                  ردیابی کامل عملیات پشتیبان‌گیری و تغییرات سیستم
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAuditLogs}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </Button>
              <Select onValueChange={(format) => handleExport(format as 'csv' | 'json' | 'pdf')} disabled={exporting}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={exporting ? "در حال خروجی..." : "خروجی"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="جستجو..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pr-10"
              />
            </div>

            <Select
              value={filters.operation_type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, operation_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="نوع عملیات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه عملیات</SelectItem>
                <SelectItem value="backup_created">ایجاد پشتیبان</SelectItem>
                <SelectItem value="backup_deleted">حذف پشتیبان</SelectItem>
                <SelectItem value="backup_restored">بازیابی پشتیبان</SelectItem>
                <SelectItem value="backup_verified">تأیید پشتیبان</SelectItem>
                <SelectItem value="policy_changed">تغییر سیاست</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="ایمیل کاربر"
              value={filters.user_email}
              onChange={(e) => setFilters(prev => ({ ...prev, user_email: e.target.value }))}
            />

            <Input
              placeholder="نام تنانت"
              value={filters.tenant_name}
              onChange={(e) => setFilters(prev => ({ ...prev, tenant_name: e.target.value }))}
            />

            <Input
              type="date"
              placeholder="از تاریخ"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            />

            <Select
              value={filters.success}
              onValueChange={(value) => setFilters(prev => ({ ...prev, success: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="true">موفق</SelectItem>
                <SelectItem value="false">ناموفق</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-slate-600">
            نمایش {filteredLogs.length} از {pagination.total} گزارش
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="w-5 h-5" />
            گزارش‌های حسابرسی
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <Card key={log.id} variant="default" className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getOperationIcon(log.operation_type)}
                    </div>

                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getOperationBadge(log.operation_type)}
                          <div className="flex items-center gap-1">
                            {getSuccessIcon(log.operation_details.success)}
                            <span className={`text-sm font-medium ${
                              log.operation_details.success ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {log.operation_details.success ? 'موفق' : 'ناموفق'}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-slate-500">
                          {new Date(log.timestamp).toLocaleString('fa-IR')}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">کاربر:</span>
                          <span className="font-medium">{log.user_email}</span>
                        </div>

                        {log.tenant_name && (
                          <div className="flex items-center gap-2">
                            <DatabaseIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">تنانت:</span>
                            <span className="font-medium">{log.tenant_name}</span>
                          </div>
                        )}

                        {log.operation_details.storage_provider && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">ذخیره‌ساز:</span>
                            <Badge className={
                              log.operation_details.storage_provider === 'backblaze_b2'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }>
                              {log.operation_details.storage_provider === 'backblaze_b2' ? 'B2' : 'R2'}
                            </Badge>
                          </div>
                        )}

                        {log.operation_details.file_size && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">اندازه:</span>
                            <span className="font-medium">
                              {formatFileSize(log.operation_details.file_size)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {log.operation_details.duration_seconds && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">مدت زمان:</span>
                            <span className="font-medium">
                              {formatDuration(log.operation_details.duration_seconds)}
                            </span>
                          </div>
                        )}

                        {log.backup_id && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">شناسه پشتیبان:</span>
                            <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                              {log.backup_id.substring(0, 8)}...
                            </code>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {log.operation_details.error_message && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-800 mb-1">
                            <XCircleIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">خطا:</span>
                          </div>
                          <p className="text-sm text-red-700">{log.operation_details.error_message}</p>
                        </div>
                      )}

                      {/* Metadata */}
                      {Object.keys(log.metadata).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-slate-600 hover:text-slate-800">
                            اطلاعات تکمیلی
                          </summary>
                          <div className="mt-2 bg-slate-50 rounded p-3">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <FileTextIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>هیچ گزارش حسابرسی یافت نشد</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-slate-600">
                نمایش {((pagination.page - 1) * pagination.limit) + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total} گزارش
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  قبلی
                </Button>
                <span className="text-sm text-slate-600">
                  صفحه {pagination.page} از {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
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

export default BackupAuditTrail;