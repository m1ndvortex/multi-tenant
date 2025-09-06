import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentSystemHealth } from '@/hooks/useAnalytics';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Bell, 
  BellOff,
  Settings 
} from 'lucide-react';

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
}

interface AlertThresholds {
  cpu_usage: { warning: number; critical: number };
  memory_usage: { warning: number; critical: number };
  disk_usage: { warning: number; critical: number };
  database_response_time: { warning: number; critical: number };
  api_response_time: { warning: number; critical: number };
  error_rate: { warning: number; critical: number };
  celery_failed_tasks: { warning: number; critical: number };
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  cpu_usage: { warning: 70, critical: 90 },
  memory_usage: { warning: 80, critical: 95 },
  disk_usage: { warning: 85, critical: 95 },
  database_response_time: { warning: 1000, critical: 2000 },
  api_response_time: { warning: 500, critical: 1000 },
  error_rate: { warning: 5, critical: 10 },
  celery_failed_tasks: { warning: 5, critical: 10 },
};

interface SystemHealthAlertsProps {
  className?: string;
}

const SystemHealthAlerts: React.FC<SystemHealthAlertsProps> = ({ className }) => {
  const { data: healthData } = useCurrentSystemHealth();
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);

  // Generate alerts based on current health data
  useEffect(() => {
    if (!healthData || !alertsEnabled) return;

    const newAlerts: SystemAlert[] = [];
    const now = new Date();

    // Check CPU usage
    if (healthData.cpu_usage >= thresholds.cpu_usage.critical) {
      newAlerts.push({
        id: `cpu-critical-${now.getTime()}`,
        type: 'critical',
        title: 'استفاده بحرانی از CPU',
        message: `استفاده از CPU به ${healthData.cpu_usage}% رسیده است`,
        timestamp: now,
        metric: 'cpu_usage',
        value: healthData.cpu_usage,
        threshold: thresholds.cpu_usage.critical,
        acknowledged: false,
      });
    } else if (healthData.cpu_usage >= thresholds.cpu_usage.warning) {
      newAlerts.push({
        id: `cpu-warning-${now.getTime()}`,
        type: 'warning',
        title: 'استفاده بالا از CPU',
        message: `استفاده از CPU به ${healthData.cpu_usage}% رسیده است`,
        timestamp: now,
        metric: 'cpu_usage',
        value: healthData.cpu_usage,
        threshold: thresholds.cpu_usage.warning,
        acknowledged: false,
      });
    }

    // Check Memory usage
    if (healthData.memory_usage >= thresholds.memory_usage.critical) {
      newAlerts.push({
        id: `memory-critical-${now.getTime()}`,
        type: 'critical',
        title: 'استفاده بحرانی از حافظه',
        message: `استفاده از حافظه به ${healthData.memory_usage}% رسیده است`,
        timestamp: now,
        metric: 'memory_usage',
        value: healthData.memory_usage,
        threshold: thresholds.memory_usage.critical,
        acknowledged: false,
      });
    } else if (healthData.memory_usage >= thresholds.memory_usage.warning) {
      newAlerts.push({
        id: `memory-warning-${now.getTime()}`,
        type: 'warning',
        title: 'استفاده بالا از حافظه',
        message: `استفاده از حافظه به ${healthData.memory_usage}% رسیده است`,
        timestamp: now,
        metric: 'memory_usage',
        value: healthData.memory_usage,
        threshold: thresholds.memory_usage.warning,
        acknowledged: false,
      });
    }

    // Check Disk usage
    if (healthData.disk_usage >= thresholds.disk_usage.critical) {
      newAlerts.push({
        id: `disk-critical-${now.getTime()}`,
        type: 'critical',
        title: 'استفاده بحرانی از دیسک',
        message: `استفاده از دیسک به ${healthData.disk_usage}% رسیده است`,
        timestamp: now,
        metric: 'disk_usage',
        value: healthData.disk_usage,
        threshold: thresholds.disk_usage.critical,
        acknowledged: false,
      });
    } else if (healthData.disk_usage >= thresholds.disk_usage.warning) {
      newAlerts.push({
        id: `disk-warning-${now.getTime()}`,
        type: 'warning',
        title: 'استفاده بالا از دیسک',
        message: `استفاده از دیسک به ${healthData.disk_usage}% رسیده است`,
        timestamp: now,
        metric: 'disk_usage',
        value: healthData.disk_usage,
        threshold: thresholds.disk_usage.warning,
        acknowledged: false,
      });
    }

    // Check Database response time
    if (healthData.database_response_time >= thresholds.database_response_time.critical) {
      newAlerts.push({
        id: `db-critical-${now.getTime()}`,
        type: 'critical',
        title: 'زمان پاسخ بحرانی دیتابیس',
        message: `زمان پاسخ دیتابیس به ${healthData.database_response_time}ms رسیده است`,
        timestamp: now,
        metric: 'database_response_time',
        value: healthData.database_response_time,
        threshold: thresholds.database_response_time.critical,
        acknowledged: false,
      });
    } else if (healthData.database_response_time >= thresholds.database_response_time.warning) {
      newAlerts.push({
        id: `db-warning-${now.getTime()}`,
        type: 'warning',
        title: 'زمان پاسخ بالا دیتابیس',
        message: `زمان پاسخ دیتابیس به ${healthData.database_response_time}ms رسیده است`,
        timestamp: now,
        metric: 'database_response_time',
        value: healthData.database_response_time,
        threshold: thresholds.database_response_time.warning,
        acknowledged: false,
      });
    }

    // Check API response time
    if (healthData.api_response_time >= thresholds.api_response_time.critical) {
      newAlerts.push({
        id: `api-critical-${now.getTime()}`,
        type: 'critical',
        title: 'زمان پاسخ بحرانی API',
        message: `زمان پاسخ API به ${healthData.api_response_time}ms رسیده است`,
        timestamp: now,
        metric: 'api_response_time',
        value: healthData.api_response_time,
        threshold: thresholds.api_response_time.critical,
        acknowledged: false,
      });
    } else if (healthData.api_response_time >= thresholds.api_response_time.warning) {
      newAlerts.push({
        id: `api-warning-${now.getTime()}`,
        type: 'warning',
        title: 'زمان پاسخ بالا API',
        message: `زمان پاسخ API به ${healthData.api_response_time}ms رسیده است`,
        timestamp: now,
        metric: 'api_response_time',
        value: healthData.api_response_time,
        threshold: thresholds.api_response_time.warning,
        acknowledged: false,
      });
    }

    // Check Error rate
    if (healthData.error_rate >= thresholds.error_rate.critical) {
      newAlerts.push({
        id: `error-critical-${now.getTime()}`,
        type: 'critical',
        title: 'نرخ خطای بحرانی',
        message: `نرخ خطا به ${healthData.error_rate}% رسیده است`,
        timestamp: now,
        metric: 'error_rate',
        value: healthData.error_rate,
        threshold: thresholds.error_rate.critical,
        acknowledged: false,
      });
    } else if (healthData.error_rate >= thresholds.error_rate.warning) {
      newAlerts.push({
        id: `error-warning-${now.getTime()}`,
        type: 'warning',
        title: 'نرخ خطای بالا',
        message: `نرخ خطا به ${healthData.error_rate}% رسیده است`,
        timestamp: now,
        metric: 'error_rate',
        value: healthData.error_rate,
        threshold: thresholds.error_rate.warning,
        acknowledged: false,
      });
    }

    // Check Celery failed tasks
    if (healthData.celery_failed_tasks >= thresholds.celery_failed_tasks.critical) {
      newAlerts.push({
        id: `celery-critical-${now.getTime()}`,
        type: 'critical',
        title: 'تسک‌های ناموفق بحرانی',
        message: `تعداد تسک‌های ناموفق به ${healthData.celery_failed_tasks} رسیده است`,
        timestamp: now,
        metric: 'celery_failed_tasks',
        value: healthData.celery_failed_tasks,
        threshold: thresholds.celery_failed_tasks.critical,
        acknowledged: false,
      });
    } else if (healthData.celery_failed_tasks >= thresholds.celery_failed_tasks.warning) {
      newAlerts.push({
        id: `celery-warning-${now.getTime()}`,
        type: 'warning',
        title: 'تسک‌های ناموفق زیاد',
        message: `تعداد تسک‌های ناموفق به ${healthData.celery_failed_tasks} رسیده است`,
        timestamp: now,
        metric: 'celery_failed_tasks',
        value: healthData.celery_failed_tasks,
        threshold: thresholds.celery_failed_tasks.warning,
        acknowledged: false,
      });
    }

    // Update alerts, avoiding duplicates
    setAlerts(prevAlerts => {
      const existingAlertIds = new Set(prevAlerts.map(alert => alert.id));
      const uniqueNewAlerts = newAlerts.filter(alert => !existingAlertIds.has(alert.id));
      
      // Keep only recent alerts (last 24 hours) and add new ones
      const recentAlerts = prevAlerts.filter(alert => 
        now.getTime() - alert.timestamp.getTime() < 24 * 60 * 60 * 1000
      );
      
      return [...recentAlerts, ...uniqueNewAlerts];
    });
  }, [healthData, alertsEnabled, thresholds]);

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertBadgeColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);
  const criticalAlerts = activeAlerts.filter(alert => alert.type === 'critical');
  const warningAlerts = activeAlerts.filter(alert => alert.type === 'warning');

  return (
    <Card variant="professional" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            هشدارهای سیستم
            {activeAlerts.length > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                {activeAlerts.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className="text-slate-600 hover:text-slate-800"
              aria-label={alertsEnabled ? "غیرفعال کردن هشدارها" : "فعال کردن هشدارها"}
            >
              {alertsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </Button>
            {alerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllAlerts}
                className="text-slate-600 hover:text-slate-800"
              >
                پاک کردن همه
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!alertsEnabled ? (
          <div className="text-center py-8">
            <BellOff className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">هشدارها غیرفعال شده‌اند</p>
            <Button
              variant="gradient-green"
              size="sm"
              onClick={() => setAlertsEnabled(true)}
              className="mt-2"
            >
              فعال کردن هشدارها
            </Button>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-slate-600">همه سیستم‌ها سالم هستند</p>
            <p className="text-sm text-slate-500 mt-1">هیچ هشدار فعالی وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-800">هشدارهای بحرانی</span>
                  <Badge className="bg-red-100 text-red-800">
                    {criticalAlerts.length}
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-yellow-800">هشدارهای عادی</span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {warningAlerts.length}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Alert List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activeAlerts
                .sort((a, b) => {
                  // Sort by type (critical first) then by timestamp (newest first)
                  if (a.type !== b.type) {
                    return a.type === 'critical' ? -1 : 1;
                  }
                  return b.timestamp.getTime() - a.timestamp.getTime();
                })
                .map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200",
                      alert.type === 'critical' 
                        ? "bg-red-50 border-red-200 hover:bg-red-100" 
                        : "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-800">{alert.title}</h4>
                            <Badge className={cn('text-xs', getAlertBadgeColor(alert.type))}>
                              {alert.type === 'critical' ? 'بحرانی' : 'هشدار'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              زمان: {alert.timestamp.toLocaleTimeString('fa-IR')}
                            </span>
                            <span>
                              آستانه: {alert.threshold}{alert.metric.includes('time') ? 'ms' : '%'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-slate-500 hover:text-slate-700 p-1"
                          title="تأیید هشدار"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                          className="text-slate-500 hover:text-slate-700 p-1"
                          title="حذف هشدار"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthAlerts;