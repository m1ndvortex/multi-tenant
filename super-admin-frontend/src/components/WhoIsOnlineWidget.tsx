import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { cn } from '@/lib/utils';

const WhoIsOnlineWidget: React.FC = () => {
  const { data: onlineData, isLoading, error, isRefetching } = useOnlineUsers();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'همین الان';
    if (diffInMinutes < 60) return `${diffInMinutes} دقیقه پیش`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ساعت پیش`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} روز پیش`;
  };

  if (error) {
    return (
      <Card variant="professional" className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            کاربران آنلاین
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-red-600">خطا در دریافت اطلاعات</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="gradient-green" className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isLoading || isRefetching 
                ? "bg-yellow-500 animate-pulse" 
                : "bg-green-500 animate-pulse"
            )}></div>
            کاربران آنلاین
          </div>
          <span className="text-2xl font-bold text-green-700">
            {onlineData?.total_count || 0}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-green-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-3 bg-green-200 rounded mb-1"></div>
                  <div className="h-2 bg-green-100 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : onlineData?.users && onlineData.users.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {onlineData.users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/50 hover:bg-white/70 transition-colors">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  {user.is_impersonation && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white">
                      <div className="w-full h-full bg-orange-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-green-800 truncate">
                      {user.email}
                    </p>
                    {user.is_impersonation && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                        جایگزین
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-green-600 truncate">
                    {user.tenant_name}
                  </p>
                  <p className="text-xs text-green-500">
                    {formatTimeAgo(user.last_activity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm text-green-600">هیچ کاربری آنلاین نیست</p>
          </div>
        )}
        
        {onlineData?.last_updated && (
          <div className="mt-4 pt-3 border-t border-green-200/50">
            <p className="text-xs text-green-600 text-center">
              آخرین بروزرسانی: {formatTimeAgo(onlineData.last_updated)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhoIsOnlineWidget;