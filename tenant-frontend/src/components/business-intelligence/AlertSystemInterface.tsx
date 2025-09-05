import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangleIcon, 
  BellIcon,
  ClockIcon,
  DollarSignIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  SettingsIcon,
  FilterIcon,
  RefreshCwIcon
} from 'lucide-react';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';
import { toast } from '@/components/ui/use-toast';

interface BusinessAlert {
  id: string;
  type: 'overdue_payment' | 'low_stock' | 'high_debt' | 'system' | 'business_opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  entity_type?: 'customer' | 'product' | 'invoice' | 'system';
  entity_id?: string;
  entity_name?: string;
  amount?: number;
  due_date?: string;
  created_at: string;
  is_read: boolean;
  is_resolved: boolean;
  actionable: boolean;
  action_url?: string;
  action_text?: string;
}

interface AlertSystemInterfaceProps {
  className?: string;
  showFilters?: boolean;
  maxAlerts?: number;
}

const AlertSystemInterface: React.FC<AlertSystemInterfaceProps> = ({ 
  className, 
  showFilters = true,
  maxAlerts = 10 
}) => {
  const [filters, setFilters] = useState({
    severity: 'all' as 'all' | 'low' | 'medium' | 'high' | 'critical',
    type: 'all' as 'all' | 'overdue_payment' | 'low_stock' | 'high_debt' | 'system' | 'business_opportunity',
    status: 'unresolved' as 'all' | 'unresolved' | 'resolved',
    read_status: 'all' as 'all' | 'read' | 'unread'
  });

  const queryClient = useQueryClient();

  const { data: alerts, isLoading, error, refetch } = useQuery({
    queryKey: ['business-alerts', filters],
    queryFn: () => businessIntelligenceService.getBusinessAlerts(filters),
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const markAsReadMutation = useMutation({
    mutationFn: (alertId: string) => businessIntelligenceService.markAlertAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-alerts'] });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) => businessIntelligenceService.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-alerts'] });
      toast({
        title: "هشدار حل شد",
        description: "هشدار با موفقیت به عنوان حل شده علامت‌گذاری شد",
      });
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'بحرانی';
      case 'high':
        return 'مهم';
      case 'medium':
        return 'متوسط';
      default:
        return 'کم';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overdue_payment':
        return <ClockIcon className="h-4 w-4" />;
      case 'low_stock':
        return <AlertTriangleIcon className="h-4 w-4" />;
      case 'high_debt':
        return <DollarSignIcon className="h-4 w-4" />;
      case 'system':
        return <SettingsIcon className="h-4 w-4" />;
      default:
        return <BellIcon className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'overdue_payment':
        return 'پرداخت معوقه';
      case 'low_stock':
        return 'موجودی کم';
      case 'high_debt':
        return 'بدهی بالا';
      case 'system':
        return 'سیستم';
      case 'business_opportunity':
        return 'فرصت کسب‌وکار';
      default:
        return 'عمومی';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleMarkAsRead = (alertId: string) => {
    markAsReadMutation.mutate(alertId);
  };

  const handleResolveAlert = (alertId: string) => {
    resolveAlertMutation.mutate(alertId);
  };

  const filteredAlerts = alerts?.slice(0, maxAlerts) || [];
  const unreadCount = alerts?.filter(alert => !alert.is_read).length || 0;

  if (isLoading) {
    return (
      <Card variant="professional" className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BellIcon className="h-5 w-5 text-orange-600" />
            هشدارها و اعلان‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
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
            <BellIcon className="h-5 w-5 text-orange-600" />
            هشدارها و اعلان‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">خطا در بارگذاری هشدارها</p>
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
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <BellIcon className="h-5 w-5 text-orange-600" />
              هشدارها و اعلان‌ها
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} خوانده نشده
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <FilterIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">فیلترها</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">همه اولویت‌ها</option>
                <option value="critical">بحرانی</option>
                <option value="high">مهم</option>
                <option value="medium">متوسط</option>
                <option value="low">کم</option>
              </select>
              
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">همه انواع</option>
                <option value="overdue_payment">پرداخت معوقه</option>
                <option value="low_stock">موجودی کم</option>
                <option value="high_debt">بدهی بالا</option>
                <option value="system">سیستم</option>
                <option value="business_opportunity">فرصت کسب‌وکار</option>
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="unresolved">حل نشده</option>
                <option value="resolved">حل شده</option>
              </select>
              
              <select
                value={filters.read_status}
                onChange={(e) => setFilters(prev => ({ ...prev, read_status: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">همه</option>
                <option value="unread">خوانده نشده</option>
                <option value="read">خوانده شده</option>
              </select>
            </div>
          </div>
        )}

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">هیچ هشداری یافت نشد</p>
            <p className="text-sm text-gray-500 mt-2">
              {filters.status === 'unresolved' ? 'همه هشدارها حل شده‌اند' : 'هنوز هشداری ایجاد نشده است'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert: BusinessAlert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition-all ${
                  alert.is_read ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${getSeverityColor(alert.severity)}`}>
                      {getTypeIcon(alert.type)}
                    </div>
                    <div>
                      <h4 className={`font-semibold ${alert.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {alert.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {getSeverityLabel(alert.severity)}
                        </Badge>
                        <span className="text-xs text-gray-500">{getTypeLabel(alert.type)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!alert.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(alert.id)}
                        className="h-8 w-8 p-0"
                        title="علامت‌گذاری به عنوان خوانده شده"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {!alert.is_resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveAlert(alert.id)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        title="علامت‌گذاری به عنوان حل شده"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <p className={`text-sm mb-2 ${alert.is_read ? 'text-gray-600' : 'text-gray-700'}`}>
                  {alert.description}
                </p>
                
                {alert.entity_name && (
                  <div className="flex items-center gap-2 mb-2">
                    <UsersIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{alert.entity_name}</span>
                    {alert.amount && (
                      <span className="text-sm font-medium text-gray-900">
                        {alert.amount.toLocaleString('fa-IR')} تومان
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{formatDate(alert.created_at)}</span>
                  
                  {alert.actionable && alert.action_text && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        if (alert.action_url) {
                          // Navigate to action URL
                          console.log('Navigate to:', alert.action_url);
                        }
                      }}
                    >
                      {alert.action_text}
                    </Button>
                  )}
                </div>
                
                {alert.is_resolved && (
                  <div className="mt-2 flex items-center gap-1 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span className="text-xs">حل شده</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertSystemInterface;