import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PlayIcon,
  RefreshCwIcon,
  SearchIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  FileCheckIcon
} from 'lucide-react';
import { BackupVerificationResult } from '@/types/backupMonitoring';
import { backupMonitoringService } from '@/services/backupMonitoringService';
import { useToast } from '@/hooks/use-toast';

interface BackupVerificationDashboardProps {
  refreshInterval?: number;
}

const BackupVerificationDashboard: React.FC<BackupVerificationDashboardProps> = ({
  refreshInterval = 60000
}) => {
  const [verificationResults, setVerificationResults] = useState<BackupVerificationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [bulkVerificationJob, setBulkVerificationJob] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    backup_type: 'all',
    date_from: '',
    date_to: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const { toast } = useToast();

  const fetchVerificationResults = async () => {
    try {
      const response = await backupMonitoringService.getVerificationResults(
        pagination.page,
        pagination.limit,
        {
          status: filters.status !== 'all' ? filters.status : undefined,
          backup_type: filters.backup_type !== 'all' ? filters.backup_type : undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
        }
      );

      setVerificationResults(response.results);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch verification results:', error);
      toast({
        title: 'خطا در دریافت نتایج تأیید',
        description: 'امکان دریافت نتایج تأیید پشتیبان‌ها وجود ندارد',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBulkProgress = async () => {
    if (!bulkVerificationJob) return;

    try {
      const progress = await backupMonitoringService.getVerificationJobStatus(bulkVerificationJob);
      setBulkProgress(progress);

      if (progress.status === 'completed' || progress.status === 'failed') {
        setBulkVerificationJob(null);
        setBulkProgress(null);
        fetchVerificationResults();
        
        toast({
          title: progress.status === 'completed' ? 'تأیید انبوه تکمیل شد' : 'تأیید انبوه ناموفق',
          description: progress.message || 'عملیات تأیید انبوه به پایان رسید',
          variant: progress.status === 'completed' ? 'default' : 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to check bulk progress:', error);
    }
  };

  useEffect(() => {
    fetchVerificationResults();
  }, [pagination.page, filters]);

  useEffect(() => {
    const interval = setInterval(fetchVerificationResults, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    if (bulkVerificationJob) {
      const interval = setInterval(checkBulkProgress, 5000);
      return () => clearInterval(interval);
    }
  }, [bulkVerificationJob]);

  const handleBulkVerification = async () => {
    if (selectedResults.length === 0) {
      toast({
        title: 'هیچ پشتیبانی انتخاب نشده',
        description: 'لطفاً پشتیبان‌هایی را برای تأیید انتخاب کنید',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await backupMonitoringService.startBulkVerification(selectedResults);
      setBulkVerificationJob(response.job_id);
      
      toast({
        title: 'تأیید انبوه شروع شد',
        description: `تأیید ${selectedResults.length} پشتیبان در حال انجام است`,
      });
    } catch (error) {
      console.error('Failed to start bulk verification:', error);
      toast({
        title: 'خطا در شروع تأیید انبوه',
        description: 'امکان شروع عملیات تأیید انبوه وجود ندارد',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-700">تأیید شده</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">ناموفق</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700">در حال انجام</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">در انتظار</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">نامشخص</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <RefreshCwIcon className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangleIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getCheckIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircleIcon className="w-4 h-4 text-green-600" />
    ) : (
      <XCircleIcon className="w-4 h-4 text-red-600" />
    );
  };

  const filteredResults = verificationResults.filter(result => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        result.backup_id.toLowerCase().includes(searchLower) ||
        (result.tenant_name && result.tenant_name.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedResults(filteredResults.map(r => r.backup_id));
    } else {
      setSelectedResults([]);
    }
  };

  const handleSelectResult = (backupId: string, checked: boolean) => {
    if (checked) {
      setSelectedResults(prev => [...prev, backupId]);
    } else {
      setSelectedResults(prev => prev.filter(id => id !== backupId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">داشبورد تأیید پشتیبان‌ها</h2>
                <p className="text-sm text-slate-600">
                  نظارت و مدیریت تأیید یکپارچگی پشتیبان‌ها
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVerificationResults}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Progress */}
      {bulkProgress && (
        <Card variant="gradient-blue">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RefreshCwIcon className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="font-medium">تأیید انبوه در حال انجام</span>
              </div>
              <span className="text-sm text-blue-600">
                {bulkProgress.completed_verifications} از {bulkProgress.total_verifications}
              </span>
            </div>
            <Progress value={bulkProgress.progress} className="h-2" />
            {bulkProgress.message && (
              <p className="text-sm text-blue-600 mt-2">{bulkProgress.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="جستجو در پشتیبان‌ها..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pr-10"
              />
            </div>

            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="passed">تأیید شده</SelectItem>
                <SelectItem value="failed">ناموفق</SelectItem>
                <SelectItem value="in_progress">در حال انجام</SelectItem>
                <SelectItem value="pending">در انتظار</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.backup_type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, backup_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="نوع پشتیبان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                <SelectItem value="tenant">تنانت</SelectItem>
                <SelectItem value="disaster_recovery">بازیابی فاجعه</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="از تاریخ"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            />

            <Input
              type="date"
              placeholder="تا تاریخ"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedResults.length === filteredResults.length && filteredResults.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-slate-600">
                  انتخاب همه ({selectedResults.length} انتخاب شده)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="gradient-purple"
                size="sm"
                onClick={handleBulkVerification}
                disabled={selectedResults.length === 0 || !!bulkVerificationJob}
                className="flex items-center gap-2"
              >
                <PlayIcon className="w-4 h-4" />
                تأیید انبوه ({selectedResults.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Results Table */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheckIcon className="w-5 h-5" />
            نتایج تأیید پشتیبان‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((result) => (
                <Card key={result.backup_id} variant="default" className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedResults.includes(result.backup_id)}
                      onCheckedChange={(checked) => handleSelectResult(result.backup_id, checked as boolean)}
                    />

                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <h4 className="font-medium">
                              {result.tenant_name || result.backup_id}
                            </h4>
                            <p className="text-sm text-slate-600">
                              {result.backup_type === 'tenant' ? 'پشتیبان تنانت' : 'بازیابی فاجعه'} • 
                              {new Date(result.verification_date).toLocaleDateString('fa-IR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result.status)}
                          <span className="text-sm text-slate-500">
                            {result.verification_duration_seconds}s
                          </span>
                        </div>
                      </div>

                      {/* Verification Checks */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="flex items-center gap-2">
                          {getCheckIcon(result.checks.file_exists)}
                          <span className="text-sm">وجود فایل</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getCheckIcon(result.checks.file_size_match)}
                          <span className="text-sm">اندازه فایل</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getCheckIcon(result.checks.checksum_valid)}
                          <span className="text-sm">چک‌سام</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getCheckIcon(result.checks.encryption_valid)}
                          <span className="text-sm">رمزنگاری</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getCheckIcon(result.checks.download_test)}
                          <span className="text-sm">تست دانلود</span>
                        </div>
                      </div>

                      {/* Storage Providers Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-orange-800">Backblaze B2</span>
                            {result.storage_providers.backblaze_b2.available ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div className="text-xs text-orange-700 space-y-1">
                            <div>اندازه: {(result.storage_providers.backblaze_b2.file_size / 1024 / 1024).toFixed(2)} MB</div>
                            <div>تاریخ: {new Date(result.storage_providers.backblaze_b2.last_modified).toLocaleDateString('fa-IR')}</div>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-800">Cloudflare R2</span>
                            {result.storage_providers.cloudflare_r2.available ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div className="text-xs text-blue-700 space-y-1">
                            <div>اندازه: {(result.storage_providers.cloudflare_r2.file_size / 1024 / 1024).toFixed(2)} MB</div>
                            <div>تاریخ: {new Date(result.storage_providers.cloudflare_r2.last_modified).toLocaleDateString('fa-IR')}</div>
                          </div>
                        </div>
                      </div>

                      {/* Error Details */}
                      {result.error_details && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-800 mb-1">
                            <AlertTriangleIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">جزئیات خطا:</span>
                          </div>
                          <p className="text-sm text-red-700">{result.error_details}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {filteredResults.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <FileCheckIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>هیچ نتیجه تأییدی یافت نشد</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-slate-600">
                نمایش {((pagination.page - 1) * pagination.limit) + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total} نتیجه
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

export default BackupVerificationDashboard;