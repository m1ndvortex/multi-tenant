/**
 * Online Users Table Component
 * Displays list of online users with real-time status updates
 */

import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  UserX, 
  Eye, 
  Clock, 
  Monitor, 
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react';
import { OnlineUser } from '../../types/onlineUsers';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface OnlineUsersTableProps {
  users: OnlineUser[];
  loading?: boolean;
  onUserSelect?: (user: OnlineUser) => void;
  onSetOffline?: (userId: string) => void;
  onViewSession?: (userId: string) => void;
  className?: string;
}

export const OnlineUsersTable: React.FC<OnlineUsersTableProps> = ({
  users,
  loading = false,
  onUserSelect,
  onSetOffline,
  onViewSession,
  className = ''
}) => {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const formatLastActivity = (lastActivity: string): string => {
    try {
      const date = new Date(lastActivity);
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: faIR 
      });
    } catch {
      return 'نامشخص';
    }
  };

  const formatSessionDuration = (minutes?: number): string => {
    if (!minutes || minutes === 0) return '< 1m';
    
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const getBrowserFromUserAgent = (userAgent?: string): string => {
    if (!userAgent) return 'نامشخص';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'سایر';
  };

  const getStatusBadge = (isOnline: boolean, lastActivity: string) => {
    const activityDate = new Date(lastActivity);
    const now = new Date();
    const diffMinutes = (now.getTime() - activityDate.getTime()) / (1000 * 60);

    if (isOnline && diffMinutes < 5) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <Wifi className="h-3 w-3 mr-1" />
          آنلاین
        </Badge>
      );
    } else if (isOnline && diffMinutes < 15) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          غیرفعال
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-500">
          <WifiOff className="h-3 w-3 mr-1" />
          آفلاین
        </Badge>
      );
    }
  };

  const handleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSetOffline = (userId: string) => {
    onSetOffline?.(userId);
    // Remove from selected users
    const newSelected = new Set(selectedUsers);
    newSelected.delete(userId);
    setSelectedUsers(newSelected);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${className}`}>
        <div className="p-4 border-b border-slate-200">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-4 space-x-reverse">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center ${className}`}>
        <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          هیچ کاربر آنلاینی یافت نشد
        </h3>
        <p className="text-gray-500">
          در حال حاضر هیچ کاربری در سیستم فعال نیست.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                کاربر
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                تنانت
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                وضعیت
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                آخرین فعالیت
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                مدت جلسه
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                مرورگر
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                IP
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-gray-900">
                عملیات
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow 
                key={user.id}
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer"
                onClick={() => onUserSelect?.(user)}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900">
                      {user.user_full_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {user.user_email}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-indigo-700 bg-indigo-50/30 px-2 py-1 rounded">
                      {user.tenant_name}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  {getStatusBadge(user.is_online, user.last_activity)}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="h-3 w-3" />
                    {formatLastActivity(user.last_activity)}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Monitor className="h-3 w-3" />
                    {formatSessionDuration(user.session_duration_minutes)}
                  </div>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {getBrowserFromUserAgent(user.user_agent)}
                  </span>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="font-mono text-xs">
                      {user.ip_address || 'نامشخص'}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewSession?.(user.user_id);
                      }}
                      className="h-8 px-2"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    
                    {user.is_online && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetOffline(user.user_id);
                        }}
                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OnlineUsersTable;