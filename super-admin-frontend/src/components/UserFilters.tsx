import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { UserFilters as UserFiltersType } from '@/types/impersonation';

interface UserFiltersProps {
  filters: Partial<UserFiltersType>;
  onFiltersChange: (filters: Partial<UserFiltersType>) => void;
  onReset: () => void;
  tenants?: Array<{ id: string; name: string }>;
}

const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  tenants = [],
}) => {
  const handleFilterChange = (key: keyof UserFiltersType, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? '' : value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== '');

  return (
    <Card variant="filter">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-slate-600" />
          <h3 className="font-medium text-slate-900">فیلترهای جستجو</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              جستجو
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ایمیل یا نام کاربر..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Tenant */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              تنانت
            </label>
            <Select
              value={filters.tenant_id || 'all'}
              onValueChange={(value) => handleFilterChange('tenant_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="همه تنانت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه تنانت‌ها</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              نقش
            </label>
            <Select
              value={filters.role || 'all'}
              onValueChange={(value) => handleFilterChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="همه نقش‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه نقش‌ها</SelectItem>
                <SelectItem value="admin">مدیر</SelectItem>
                <SelectItem value="manager">مدیر کل</SelectItem>
                <SelectItem value="user">کاربر</SelectItem>
                <SelectItem value="accountant">حسابدار</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              وضعیت
            </label>
            <Select
              value={filters.is_active || 'all'}
              onValueChange={(value) => handleFilterChange('is_active', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="همه وضعیت‌ها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="true">فعال</SelectItem>
                <SelectItem value="false">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              پاک کردن فیلترها
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserFilters;