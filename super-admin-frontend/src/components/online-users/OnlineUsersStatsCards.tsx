/**
 * Online Users Statistics Cards Component
 * Displays real-time statistics about online users
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Activity, 
  TrendingUp, 
  Clock 
} from 'lucide-react';
import { OnlineUsersStats } from '../../types/onlineUsers';

interface OnlineUsersStatsCardsProps {
  stats: OnlineUsersStats | null;
  loading?: boolean;
  className?: string;
}

export const OnlineUsersStatsCards: React.FC<OnlineUsersStatsCardsProps> = ({
  stats,
  loading = false,
  className = ''
}) => {
  if (loading || !stats) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="bg-gradient-to-br from-slate-50 to-slate-100/80">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  // getStatusColor function removed as unused

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 ${className}`}>
      {/* Total Online Users */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-200 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            آنلاین
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700 mb-1">
            {stats.total_online_users.toLocaleString()}
          </div>
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
            فعال
          </Badge>
        </CardContent>
      </Card>

      {/* Total Offline Users */}
      <Card className="bg-gradient-to-br from-gray-50 to-slate-100/50 border-gray-200 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <UserX className="h-4 w-4 text-gray-500" />
            آفلاین
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600 mb-1">
            {stats.total_offline_users.toLocaleString()}
          </div>
          <Badge variant="outline" className="text-xs">
            غیرفعال
          </Badge>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100/50 border-blue-200 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            فعالیت اخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700 mb-1">
            {stats.recent_activity_count.toLocaleString()}
          </div>
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
            ۵ دقیقه اخیر
          </Badge>
        </CardContent>
      </Card>

      {/* Peak Online Today */}
      <Card className="bg-gradient-to-br from-purple-50 to-violet-100/50 border-purple-200 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            بیشترین امروز
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700 mb-1">
            {stats.peak_online_today.toLocaleString()}
          </div>
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
            حداکثر
          </Badge>
        </CardContent>
      </Card>

      {/* Average Session Duration */}
      <Card className="bg-gradient-to-br from-orange-50 to-amber-100/50 border-orange-200 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            میانگین جلسه
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-700 mb-1">
            {formatDuration(stats.average_session_duration)}
          </div>
          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
            مدت زمان
          </Badge>
        </CardContent>
      </Card>

      {/* Total Users */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-100/50 border-indigo-200 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            کل کاربران
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-700 mb-1">
            {(stats.total_online_users + stats.total_offline_users).toLocaleString()}
          </div>
          <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
            مجموع
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnlineUsersStatsCards;