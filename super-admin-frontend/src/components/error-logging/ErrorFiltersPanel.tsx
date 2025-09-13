/**
 * Error Filters Panel Component
 * Provides filtering controls for error logging dashboard
 */

import React, { useState } from 'react';
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
    <Card className={cn('h-fit', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </span>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-auto p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Filter Presets */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quick Filters</Label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('critical-only')}
              className="justify-start text-xs"
            >
              <AlertTriangle className="h-3 w-3 mr-2 text-red-500" />
              Critical Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('last-hour')}
              className="justify-start text-xs"
            >
              <Clock className="h-3 w-3 mr-2 text-orange-500" />
              Last Hour
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('api-errors')}
              className="justify-start text-xs"
            >
              <Server className="h-3 w-3 mr-2 text-blue-500" />
              API Errors
            </Button>
          </div>
        </div>

        {/* Time Range */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Time Range: {localFilters.hours_back} hours
          </Label>
          <Slider
            value={[localFilters.hours_back]}
            onValueChange={([value]) => handleFilterChange('hours_back', value)}
            max={168} // 7 days
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1h</span>
            <span>7d</span>
          </div>
        </div>

        {/* Severity Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Severity</Label>
          <Select
            value={localFilters.severity || 'all'}
            onValueChange={(value) => 
              handleFilterChange('severity', value === 'all' ? undefined : value as ErrorSeverity)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value={ErrorSeverity.CRITICAL}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Critical
                </div>
              </SelectItem>
              <SelectItem value={ErrorSeverity.HIGH}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  High
                </div>
              </SelectItem>
              <SelectItem value={ErrorSeverity.MEDIUM}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Medium
                </div>
              </SelectItem>
              <SelectItem value={ErrorSeverity.LOW}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Low
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Category</Label>
          <Select
            value={localFilters.category || 'all'}
            onValueChange={(value) => 
              handleFilterChange('category', value === 'all' ? undefined : value as ErrorCategory)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value={ErrorCategory.SYSTEM}>System</SelectItem>
              <SelectItem value={ErrorCategory.DATABASE}>Database</SelectItem>
              <SelectItem value={ErrorCategory.API}>API</SelectItem>
              <SelectItem value={ErrorCategory.AUTHENTICATION}>Authentication</SelectItem>
              <SelectItem value={ErrorCategory.AUTHORIZATION}>Authorization</SelectItem>
              <SelectItem value={ErrorCategory.VALIDATION}>Validation</SelectItem>
              <SelectItem value={ErrorCategory.BUSINESS_LOGIC}>Business Logic</SelectItem>
              <SelectItem value={ErrorCategory.EXTERNAL_SERVICE}>External Service</SelectItem>
              <SelectItem value={ErrorCategory.PERFORMANCE}>Performance</SelectItem>
              <SelectItem value={ErrorCategory.SECURITY}>Security</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Advanced Filters</Label>
          <Switch
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
          />
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t">
            {/* Tenant ID Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tenant ID</Label>
              <Input
                placeholder="Filter by tenant ID..."
                value={localFilters.tenant_id || ''}
                onChange={(e) => handleFilterChange('tenant_id', e.target.value || undefined)}
              />
            </div>

            {/* Endpoint Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Endpoint</Label>
              <Input
                placeholder="Filter by endpoint..."
                value={localFilters.endpoint || ''}
                onChange={(e) => handleFilterChange('endpoint', e.target.value || undefined)}
              />
            </div>

            {/* Error Type Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Error Type</Label>
              <Input
                placeholder="Filter by error type..."
                value={localFilters.error_type || ''}
                onChange={(e) => handleFilterChange('error_type', e.target.value || undefined)}
              />
            </div>

            {/* Results Limit */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Results Limit: {localFilters.limit}
              </Label>
              <Slider
                value={[localFilters.limit]}
                onValueChange={([value]) => handleFilterChange('limit', value)}
                max={100}
                min={10}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10</span>
                <span>100</span>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Summary */}
        {statistics && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">Current Statistics</Label>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Errors:</span>
                <Badge variant="destructive" className="text-xs">
                  {statistics.active_errors_count}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Errors:</span>
                <Badge variant="outline" className="text-xs">
                  {statistics.total_errors}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Error Rate:</span>
                <Badge variant="secondary" className="text-xs">
                  {statistics.error_rate_per_minute.toFixed(1)}/min
                </Badge>
              </div>
              {statistics.system_health_score && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Health Score:</span>
                  <Badge 
                    variant={statistics.system_health_score > 80 ? "default" : "destructive"} 
                    className="text-xs"
                  >
                    {statistics.system_health_score}%
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applied Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-2 block">Applied Filters</Label>
            <div className="flex flex-wrap gap-1">
              {localFilters.severity && (
                <Badge variant="outline" className="text-xs">
                  Severity: {localFilters.severity}
                </Badge>
              )}
              {localFilters.category && (
                <Badge variant="outline" className="text-xs">
                  Category: {localFilters.category}
                </Badge>
              )}
              {localFilters.tenant_id && (
                <Badge variant="outline" className="text-xs">
                  Tenant: {localFilters.tenant_id.slice(0, 8)}...
                </Badge>
              )}
              {localFilters.hours_back !== 24 && (
                <Badge variant="outline" className="text-xs">
                  {localFilters.hours_back}h
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorFiltersPanel;