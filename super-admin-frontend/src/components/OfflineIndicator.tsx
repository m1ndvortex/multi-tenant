import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  onRetry?: () => void;
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  onRetry, 
  className 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRetryButton, setShowRetryButton] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRetryButton(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Show retry button after 5 seconds
      setTimeout(() => setShowRetryButton(true), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <Card className={cn(
      "border-orange-200 bg-orange-50 shadow-lg",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-orange-800">You're offline</h4>
              <p className="text-sm text-orange-600">
                Working with cached data. Some features may be limited.
              </p>
            </div>
          </div>
          
          {showRetryButton && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Hook for offline detection
export const useOfflineDetection = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger a custom event when coming back online
        window.dispatchEvent(new CustomEvent('connection-restored'));
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      // Trigger a custom event when going offline
      window.dispatchEvent(new CustomEvent('connection-lost'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
};