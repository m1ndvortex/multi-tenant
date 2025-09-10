/**
 * Active Errors Table Component
 * Displays active errors with filtering, sorting, and resolution actions
 */

import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  CheckCircle, 
  MoreHorizontal, 
  ExternalLink, 
  Clock,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Copy
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ErrorLog, ErrorSeverity, ErrorCategory } from '../../types/errorLogging';

interface ActiveErrorsTableProps {
  errors: ErrorLog[];
  isLoading: boolean;
  onResolveError: (errorId: string) => void;
  compact?: boolean;
  className?: string;
}

type SortField = 'last_occurrence' | 'severity' | 'occurrence_count' | 'error_type' | 'endpoint';
type SortOrder = 'asc' | 'desc';

const ActiveErrorsTable: React.FC<ActiveErrorsTableProps> = ({
  errors,
  isLoading,
  onResolveError,
  compact = false,
  className
}) => {
  // Local state for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('last_occurrence');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

  /**
   * Get severity color and styling
   */
  const getSeverityBadge = (severity: ErrorSeverity) => {
    const variants = {
      [ErrorSeverity.CRITICAL]: 'destructive',
      [ErrorSeverity.HIGH]: 'destructive',
      [ErrorSeverity.MEDIUM]: 'secondary',
      [ErrorSeverity.LOW]: 'outline'
    } as const;

    const colors = {
      [ErrorSeverity.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
      [ErrorSeverity.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
      [ErrorSeverity.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      [ErrorSeverity.LOW]: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <Badge 
        variant={variants[severity]} 
        className={cn('capitalize', colors[severity])}
      >
        {severity}
      </Badge>
    );
  };

  /**
   * Format time since last occurrence
   */
  const formatTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  /**
   * Filter and sort errors
   */
  const filteredAndSortedErrors = useMemo(() => {
    let filtered = errors;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(error => 
        error.error_message.toLowerCase().includes(term) ||
        error.error_type.toLowerCase().includes(term) ||
        error.endpoint.toLowerCase().includes(term) ||
        (error.tenant_id && error.tenant_id.toLowerCase().includes(term))
      );
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(error => error.severity === severityFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(error => error.category === categoryFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle different data types
      if (sortField === 'last_occurrence') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'severity') {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        aValue = severityOrder[aValue as keyof typeof severityOrder] || 0;
        bValue = severityOrder[bValue as keyof typeof severityOrder] || 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [errors, searchTerm, severityFilter, categoryFilter, sortField, sortOrder]);

  /**
   * Handle sort change
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  /**
   * Copy error details to clipboard
   */
  const copyErrorDetails = (error: ErrorLog) => {
    const details = `Error ID: ${error.id}
Type: ${error.error_type}
Message: ${error.error_message}
Endpoint: ${error.endpoint}
Severity: ${error.severity}
Occurrences: ${error.occurrence_count}
Last Occurrence: ${error.last_occurrence}`;

    navigator.clipboard.writeText(details);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errors.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Errors</h3>
          <p className="text-gray-500">
            Great! There are no unresolved errors at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters and Search */}
      {!compact && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search errors by message, type, endpoint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="authentication">Auth</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results count */}
      {!compact && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {filteredAndSortedErrors.length} of {errors.length} errors
          </span>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('error_type')}
                  className="h-auto p-0 font-medium"
                >
                  Error Type
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Error Message</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('endpoint')}
                  className="h-auto p-0 font-medium"
                >
                  Endpoint
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('severity')}
                  className="h-auto p-0 font-medium"
                >
                  Severity
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('occurrence_count')}
                  className="h-auto p-0 font-medium"
                >
                  Count
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('last_occurrence')}
                  className="h-auto p-0 font-medium"
                >
                  Last Seen
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedErrors.map((error) => (
              <TableRow key={error.id} className="hover:bg-gray-50">
                <TableCell>
                  {error.severity === ErrorSeverity.CRITICAL && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="max-w-32 truncate" title={error.error_type}>
                    {error.error_type}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-64 truncate" title={error.error_message}>
                    {error.error_message}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {error.method} {error.endpoint}
                  </code>
                </TableCell>
                <TableCell>
                  {getSeverityBadge(error.severity)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {error.occurrence_count}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatTimeSince(error.last_occurrence)}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onResolveError(error.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Resolve Error
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedError(error)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyErrorDetails(error)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Details
                      </DropdownMenuItem>
                      {error.stack_trace && (
                        <DropdownMenuItem>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Stack Trace
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* No results message */}
      {filteredAndSortedErrors.length === 0 && errors.length > 0 && (
        <div className="text-center py-8">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matching errors</h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveErrorsTable;