import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BrainIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  AlertTriangleIcon,
  RefreshCwIcon,
  SparklesIcon
} from 'lucide-react';
import { businessIntelligenceService } from '@/services/businessIntelligenceService';

interface BusinessInsight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'info';
  title: string;
  description: string;
  value?: string;
  trend?: 'up' | 'down' | 'stable';
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  action_text?: string;
}

interface BusinessInsightsWidgetProps {
  className?: string;
}

const BusinessInsightsWidget: React.FC<BusinessInsightsWidgetProps> = ({ className }) => {
  const { data: insights, isLoading, error, refetch } = useQuery({
    queryKey: ['business-insights'],
    queryFn: () => businessIntelligenceService.getBusinessInsights(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getInsightIcon = (type: string, trend?: string) => {
    switch (type) {
      case 'positive':
        return <TrendingUpIcon className="h-5 w-5 text-green-600" />;
      case 'negative':
        return <TrendingDownIcon className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangleIcon className="h-5 w-5 text-amber-600" />;
      default:
        return <SparklesIcon className="h-5 w-5 text-blue-600" />;
    }
  };

  const getInsightBorderColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'border-l-green-500';
      case 'negative':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (priority) {
      case 'high':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'medium':
        return `${baseClasses} bg-amber-100 text-amber-800`;
      default:
        return `${baseClasses} bg-blue-100 text-blue-800`;
    }
  };

  if (isLoading) {
    return (
      <Card variant="gradient-purple" className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BrainIcon className="h-5 w-5 text-purple-600" />
            تحلیل‌های هوشمند کسب‌وکار
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="gradient-purple" className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BrainIcon className="h-5 w-5 text-purple-600" />
            تحلیل‌های هوشمند کسب‌وکار
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">خطا در بارگذاری تحلیل‌های هوشمند</p>
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
    <Card variant="gradient-purple" className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <BrainIcon className="h-5 w-5 text-purple-600" />
            تحلیل‌های هوشمند کسب‌وکار
          </CardTitle>
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
        {!insights || insights.length === 0 ? (
          <div className="text-center py-8">
            <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">هنوز تحلیل هوشمندی در دسترس نیست</p>
            <p className="text-sm text-gray-500 mt-2">
              با افزایش داده‌های کسب‌وکار، تحلیل‌های بیشتری ارائه خواهد شد
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.slice(0, 5).map((insight: BusinessInsight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border-l-4 bg-white/50 ${getInsightBorderColor(insight.type)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type, insight.trend)}
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                  </div>
                  <span className={getPriorityBadge(insight.priority)}>
                    {insight.priority === 'high' ? 'مهم' : 
                     insight.priority === 'medium' ? 'متوسط' : 'کم'}
                  </span>
                </div>
                
                <p className="text-gray-700 text-sm mb-2">{insight.description}</p>
                
                {insight.value && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-gray-900">{insight.value}</span>
                    {insight.trend && (
                      <span className={`text-sm ${
                        insight.trend === 'up' ? 'text-green-600' : 
                        insight.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {insight.trend === 'up' ? '↗️ رو به بالا' : 
                         insight.trend === 'down' ? '↘️ رو به پایین' : '➡️ ثابت'}
                      </span>
                    )}
                  </div>
                )}
                
                {insight.actionable && insight.action_text && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                  >
                    {insight.action_text}
                  </Button>
                )}
              </div>
            ))}
            
            {insights.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="text-purple-600">
                  مشاهده {insights.length - 5} تحلیل بیشتر
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;