import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { TenantFilters } from '@/types/tenant';

interface TenantFiltersProps {
  filters: TenantFilters;
  onFiltersChange: (filters: TenantFilters) => void;
  onClearFilters: () => void;
}

const TenantFiltersComponent: React.FC<TenantFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleFilterChange = (key: keyof TenantFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? '' : value,
    });
  };

  const hasActiveFilters = filters.search || filters.subscription_type || filters.is_active;

  return (
    <Card variant="filter">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label htmlFor="search-input" className="text-sm font-medium text-slate-700">جستجو</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="search-input"
                type="text"
                placeholder="نام تنانت یا دامنه..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="subscription-type-select" className="text-sm font-medium text-slate-700">نوع اشتراک</label>
            <Select
              value={filters.subscription_type}
              onValueChange={(value) => handleFilterChange('subscription_type', value)}
            >
              <SelectTrigger id="subscription-type-select">
                <SelectValue placeholder="همه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="free">رایگان</SelectItem>
                <SelectItem value="pro">حرفه‌ای</SelectItem>
                <SelectItem value="pending_payment">در انتظار پرداخت</SelectItem>
                <SelectItem value="expired">منقضی شده</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status-select" className="text-sm font-medium text-slate-700">وضعیت</label>
            <Select
              value={filters.is_active}
              onValueChange={(value) => handleFilterChange('is_active', value)}
            >
              <SelectTrigger id="status-select">
                <SelectValue placeholder="همه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="true">فعال</SelectItem>
                <SelectItem value="false">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                پاک کردن
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TenantFiltersComponent;