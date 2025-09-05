import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Share2, 
  Eye, 
  BarChart3, 
  Download,
  ExternalLink,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw
} from 'lucide-react';
import { qrSharingService, AccessLogResponse, AccessStatsResponse } from '@/services/qrSharingService';

interface SharingControlsProps {
  invoiceId: string;
  invoiceNumber: string;
  isShareable: boolean;
  qrToken?: string;
}

export const SharingControls: React.FC<SharingControlsProps> = ({
  invoiceId,
  invoiceNumber,
  isShareable,
  qrToken
}) => {
  const { toast } = useToast();
  const [accessLogs, setAccessLogs] = useState<AccessLogResponse[]>([]);
  const [accessStats, setAccessStats] = useState<AccessStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  useEffect(() => {
    if (isShareable && qrToken) {
      loadAccessData();
    }
  }, [isShareable, qrToken, activeTab]);

  const loadAccessData = async () => {
    if (!isShareable || !qrToken) return;
    
    setLoading(true);
    try {
      if (activeTab === 'logs') {
        const logs = await qrSharingService.getAccessLogs(invoiceId, 30, 0, 50);
        setAccessLogs(logs);
      } else if (activeTab === 'stats') {
        const stats = await qrSharingService.getAccessStatistics(invoiceId, 30);
        setAccessStats(stats);
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری اطلاعات دسترسی',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return Monitor;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    }
    return Monitor;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAccessMethodBadge = (method: string) => {
    const methodConfig = {
      qr_scan: { label: 'اسکن QR', variant: 'default' as const },
      direct_link: { label: 'لینک مستقیم', variant: 'secondary' as const },
      pdf_download: { label: 'دانلود PDF', variant: 'outline' as const },
    };

    const config = methodConfig[method as keyof typeof methodConfig] || methodConfig.direct_link;
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (!isShareable) {
    return (
      <Card variant="professional">
        <CardContent className="p-8 text-center">
          <Share2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">اشتراک‌گذاری غیرفعال</h3>
          <p className="text-muted-foreground">
            برای مشاهده آمار دسترسی، ابتدا اشتراک‌گذاری را فعال کنید
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional" className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          مدیریت اشتراک‌گذاری و آمار دسترسی
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              تاریخچه دسترسی
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              آمار کلی
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">تاریخچه دسترسی (30 روز اخیر)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAccessData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
              </div>
            ) : accessLogs && accessLogs.length > 0 ? (
              <div className="space-y-3">
                {accessLogs.map((log) => {
                  const DeviceIcon = getDeviceIcon(log.user_agent);
                  
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <DeviceIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getAccessMethodBadge(log.access_method)}
                            <span className="text-sm text-muted-foreground">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            IP: {log.access_ip || 'نامشخص'}
                          </div>
                        </div>
                      </div>
                      <Globe className="h-4 w-4 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Eye className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  هنوز هیچ دسترسی ثبت نشده است
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">آمار کلی (30 روز اخیر)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAccessData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
              </div>
            ) : accessStats ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card variant="gradient-blue">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {accessStats.total_accesses}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        کل دسترسی‌ها
                      </div>
                    </CardContent>
                  </Card>
                  <Card variant="gradient-green">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {accessStats.unique_ips}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        IP های منحصر به فرد
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily Access Chart */}
                {accessStats.daily_accesses.length > 0 && (
                  <Card variant="professional">
                    <CardHeader>
                      <CardTitle className="text-base">دسترسی روزانه</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {accessStats.daily_accesses.slice(-7).map((day, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">
                              {new Date(day.date).toLocaleDateString('fa-IR')}
                            </span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2 bg-blue-500 rounded"
                                style={{ 
                                  width: `${Math.max(day.count * 20, 10)}px`,
                                  maxWidth: '100px'
                                }}
                              />
                              <span className="text-sm font-medium w-8 text-right">
                                {day.count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top IPs */}
                {accessStats.top_ips.length > 0 && (
                  <Card variant="professional">
                    <CardHeader>
                      <CardTitle className="text-base">بیشترین دسترسی‌ها</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {accessStats.top_ips.slice(0, 5).map((ip, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-mono">{ip.ip}</span>
                            <Badge variant="outline">{ip.count} بار</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  آماری برای نمایش وجود ندارد
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};