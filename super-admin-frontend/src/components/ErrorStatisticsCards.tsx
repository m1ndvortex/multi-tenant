import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorStatistics, ErrorSeverity, ErrorCategory } from '@/services/errorLoggingService';
import { cn } from '@/lib/utils';

interface ErrorStatisticsCardsProps {
  statistics?: ErrorStatistics;
  isLoading: boolean;
  detailed?: boolean;
}

export const ErrorStatisticsCards: React.FC<ErrorStatisticsCardsProps> = ({
  statistics,
  isLoading,
  detailed = false,
}) => {
  const formatSeverityName = (severity: string) => {
    const severityNames = {
      [ErrorSeverity.CRITICAL]: 'بحرانی',
      [ErrorSeverity.HIGH]: 'بالا',
      [ErrorSeverity.MEDIUM]: 'متوسط',
      [ErrorSeverity.LOW]: 'پایین',
    };
    return severityNames[severity as ErrorSeverity] || severity;
  };

  const formatCategoryName = (category: string) => {
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case ErrorSeverity.LOW:
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = [
      'text-red-700 bg-red-100',
      'text-orange-700 bg-orange-100',
      'text-yellow-700 bg-yellow-100',
      'text-green-700 bg-green-100',
      'text-blue-700 bg-blue-100',
      'text-indigo-700 bg-indigo-100',
      'text-purple-700 bg-purple-100',
      'text-pink-700 bg-pink-100',
      'text-cyan-700 bg-cyan-100',
      'text-teal-700 bg-teal-100',
      'text-gray-700 bg-gray-100',
    ];
    
    // Simple hash function to consistently assign colors
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = ((hash << 5) - hash + category.charCodeAt(i)) & 0xffffffff;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} variant="professional">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-slate-600">آمار خطاها در دسترس نیست</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Errors */}
        <Card variant="gradient-blue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">کل خطاها</p>
                <p className="text-3xl font-bold text-blue-900">{statistics.total_errors.toLocaleString('fa-IR')}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Errors */}
        <Card variant="gradient-red">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">خطاهای بحرانی (24 ساعت)</p>
                <p className="text-3xl font-bold text-red-900">{statistics.recent_critical_errors.toLocaleString('fa-IR')}</p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unresolved Errors */}
        <Card variant="gradient-orange">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">خطاهای حل نشده</p>
                <p className="text-3xl font-bold text-orange-900">{statistics.unresolved_errors.toLocaleString('fa-IR')}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Rate */}
        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">نرخ حل مسئله</p>
                <p className="text-3xl font-bold text-green-900">
                  {statistics.total_errors > 0 
                    ? Math.round(((statistics.total_errors - statistics.unresolved_errors) / statistics.total_errors) * 100)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      {detailed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Breakdown */}
          <Card variant="professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                تفکیک بر اساس شدت
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(statistics.severity_breakdown)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', getSeverityColor(severity))}>
                          {formatSeverityName(severity)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">{(count as number).toLocaleString('fa-IR')}</span>
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                            style={{ 
                              width: `${statistics.total_errors > 0 ? ((count as number) / statistics.total_errors) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card variant="professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                تفکیک بر اساس دسته‌بندی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(statistics.category_breakdown)
                  .filter(([, count]) => (count as number) > 0)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 8) // Show top 8 categories
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('text-xs', getCategoryColor(category))}>
                          {formatCategoryName(category)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">{(count as number).toLocaleString('fa-IR')}</span>
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${statistics.total_errors > 0 ? ((count as number) / statistics.total_errors) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Error Endpoints */}
      {statistics.top_error_endpoints.length > 0 && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              مسیرهای پرخطا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.top_error_endpoints.slice(0, 10).map((endpoint: any, index: number) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-rose-600 rounded text-white text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-mono text-slate-700 truncate max-w-md">
                      {endpoint.endpoint}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {endpoint.count.toLocaleString('fa-IR')} خطا
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};