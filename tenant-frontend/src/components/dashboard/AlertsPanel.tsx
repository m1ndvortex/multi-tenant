/**
 * Alerts Panel Component
 * Displays important alerts for overdue payments and upcoming installments
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  Coins,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { AlertsResponse } from '@/services/dashboardService';

interface AlertsPanelProps {
  alerts: AlertsResponse;
  isLoading?: boolean;
  onViewAlert?: (alertType: string) => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  isLoading = false,
  onViewAlert
}) => {
  if (isLoading) {
    return (
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            هشدارها و اعلان‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-16 bg-slate-200 rounded mb-3"></div>
              <div className="h-16 bg-slate-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdue_payments':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'upcoming_installments':
      case 'upcoming_gold_installments':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'low_stock':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'cash_flow':
        return <Coins className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-r-red-600 bg-red-50/80 hover:bg-red-50';
      case 'high':
        return 'border-r-red-500 bg-red-50/60 hover:bg-red-50/80';
      case 'medium':
        return 'border-r-yellow-500 bg-yellow-50/60 hover:bg-yellow-50/80';
      case 'low':
        return 'border-r-blue-500 bg-blue-50/60 hover:bg-blue-50/80';
      default:
        return 'border-r-gray-500 bg-gray-50/60 hover:bg-gray-50/80';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-red-100 text-red-700 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    const labels = {
      critical: 'بحرانی',
      high: 'مهم',
      medium: 'متوسط',
      low: 'کم'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[severity as keyof typeof colors] || colors.low}`}>
        {labels[severity as keyof typeof labels] || 'نامشخص'}
      </span>
    );
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const formatWeight = (weight: number) => {
    return weight.toFixed(3) + ' گرم';
  };

  if (alerts.total_alerts === 0) {
    return (
      <Card variant="gradient-green">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            هشدارها و اعلان‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              همه چیز عالی است!
            </h3>
            <p className="text-slate-600">
              در حال حاضر هیچ هشدار مهمی وجود ندارد.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="professional">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>هشدارها و اعلان‌ها</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">
                  {alerts.total_alerts} هشدار
                </span>
                {alerts.critical_alerts > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    {alerts.critical_alerts} بحرانی
                  </span>
                )}
                {alerts.high_alerts > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                    {alerts.high_alerts} مهم
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.alerts.map((alert, index) => (
          <div 
            key={index}
            className={`p-4 rounded-lg border-r-4 transition-all duration-200 cursor-pointer ${getSeverityColor(alert.severity)}`}
            onClick={() => onViewAlert?.(alert.type)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {getAlertIcon(alert.type)}
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">
                    {alert.title}
                  </h4>
                  {getSeverityBadge(alert.severity)}
                </div>
              </div>
              <ArrowLeft className="h-4 w-4 text-slate-400" />
            </div>
            
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
              {alert.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {alert.count && (
                  <span>تعداد: {alert.count}</span>
                )}
                {alert.amount && (
                  <span>مبلغ: {formatAmount(alert.amount)}</span>
                )}
                {alert.weight && (
                  <span>وزن: {formatWeight(alert.weight)}</span>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAlert?.(alert.type);
                }}
              >
                مشاهده
              </Button>
            </div>
          </div>
        ))}
        
        {alerts.alerts.length > 3 && (
          <div className="text-center pt-4 border-t border-slate-200">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewAlert?.('all')}
            >
              مشاهده همه هشدارها ({alerts.total_alerts})
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;