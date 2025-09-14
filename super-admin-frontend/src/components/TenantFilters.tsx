import React from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { TenantFilters } from '@/types/tenant';
import { CyberCard } from '@/components/animations/CyberAnimations';

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
    <CyberCard 
      variant="primary" 
      glowIntensity="low"
      className="
        backdrop-blur-[20px] saturate-[180%] 
        bg-gradient-to-br from-white/[0.05] to-white/[0.02] 
        border border-white/[0.08] rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
        hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,212,255,0.1)]
        transition-all duration-300
      "
    >
      <CardContent className="p-6">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, staggerChildren: 0.1 }}
        >
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label htmlFor="search-input" className="text-sm font-medium text-[#B8BCC8] block">
              جستجو
            </label>
            <div className="relative">
              <motion.div
                animate={{ 
                  color: filters.search ? "#00D4FF" : "#6B7280"
                }}
                transition={{ duration: 0.2 }}
              >
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 z-10" />
              </motion.div>
              <Input
                id="search-input"
                type="text"
                placeholder="نام تنانت یا دامنه..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="
                  pr-10 backdrop-blur-[16px] saturate-[150%]
                  bg-white/[0.03] border border-white/[0.06] rounded-xl
                  text-white placeholder:text-[#6B7280]
                  focus:border-[#00D4FF]/30 focus:shadow-[0_0_15px_rgba(0,212,255,0.2)]
                  hover:bg-white/[0.05] hover:border-white/[0.08]
                  transition-all duration-300
                "
              />
            </div>
          </motion.div>

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label htmlFor="subscription-type-select" className="text-sm font-medium text-[#B8BCC8] block">
              نوع اشتراک
            </label>
            <Select
              value={filters.subscription_type}
              onValueChange={(value) => handleFilterChange('subscription_type', value)}
            >
              <SelectTrigger 
                id="subscription-type-select"
                className="
                  backdrop-blur-[16px] saturate-[150%]
                  bg-white/[0.03] border border-white/[0.06] rounded-xl
                  text-white hover:bg-white/[0.05] hover:border-white/[0.08]
                  focus:border-[#00FF88]/30 focus:shadow-[0_0_15px_rgba(0,255,136,0.2)]
                  transition-all duration-300
                "
              >
                <SelectValue placeholder="همه" />
              </SelectTrigger>
              <SelectContent className="
                backdrop-blur-[20px] saturate-[180%]
                bg-[#1A1D29]/95 border border-white/[0.08] rounded-xl
                shadow-[0_16px_48px_rgba(0,0,0,0.5)]
              ">
                <SelectItem value="all" className="text-white hover:bg-white/[0.05]">همه</SelectItem>
                <SelectItem value="free" className="text-white hover:bg-white/[0.05]">رایگان</SelectItem>
                <SelectItem value="pro" className="text-white hover:bg-white/[0.05]">حرفه‌ای</SelectItem>
                <SelectItem value="pending_payment" className="text-white hover:bg-white/[0.05]">در انتظار پرداخت</SelectItem>
                <SelectItem value="expired" className="text-white hover:bg-white/[0.05]">منقضی شده</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label htmlFor="status-select" className="text-sm font-medium text-[#B8BCC8] block">
              وضعیت
            </label>
            <Select
              value={filters.is_active}
              onValueChange={(value) => handleFilterChange('is_active', value)}
            >
              <SelectTrigger 
                id="status-select"
                className="
                  backdrop-blur-[16px] saturate-[150%]
                  bg-white/[0.03] border border-white/[0.06] rounded-xl
                  text-white hover:bg-white/[0.05] hover:border-white/[0.08]
                  focus:border-[#A55EEA]/30 focus:shadow-[0_0_15px_rgba(165,94,234,0.2)]
                  transition-all duration-300
                "
              >
                <SelectValue placeholder="همه" />
              </SelectTrigger>
              <SelectContent className="
                backdrop-blur-[20px] saturate-[180%]
                bg-[#1A1D29]/95 border border-white/[0.08] rounded-xl
                shadow-[0_16px_48px_rgba(0,0,0,0.5)]
              ">
                <SelectItem value="all" className="text-white hover:bg-white/[0.05]">همه</SelectItem>
                <SelectItem value="true" className="text-white hover:bg-white/[0.05]">فعال</SelectItem>
                <SelectItem value="false" className="text-white hover:bg-white/[0.05]">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div 
            className="flex gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            {hasActiveFilters && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  className="
                    flex items-center gap-2 backdrop-blur-[16px] saturate-[150%]
                    bg-white/[0.03] border border-[#FF4757]/30 rounded-xl
                    text-[#FF4757] hover:bg-[#FF4757]/10 hover:border-[#FF4757]/50
                    hover:shadow-[0_0_15px_rgba(255,71,87,0.2)]
                    transition-all duration-300
                  "
                >
                  <X className="h-4 w-4" />
                  پاک کردن
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </CardContent>
    </CyberCard>
  );
};

export default TenantFiltersComponent;