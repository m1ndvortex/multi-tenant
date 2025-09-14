/**
 * Error Filters Panel Component - Cybersecurity Theme
 * Provides filtering controls with cybersecurity aesthetics and glassmorphism effects
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { 
  Filter, 
  X, 
  Clock,
  AlertTriangle,
  Server
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ErrorFilters, ErrorSeverity, ErrorCategory, ErrorStatistics } from '../../types/errorLogging';
import { glassmorphismClasses, neonClasses } from '../../lib/theme/cybersecurity';

interface ErrorFiltersPanelProps {
  filters: ErrorFilters;
  onFiltersChange: (filters: Partial<ErrorFilters>) => void;
  statistics?: ErrorStatistics | null;
  className?: string;
}

const ErrorFiltersPanel: React.FC<ErrorFiltersPanelProps> = ({
  filters,
  onFiltersChange,
  statistics,
  className
}) => {
  const [localFilters, setLocalFilters] = useState<ErrorFilters>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * Handle filter change
   */
  const handleFilterChange = (key: keyof ErrorFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange({ [key]: value });
  };

  /**
   * Clear all filters
   */
  const clearAllFilters = () => {
    const defaultFilters: ErrorFilters = {
      hours_back: 24,
      limit: 50
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  /**
   * Apply quick filter presets
   */
  const applyQuickFilter = (preset: string) => {
    let newFilters: Partial<ErrorFilters> = {};

    switch (preset) {
      case 'critical-only':
        newFilters = { severity: ErrorSeverity.CRITICAL };
        break;
      case 'last-hour':
        newFilters = { hours_back: 1 };
        break;
      case 'last-24h':
        newFilters = { hours_back: 24 };
        break;
      case 'high-frequency':
        // This would need backend support for occurrence count filtering
        break;
      case 'api-errors':
        newFilters = { category: ErrorCategory.API };
        break;
      case 'database-errors':
        newFilters = { category: ErrorCategory.DATABASE };
        break;
    }

    const updatedFilters = { ...localFilters, ...newFilters };
    setLocalFilters(updatedFilters);
    onFiltersChange(newFilters);
  };

  /**
   * Get active filters count
   */
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (localFilters.tenant_id) count++;
    if (localFilters.severity) count++;
    if (localFilters.category) count++;
    if (localFilters.endpoint) count++;
    if (localFilters.error_type) count++;
    if (localFilters.hours_back !== 24) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(`${glassmorphismClasses.card} h-fit`, className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Filter className={`h-4 w-4 ${neonClasses.text.primary}`} />
              </motion.div>
              <span className="text-white">Filters</span>
              {activeFiltersCount > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Badge className={`text-xs bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 ${neonClasses.glow.primary}`}>
                    {activeFiltersCount}
                  </Badge>
                </motion.div>
              )}
            </span>
            {activeFiltersCount > 0 && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className={`h-auto p-1 ${glassmorphismClasses.base} border-[#FF4757]/30 text-[#FF4757] hover:bg-[#FF4757]/10`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          </CardTitle>
        </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Filter Presets */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Quick Filters</Label>
          <div className="grid grid-cols-1 gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickFilter('critical-only')}
                className={`justify-start text-xs ${glassmorphismClasses.base} border-[#FF4757]/30 text-[#FF4757] hover:bg-[#FF4757]/10 hover:border-[#FF4757]/50`}
              >
                <AlertTriangle className="h-3 w-3 mr-2" />
                Critical Only
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickFilter('last-hour')}
                className={`justify-start text-xs ${glassmorphismClasses.base} border-[#FFB800]/30 text-[#FFB800] hover:bg-[#FFB800]/10 hover:border-[#FFB800]/50`}
              >
                <Clock className="h-3 w-3 mr-2" />
                Last Hour
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickFilter('api-errors')}
                className={`justify-start text-xs ${glassmorphismClasses.base} border-[#5352ED]/30 text-[#5352ED] hover:bg-[#5352ED]/10 hover:border-[#5352ED]/50`}
              >
                <Server className="h-3 w-3 mr-2" />
                API Errors
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Time Range */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">
            Time Range: <span className={neonClasses.text.numbers}>{localFilters.hours_back}</span> hours
          </Label>
          <div className="relative">
            <Slider
              value={[localFilters.hours_back]}
              onValueChange={([value]) => handleFilterChange('hours_back', value)}
              max={168} // 7 days
              min={1}
              step={1}
              className="w-full [&_[role=slider]]:bg-[#00D4FF] [&_[role=slider]]:border-[#00D4FF] [&_[role=slider]]:shadow-[0_0_10px_rgba(0,212,255,0.5)] [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-[#00D4FF] [&_.bg-primary]:to-[#00FF88]"
            />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ 
                boxShadow: [
                  '0 0 5px rgba(0, 212, 255, 0.3)',
                  '0 0 15px rgba(0, 212, 255, 0.6)',
                  '0 0 5px rgba(0, 212, 255, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#6B7280] mt-1 font-mono">
            <span className="text-[#00D4FF]">1h</span>
            <span className="text-[#00FF88]">7d</span>
          </div>
        </motion.div>

        {/* Severity Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Severity</Label>
          <Select
            value={localFilters.severity || 'all'}
            onValueChange={(value) => 
              handleFilterChange('severity', value === 'all' ? undefined : value as ErrorSeverity)
            }
          >
            <SelectTrigger className={`${glassmorphismClasses.base} border-white/10 text-white hover:border-[#00D4FF]/30`}>
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent className={`${glassmorphismClasses.elevated} border-white/10 bg-[#1A1D29]`}>
              <SelectItem value="all" className="text-white hover:bg-white/10">All Severities</SelectItem>
              <SelectItem value={ErrorSeverity.CRITICAL} className="text-white hover:bg-[#FF4757]/10">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-2 h-2 bg-[#FF4757] rounded-full"
                    animate={{ 
                      boxShadow: [
                        '0 0 5px rgba(255, 71, 87, 0.5)',
                        '0 0 15px rgba(255, 71, 87, 0.8)',
                        '0 0 5px rgba(255, 71, 87, 0.5)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[#FF4757]">Critical</span>
                </div>
              </SelectItem>
              <SelectItem value={ErrorSeverity.HIGH} className="text-white hover:bg-[#FFB800]/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#FFB800] rounded-full shadow-[0_0_8px_rgba(255,184,0,0.6)]"></div>
                  <span className="text-[#FFB800]">High</span>
                </div>
              </SelectItem>
              <SelectItem value={ErrorSeverity.MEDIUM} className="text-white hover:bg-[#00D4FF]/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00D4FF] rounded-full shadow-[0_0_8px_rgba(0,212,255,0.6)]"></div>
                  <span className="text-[#00D4FF]">Medium</span>
                </div>
              </SelectItem>
              <SelectItem value={ErrorSeverity.LOW} className="text-white hover:bg-[#5352ED]/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#5352ED] rounded-full shadow-[0_0_8px_rgba(83,82,237,0.6)]"></div>
                  <span className="text-[#5352ED]">Low</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Category</Label>
          <Select
            value={localFilters.category || 'all'}
            onValueChange={(value) => 
              handleFilterChange('category', value === 'all' ? undefined : value as ErrorCategory)
            }
          >
            <SelectTrigger className={`${glassmorphismClasses.base} border-white/10 text-white hover:border-[#00FF88]/30`}>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className={`${glassmorphismClasses.elevated} border-white/10 bg-[#1A1D29]`}>
              <SelectItem value="all" className="text-white hover:bg-white/10">All Categories</SelectItem>
              <SelectItem value={ErrorCategory.SYSTEM} className="text-[#A55EEA] hover:bg-[#A55EEA]/10">System</SelectItem>
              <SelectItem value={ErrorCategory.DATABASE} className="text-[#00FF88] hover:bg-[#00FF88]/10">Database</SelectItem>
              <SelectItem value={ErrorCategory.API} className="text-[#00D4FF] hover:bg-[#00D4FF]/10">API</SelectItem>
              <SelectItem value={ErrorCategory.AUTHENTICATION} className="text-[#FFB800] hover:bg-[#FFB800]/10">Authentication</SelectItem>
              <SelectItem value={ErrorCategory.AUTHORIZATION} className="text-[#FF6B35] hover:bg-[#FF6B35]/10">Authorization</SelectItem>
              <SelectItem value={ErrorCategory.VALIDATION} className="text-[#5352ED] hover:bg-[#5352ED]/10">Validation</SelectItem>
              <SelectItem value={ErrorCategory.BUSINESS_LOGIC} className="text-[#00D4FF] hover:bg-[#00D4FF]/10">Business Logic</SelectItem>
              <SelectItem value={ErrorCategory.EXTERNAL_SERVICE} className="text-[#FF4757] hover:bg-[#FF4757]/10">External Service</SelectItem>
              <SelectItem value={ErrorCategory.PERFORMANCE} className="text-[#FFB800] hover:bg-[#FFB800]/10">Performance</SelectItem>
              <SelectItem value={ErrorCategory.SECURITY} className="text-[#FF4757] hover:bg-[#FF4757]/10">Security</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Advanced Filters Toggle */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Label className="text-sm font-medium text-[#B8BCC8]">Advanced Filters</Label>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Switch
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
              className="data-[state=checked]:bg-[#00D4FF] data-[state=unchecked]:bg-white/20"
            />
          </motion.div>
        </motion.div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              className="space-y-4 pt-2 border-t border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Tenant ID Filter */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Tenant ID</Label>
                <Input
                  placeholder="Filter by tenant ID..."
                  value={localFilters.tenant_id || ''}
                  onChange={(e) => handleFilterChange('tenant_id', e.target.value || undefined)}
                  className={`${glassmorphismClasses.base} border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#A55EEA]/50 focus:ring-[#A55EEA]/20`}
                />
              </motion.div>

              {/* Endpoint Filter */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Endpoint</Label>
                <Input
                  placeholder="Filter by endpoint..."
                  value={localFilters.endpoint || ''}
                  onChange={(e) => handleFilterChange('endpoint', e.target.value || undefined)}
                  className={`${glassmorphismClasses.base} border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#00D4FF]/50 focus:ring-[#00D4FF]/20 font-mono`}
                />
              </motion.div>

              {/* Error Type Filter */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Error Type</Label>
                <Input
                  placeholder="Filter by error type..."
                  value={localFilters.error_type || ''}
                  onChange={(e) => handleFilterChange('error_type', e.target.value || undefined)}
                  className={`${glassmorphismClasses.base} border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#FF6B35]/50 focus:ring-[#FF6B35]/20`}
                />
              </motion.div>

              {/* Results Limit */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">
                  Results Limit: <span className={neonClasses.text.numbers}>{localFilters.limit}</span>
                </Label>
                <div className="relative">
                  <Slider
                    value={[localFilters.limit]}
                    onValueChange={([value]) => handleFilterChange('limit', value)}
                    max={100}
                    min={10}
                    step={10}
                    className="w-full [&_[role=slider]]:bg-[#00FF88] [&_[role=slider]]:border-[#00FF88] [&_[role=slider]]:shadow-[0_0_10px_rgba(0,255,136,0.5)] [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-[#00FF88] [&_.bg-primary]:to-[#00D4FF]"
                  />
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ 
                      boxShadow: [
                        '0 0 5px rgba(0, 255, 136, 0.3)',
                        '0 0 15px rgba(0, 255, 136, 0.6)',
                        '0 0 5px rgba(0, 255, 136, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#6B7280] mt-1 font-mono">
                  <span className="text-[#00FF88]">10</span>
                  <span className="text-[#00D4FF]">100</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Statistics Summary */}
        {statistics && (
          <motion.div 
            className="pt-4 border-t border-white/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Current Statistics</Label>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Active Errors:</span>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge className={`text-xs bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`}>
                    {statistics.active_errors_count}
                  </Badge>
                </motion.div>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Total Errors:</span>
                <Badge className="text-xs bg-white/10 text-[#B8BCC8] border border-white/20">
                  {statistics.total_errors}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Error Rate:</span>
                <Badge className={`text-xs bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30 ${neonClasses.glow.warning}`}>
                  {statistics.error_rate_per_minute.toFixed(1)}/min
                </Badge>
              </div>
              {statistics.system_health_score && (
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Health Score:</span>
                  <motion.div
                    animate={{ 
                      boxShadow: statistics.system_health_score > 80 
                        ? ['0 0 5px rgba(0, 255, 136, 0.3)', '0 0 15px rgba(0, 255, 136, 0.6)', '0 0 5px rgba(0, 255, 136, 0.3)']
                        : ['0 0 5px rgba(255, 71, 87, 0.3)', '0 0 15px rgba(255, 71, 87, 0.6)', '0 0 5px rgba(255, 71, 87, 0.3)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Badge 
                      className={`text-xs ${
                        statistics.system_health_score > 80 
                          ? `bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30`
                          : `bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30`
                      }`}
                    >
                      {statistics.system_health_score}%
                    </Badge>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Applied Filters Summary */}
        <AnimatePresence>
          {activeFiltersCount > 0 && (
            <motion.div 
              className="pt-4 border-t border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Label className="text-sm font-medium mb-2 block text-[#B8BCC8]">Applied Filters</Label>
              <div className="flex flex-wrap gap-1">
                {localFilters.severity && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge className="text-xs bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30">
                      Severity: {localFilters.severity}
                    </Badge>
                  </motion.div>
                )}
                {localFilters.category && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge className="text-xs bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30">
                      Category: {localFilters.category}
                    </Badge>
                  </motion.div>
                )}
                {localFilters.tenant_id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge className="text-xs bg-[#A55EEA]/20 text-[#A55EEA] border border-[#A55EEA]/30 font-mono">
                      Tenant: {localFilters.tenant_id.slice(0, 8)}...
                    </Badge>
                  </motion.div>
                )}
                {localFilters.hours_back !== 24 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge className={`text-xs bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30 ${neonClasses.text.numbers}`}>
                      {localFilters.hours_back}h
                    </Badge>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  </motion.div>
  );
};

export default ErrorFiltersPanel;