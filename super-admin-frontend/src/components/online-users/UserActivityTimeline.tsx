/**
 * User Activity Timeline Component
 * Shows detailed activity timeline for a specific user
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  User, 
  Monitor, 
  Wifi, 
  Calendar,
  Activity,
  Globe,
  X
} from 'lucide-react';
import { OnlineUser, UserSession } from '../../types/onlineUsers';
import { formatDistanceToNow, format } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface UserActivityTimelineProps {
  user: OnlineUser;
  session?: UserSession;
  onClose?: () => void;
  className?: string;
}

export const UserActivityTimeline: React.FC<UserActivityTimelineProps> = ({
  user,
  session,
  onClose,
  className = ''
}) => {
  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy/MM/dd HH:mm:ss', { locale: faIR });
    } catch {
      return 'نامشخص';
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} دقیقه`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (hours < 24) {
      return `${hours} ساعت و ${remainingMinutes} دقیقه`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} روز، ${remainingHours} ساعت و ${remainingMinutes} دقیقه`;
  };

  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: faIR 
      });
    } catch {
      return 'نامشخص';
    }
  };

  const getBrowserInfo = (userAgent?: string): { browser: string; os: string } => {
    if (!userAgent) return { browser: 'نامشخص', os: 'نامشخص' };
    
    let browser = 'سایر';
    let os = 'نامشخص';
    
    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    return { browser, os };
  };

  const { browser, os } = getBrowserInfo(user.user_agent);
  const sessionDuration = session?.session_duration_minutes || user.session_duration_minutes || 0;

  return (
    <Card className={`bg-white border border-slate-200 shadow-lg ${className}`}>
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            جزئیات فعالیت کاربر
          </CardTitle>
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* User Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            اطلاعات کاربر
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">نام کامل:</label>
              <p className="text-sm font-semibold text-gray-900">{user.user_full_name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">ایمیل:</label>
              <p className="text-sm text-gray-900">{user.user_email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">تنانت:</label>
              <p className="text-sm font-semibold text-indigo-700">{user.tenant_name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">وضعیت:</label>
              <Badge className={user.is_online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                <Wifi className="h-3 w-3 mr-1" />
                {user.is_online ? 'آنلاین' : 'آفلاین'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Session Information */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-green-600" />
            اطلاعات جلسه
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">شناسه جلسه:</label>
              <p className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border">
                {user.session_id || 'نامشخص'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">مدت جلسه:</label>
              <p className="text-sm font-semibold text-gray-900">
                {formatDuration(sessionDuration)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">شروع جلسه:</label>
              <p className="text-sm text-gray-900">
                {session ? formatDateTime(session.session_start) : formatDateTime(user.created_at)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">آخرین فعالیت:</label>
              <p className="text-sm text-gray-900">
                {formatDateTime(user.last_activity)}
                <span className="text-xs text-gray-500 block">
                  ({formatRelativeTime(user.last_activity)})
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Technical Information */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" />
            اطلاعات فنی
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">آدرس IP:</label>
              <p className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border">
                {user.ip_address || 'نامشخص'}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">مرورگر:</label>
              <p className="text-sm text-gray-900">{browser}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">سیستم عامل:</label>
              <p className="text-sm text-gray-900">{os}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">User Agent:</label>
              <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded border break-all">
                {user.user_agent || 'نامشخص'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            تاریخچه فعالیت
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">آخرین فعالیت</p>
                <p className="text-xs text-gray-600">
                  {formatDateTime(user.last_activity)} - {formatRelativeTime(user.last_activity)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">شروع جلسه</p>
                <p className="text-xs text-gray-600">
                  {session ? formatDateTime(session.session_start) : formatDateTime(user.created_at)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white rounded border">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">ایجاد رکورد</p>
                <p className="text-xs text-gray-600">
                  {formatDateTime(user.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserActivityTimeline;