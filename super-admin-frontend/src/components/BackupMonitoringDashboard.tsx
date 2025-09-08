import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ActivityIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  DatabaseIcon,
  HardDriveIcon,
  RefreshCwIcon,
  ServerIcon,
  TrendingUpIcon,
  XCircleIcon
} from 'lucide-react';
import { BackupMonitoringStatus, BackupHealthMetrics, BackupTrend } from '@/types/backupMonitoring';
import { backupMonitoringService } from '@/services/backupMonitoringService';
import { useToast } from '@/hooks/use-toast';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BackupMonitoringDashboardProps {
  refreshInterval?: number;
}

const BackupMonitoringDashboard: React.FC<BackupMonitoringDashboardProps> = ({ 
  refreshInterval = 30000 
}) => {
  const [status, setStatus] = useState<BackupMonitoringStatus | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<BackupHealthMetrics | null>(null);
  const [trends, setTrends] = useState<BackupTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [statusData, metricsData, trendsData] = await Promise.all([
        backupMonitoringService.getBackupMonitoringStatus(),
        backupMonitoringService.getBackupHealthMetrics(),
        backupMonitoringService.getBackupTrends(7), // Last 7 days
      ]);

      setStatus(statusData);
      setHealthMetrics(metricsData);
      setTrends(trendsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch backup monitoring data:', error);
      toast({
        title: 'خطا در دریافت اطلاعات',
        description: 'امکان دریافت وضعیت پشتیبان‌گیری وجود ندارد',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="w-5 h-5" />;
      case 'warning': return <AlertTriangleIcon className="w-5 h-5" />;
      case 'critical': return <XCircleIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const trendsChartData = {
    labels: trends.map(t => new Date(t.date).toLocaleDateString('fa-IR')),
    datasets: [
      {
        label: 'پشتیبان‌های موفق',
        data: trends.map(t => t.successful_backups),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'پشتیبان‌های ناموفق',
        data: trends.map(t => t.failed_backups),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'روند پشتیبان‌گیری (۷ روز گذشته)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      {/* Header with Refresh */}
      <Card variant="filter">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <ActivityIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">داشبورد نظارت پشتیبان‌گیری</h2>
                <p className="text-sm text-slate-600">
                  {lastUpdated && `آخرین بروزرسانی: ${lastUpdated.toLocaleTimeString('fa-IR')}`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overall Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall System Status */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">وضعیت کلی سیستم</p>
                <div className="flex items-center gap-2 mt-2">
                  {status && getStatusIcon(status.overall_status)}
                  <Badge className={status ? getStatusColor(status.overall_status) : 'text-gray-600 bg-gray-100'}>
                    {status?.overall_status === 'healthy' && 'سالم'}
                    {status?.overall_status === 'warning' && 'هشدار'}
                    {status?.overall_status === 'critical' && 'بحرانی'}
                  </Badge>
                </div>
              </div>
              <ServerIcon className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* Tenant Backups Status */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">پشتیبان تنانت‌ها (۲۴ساعت)</p>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-green-600">
                    {status?.tenant_backups.successful_backups_24h || 0}
                  </div>
                  <div className="text-sm text-slate-500">
                    {status?.tenant_backups.failed_backups_24h || 0} ناموفق
                  </div>
                </div>
              </div>
              <HardDriveIcon className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">نرخ موفقیت (۷ روز)</p>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-blue-600">
                    {healthMetrics?.success_rate_7d ? `${healthMetrics.success_rate_7d.toFixed(1)}%` : '0%'}
                  </div>
                  <Progress 
                    value={healthMetrics?.success_rate_7d || 0} 
                    className="mt-2 h-2"
                  />
                </div>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* Storage Efficiency */}
        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">بازدهی ذخیره‌سازی</p>
                <div className="mt-2">
                  <div className="text-2xl font-bold text-purple-600">
                    {healthMetrics?.storage_efficiency_percentage ? 
                      `${healthMetrics.storage_efficiency_percentage.toFixed(1)}%` : '0%'}
                  </div>
                  <div className="text-sm text-slate-500">
                    میانگین: {healthMetrics?.average_backup_size_gb ? 
                      `${healthMetrics.average_backup_size_gb.toFixed(2)} GB` : '0 GB'}
                  </div>
                </div>
              </div>
              <DatabaseIcon className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Providers Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backblaze B2 Status */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <HardDriveIcon className="w-4 h-4 text-white" />
              </div>
              Backblaze B2 (اصلی)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">وضعیت:</span>
                <Badge className={status ? getStatusColor(status.storage_providers.backblaze_b2.status) : 'text-gray-600 bg-gray-100'}>
                  {status?.storage_providers.backblaze_b2.status === 'healthy' && 'سالم'}
                  {status?.storage_providers.backblaze_b2.status === 'degraded' && 'کاهش عملکرد'}
                  {status?.storage_providers.backblaze_b2.status === 'unavailable' && 'غیرفعال'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">زمان پاسخ:</span>
                <span className="text-sm font-medium">
                  {status?.storage_providers.backblaze_b2.response_time ? 
                    `${status.storage_providers.backblaze_b2.response_time.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">آپتایم:</span>
                <span className="text-sm font-medium">
                  {status?.storage_providers.backblaze_b2.uptime_percentage ? 
                    `${status.storage_providers.backblaze_b2.uptime_percentage.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              {status?.storage_providers.backblaze_b2.error_message && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {status.storage_providers.backblaze_b2.error_message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cloudflare R2 Status */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <HardDriveIcon className="w-4 h-4 text-white" />
              </div>
              Cloudflare R2 (پشتیبان)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">وضعیت:</span>
                <Badge className={status ? getStatusColor(status.storage_providers.cloudflare_r2.status) : 'text-gray-600 bg-gray-100'}>
                  {status?.storage_providers.cloudflare_r2.status === 'healthy' && 'سالم'}
                  {status?.storage_providers.cloudflare_r2.status === 'degraded' && 'کاهش عملکرد'}
                  {status?.storage_providers.cloudflare_r2.status === 'unavailable' && 'غیرفعال'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">زمان پاسخ:</span>
                <span className="text-sm font-medium">
                  {status?.storage_providers.cloudflare_r2.response_time ? 
                    `${status.storage_providers.cloudflare_r2.response_time.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">آپتایم:</span>
                <span className="text-sm font-medium">
                  {status?.storage_providers.cloudflare_r2.uptime_percentage ? 
                    `${status.storage_providers.cloudflare_r2.uptime_percentage.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              {status?.storage_providers.cloudflare_r2.error_message && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {status.storage_providers.cloudflare_r2.error_message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle>روند پشتیبان‌گیری</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={trendsChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Health Metrics Summary */}
      {healthMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="gradient-green">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {healthMetrics.success_rate_30d.toFixed(1)}%
                </div>
                <p className="text-sm text-green-600">نرخ موفقیت ۳۰ روز</p>
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient-blue">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {healthMetrics.average_backup_duration_minutes.toFixed(0)}m
                </div>
                <p className="text-sm text-blue-600">میانگین مدت زمان پشتیبان‌گیری</p>
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient-purple">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  ${healthMetrics.cost_per_gb_monthly.toFixed(3)}
                </div>
                <p className="text-sm text-purple-600">هزینه ماهانه هر GB</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BackupMonitoringDashboard;