import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Memoized StatCard component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  link?: string;
  isLoading?: boolean;
}

export const MemoizedStatCard = memo<StatCardProps>(({
  title,
  value,
  subtitle,
  icon,
  gradient,
  trend,
  link,
  isLoading = false
}) => {
  const CardWrapper = link ? Link : 'div';
  const cardProps = link ? { to: link } : {};

  const trendIcon = useMemo(() => {
    if (!trend) return null;
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={trend.isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"}
        />
      </svg>
    );
  }, [trend]);

  if (isLoading) {
    return (
      <Card variant="professional" className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded mb-2 w-2/3"></div>
              <div className="h-8 bg-slate-200 rounded mb-2 w-1/2"></div>
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            </div>
            <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CardWrapper {...(cardProps as any)} className={link ? 'block' : ''}>
      <Card variant="professional" className={cn(
        "h-full transition-all duration-300",
        link && "hover:shadow-xl hover:scale-[1.02] cursor-pointer"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
              {subtitle && (
                <p className="text-sm text-slate-500">{subtitle}</p>
              )}
              {trend && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-sm",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {trendIcon}
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br",
              gradient
            )}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
});

MemoizedStatCard.displayName = 'MemoizedStatCard';

// Memoized QuickAction component
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  link: string;
  badge?: string;
}

export const MemoizedQuickActionCard = memo<QuickActionProps>(({
  title,
  description,
  icon,
  gradient,
  link,
  badge
}) => {
  return (
    <Link to={link} className="block">
      <Card variant="professional" className="h-full hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br flex-shrink-0",
              gradient
            )}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-800 truncate">{title}</h3>
                {badge && (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 line-clamp-2">{description}</p>
            </div>
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

MemoizedQuickActionCard.displayName = 'MemoizedQuickActionCard';

// Memoized MiniChart component
interface MiniChartProps {
  data: number[];
  color: string;
  label: string;
}

export const MemoizedMiniChart = memo<MiniChartProps>(({ data, color, label }) => {
  const { max, min, range, chartBars } = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const chartBars = data.map((value, index) => ({
      key: index,
      height: `${((value - min) / range) * 100}%`,
      minHeight: '2px'
    }));

    return { max, min, range, chartBars };
  }, [data]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm text-slate-500">{data[data.length - 1]}</span>
      </div>
      <div className="h-8 flex items-end gap-1">
        {chartBars.map((bar) => (
          <div
            key={bar.key}
            className={cn("flex-1 rounded-t", color)}
            style={{
              height: bar.height,
              minHeight: bar.minHeight
            }}
          />
        ))}
      </div>
    </div>
  );
});

MemoizedMiniChart.displayName = 'MemoizedMiniChart';

// Memoized SystemHealthIndicator component
interface SystemHealthIndicatorProps {
  label: string;
  value: number | string;
  status?: 'healthy' | 'warning' | 'error' | 'unknown';
  type?: 'percentage' | 'status';
}

export const MemoizedSystemHealthIndicator = memo<SystemHealthIndicatorProps>(({
  label,
  value,
  status,
  type = 'percentage'
}) => {
  const { statusColor, statusIcon } = useMemo(() => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'healthy': return 'text-green-600';
        case 'warning': return 'text-yellow-600';
        case 'error': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'healthy':
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        case 'warning':
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          );
        case 'error':
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
        default:
          return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
      }
    };

    return {
      statusColor: getStatusColor(status || 'unknown'),
      statusIcon: getStatusIcon(status || 'unknown')
    };
  }, [status]);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {type === 'percentage' ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{value}%</span>
          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-teal-600 transition-all duration-300"
              style={{ width: `${Math.min(Number(value) || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium",
          statusColor
        )}>
          {statusIcon}
          <span className="capitalize">{value}</span>
        </div>
      )}
    </div>
  );
});

MemoizedSystemHealthIndicator.displayName = 'MemoizedSystemHealthIndicator';