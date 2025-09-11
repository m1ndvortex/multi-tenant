/**
 * Online Users Filters Component
 * Provides filtering options for online users monitoring
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Filter, 
  X, 
  Search, 
  Building2, 
  Clock, 
  Users,
  RefreshCw
} from 'lucide-react';
import { OnlineUsersFilter } from '../../types/onlineUsers';

interface OnlineUsersFiltersProps {
  filters: OnlineUsersFilter;
  onFiltersChange: (filters: OnlineUsersFilter) => void;
  tenants: Array<{ id: string; name: string }>;
  onRefresh?: () => void;
  onClearFilters?: () => void;
  loading?: boolean;
  className?: string;
}

export const OnlineUsersFilters: React.FC<OnlineUsersFiltersProps> = ({
  filters,
  onFiltersChange,
  tenants,
  onRefresh,
  onClearFilters,
  loading = false,
  className = ''
}) => {
  const handleFilterChange = (key: keyof OnlineUsersFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
    onClearFilters?.();
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.tenant_id) count++;
    if (filters.is_online !== undefined) count++;
    if (filters.last_activity_minutes) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className={`bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600" />
            فیلترها
            {activeFiltersCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </Button>
            
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3" />
                پاک کردن
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tenant Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              تنانت
            </Label>
            <Select
              value={filters.tenant_id || ''}
              onValueChange={(value) => handleFilterChange('tenant_id', value)}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="همه تنانت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">همه تنانت‌ها</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Online Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              وضعیت
            </Label>
            <Select
              value={filters.is_online === undefined ? '' : filters.is_online.toString()}
              onValueChange={(value) => 
                handleFilterChange('is_online', value === '' ? undefined : value === 'true')
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">همه وضعیت‌ها</SelectItem>
                <SelectItem value="true">آنلاین</SelectItem>
                <SelectItem value="false">آفلاین</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Last Activity Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              آخرین فعالیت (دقیقه)
            </Label>
            <Select
              value={filters.last_activity_minutes?.toString() || ''}
              onValueChange={(value) => 
                handleFilterChange('last_activity_minutes', value === '' ? undefined : parseInt(value))
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="همه زمان‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">همه زمان‌ها</SelectItem>
                <SelectItem value="5">۵ دقیقه اخیر</SelectItem>
                <SelectItem value="15">۱۵ دقیقه اخیر</SelectItem>
                <SelectItem value="30">۳۰ دقیقه اخیر</SelectItem>
                <SelectItem value="60">۱ ساعت اخیر</SelectItem>
                <SelectItem value="180">۳ ساعت اخیر</SelectItem>
                <SelectItem value="360">۶ ساعت اخیر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Limit */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Search className="h-4 w-4" />
              تعداد نتایج
            </Label>
            <Select
              value={filters.limit?.toString() || '50'}
              onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">۲۵</SelectItem>
                <SelectItem value="50">۵۰</SelectItem>
                <SelectItem value="100">۱۰۰</SelectItem>
                <SelectItem value="200">۲۰۰</SelectItem>
                <SelectItem value="500">۵۰۰</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">فیلترهای فعال:</span>
              
              {filters.tenant_id && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  تنانت: {tenants.find(t => t.id === filters.tenant_id)?.name || 'نامشخص'}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-blue-200"
                    onClick={() => handleFilterChange('tenant_id', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {filters.is_online !== undefined && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  وضعیت: {filters.is_online ? 'آنلاین' : 'آفلاین'}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-green-200"
                    onClick={() => handleFilterChange('is_online', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {filters.last_activity_minutes && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  فعالیت: {filters.last_activity_minutes} دقیقه
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-purple-200"
                    onClick={() => handleFilterChange('last_activity_minutes', undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnlineUsersFilters;