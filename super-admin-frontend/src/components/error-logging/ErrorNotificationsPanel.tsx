/**
 * Error Notifications Panel Component
 * Displays real-time error notifications with read/unread status
 */

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Filter,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ErrorNotification } from '../../types/errorLogging';

interface ErrorNotificationsPanelProps {
  notifications: ErrorNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onClearAll: () => void;
  className?: string;
}

const ErrorNotificationsPanel: React.FC<ErrorNotificationsPanelProps> = ({
  notifications,
  onMarkAsRead,
  onClearAll,
  className
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'action-required'>('all');
  const [showReadNotifications, setShowReadNotifications] = useState(true);

  /**
   * Filter notifications based on current filter
   */
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'action-required' && !notification.actionRequired) return false;
    if (!showReadNotifications && notification.read) return false;
    return true;
  });

  /**
   * Get notification icon based on type
   */
  const getNotificationIcon = (notification: ErrorNotification) => {
    switch (notification.type) {
      case 'critical_alert':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'error_resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error_update':
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  /**
   * Get notification color based on severity and read status
   */
  const getNotificationColor = (notification: ErrorNotification): string => {
    if (notification.read) {
      return 'bg-gray-50 border-gray-200';
    }

    switch (notification.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 border-l-red-500';
      case 'high':
        return 'bg-orange-50 border-orange-200 border-l-orange-500';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 border-l-yellow-500';
      case 'low':
        return 'bg-blue-50 border-blue-200 border-l-blue-500';
      default:
        return 'bg-gray-50 border-gray-200 border-l-gray-500';
    }
  };

  /**
   * Format notification time
   */
  const formatNotificationTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Get unread count
   */
  const unreadCount = notifications.filter(n => !n.read).length;
  const actionRequiredCount = notifications.filter(n => n.actionRequired && !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
        <p className="text-gray-500">
          You'll see real-time error notifications here when they occur.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Notification Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Filter Buttons */}
          <div className="flex gap-1">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={filter === 'action-required' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('action-required')}
            >
              Action Required
              {actionRequiredCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {actionRequiredCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Show/Hide Read Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReadNotifications(!showReadNotifications)}
          >
            {showReadNotifications ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Read
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Read
              </>
            )}
          </Button>
        </div>

        {/* Clear All Button */}
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-96">
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                'border-l-4 transition-all duration-200 hover:shadow-sm cursor-pointer',
                getNotificationColor(notification),
                !notification.read && 'shadow-sm'
              )}
              onClick={() => !notification.read && onMarkAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Notification Icon */}
                    <div className="mt-0.5">
                      {getNotificationIcon(notification)}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          'font-medium text-sm',
                          notification.read ? 'text-gray-600' : 'text-gray-900'
                        )}>
                          {notification.title}
                        </h4>
                        
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        
                        {notification.actionRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Action Required
                          </Badge>
                        )}
                      </div>

                      <p className={cn(
                        'text-sm mb-2',
                        notification.read ? 'text-gray-500' : 'text-gray-700'
                      )}>
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatNotificationTime(notification.timestamp)}
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'capitalize text-xs',
                            notification.severity === 'critical' && 'border-red-200 text-red-700',
                            notification.severity === 'high' && 'border-orange-200 text-orange-700',
                            notification.severity === 'medium' && 'border-yellow-200 text-yellow-700',
                            notification.severity === 'low' && 'border-blue-200 text-blue-700'
                          )}
                        >
                          {notification.severity}
                        </Badge>

                        <Badge variant="outline" className="capitalize text-xs">
                          {notification.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 ml-2">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Action Required Details */}
                {notification.actionRequired && !notification.read && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-800 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">This notification requires your attention</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* No Filtered Results */}
      {filteredNotifications.length === 0 && notifications.length > 0 && (
        <div className="text-center py-8">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matching notifications</h3>
          <p className="text-gray-500">
            Try adjusting your filter criteria or check back later.
          </p>
        </div>
      )}

      {/* Notification Summary */}
      {notifications.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Notification Summary
                </h4>
                <p className="text-sm text-blue-700">
                  {unreadCount} unread • {actionRequiredCount} require action • {notifications.length} total
                </p>
              </div>
              
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      notifications
                        .filter(n => !n.read)
                        .forEach(n => onMarkAsRead(n.id));
                    }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ErrorNotificationsPanel;