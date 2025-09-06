/**
 * Business Insights Widget Component
 * Displays AI-driven business analysis in Persian
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  ArrowLeft,
  Lightbulb
} from 'lucide-react';
import { BusinessInsightsResponse } from '@/services/dashboardService';

interface BusinessInsightsWidgetProps {
  insights: BusinessInsightsResponse;
  isLoading?: boolean;
  onViewDetails?: () => void;
}

const BusinessInsightsWidget: React.FC<BusinessInsightsWidgetProps> = ({
  insights,
  isLoading = false,
  onViewDetails
}) => {
  if (isLoading) {
    return (
      <Card variant="gradient-purple">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            تحلیل‌های هوشمند کسب‌وکار
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
              <div className="h-20 bg-slate-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-r-red-500 bg-red-50/50';
      case 'medium':
        return 'border-r-yellow-500 bg-yellow-50/50';
      case 'low':
        return 'border-r-green-500 bg-green-50/50';
      default:
        return 'border-r-blue-500 bg-blue-50/50';
    }
  };

  return (
    <Card variant="gradient-purple">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            تحلیل‌های هوشمند کسب‌وکار
          </div>
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewDetails}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              مشاهده جزئیات
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-purple-600" />
            خلاصه تحلیل
          </h4>
          <p className="text-slate-700 leading-relaxed">
            {insights.summary}
          </p>
        </div>

        {/* Top Insights */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            نکات کلیدی
          </h4>
          
          {insights.insights.slice(0, 3).map((insight, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border-r-4 ${getPriorityColor(insight.priority)} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(insight.priority)}
                  <h5 className="font-medium text-slate-800 text-sm">
                    {insight.title}
                  </h5>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>تأثیر: {insight.impact_score}/10</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {insight.description}
              </p>
              
              {insight.actionable && insight.action_items.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">اقدامات پیشنهادی:</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {insight.action_items.slice(0, 2).map((action, actionIndex) => (
                      <li key={actionIndex} className="flex items-start gap-1">
                        <span className="text-purple-500 mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Top Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-100">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              توصیه‌های اولویت‌دار
            </h4>
            <ul className="space-y-2">
              {insights.recommendations.slice(0, 3).map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-purple-500 font-bold mt-1">{index + 1}.</span>
                  <span className="leading-relaxed">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Generation timestamp */}
        <div className="text-xs text-slate-500 text-center pt-2 border-t border-purple-100">
          آخرین بروزرسانی: {new Date(insights.generated_at).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInsightsWidget;