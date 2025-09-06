import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ErrorLogTable } from '@/components/ErrorLogTable';
import { ErrorDetailModal } from '@/components/ErrorDetailModal';
import { ErrorTrendsChart } from '@/components/ErrorTrendsChart';
import { ErrorStatisticsCards } from '@/components/ErrorStatisticsCards';
import { CriticalErrorsAlert } from '@/components/CriticalErrorsAlert';
import { ErrorFilters } from '@/components/ErrorFilters';
import { BulkErrorActions } from '@/components/BulkErrorActions';
import { 
  useErrorLogs, 
  useErrorStatistics, 
  useErrorTrends, 
  useCriticalErrors,
  useErrorLoggingHealth 
} from '@/hooks/useErrorLogging';
import { ErrorLogFilters } from '@/services/errorLoggingService';
import { cn } from '@/lib/utils';

const ErrorLogging: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<ErrorLogFilters>({
    skip: 0,
    limit: 50,
    order_by: 'created_at',
    order_desc: true,
  });
  const [selectedErrorIds, setSelectedErrorIds] = useState<string[]>([]);
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);

  // Data fetching
  const { data: errorLogs, isLoading: isLoadingErrors, error: errorLogsError } = useErrorLogs(filters);
  const { data: statistics, isLoading: isLoadingStats } = useErrorStatistics();
  const { data: trends, isLoading: isLoadingTrends } = useErrorTrends(7);
  const { data: criticalErrors, isLoading: isLoadingCritical } = useCriticalErrors(24);
  const { data: healthStatus } = useErrorLoggingHealth();

  const handleFilterChange = (newFilters: Partial<ErrorLogFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      skip: 0, // Reset pagination when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      skip: page * (prev.limit || 50),
    }));
  };

  const handleErrorSelect = (errorId: string, selected: boolean) => {
    setSelectedErrorIds(prev => 
      selected 
        ? [...prev, errorId]
        : prev.filter(id => id !== errorId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected && errorLogs?.errors) {
      setSelectedErrorIds(errorLogs.errors.map(error => error.id));
    } else {
      setSelectedErrorIds([]);
    }
  };

  const handleErrorClick = (errorId: string) => {
    setSelectedErrorId(errorId);
  };

  const handleCloseModal = () => {
    setSelectedErrorId(null);
  };

  if (errorLogsError) {
    return (
      <div className="p-6">
        <Card variant="professional">
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
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">مدیریت خطاهای API</h1>
          <p className="text-slate-600 mt-1">
            نظارت و مدیریت خطاهای سیستم با امکانات پیشرفته تحلیل و حل مسئله
          </p>
        </div>
        
        {/* Health Status Badge */}
        {healthStatus && (
          <Badge 
            variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}
            className="text-sm"
          >
            {healthStatus.status === 'healthy' ? 'سیستم سالم' : 'مشکل در سیستم'}
          </Badge>
        )}
      </div>

      {/* Critical Errors Alert */}
      <CriticalErrorsAlert 
        criticalErrors={criticalErrors || []}
        isLoading={isLoadingCritical}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
            نمای کلی
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
            لاگ خطاها
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
            تحلیل روند
          </TabsTrigger>
          <TabsTrigger value="statistics" className="data-[state=active]:bg-white data-[state=active]:shadow-md">
            آمار تفصیلی
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <ErrorStatisticsCards 
            statistics={statistics}
            isLoading={isLoadingStats}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  روند خطاها (7 روز گذشته)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorTrendsChart 
                  trends={trends}
                  isLoading={isLoadingTrends}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  خطاهای اخیر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ErrorLogTable
                  errorLogs={errorLogs?.errors.slice(0, 5) || []}
                  isLoading={isLoadingErrors}
                  onErrorClick={handleErrorClick}
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Error Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card variant="filter">
            <CardContent className="p-4">
              <ErrorFilters
                filters={filters}
                onFiltersChange={handleFilterChange}
              />
            </CardContent>
          </Card>

          {selectedErrorIds.length > 0 && (
            <BulkErrorActions
              selectedErrorIds={selectedErrorIds}
              onActionComplete={() => setSelectedErrorIds([])}
            />
          )}

          <Card variant="professional">
            <CardContent className="p-0">
              <ErrorLogTable
                errorLogs={errorLogs?.errors || []}
                isLoading={isLoadingErrors}
                total={errorLogs?.total || 0}
                currentPage={Math.floor((filters.skip || 0) / (filters.limit || 50))}
                pageSize={filters.limit || 50}
                onPageChange={handlePageChange}
                onErrorClick={handleErrorClick}
                selectedErrorIds={selectedErrorIds}
                onErrorSelect={handleErrorSelect}
                onSelectAll={handleSelectAll}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card variant="professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                تحلیل روند خطاها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorTrendsChart 
                trends={trends}
                isLoading={isLoadingTrends}
                height={400}
                detailed={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-6">
          <ErrorStatisticsCards 
            statistics={statistics}
            isLoading={isLoadingStats}
            detailed={true}
          />
        </TabsContent>
      </Tabs>

      {/* Error Detail Modal */}
      {selectedErrorId && (
        <ErrorDetailModal
          errorId={selectedErrorId}
          isOpen={!!selectedErrorId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default ErrorLogging;