/**
 * Online Users Filters Component - Cybersecurity Theme
 * Provides filtering options for online users monitoring with cybersecurity styling
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
// import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  X, 
  Search, 
  Building2, 
  Clock, 
  Users,
  RefreshCw,
  Shield,
  Zap
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <motion.div
                animate={{ 
                  filter: [
                    "drop-shadow(0 0 0px rgba(0,212,255,0.6))",
                    "drop-shadow(0 0 15px rgba(0,212,255,0.8))",
                    "drop-shadow(0 0 0px rgba(0,212,255,0.6))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className="h-5 w-5 text-cyan-400" />
              </motion.div>
              <span className="text-cyan-400">فیلترها</span>
              <AnimatePresence>
                {activeFiltersCount > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-400/30 backdrop-blur-sm">
                      {activeFiltersCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className="h-8 bg-white/5 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  بروزرسانی
                </Button>
              </motion.div>
              
              <AnimatePresence>
                {activeFiltersCount > 0 && (
                  <motion.div 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-8 bg-white/5 border-red-400/30 text-red-400 hover:bg-red-400/10 hover:border-red-400/50 hover:text-red-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,71,87,0.3)]"
                    >
                      <X className="h-3 w-3" />
                      پاک کردن
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Tenant Filter */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Building2 className="h-4 w-4 text-emerald-400" />
                </motion.div>
                <span className="text-emerald-400">تنانت</span>
              </Label>
              <Select
                value={filters.tenant_id || ''}
                onValueChange={(value) => handleFilterChange('tenant_id', value)}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white backdrop-blur-sm hover:bg-white/10 hover:border-emerald-400/30 transition-all duration-300">
                  <SelectValue placeholder="همه تنانت‌ها" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-white/10 backdrop-blur-sm">
                  <SelectItem value="" className="text-gray-300 hover:bg-white/10">همه تنانت‌ها</SelectItem>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id} className="text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-400">
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Online Status Filter */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 0px rgba(0,255,136,0.4)",
                      "0 0 15px rgba(0,255,136,0.6)",
                      "0 0 0px rgba(0,255,136,0.4)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Users className="h-4 w-4 text-orange-400" />
                </motion.div>
                <span className="text-orange-400">وضعیت</span>
              </Label>
              <Select
                value={filters.is_online === undefined ? '' : filters.is_online.toString()}
                onValueChange={(value) => 
                  handleFilterChange('is_online', value === '' ? undefined : value === 'true')
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white backdrop-blur-sm hover:bg-white/10 hover:border-orange-400/30 transition-all duration-300">
                  <SelectValue placeholder="همه وضعیت‌ها" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-white/10 backdrop-blur-sm">
                  <SelectItem value="" className="text-gray-300 hover:bg-white/10">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="true" className="text-gray-300 hover:bg-emerald-500/10 hover:text-emerald-400">آنلاین</SelectItem>
                  <SelectItem value="false" className="text-gray-300 hover:bg-red-500/10 hover:text-red-400">آفلاین</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Last Activity Filter */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="h-4 w-4 text-purple-400" />
                </motion.div>
                <span className="text-purple-400">آخرین فعالیت (دقیقه)</span>
              </Label>
              <Select
                value={filters.last_activity_minutes?.toString() || ''}
                onValueChange={(value) => 
                  handleFilterChange('last_activity_minutes', value === '' ? undefined : parseInt(value))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white backdrop-blur-sm hover:bg-white/10 hover:border-purple-400/30 transition-all duration-300">
                  <SelectValue placeholder="همه زمان‌ها" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-white/10 backdrop-blur-sm">
                  <SelectItem value="" className="text-gray-300 hover:bg-white/10">همه زمان‌ها</SelectItem>
                  <SelectItem value="5" className="text-gray-300 hover:bg-purple-500/10 hover:text-purple-400">۵ دقیقه اخیر</SelectItem>
                  <SelectItem value="15" className="text-gray-300 hover:bg-purple-500/10 hover:text-purple-400">۱۵ دقیقه اخیر</SelectItem>
                  <SelectItem value="30" className="text-gray-300 hover:bg-purple-500/10 hover:text-purple-400">۳۰ دقیقه اخیر</SelectItem>
                  <SelectItem value="60" className="text-gray-300 hover:bg-purple-500/10 hover:text-purple-400">۱ ساعت اخیر</SelectItem>
                  <SelectItem value="180" className="text-gray-300 hover:bg-purple-500/10 hover:text-purple-400">۳ ساعت اخیر</SelectItem>
                  <SelectItem value="360" className="text-gray-300 hover:bg-purple-500/10 hover:text-purple-400">۶ ساعت اخیر</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Results Limit */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <motion.div
                  animate={{ 
                    filter: [
                      "drop-shadow(0 0 0px rgba(0,212,255,0.4))",
                      "drop-shadow(0 0 10px rgba(0,212,255,0.6))",
                      "drop-shadow(0 0 0px rgba(0,212,255,0.4))"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Search className="h-4 w-4 text-cyan-400" />
                </motion.div>
                <span className="text-cyan-400">تعداد نتایج</span>
              </Label>
              <Select
                value={filters.limit?.toString() || '50'}
                onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white backdrop-blur-sm hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D29] border-white/10 backdrop-blur-sm">
                  <SelectItem value="25" className="text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400">۲۵</SelectItem>
                  <SelectItem value="50" className="text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400">۵۰</SelectItem>
                  <SelectItem value="100" className="text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400">۱۰۰</SelectItem>
                  <SelectItem value="200" className="text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400">۲۰۰</SelectItem>
                  <SelectItem value="500" className="text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400">۵۰۰</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
          </motion.div>

          {/* Active Filters Summary */}
          <AnimatePresence>
            {activeFiltersCount > 0 && (
              <motion.div 
                className="pt-3 border-t border-white/10"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    فیلترهای فعال:
                  </span>
                  
                  <AnimatePresence>
                    {filters.tenant_id && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-400/30 backdrop-blur-sm">
                          تنانت: {tenants.find(t => t.id === filters.tenant_id)?.name || 'نامشخص'}
                          <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1 hover:bg-emerald-400/20 text-emerald-400"
                              onClick={() => handleFilterChange('tenant_id', undefined)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <AnimatePresence>
                    {filters.is_online !== undefined && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Badge className={`${filters.is_online ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-400/30' : 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border-red-400/30'} backdrop-blur-sm`}>
                          وضعیت: {filters.is_online ? 'آنلاین' : 'آفلاین'}
                          <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-4 w-4 p-0 ml-1 ${filters.is_online ? 'hover:bg-emerald-400/20 text-emerald-400' : 'hover:bg-red-400/20 text-red-400'}`}
                              onClick={() => handleFilterChange('is_online', undefined)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <AnimatePresence>
                    {filters.last_activity_minutes && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Badge className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-400 border-purple-400/30 backdrop-blur-sm">
                          فعالیت: {filters.last_activity_minutes} دقیقه
                          <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1 hover:bg-purple-400/20 text-purple-400"
                              onClick={() => handleFilterChange('last_activity_minutes', undefined)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OnlineUsersFilters;