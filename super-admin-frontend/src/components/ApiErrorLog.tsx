import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useApiErrors } from '@/hooks/useAnalytics';
import { ApiError, ErrorLogFilters } from '@/services/analyticsService';
import { cn } from '@/lib/utils';

interface ApiErrorLogProps {
  className?: string;
}

const ApiErrorLog: React.FC<ApiErrorLogProps> = ({ className }) => {
  const [filters, setFilters] = useState<ErrorLogFilters>({
    page: 1,
    limit: 20,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusCode, setSelectedStatusCode] = useState<string>('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');

  const { data: errorData, isLoading, error } = useApiErrors(filters);

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
      status_code: selectedStatusCode && selectedStatusCode !== 'all' ? parseInt(selectedStatusCode) : undefined,
      endpoint: selectedEndpoint || undefined,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatusCode('all');
    setSelectedEndpoint('');
    setFilters({
      page: 1,
      limit: 20,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const getStatusBadgeVariant = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'default';
    if (statusCode >= 400 && statusCode < 500) return 'secondary';
    if (statusCode >= 500) return 'destructive';
    return 'outline';
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'PATCH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (error) {
    return (
      <Card variant="professional" className={className}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">خطا در دریافت لاگ خطاها</h3>
          <p className="text-slate-600 mb-4">امکان دریافت اطلاعات لاگ خطاها وجود ندارد</p>
          <Button variant="gradient-green" onClick={() => window.location.reload()}>
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          لاگ خطاهای API
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100/80 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="جستجو در پیام خطا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            
            <Select value={selectedStatusCode} onValueChange={setSelectedStatusCode}>
              <SelectTrigger>
                <SelectValue placeholder="کد وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="400">400 - Bad Request</SelectItem>
                <SelectItem value="401">401 - Unauthorized</SelectItem>
                <SelectItem value="403">403 - Forbidden</SelectItem>
                <SelectItem value="404">404 - Not Found</SelectItem>
                <SelectItem value="500">500 - Internal Server Error</SelectItem>
                <SelectItem value="502">502 - Bad Gateway</SelectItem>
                <SelectItem value="503">503 - Service Unavailable</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="مسیر API..."
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="w-full"
            />

            <div className="flex gap-2">
              <Button variant="gradient-blue" onClick={handleSearch} className="flex-1">
                جستجو
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                پاک کردن
              </Button>
            </div>
          </div>
        </div>

        {/* Error List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
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
        ) : errorData?.errors.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">خطایی یافت نشد</h3>
            <p className="text-slate-600">هیچ خطای API با فیلترهای انتخابی یافت نشد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {errorData?.errors.map((error: ApiError) => (
              <div key={error.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', getMethodBadgeColor(error.method))}>
                      {error.method}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(error.status_code)}>
                      {error.status_code}
                    </Badge>
                    <span className="text-sm font-medium text-slate-700">{error.endpoint}</span>
                  </div>
                  <span className="text-xs text-slate-500">{formatTimestamp(error.timestamp)}</span>
                </div>
                
                <p className="text-sm text-slate-800 mb-2 font-medium">{error.error_message}</p>
                
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {error.tenant_id && (
                    <span>تنانت: {error.tenant_id.slice(0, 8)}...</span>
                  )}
                  {error.user_id && (
                    <span>کاربر: {error.user_id.slice(0, 8)}...</span>
                  )}
                  <span>درخواست: {error.request_id.slice(0, 8)}...</span>
                  {error.ip_address && (
                    <span>IP: {error.ip_address}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {errorData && errorData.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              نمایش {((errorData.page - 1) * errorData.limit) + 1} تا {Math.min(errorData.page * errorData.limit, errorData.total)} از {errorData.total} خطا
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(errorData.page - 1)}
                disabled={errorData.page <= 1}
              >
                قبلی
              </Button>
              <span className="text-sm text-slate-600">
                صفحه {errorData.page} از {errorData.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(errorData.page + 1)}
                disabled={errorData.page >= errorData.total_pages}
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiErrorLog;