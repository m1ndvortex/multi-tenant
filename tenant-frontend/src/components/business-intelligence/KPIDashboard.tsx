import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  DollarSignIcon,
  UsersIcon,
  ShoppingCartIcon,
  ClockIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  BarChart3Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from 'lucide-react';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';

interface KPIMetric {
  id: string;
  name: string;
  value: number;
  formatted_value: string;
  previous_value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  target_percentage?: number;
  category: 'revenue' | 'customers' | 'operations' | 'financial';
  unit: string;
  description: string;
}

interface KPIDashboardProps {
  className?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ className, period = 'monthly' }) => {
  const { data: kpis, isLoading, error, refetch } = useQuery({
    queryKey: ['kpi-metrics', period],
    queryFn: () => businessIntelligenceService.getKPIMetrics(period),
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue':
        return <DollarSignIcon className="h-5 w-5" />;
      case 'customers':
        return <UsersIcon className="h-5 w-5" />;
      case 'operations':
        return <ShoppingCartIcon className="h-5 w-5" />;
      case 'financial':
        return <BarChart3Icon className="h-5 w-5" />;
      default:
        return <TrendingUpIcon className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'revenue':
        return 'from-green-500 to-teal-600';
      case 'customers':
        return 'from-blue-500 to-indigo-600';
      case 'operations':
        return 'from-purple-500 to-violet-600';
      case 'financial':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTrendIcon = (trend: string, changePercentage: number) => {
    if (trend === 'up') {
      return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    } else if (trend === 'down') {
      return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    } else {
      return <MinusIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTargetProgress = (value: number, target?: number) => {
    if (!target) return null;
    const percentage = Math.min((value / target) * 100, 100);
    return percentage;
  };

  if (isLoading) {
    return (
      <Card variant="professional" className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BarChart3Icon className="h-5 w-5 text-blue-600" />
            شاخص‌های کلیدی عملکرد (KPI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="professional" className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BarChart3Icon className="h-5 w-5 text-blue-600" />
            شاخص‌های کلیدی عملکرد (KPI)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">خطا در بارگذاری شاخص‌های عملکرد</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className="h-4 w-4" />
              تلاش مجدد
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BarChart3Icon className="h-5 w-5 text-blue-600" />
            شاخص‌های کلیدی عملکرد (KPI)
          </CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => {
                // This would be handled by parent component
                console.log('Period changed:', e.target.value);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
              <option value="monthly">ماهانه</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
            >
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!kpis || kpis.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">هنوز شاخص عملکردی در دسترس نیست</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi: KPIMetric) => {
              const targetProgress = getTargetProgress(kpi.value, kpi.target);
              
              return (
                <div
                  key={kpi.id}
                  className="relative p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow"
                >
                  {/* Category Icon */}
                  <div className={`absolute top-3 left-3 h-8 w-8 rounded-lg bg-gradient-to-br ${getCategoryColor(kpi.category)} flex items-center justify-center text-white`}>
                    {getCategoryIcon(kpi.category)}
                  </div>
                  
                  {/* KPI Content */}
                  <div className="pt-2">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">{kpi.name}</h4>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-gray-900">{kpi.formatted_value}</span>
                      <span className="text-xs text-gray-500">{kpi.unit}</span>
                    </div>
                    
                    {/* Trend Indicator */}
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(kpi.trend)}`}>
                      {getTrendIcon(kpi.trend, kpi.change_percentage)}
                      <span>
                        {Math.abs(kpi.change_percentage).toFixed(1)}%
                      </span>
                    </div>
                    
                    {/* Target Progress */}
                    {targetProgress !== null && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>هدف</span>
                          <span>{targetProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${getCategoryColor(kpi.category)}`}
                            style={{ width: `${targetProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Description */}
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{kpi.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KPIDashboard;