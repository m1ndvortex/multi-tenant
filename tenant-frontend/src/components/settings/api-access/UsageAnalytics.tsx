import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Zap,
  Activity,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Target,
  Globe
} from 'lucide-react';
import { apiAccessService } from '@/services/apiAccessService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const UsageAnalytics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const { data: usageStats, isLoading: statsLoading } = useQuery({
    queryKey: ['api-usage-stats'],
    queryFn: () => apiAccessService.getUsageStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: usageHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['api-usage-history', selectedPeriod],
    queryFn: () => apiAccessService.getUsageHistory(parseInt(selectedPeriod)),
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString('fa-IR');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fa-IR');
  };

  const getRateLimitStatus = () => {
    if (!usageStats) return null;
    
    const percentage = (usageStats.rate_limit_remaining / usageStats.rate_limit) * 100;
    
    if (percentage > 50) {
      return { color: 'text-green-600', bg: 'bg-green-100', status: 'عالی' };
    } else if (percentage > 20) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-100', status: 'متوسط' };
    } else {
      return { color: 'text-red-600', bg: 'bg-red-100', status: 'محدود' };
    }
  };

  const rateLimitStatus = getRateLimitStatus();

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (statsLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="mr-2 text-gray-600">در حال بارگذاری آمار...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">آمار استفاده از API</h2>
          <p className="text-sm text-gray-600 mt-1">تحلیل و نظارت بر استفاده از API</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="بازه زمانی" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 روز گذشته</SelectItem>
            <SelectItem value="30">30 روز گذشته</SelectItem>
            <SelectItem value="90">90 روز گذشته</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="gradient-blue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">کل درخواست‌ها</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(usageStats?.total_requests || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">درخواست‌های امروز</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(usageStats?.requests_today || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-purple">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">درخواست‌های این ماه</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(usageStats?.requests_this_month || 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant={rateLimitStatus ? "professional" : "gradient-blue"}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">محدودیت نرخ</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(usageStats?.rate_limit_remaining || 0)}
                  </p>
                  {rateLimitStatus && (
                    <Badge className={`${rateLimitStatus.bg} ${rateLimitStatus.color} text-xs`}>
                      {rateLimitStatus.status}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  از {formatNumber(usageStats?.rate_limit || 0)} مجاز
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Zap className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limit Progress */}
      {usageStats && (
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              وضعیت محدودیت نرخ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>استفاده شده</span>
                <span>{formatNumber(usageStats.rate_limit - usageStats.rate_limit_remaining)} از {formatNumber(usageStats.rate_limit)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    rateLimitStatus?.color === 'text-green-600' ? 'bg-green-500' :
                    rateLimitStatus?.color === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ 
                    width: `${((usageStats.rate_limit - usageStats.rate_limit_remaining) / usageStats.rate_limit) * 100}%` 
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>بازنشانی در: {new Date(usageStats.rate_limit_reset).toLocaleString('fa-IR')}</span>
                <span>{Math.round(((usageStats.rate_limit - usageStats.rate_limit_remaining) / usageStats.rate_limit) * 100)}% استفاده شده</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage History Chart */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            روند استفاده ({selectedPeriod} روز گذشته)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="mr-2 text-gray-600">در حال بارگذاری نمودار...</span>
            </div>
          ) : (
            <div className="h-80">
              <Line
                data={{
                  labels: usageHistory?.map(item => formatDate(item.date)) || [],
                  datasets: [
                    {
                      label: 'درخواست‌ها',
                      data: usageHistory?.map(item => item.requests) || [],
                      borderColor: '#3B82F6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 2,
                      fill: true,
                      tension: 0.4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return formatNumber(value as number);
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Endpoints */}
      {usageStats?.top_endpoints && usageStats.top_endpoints.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Endpoints Table */}
          <Card variant="professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                پربازدیدترین endpoint ها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usageStats.top_endpoints.map((endpoint, index) => (
                  <div key={`${endpoint.method}-${endpoint.endpoint}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm text-gray-800">{endpoint.endpoint}</code>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatNumber(endpoint.count)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Endpoints Distribution Chart */}
          <Card variant="professional">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                توزیع استفاده
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Doughnut
                  data={{
                    labels: usageStats.top_endpoints.map(item => `${item.method} ${item.endpoint}`),
                    datasets: [
                      {
                        data: usageStats.top_endpoints.map(item => item.count),
                        backgroundColor: COLORS,
                        borderColor: COLORS.map(color => color),
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = formatNumber(context.parsed);
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rate Limit Warning */}
      {usageStats && rateLimitStatus?.color === 'text-red-600' && (
        <Card variant="professional" className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800 mb-1">هشدار محدودیت نرخ</h3>
                <p className="text-sm text-red-700 mb-3">
                  شما به حد مجاز درخواست‌های API نزدیک شده‌اید. در صورت تمام شدن، درخواست‌های جدید تا بازنشانی محدود خواهند شد.
                </p>
                <div className="text-xs text-red-600">
                  <p>• درخواست‌های باقی‌مانده: {formatNumber(usageStats.rate_limit_remaining)}</p>
                  <p>• بازنشانی در: {new Date(usageStats.rate_limit_reset).toLocaleString('fa-IR')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UsageAnalytics;