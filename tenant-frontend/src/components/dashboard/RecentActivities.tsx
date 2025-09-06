/**
 * Recent Activities Component
 * Displays recent business activities and transactions
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  FileText, 
  DollarSign, 
  Users, 
  Package,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { RecentActivity } from '@/services/dashboardService';

interface RecentActivitiesProps {
  activities: RecentActivity[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({
  activities,
  isLoading = false,
  onViewAll
}) => {
  if (isLoading) {
    return (
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            فعالیت‌های اخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return <FileText className="h-5 w-5 text-green-600" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-blue-600" />;
      case 'customer_added':
        return <Users className="h-5 w-5 text-purple-600" />;
      case 'product_added':
        return <Package className="h-5 w-5 text-orange-600" />;
      case 'installment_paid':
        return <CheckCircle className="h-5 w-5 text-teal-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-slate-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return 'from-green-500 to-green-600';
      case 'payment_received':
        return 'from-blue-500 to-blue-600';
      case 'customer_added':
        return 'from-purple-500 to-purple-600';
      case 'product_added':
        return 'from-orange-500 to-orange-600';
      case 'installment_paid':
        return 'from-teal-500 to-teal-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} دقیقه پیش`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ساعت پیش`;
    } else {
      return date.toLocaleDateString('fa-IR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (activities.length === 0) {
    return (
      <Card variant="professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            فعالیت‌های اخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">
              فعالیتی یافت نشد
            </h3>
            <p className="text-slate-500">
              هنوز هیچ فعالیت اخیری ثبت نشده است.
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
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            فعالیت‌های اخیر
          </div>
          {onViewAll && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewAll}
            >
              مشاهده همه
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => (
          <div 
            key={activity.reference_id}
            className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all duration-200"
          >
            {/* Activity Icon */}
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getActivityColor(activity.type)} flex items-center justify-center shadow-sm`}>
              {getActivityIcon(activity.type)}
            </div>
            
            {/* Activity Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-semibold text-slate-800 text-sm">
                  {activity.title}
                </h4>
                <span className="text-xs text-slate-500 whitespace-nowrap mr-2">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
              
              <p className="text-sm text-slate-600 leading-relaxed mb-2">
                {activity.description}
              </p>
              
              {/* Activity Details */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {activity.amount && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatAmount(activity.amount)}
                  </span>
                )}
                
                {activity.customer && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {activity.customer}
                  </span>
                )}
                
                {activity.invoice_number && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {activity.invoice_number}
                  </span>
                )}
                
                {activity.status && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : activity.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {activity.status === 'paid' ? 'پرداخت شده' : 
                     activity.status === 'pending' ? 'در انتظار' : 
                     activity.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {activities.length > 5 && onViewAll && (
          <div className="text-center pt-4 border-t border-slate-200">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onViewAll}
            >
              مشاهده {activities.length - 5} فعالیت دیگر
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivities;