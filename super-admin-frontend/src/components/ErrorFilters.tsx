import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ErrorSeverity, ErrorCategory } from '@/services/errorLoggingService';
import { ErrorFilters as ErrorLogFilters } from '@/types/errorLogging';
import { DateRange } from 'react-day-picker';

interface ErrorFiltersProps {
  filters: ErrorLogFilters;
  onFiltersChange: (filters: Partial<ErrorLogFilters>) => void;
}

export const ErrorFilters: React.FC<ErrorFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState<Partial<ErrorLogFilters>>({
    search_term: filters.search_term || '',
    severity: filters.severity || undefined,
    category: filters.category || undefined,
    status_code: filters.status_code || undefined,
    endpoint: filters.endpoint || '',
    error_type: filters.error_type || '',
    is_resolved: filters.is_resolved,
    tenant_id: filters.tenant_id || '',
    user_id: filters.user_id || '',
  });

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (filters.start_date && filters.end_date) {
      return {
        from: new Date(filters.start_date),
        to: new Date(filters.end_date),
      };
    }
    return undefined;
  });

  const handleLocalFilterChange = (key: keyof ErrorLogFilters, value: any) => {
    setLocalFilters((prev: any) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setLocalFilters((prev: any) => ({
        ...prev,
        start_date: range.from!.toISOString(),
        end_date: range.to!.toISOString(),
      }));
    } else {
      setLocalFilters((prev: any) => ({
        ...prev,
        start_date: undefined,
        end_date: undefined,
      }));
    }
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search_term: '',
      severity: undefined,
      category: undefined,
      status_code: undefined,
      endpoint: '',
      error_type: '',
      is_resolved: undefined,
      tenant_id: '',
      user_id: '',
      start_date: undefined,
      end_date: undefined,
    };
    
    setLocalFilters(clearedFilters);
    setDateRange(undefined);
    onFiltersChange(clearedFilters);
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

  return (
    <div className="space-y-4">
      {/* First Row - Search and Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder="جستجو در پیام خطا..."
          value={localFilters.search_term || ''}
          onChange={(e) => handleLocalFilterChange('search_term', e.target.value)}
        />
        
        <Select 
          value={localFilters.severity || 'all'} 
          onValueChange={(value) => handleLocalFilterChange('severity', value === 'all' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="شدت خطا" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه سطوح</SelectItem>
            {Object.values(ErrorSeverity).map((severity) => (
              <SelectItem key={severity as string} value={severity as string}>
                {formatSeverityName(severity)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={localFilters.category || 'all'} 
          onValueChange={(value) => handleLocalFilterChange('category', value === 'all' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="دسته‌بندی" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌ها</SelectItem>
            {Object.values(ErrorCategory).map((category) => (
              <SelectItem key={category as string} value={category as string}>
                {formatCategoryName(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={localFilters.is_resolved === undefined ? 'all' : localFilters.is_resolved.toString()} 
          onValueChange={(value) => handleLocalFilterChange('is_resolved', value === 'all' ? undefined : value === 'true')}
        >
          <SelectTrigger>
            <SelectValue placeholder="وضعیت حل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="false">در انتظار حل</SelectItem>
            <SelectItem value="true">حل شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Second Row - Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder="مسیر API..."
          value={localFilters.endpoint || ''}
          onChange={(e) => handleLocalFilterChange('endpoint', e.target.value)}
        />
        
        <Input
          placeholder="نوع خطا..."
          value={localFilters.error_type || ''}
          onChange={(e) => handleLocalFilterChange('error_type', e.target.value)}
        />

        <Select 
          value={localFilters.status_code?.toString() || 'all'} 
          onValueChange={(value) => handleLocalFilterChange('status_code', value === 'all' ? undefined : parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="کد وضعیت HTTP" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه کدها</SelectItem>
            <SelectItem value="400">400 - Bad Request</SelectItem>
            <SelectItem value="401">401 - Unauthorized</SelectItem>
            <SelectItem value="403">403 - Forbidden</SelectItem>
            <SelectItem value="404">404 - Not Found</SelectItem>
            <SelectItem value="422">422 - Validation Error</SelectItem>
            <SelectItem value="500">500 - Internal Server Error</SelectItem>
            <SelectItem value="502">502 - Bad Gateway</SelectItem>
            <SelectItem value="503">503 - Service Unavailable</SelectItem>
          </SelectContent>
        </Select>

        <DatePickerWithRange
          date={dateRange}
          onDateChange={handleDateRangeChange}
          placeholder="بازه زمانی..."
        />
      </div>

      {/* Third Row - Tenant and User Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          placeholder="شناسه تنانت..."
          value={localFilters.tenant_id || ''}
          onChange={(e) => handleLocalFilterChange('tenant_id', e.target.value)}
        />
        
        <Input
          placeholder="شناسه کاربر..."
          value={localFilters.user_id || ''}
          onChange={(e) => handleLocalFilterChange('user_id', e.target.value)}
        />

        <div className="flex gap-2 lg:col-span-2">
          <Button 
            variant="gradient-blue" 
            onClick={handleApplyFilters}
            className="flex-1"
          >
            اعمال فیلترها
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearFilters}
          >
            پاک کردن
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {Object.values(localFilters).some(value => value !== undefined && value !== '') && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
          <span className="text-sm text-slate-600">فیلترهای فعال:</span>
          
          {localFilters.search_term && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              جستجو: {localFilters.search_term}
            </span>
          )}
          
          {localFilters.severity && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
              شدت: {formatSeverityName(localFilters.severity)}
            </span>
          )}
          
          {localFilters.category && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              دسته: {formatCategoryName(localFilters.category)}
            </span>
          )}
          
          {localFilters.is_resolved !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              وضعیت: {localFilters.is_resolved ? 'حل شده' : 'در انتظار'}
            </span>
          )}
          
          {localFilters.status_code && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
              کد: {localFilters.status_code}
            </span>
          )}
          
          {localFilters.endpoint && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded">
              مسیر: {localFilters.endpoint}
            </span>
          )}
          
          {dateRange?.from && dateRange?.to && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">
              تاریخ: {dateRange.from.toLocaleDateString('fa-IR')} - {dateRange.to.toLocaleDateString('fa-IR')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};