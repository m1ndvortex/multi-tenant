import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3Icon,
  DollarSignIcon,
  HardDriveIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ZapIcon,
  ShieldIcon,
  DownloadIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { StorageAnalytics, StorageProviderComparison } from '@/types/backupMonitoring';
import { backupMonitoringService } from '@/services/backupMonitoringService';
import { useToast } from '@/hooks/use-toast';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const StorageProviderAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<StorageAnalytics[]>([]);
  const [comparison, setComparison] = useState<StorageProviderComparison[]>([]);
  const [costAnalytics, setCostAnalytics] = useState<any>(null);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsData, comparisonData, costData, historyData] = await Promise.all([
        backupMonitoringService.getStorageAnalytics(),
        backupMonitoringService.getStorageProviderComparison(),
        backupMonitoringService.getCostAnalytics(),
        backupMonitoringService.getStorageUsageHistory(30),
      ]);

      setAnalytics(analyticsData);
      setComparison(comparisonData);
      setCostAnalytics(costData);
      setUsageHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch storage analytics:', error);
      toast({
        title: 'خطا در دریافت آمار ذخیره‌سازی',
        description: 'امکان دریافت اطلاعات آمار ذخیره‌سازی وجود ندارد',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // const formatBytes = (bytes: number) => {
  //   if (bytes === 0) return '0 B';
  //   const k = 1024;
  //   const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  // };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getProviderColor = (provider: string) => {
    return provider === 'backblaze_b2' ? 'from-orange-500 to-red-600' : 'from-blue-500 to-indigo-600';
  };

  const getProviderName = (provider: string) => {
    return provider === 'backblaze_b2' ? 'Backblaze B2' : 'Cloudflare R2';
  };

  const getTrendIcon = (percentage: number) => {
    if (percentage > 0) {
      return <TrendingUpIcon className="w-4 h-4 text-green-600" />;
    } else if (percentage < 0) {
      return <TrendingDownIcon className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  const usageChartData = {
    labels: usageHistory.map(h => new Date(h.date).toLocaleDateString('fa-IR')),
    datasets: [
      {
        label: 'Backblaze B2 (GB)',
        data: usageHistory.map(h => h.backblaze_b2_gb),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Cloudflare R2 (GB)',
        data: usageHistory.map(h => h.cloudflare_r2_gb),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const costTrendsData = costAnalytics?.cost_trends ? {
    labels: costAnalytics.cost_trends.map((t: any) => new Date(t.date).toLocaleDateString('fa-IR')),
    datasets: [
      {
        label: 'Backblaze B2 Cost ($)',
        data: costAnalytics.cost_trends.map((t: any) => t.backblaze_b2_cost),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Cloudflare R2 Cost ($)',
        data: costAnalytics.cost_trends.map((t: any) => t.cloudflare_r2_cost),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  } : null;

  const redundancyData = analytics.length > 0 ? {
    labels: ['فایل‌های موجود در هر دو', 'فقط در اصلی', 'فقط در پشتیبان'],
    datasets: [
      {
        data: [
          analytics[0]?.redundancy_status.files_in_both_providers || 0,
          analytics[0]?.redundancy_status.files_only_primary || 0,
          analytics[0]?.redundancy_status.files_only_secondary || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(249, 115, 22)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
      },
    ],
  } : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} variant="professional">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
              <BarChart3Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">آمار و تحلیل ذخیره‌سازی</h2>
              <p className="text-sm text-slate-600">
                تحلیل عملکرد، هزینه و بازدهی ارائه‌دهندگان ذخیره‌سازی
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <Card variant="professional">
          <CardContent className="p-6">
            <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-50">
              <TabsTrigger value="overview">نمای کلی</TabsTrigger>
              <TabsTrigger value="performance">عملکرد</TabsTrigger>
              <TabsTrigger value="costs">هزینه‌ها</TabsTrigger>
              <TabsTrigger value="redundancy">افزونگی</TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Provider Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analytics.map((provider) => (
              <Card key={provider.provider} variant="professional">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${getProviderColor(provider.provider)} flex items-center justify-center`}>
                      <HardDriveIcon className="w-4 h-4 text-white" />
                    </div>
                    {getProviderName(provider.provider)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">حجم کل</p>
                      <p className="text-lg font-bold">
                        {(provider.usage_metrics.total_storage_gb).toFixed(2)} GB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">تعداد فایل</p>
                      <p className="text-lg font-bold">
                        {provider.usage_metrics.file_count.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">هزینه ماهانه</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(provider.cost_metrics.estimated_monthly_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">نرخ موفقیت</p>
                      <p className="text-lg font-bold text-blue-600">
                        {provider.performance_metrics.success_rate_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>رشد ماهانه</span>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(provider.cost_metrics.cost_trend_percentage)}
                        <span className={provider.cost_metrics.cost_trend_percentage > 0 ? 'text-red-600' : 'text-green-600'}>
                          {Math.abs(provider.cost_metrics.cost_trend_percentage).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(provider.usage_metrics.monthly_growth_gb / 10 * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage History Chart */}
          <Card variant="professional">
            <CardHeader>
              <CardTitle>روند استفاده از ذخیره‌سازی (۳۰ روز)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line 
                  data={usageChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'حجم (GB)',
                        },
                      },
                    },
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analytics.map((provider) => (
              <React.Fragment key={provider.provider}>
                <Card variant="gradient-blue">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <ZapIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-700">
                        {provider.performance_metrics.average_upload_speed_mbps.toFixed(1)}
                      </div>
                      <p className="text-sm text-blue-600">
                        سرعت آپلود (Mbps) - {getProviderName(provider.provider)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="gradient-green">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <DownloadIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-700">
                        {provider.performance_metrics.average_download_speed_mbps.toFixed(1)}
                      </div>
                      <p className="text-sm text-green-600">
                        سرعت دانلود (Mbps) - {getProviderName(provider.provider)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </React.Fragment>
            ))}
          </div>

          {/* Provider Comparison Table */}
          <Card variant="professional">
            <CardHeader>
              <CardTitle>مقایسه عملکرد ارائه‌دهندگان</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">معیار</th>
                      <th className="text-center p-3">Backblaze B2</th>
                      <th className="text-center p-3">Cloudflare R2</th>
                      <th className="text-center p-3">برتر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{item.metric}</td>
                        <td className="p-3 text-center">
                          {typeof item.backblaze_b2_value === 'number' 
                            ? `${item.backblaze_b2_value.toFixed(2)} ${item.unit || ''}`
                            : item.backblaze_b2_value}
                        </td>
                        <td className="p-3 text-center">
                          {typeof item.cloudflare_r2_value === 'number' 
                            ? `${item.cloudflare_r2_value.toFixed(2)} ${item.unit || ''}`
                            : item.cloudflare_r2_value}
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            className={
                              item.better_provider === 'backblaze_b2' 
                                ? 'bg-orange-100 text-orange-700'
                                : item.better_provider === 'cloudflare_r2'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }
                          >
                            {item.better_provider === 'backblaze_b2' && 'B2'}
                            {item.better_provider === 'cloudflare_r2' && 'R2'}
                            {item.better_provider === 'equal' && 'برابر'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          {/* Cost Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="gradient-green">
              <CardContent className="p-6">
                <div className="text-center">
                  <DollarSignIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">
                    {costAnalytics?.monthly_costs ? 
                      formatCurrency(costAnalytics.monthly_costs.reduce((sum: number, cost: any) => sum + cost.cost, 0))
                      : '$0.00'}
                  </div>
                  <p className="text-sm text-green-600">هزینه کل ماهانه</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="gradient-blue">
              <CardContent className="p-6">
                <div className="text-center">
                  <TrendingUpIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">
                    {costAnalytics?.cost_projections?.[0] ? 
                      formatCurrency(costAnalytics.cost_projections[0].projected_cost)
                      : '$0.00'}
                  </div>
                  <p className="text-sm text-blue-600">پیش‌بینی ماه آینده</p>
                </div>
              </CardContent>
            </Card>

            <Card variant="gradient-purple">
              <CardContent className="p-6">
                <div className="text-center">
                  <BarChart3Icon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-700">
                    {analytics.length > 0 ? 
                      `${((analytics[0].cost_metrics.estimated_monthly_cost / analytics[0].usage_metrics.total_storage_gb) || 0).toFixed(3)}`
                      : '0.000'}
                  </div>
                  <p className="text-sm text-purple-600">هزینه هر GB ($)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Trends Chart */}
          {costTrendsData && (
            <Card variant="professional">
              <CardHeader>
                <CardTitle>روند هزینه‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line 
                    data={costTrendsData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'هزینه ($)',
                          },
                        },
                      },
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analytics.map((provider) => (
              <Card key={provider.provider} variant="professional">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded bg-gradient-to-br ${getProviderColor(provider.provider)}`}></div>
                    تفکیک هزینه {getProviderName(provider.provider)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">ذخیره‌سازی:</span>
                    <span className="font-medium">{formatCurrency(provider.cost_metrics.storage_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">پهنای باند:</span>
                    <span className="font-medium">{formatCurrency(provider.cost_metrics.bandwidth_cost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">عملیات:</span>
                    <span className="font-medium">{formatCurrency(provider.cost_metrics.operations_cost)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold">
                    <span>مجموع:</span>
                    <span>{formatCurrency(provider.cost_metrics.estimated_monthly_cost)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Redundancy Tab */}
        <TabsContent value="redundancy" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Redundancy Chart */}
            <Card variant="professional">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="w-5 h-5" />
                  وضعیت افزونگی فایل‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                {redundancyData && (
                  <div className="h-64">
                    <Doughnut 
                      data={redundancyData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Redundancy Stats */}
            <Card variant="professional">
              <CardHeader>
                <CardTitle>آمار افزونگی</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.length > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">درصد افزونگی:</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={analytics[0].redundancy_status.redundancy_percentage} 
                          className="w-20 h-2"
                        />
                        <span className="font-bold text-green-600">
                          {analytics[0].redundancy_status.redundancy_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">فایل‌های محفوظ:</span>
                        <span className="font-medium text-green-600">
                          {analytics[0].redundancy_status.files_in_both_providers.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">فقط در B2:</span>
                        <span className="font-medium text-orange-600">
                          {analytics[0].redundancy_status.files_only_primary.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">فقط در R2:</span>
                        <span className="font-medium text-blue-600">
                          {analytics[0].redundancy_status.files_only_secondary.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {analytics[0].redundancy_status.redundancy_percentage < 95 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertTriangleIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            توجه: درصد افزونگی کمتر از ۹۵٪ است
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StorageProviderAnalytics;