import React, { useState, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.startIndex * itemHeight;

  if (loading && loadingComponent) {
    return <div className={cn("flex items-center justify-center", className)}>{loadingComponent}</div>;
  }

  if (items.length === 0 && emptyComponent) {
    return <div className={cn("flex items-center justify-center", className)}>{emptyComponent}</div>;
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.startIndex + index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Specialized components for common use cases
interface VirtualTenantListProps {
  tenants: Array<{
    id: string;
    name: string;
    email: string;
    subscription_type: string;
    status: string;
    created_at: string;
  }>;
  onTenantClick?: (tenant: any) => void;
  loading?: boolean;
  className?: string;
}

export const VirtualTenantList: React.FC<VirtualTenantListProps> = ({
  tenants,
  onTenantClick,
  loading = false,
  className,
}) => {
  const renderTenant = useCallback((tenant: any, _index: number) => (
    <div
      className="flex items-center justify-between p-4 border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => onTenantClick?.(tenant)}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {tenant.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium text-slate-900">{tenant.name}</p>
          <p className="text-sm text-slate-500">{tenant.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          tenant.subscription_type === 'pro' 
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-700"
        )}>
          {tenant.subscription_type}
        </span>
        <span className={cn(
          "px-2 py-1 rounded-full text-xs font-medium",
          tenant.status === 'active'
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        )}>
          {tenant.status}
        </span>
      </div>
    </div>
  ), [onTenantClick]);

  return (
    <VirtualScrollList
      items={tenants}
      itemHeight={80}
      containerHeight={400}
      renderItem={renderTenant}
      className={className}
      loading={loading}
      loadingComponent={
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded mb-2 w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-12 bg-slate-200 rounded-full" />
                <div className="h-6 w-12 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      }
      emptyComponent={
        <div className="text-center py-8">
          <p className="text-slate-500">No tenants found</p>
        </div>
      }
    />
  );
};

interface VirtualLogListProps {
  logs: Array<{
    id: string;
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    source?: string;
  }>;
  onLogClick?: (log: any) => void;
  loading?: boolean;
  className?: string;
}

export const VirtualLogList: React.FC<VirtualLogListProps> = ({
  logs,
  onLogClick,
  loading = false,
  className,
}) => {
  const renderLog = useCallback((log: any, _index: number) => (
    <div
      className="flex items-start gap-3 p-3 border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => onLogClick?.(log)}
    >
      <div className={cn(
        "w-3 h-3 rounded-full mt-1 flex-shrink-0",
        log.level === 'error' ? "bg-red-500" :
        log.level === 'warning' ? "bg-yellow-500" :
        "bg-blue-500"
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">{log.timestamp}</span>
          {log.source && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
              {log.source}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-900 truncate">{log.message}</p>
      </div>
    </div>
  ), [onLogClick]);

  return (
    <VirtualScrollList
      items={logs}
      itemHeight={60}
      containerHeight={300}
      renderItem={renderLog}
      className={className}
      loading={loading}
      loadingComponent={
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
              <div className="w-3 h-3 bg-slate-200 rounded-full mt-1" />
              <div className="flex-1">
                <div className="h-3 bg-slate-200 rounded mb-2 w-1/4" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      }
      emptyComponent={
        <div className="text-center py-8">
          <p className="text-slate-500">No logs found</p>
        </div>
      }
    />
  );
};