import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBackups } from '@/hooks/useBackups';
import { formatBytes, formatCurrency, formatDate } from '@/lib/utils';
import { 
  CloudIcon, 
  HardDriveIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  DatabaseIcon,
  RefreshCwIcon
} from 'lucide-react';

const StorageUsageAnalytics: React.FC = () => {
  const { useStorageUsage } = useBackups();
  const { data: storageData, isLoading } = useStorageUsage();

  if (isLoading) {
    return (
      <Card variant="professional">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCwIcon className="w-6 h-6 animate-spin ml-2" />
            در حال بارگذاری آمار ذخیره‌سازی...
          </div>
        </CardContent>
      </Card>
    );
  }

  const cloudflareData = storageData?.find(s => s.provider === 'cloudflare_r2');
  const backblazeData = storageData?.find(s => s.provider === 'backblaze_b2');

  const totalSize = (cloudflareData?.total_size || 0) + (backblazeData?.total_size || 0);
  const totalCost = (cloudflareData?.monthly_cost || 0) + (backblazeData?.monthly_cost || 0);
  const totalFiles = (cloudflareData?.file_count || 0) + (backblazeData?.file_count || 0);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="gradient-blue">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">کل حجم</p>
                <p className="text-2xl font-bold text-blue-900">{formatBytes(totalSize)}</p>
                <p className="text-xs text-blue-600">در هر دو ارائه‌دهنده</p>
              </div>
              <DatabaseIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-green">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">هزینه ماهانه</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalCost)}</p>
                <p className="text-xs text-green-600">مجموع هزینه‌ها</p>
              </div>
              <DollarSignIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-purple">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">تعداد فایل</p>
                <p className="text-2xl font-bold text-purple-900">{totalFiles.toLocaleString()}</p>
                <p className="text-xs text-purple-600">کل فایل‌های پشتیبان</p>
              </div>
              <HardDriveIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">آخرین بروزرسانی</p>
                <p className="text-lg font-bold text-slate-900">
                  {storageData?.[0]?.last_updated ? formatDate(storageData[0].last_updated) : 'نامشخص'}
                </p>
                <p className="text-xs text-slate-600">وضعیت ذخیره‌سازی</p>
              </div>
              <RefreshCwIcon className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cloudflare R2 */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <CloudIcon className="w-4 h-4 text-white" />
              </div>
              Cloudflare R2
              <Badge variant="default" className="bg-orange-100 text-orange-800">اصلی</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">کل حجم:</span>
                <span className="font-semibold">{formatBytes(cloudflareData?.total_size || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">پشتیبان تنانت‌ها:</span>
                <span className="font-semibold">{formatBytes(cloudflareData?.tenant_backups_size || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">بازیابی فاجعه:</span>
                <span className="font-semibold">{formatBytes(cloudflareData?.disaster_recovery_size || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">تعداد فایل:</span>
                <span className="font-semibold">{(cloudflareData?.file_count || 0).toLocaleString()}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">هزینه ماهانه:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-orange-600">
                      {formatCurrency(cloudflareData?.monthly_cost || 0)}
                    </span>
                    <TrendingUpIcon className="w-4 h-4 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backblaze B2 */}
        <Card variant="professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <HardDriveIcon className="w-4 h-4 text-white" />
              </div>
              Backblaze B2
              <Badge variant="secondary">پشتیبان</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">کل حجم:</span>
                <span className="font-semibold">{formatBytes(backblazeData?.total_size || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">پشتیبان تنانت‌ها:</span>
                <span className="font-semibold">{formatBytes(backblazeData?.tenant_backups_size || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">بازیابی فاجعه:</span>
                <span className="font-semibold">{formatBytes(backblazeData?.disaster_recovery_size || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">تعداد فایل:</span>
                <span className="font-semibold">{(backblazeData?.file_count || 0).toLocaleString()}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">هزینه ماهانه:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(backblazeData?.monthly_cost || 0)}
                    </span>
                    <TrendingDownIcon className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <DollarSignIcon className="w-4 h-4 text-white" />
            </div>
            تحلیل هزینه‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatCurrency(totalCost)}
              </div>
              <div className="text-sm text-slate-600">کل هزینه ماهانه</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {formatCurrency((cloudflareData?.monthly_cost || 0) / totalSize * 1024 * 1024 * 1024)}
              </div>
              <div className="text-sm text-slate-600">هزینه هر گیگابایت (R2)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatCurrency((backblazeData?.monthly_cost || 0) / totalSize * 1024 * 1024 * 1024)}
              </div>
              <div className="text-sm text-slate-600">هزینه هر گیگابایت (B2)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorageUsageAnalytics;