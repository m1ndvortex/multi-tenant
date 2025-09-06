import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SystemHealth {
  cpu_usage: number;
  memory_usage: number;
  database_status: 'healthy' | 'warning' | 'error';
  redis_status: 'healthy' | 'warning' | 'error';
  celery_status: 'healthy' | 'warning' | 'error';
}

interface SystemStatusIndicatorProps {
  systemHealth?: SystemHealth;
  className?: string;
}

const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({ 
  systemHealth, 
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!systemHealth) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-slate-600">در حال بارگذاری...</span>
      </div>
    );
  }

  const getOverallStatus = () => {
    const statuses = [
      systemHealth.database_status,
      systemHealth.redis_status,
      systemHealth.celery_status
    ];

    if (statuses.includes('error')) return 'error';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

  const overallStatus = getOverallStatus();
  const statusColor = getStatusColor(overallStatus);

  const services = [
    { name: 'دیتابیس', status: systemHealth.database_status, key: 'database' },
    { name: 'Redis', status: systemHealth.redis_status, key: 'redis' },
    { name: 'Celery', status: systemHealth.celery_status, key: 'celery' }
  ];

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:shadow-md",
          statusColor
        )}
        title="وضعیت سیستم"
      >
        {getStatusIcon(overallStatus)}
        <span className="text-sm font-medium">
          سیستم {overallStatus === 'healthy' ? 'سالم' : overallStatus === 'warning' ? 'هشدار' : 'خطا'}
        </span>
        <svg 
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <Card className="absolute top-full left-0 mt-2 w-80 z-50 shadow-xl border-0">
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">جزئیات وضعیت سیستم</h3>
            
            {/* Resource Usage */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-600">استفاده از CPU</span>
                  <span className="text-sm font-medium">{systemHealth.cpu_usage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      systemHealth.cpu_usage > 80 ? "bg-red-500" :
                      systemHealth.cpu_usage > 60 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${systemHealth.cpu_usage}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-600">استفاده از حافظه</span>
                  <span className="text-sm font-medium">{systemHealth.memory_usage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      systemHealth.memory_usage > 80 ? "bg-red-500" :
                      systemHealth.memory_usage > 60 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${systemHealth.memory_usage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Services Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 mb-2">وضعیت سرویس‌ها</h4>
              {services.map((service) => (
                <div key={service.key} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="text-sm text-slate-700">{service.name}</span>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    getStatusColor(service.status)
                  )}>
                    {getStatusIcon(service.status)}
                    <span>
                      {service.status === 'healthy' ? 'سالم' : 
                       service.status === 'warning' ? 'هشدار' : 'خطا'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                آخرین بروزرسانی: {new Date().toLocaleTimeString('fa-IR')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SystemStatusIndicator;