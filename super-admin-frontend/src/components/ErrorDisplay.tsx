import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/apiClient';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: ApiError | Error | null;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'card' | 'inline' | 'banner';
  showDetails?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = 'Error',
  onRetry,
  onDismiss,
  className,
  variant = 'card',
  showDetails = false,
}) => {
  if (!error) return null;

  const apiError = error as ApiError;
  const isApiError = 'status' in error;

  const getErrorIcon = () => {
    if (isApiError) {
      if (apiError.isNetworkError) {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" />
          </svg>
        );
      }
      if (apiError.isTimeoutError) {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      }
      if (apiError.status === 401 || apiError.status === 403) {
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      }
    }
    
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getErrorColor = () => {
    if (isApiError) {
      if (apiError.isNetworkError) return 'text-orange-600';
      if (apiError.isTimeoutError) return 'text-yellow-600';
      if (apiError.status === 401 || apiError.status === 403) return 'text-purple-600';
    }
    return 'text-red-600';
  };

  const getErrorMessage = () => {
    if (isApiError) {
      return apiError.message;
    }
    return error.message || 'An unexpected error occurred';
  };

  const getErrorSuggestion = () => {
    if (isApiError) {
      if (apiError.isNetworkError) {
        return 'Please check your internet connection and try again.';
      }
      if (apiError.isTimeoutError) {
        return 'The request took too long. Please try again.';
      }
      if (apiError.status === 401) {
        return 'Please log in again to continue.';
      }
      if (apiError.status === 403) {
        return 'You don\'t have permission to access this resource.';
      }
      if (apiError.status >= 500) {
        return 'There\'s a problem with our servers. Please try again later.';
      }
    }
    return 'Please try again or contact support if the problem persists.';
  };

  if (variant === 'inline') {
    return (
      <div className={cn(
        "flex items-center gap-2 text-sm",
        getErrorColor(),
        className
      )}>
        <div className="w-4 h-4">{getErrorIcon()}</div>
        <span>{getErrorMessage()}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-6 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg border-l-4",
        isApiError && apiError.isNetworkError ? "bg-orange-50 border-orange-400" :
        isApiError && apiError.isTimeoutError ? "bg-yellow-50 border-yellow-400" :
        "bg-red-50 border-red-400",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("w-6 h-6", getErrorColor())}>
            {getErrorIcon()}
          </div>
          <div>
            <h4 className={cn("font-medium", getErrorColor())}>{title}</h4>
            <p className="text-sm text-slate-600">{getErrorMessage()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-red-200 bg-red-50", className)}>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", getErrorColor())}>
          {getErrorIcon()}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-slate-800 font-medium">{getErrorMessage()}</p>
          <p className="text-sm text-slate-600 mt-1">{getErrorSuggestion()}</p>
        </div>

        {showDetails && isApiError && apiError.details && (
          <details className="bg-slate-100 p-3 rounded-lg">
            <summary className="cursor-pointer font-medium text-slate-700 mb-2">
              Technical Details
            </summary>
            <pre className="text-xs text-slate-600 whitespace-pre-wrap overflow-auto">
              {JSON.stringify(apiError.details, null, 2)}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          {onRetry && (
            <Button 
              variant="gradient-green" 
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </Button>
          )}
          
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};