import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse rounded-md bg-slate-200",
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined skeleton components for common use cases
export const StatCardSkeleton: React.FC = () => (
  <div className="p-6 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => (
  <tr>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = "h-64" }) => (
  <div className={cn("w-full rounded-lg bg-slate-100 flex items-center justify-center", height)}>
    <div className="text-center space-y-2">
      <Skeleton className="h-6 w-32 mx-auto" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </div>
  </div>
);

export const UserListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
    ))}
  </div>
);

export const AlertSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-start space-x-3 p-4 rounded-lg border">
        <Skeleton className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="w-8 h-8 rounded" />
      </div>
    ))}
  </div>
);

export const SystemHealthSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
        <Skeleton className="h-4 w-1/3" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="w-16 h-2 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export { Skeleton };