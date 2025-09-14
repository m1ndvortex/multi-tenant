import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 0 10px rgba(0,212,255,0.4)",
                  "0 0 20px rgba(0,212,255,0.6)",
                  "0 0 10px rgba(0,212,255,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30"
            >
              <Filter className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
            </motion.div>
            <h3 className="font-semibold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              فیلترهای جستجو
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <label className="text-sm font-medium text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                جستجو
              </label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ایمیل یا نام کاربر..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pr-10 backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-white placeholder:text-gray-400 focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-300"
                />
              </div>
            </motion.div>

            {/* Tenant */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <label className="text-sm font-medium text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                تنانت
              </label>
              <Select
                value={filters.tenant_id || 'all'}
                onValueChange={(value) => handleFilterChange('tenant_id', value)}
              >
                <SelectTrigger className="backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-white focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-300">
                  <SelectValue placeholder="همه تنانت‌ها" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-[20px] bg-gray-900/90 border-white/[0.08]">
                  <SelectItem value="all" className="text-white hover:bg-white/[0.05]">همه تنانت‌ها</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id} className="text-white hover:bg-white/[0.05]">
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Role */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <label className="text-sm font-medium text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                نقش
              </label>
              <Select
                value={filters.role || 'all'}
                onValueChange={(value) => handleFilterChange('role', value)}
              >
                <SelectTrigger className="backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-white focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-300">
                  <SelectValue placeholder="همه نقش‌ها" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-[20px] bg-gray-900/90 border-white/[0.08]">
                  <SelectItem value="all" className="text-white hover:bg-white/[0.05]">همه نقش‌ها</SelectItem>
                  <SelectItem value="admin" className="text-white hover:bg-white/[0.05]">مدیر</SelectItem>
                  <SelectItem value="manager" className="text-white hover:bg-white/[0.05]">مدیر کل</SelectItem>
                  <SelectItem value="user" className="text-white hover:bg-white/[0.05]">کاربر</SelectItem>
                  <SelectItem value="accountant" className="text-white hover:bg-white/[0.05]">حسابدار</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Status */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <label className="text-sm font-medium text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">
                وضعیت
              </label>
              <Select
                value={filters.is_active || 'all'}
                onValueChange={(value) => handleFilterChange('is_active', value)}
              >
                <SelectTrigger className="backdrop-blur-[16px] bg-white/[0.05] border-white/[0.08] text-white focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all duration-300">
                  <SelectValue placeholder="همه وضعیت‌ها" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-[20px] bg-gray-900/90 border-white/[0.08]">
                  <SelectItem value="all" className="text-white hover:bg-white/[0.05]">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="true" className="text-white hover:bg-white/[0.05]">فعال</SelectItem>
                  <SelectItem value="false" className="text-white hover:bg-white/[0.05]">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          </div>

          {/* Reset Button */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex justify-end mt-6"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="sm"
                    onClick={onReset}
                    className="backdrop-blur-[16px] bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 text-orange-400 hover:bg-gradient-to-r hover:from-orange-500/30 hover:to-red-500/30 hover:border-orange-400/50 hover:shadow-[0_0_20px_rgba(255,107,53,0.4)] transition-all duration-300 flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    پاک کردن فیلترها
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserFilters;