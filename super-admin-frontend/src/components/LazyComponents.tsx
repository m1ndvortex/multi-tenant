import { lazy, Suspense } from 'react';
import { StatCardSkeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
export const LazyWhoIsOnlineWidget = lazy(() => import('@/components/WhoIsOnlineWidget'));
// export const LazyAnalyticsChart = lazy(() => import('@/components/AnalyticsChart'));
// export const LazySystemHealthWidget = lazy(() => import('@/components/SystemHealthWidget'));
// export const LazyQuickActionsGrid = lazy(() => import('@/components/QuickActionsGrid'));

// Wrapper components with suspense and error boundaries
export const WhoIsOnlineWidgetLazy = () => (
  <Suspense fallback={<StatCardSkeleton />}>
    <LazyWhoIsOnlineWidget />
  </Suspense>
);

// export const AnalyticsChartLazy = () => (
//   <Suspense fallback={<div className="h-64 bg-slate-100 animate-pulse rounded-lg" />}>
//     <LazyAnalyticsChart />
//   </Suspense>
// );

// export const SystemHealthWidgetLazy = () => (
//   <Suspense fallback={<SystemHealthSkeleton />}>
//     <LazySystemHealthWidget />
//   </Suspense>
// );

// export const QuickActionsGridLazy = () => (
//   <Suspense fallback={
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//       {Array.from({ length: 6 }).map((_, i) => (
//         <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg" />
//       ))}
//     </div>
//   }>
//     <LazyQuickActionsGrid />
//   </Suspense>
// );