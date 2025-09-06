import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface BackupStatus {
  last_backup: string;
  status: 'success' | 'running' | 'failed';
  next_backup: string;
  total_backups: number;
}

interface SystemAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  count: number;
}

interface HeaderActionsProps {
  className?: string;
}

const fetchBackupStatus = async (): Promise<BackupStatus> => {
  const response = await fetch('/api/super-admin/backup-status', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch backup status');
  }

  return response.json();
};

const fetchSystemAlerts = async (): Promise<SystemAlert[]> => {
  const response = await fetch('/api/super-admin/system-alerts', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch system alerts');
  }

  return response.json();
};

const HeaderActions: React.FC<HeaderActionsProps> = ({ className }) => {
  const [showBackupStatus, setShowBackupStatus] = useState(false);
  const [showSystemAlerts, setShowSystemAlerts] = useState(false);

  const { data: backupStatus } = useQuery({
    queryKey: ['backup-status'],
    queryFn: fetchBackupStatus,
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: systemAlerts = [] } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: fetchSystemAlerts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getBackupStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getBackupStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'running':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'failed':
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

  const criticalAlerts = systemAlerts.filter(alert => alert.type === 'critical');
  const totalCriticalCount = criticalAlerts.reduce((sum, alert) => sum + alert.count, 0);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'همین الان';
    if (diffInMinutes < 60) return `${diffInMinutes} دقیقه پیش`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ساعت پیش`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} روز پیش`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Quick Impersonation */}
      <Link to="/impersonation">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-orange-100 hover:text-orange-600 relative group"
          title="جایگزینی سریع کاربر"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            جایگزینی کاربر
          </div>
        </Button>
      </Link>

      {/* Backup Status */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowBackupStatus(!showBackupStatus)}
          className={cn(
            "hover:bg-slate-100 relative group",
            backupStatus && getBackupStatusColor(backupStatus.status)
          )}
          title="وضعیت پشتیبان‌گیری"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          
          {backupStatus && (
            <div className="absolute -top-1 -right-1">
              {getBackupStatusIcon(backupStatus.status)}
            </div>
          )}
        </Button>

        {showBackupStatus && backupStatus && (
          <Card className="absolute left-0 mt-2 w-80 z-50 shadow-xl border-0">
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-800 mb-3">وضعیت پشتیبان‌گیری</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">وضعیت فعلی:</span>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    getBackupStatusColor(backupStatus.status)
                  )}>
                    {getBackupStatusIcon(backupStatus.status)}
                    <span>
                      {backupStatus.status === 'success' ? 'موفق' :
                       backupStatus.status === 'running' ? 'در حال اجرا' :
                       backupStatus.status === 'failed' ? 'ناموفق' : 'نامشخص'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">آخرین پشتیبان:</span>
                  <span className="text-sm font-medium">
                    {formatTimeAgo(backupStatus.last_backup)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">پشتیبان بعدی:</span>
                  <span className="text-sm font-medium">
                    {new Date(backupStatus.next_backup).toLocaleTimeString('fa-IR')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">تعداد کل:</span>
                  <span className="text-sm font-medium">
                    {backupStatus.total_backups} فایل
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-200">
                <Link to="/backup-recovery">
                  <Button variant="outline" size="sm" className="w-full">
                    مدیریت پشتیبان‌ها
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* System Alerts */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSystemAlerts(!showSystemAlerts)}
          className={cn(
            "hover:bg-slate-100 relative group",
            totalCriticalCount > 0 && "text-red-600 hover:bg-red-100"
          )}
          title="هشدارهای سیستم"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          
          {totalCriticalCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {totalCriticalCount > 9 ? '9+' : totalCriticalCount}
              </span>
            </div>
          )}
        </Button>

        {showSystemAlerts && (
          <Card className="absolute left-0 mt-2 w-96 z-50 shadow-xl border-0 max-h-80 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">هشدارهای سیستم</h3>
              </div>
              
              {systemAlerts.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {systemAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex-shrink-0 w-2 h-2 rounded-full mt-2",
                          alert.type === 'critical' ? 'bg-red-500' :
                          alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        )}></div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800">
                            {alert.message}
                          </p>
                          {alert.count > 1 && (
                            <p className="text-xs text-slate-500 mt-1">
                              {alert.count} مورد
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-600">هشداری وجود ندارد</p>
                  <p className="text-xs text-slate-500 mt-1">سیستم در وضعیت عادی است</p>
                </div>
              )}
              
              <div className="p-3 border-t border-slate-200 bg-slate-50">
                <Link to="/system-health">
                  <Button variant="outline" size="sm" className="w-full">
                    مشاهده جزئیات سیستم
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HeaderActions;