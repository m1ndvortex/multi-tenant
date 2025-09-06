import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CriticalErrorAlert } from '@/services/errorLoggingService';


interface CriticalErrorsAlertProps {
  criticalErrors: CriticalErrorAlert[];
  isLoading: boolean;
}

export const CriticalErrorsAlert: React.FC<CriticalErrorsAlertProps> = ({
  criticalErrors,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('fa-IR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card variant="professional" className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-200 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-4 bg-orange-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-orange-200 rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (criticalErrors.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <AlertDescription className="text-green-800">
          هیچ خطای بحرانی در 24 ساعت گذشته گزارش نشده است.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card variant="professional" className="border-red-200 bg-red-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center animate-pulse">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <span className="text-red-800">خطاهای بحرانی</span>
            <Badge variant="destructive" className="text-xs">
              {criticalErrors.length} خطا
            </Badge>
          </div>
          
          {criticalErrors.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-red-700 hover:text-red-800 hover:bg-red-100"
            >
              {isExpanded ? 'کمتر' : 'بیشتر'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {(isExpanded ? criticalErrors : criticalErrors.slice(0, 3)).map((error) => (
            <div 
              key={error.id}
              className="p-3 bg-white border border-red-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    بحرانی
                  </Badge>
                  <span className="text-sm font-mono text-slate-600">
                    {error.endpoint}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {formatTimestamp(error.last_occurrence)}
                </div>
              </div>
              
              <p className="text-sm text-slate-800 mb-2 line-clamp-2">
                {error.error_message}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>نوع: {error.error_type}</span>
                  {error.tenant_id && (
                    <span>تنانت: {error.tenant_id.slice(0, 8)}...</span>
                  )}
                </div>
                
                {error.occurrence_count > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    {error.occurrence_count}x
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {criticalErrors.length > 3 && !isExpanded && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-red-700 hover:text-red-800 hover:bg-red-100"
            >
              نمایش {criticalErrors.length - 3} خطای دیگر
            </Button>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">توجه: خطاهای بحرانی نیاز به بررسی فوری دارند</p>
              <p className="text-xs text-red-700">
                این خطاها ممکن است بر عملکرد سیستم تأثیر منفی بگذارند و باید در اسرع وقت بررسی شوند.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};