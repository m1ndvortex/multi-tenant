/**
 * Error Notifications Panel Component - Cybersecurity Theme
 * Displays real-time error notifications with cybersecurity aesthetics and neon effects
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { glassmorphismClasses, neonClasses } from '../../lib/theme/cybersecurity';

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
   * Get notification styling with cybersecurity theme
   */
  const getNotificationColor = (notification: ErrorNotification): string => {
    const baseClass = glassmorphismClasses.card;
    
    if (notification.read) {
      return `${baseClass} border-l-4 border-l-[#6B7280] opacity-60`;
    }

    switch (notification.severity) {
      case 'critical':
        return `${baseClass} border-l-4 border-l-[#FF4757] ${neonClasses.glow.danger}`;
      case 'high':
        return `${baseClass} border-l-4 border-l-[#FFB800] ${neonClasses.glow.warning}`;
      case 'medium':
        return `${baseClass} border-l-4 border-l-[#00D4FF] ${neonClasses.glow.primary}`;
      case 'low':
        return `${baseClass} border-l-4 border-l-[#5352ED] ${neonClasses.glow.info}`;
      default:
        return `${baseClass} border-l-4 border-l-[#6B7280]`;
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
      <motion.div 
        className={cn('text-center py-8', className)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <BellOff className={`h-12 w-12 mx-auto mb-4 ${neonClasses.text.muted}`} />
        </motion.div>
        <h3 className="text-lg font-medium text-white mb-2">No Notifications</h3>
        <p className="text-[#B8BCC8]">
          You'll see real-time error notifications here when they occur.
        </p>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Notification Controls */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          {/* Filter Buttons */}
          <div className="flex gap-1">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' 
                  ? `bg-[#00D4FF]/20 border border-[#00D4FF]/30 text-[#00D4FF] ${neonClasses.glow.primary}`
                  : `${glassmorphismClasses.base} border-white/10 text-[#B8BCC8] hover:border-[#00D4FF]/30 hover:text-[#00D4FF]`
                }
              >
                All
                <Badge className="ml-2 bg-white/10 text-white border-white/20">
                  {notifications.length}
                </Badge>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
                className={filter === 'unread' 
                  ? `bg-[#FFB800]/20 border border-[#FFB800]/30 text-[#FFB800] ${neonClasses.glow.warning}`
                  : `${glassmorphismClasses.base} border-white/10 text-[#B8BCC8] hover:border-[#FFB800]/30 hover:text-[#FFB800]`
                }
              >
                Unread
                {unreadCount > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Badge className={`ml-2 bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`}>
                      {unreadCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={filter === 'action-required' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('action-required')}
                className={filter === 'action-required' 
                  ? `bg-[#FF4757]/20 border border-[#FF4757]/30 text-[#FF4757] ${neonClasses.glow.danger}`
                  : `${glassmorphismClasses.base} border-white/10 text-[#B8BCC8] hover:border-[#FF4757]/30 hover:text-[#FF4757]`
                }
              >
                Action Required
                {actionRequiredCount > 0 && (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.3, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Badge className={`ml-2 bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`}>
                      {actionRequiredCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </motion.div>
          </div>

          {/* Show/Hide Read Toggle */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReadNotifications(!showReadNotifications)}
              className={`${glassmorphismClasses.base} border-white/10 text-[#B8BCC8] hover:border-[#A55EEA]/30 hover:text-[#A55EEA]`}
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
          </motion.div>
        </div>

        {/* Clear All Button */}
        {notifications.length > 0 && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className={`${glassmorphismClasses.base} border-[#FF4757]/30 text-[#FF4757] hover:bg-[#FF4757]/10 ${neonClasses.glow.danger}`}
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Notifications List */}
      <ScrollArea className="h-96">
        <AnimatePresence>
          <div className="space-y-2">
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                <Card
                  className={cn(
                    'transition-all duration-300 hover:shadow-2xl cursor-pointer',
                    getNotificationColor(notification),
                    !notification.read && 'shadow-lg'
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
                          'font-medium text-sm font-mono',
                          notification.read ? 'text-[#6B7280]' : 'text-white'
                        )}>
                          {notification.title}
                        </h4>
                        
                        {!notification.read && (
                          <motion.div
                            animate={{ 
                              scale: [1, 1.3, 1],
                              boxShadow: [
                                '0 0 5px rgba(0, 212, 255, 0.5)',
                                '0 0 15px rgba(0, 212, 255, 0.8)',
                                '0 0 5px rgba(0, 212, 255, 0.5)'
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 bg-[#00D4FF] rounded-full"
                          />
                        )}
                        
                        {notification.actionRequired && (
                          <motion.div
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, 2, -2, 0]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Badge className={`text-xs bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30 ${neonClasses.glow.danger}`}>
                              Action Required
                            </Badge>
                          </motion.div>
                        )}
                      </div>

                      <p className={cn(
                        'text-sm mb-2',
                        notification.read ? 'text-[#6B7280]' : 'text-[#B8BCC8]'
                      )}>
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                        <div className="flex items-center gap-1">
                          <Clock className={`h-3 w-3 ${neonClasses.text.tertiary}`} />
                          <span className="font-mono">{formatNotificationTime(notification.timestamp)}</span>
                        </div>
                        
                        <Badge 
                          className={cn(
                            'capitalize text-xs',
                            notification.severity === 'critical' && `bg-[#FF4757]/20 text-[#FF4757] border border-[#FF4757]/30`,
                            notification.severity === 'high' && `bg-[#FFB800]/20 text-[#FFB800] border border-[#FFB800]/30`,
                            notification.severity === 'medium' && `bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30`,
                            notification.severity === 'low' && `bg-[#5352ED]/20 text-[#5352ED] border border-[#5352ED]/30`
                          )}
                        >
                          {notification.severity}
                        </Badge>

                        <Badge className="capitalize text-xs bg-white/10 text-[#B8BCC8] border border-white/20">
                          {notification.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 ml-2">
                    {!notification.read && (
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className={`h-8 w-8 p-0 ${glassmorphismClasses.base} border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10`}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    )}
                    
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${glassmorphismClasses.base} border-white/10 text-[#B8BCC8] hover:border-[#A55EEA]/30 hover:text-[#A55EEA]`}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Action Required Details */}
                {notification.actionRequired && !notification.read && (
                  <motion.div 
                    className={`mt-3 p-2 ${glassmorphismClasses.base} border-[#FF4757]/30 bg-[#FF4757]/10 rounded-md ${neonClasses.glow.danger}`}
                    animate={{ 
                      boxShadow: [
                        '0 0 10px rgba(255, 71, 87, 0.3)',
                        '0 0 20px rgba(255, 71, 87, 0.6)',
                        '0 0 10px rgba(255, 71, 87, 0.3)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="flex items-center gap-2 text-[#FF4757] text-sm">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </motion.div>
                      <span className="font-medium">This notification requires your attention</span>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  </ScrollArea>

      {/* No Filtered Results */}
      {filteredNotifications.length === 0 && notifications.length > 0 && (
        <motion.div 
          className="text-center py-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Filter className={`h-12 w-12 mx-auto mb-4 ${neonClasses.text.muted}`} />
          </motion.div>
          <h3 className="text-lg font-medium text-white mb-2">No matching notifications</h3>
          <p className="text-[#B8BCC8]">
            Try adjusting your filter criteria or check back later.
          </p>
        </motion.div>
      )}

      {/* Notification Summary */}
      {notifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={`${glassmorphismClasses.card} border-[#5352ED]/30 ${neonClasses.glow.info}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[#5352ED] mb-1">
                    Notification Summary
                  </h4>
                  <p className="text-sm text-[#B8BCC8]">
                    <span className={neonClasses.text.warning}>{unreadCount} unread</span> • 
                    <span className={neonClasses.text.danger}> {actionRequiredCount} require action</span> • 
                    <span className={neonClasses.text.primary}> {notifications.length} total</span>
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          notifications
                            .filter(n => !n.read)
                            .forEach(n => onMarkAsRead(n.id));
                        }}
                        className={`${glassmorphismClasses.base} border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10 ${neonClasses.glow.secondary}`}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark All Read
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default ErrorNotificationsPanel;