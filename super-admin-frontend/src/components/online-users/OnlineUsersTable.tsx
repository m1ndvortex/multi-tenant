/**
 * Online Users Table Component - Cybersecurity Theme
 * Displays list of online users with cybersecurity-themed styling and real-time status updates
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  WifiOff,
  Shield,
  Zap
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
        <motion.div
          animate={{ 
            boxShadow: [
              "0 0 0px rgba(0,255,136,0.4)",
              "0 0 15px rgba(0,255,136,0.6)",
              "0 0 0px rgba(0,255,136,0.4)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-400/30 backdrop-blur-sm">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Wifi className="h-3 w-3 mr-1" />
            </motion.div>
            آنلاین
          </Badge>
        </motion.div>
      );
    } else if (isOnline && diffMinutes < 15) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 border-yellow-400/30 backdrop-blur-sm">
          <Clock className="h-3 w-3 mr-1" />
          غیرفعال
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-white/5 text-gray-400 border-gray-400/30 backdrop-blur-sm">
          <WifiOff className="h-3 w-3 mr-1" />
          آفلاین
        </Badge>
      );
    }
  };

  // const handleUserSelect = (userId: string) => {
  //   const newSelected = new Set(selectedUsers);
  //   if (newSelected.has(userId)) {
  //     newSelected.delete(userId);
  //   } else {
  //     newSelected.add(userId);
  //   }
  //   setSelectedUsers(newSelected);
  // };

  const handleSetOffline = (userId: string) => {
    onSetOffline?.(userId);
    // Remove from selected users
    const newSelected = new Set(selectedUsers);
    newSelected.delete(userId);
    setSelectedUsers(newSelected);
  };

  if (loading) {
    return (
      <motion.div 
        className={`bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-4 border-b border-white/10">
          <Skeleton className="h-6 w-32 bg-white/10" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <motion.div 
              key={index} 
              className="flex items-center space-x-4 space-x-reverse"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Skeleton className="h-4 w-4 bg-white/10" />
              <Skeleton className="h-4 w-32 bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-4 w-20 bg-white/10" />
              <Skeleton className="h-4 w-16 bg-white/10" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (users.length === 0) {
    return (
      <motion.div 
        className={`bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-8 text-center ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ 
            filter: [
              "drop-shadow(0 0 0px rgba(156,163,175,0.4))",
              "drop-shadow(0 0 20px rgba(156,163,175,0.6))",
              "drop-shadow(0 0 0px rgba(156,163,175,0.4))"
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        </motion.div>
        <h3 className="text-lg font-medium text-white mb-2">
          هیچ کاربر آنلاینی یافت نشد
        </h3>
        <p className="text-gray-400">
          در حال حاضر هیچ کاربری در سیستم فعال نیست.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-orange-500/10 border-b border-white/10">
              <TableHead className="text-right text-sm font-semibold text-cyan-400">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  کاربر
                </div>
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-emerald-400">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  تنانت
                </div>
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-orange-400">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  وضعیت
                </div>
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-purple-400">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  آخرین فعالیت
                </div>
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-cyan-400">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  مدت جلسه
                </div>
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-emerald-400">
                مرورگر
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-orange-400">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  IP
                </div>
              </TableHead>
              <TableHead className="text-right text-sm font-semibold text-purple-400">
                عملیات
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-all duration-300 cursor-pointer group"
                  onClick={() => onUserSelect?.(user)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 0 20px rgba(0, 212, 255, 0.1)"
                  }}
                >
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <motion.span 
                      className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      {user.user_full_name}
                    </motion.span>
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      {user.user_email}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-col">
                    <motion.span 
                      className="text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-2 py-1 rounded-lg backdrop-blur-sm group-hover:bg-emerald-500/20 group-hover:border-emerald-400/40 transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                    >
                      {user.tenant_name}
                    </motion.span>
                  </div>
                </TableCell>
                
                <TableCell>
                  {getStatusBadge(user.is_online, user.last_activity)}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-300 group-hover:text-purple-400 transition-colors duration-300">
                    <Clock className="h-3 w-3" />
                    {formatLastActivity(user.last_activity)}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-300 group-hover:text-cyan-400 transition-colors duration-300">
                    <Monitor className="h-3 w-3" />
                    <motion.span
                      className="font-mono text-emerald-400 font-bold"
                      animate={{ 
                        textShadow: [
                          "0 0 0px rgba(0,255,136,0.4)",
                          "0 0 8px rgba(0,255,136,0.6)",
                          "0 0 0px rgba(0,255,136,0.4)"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {formatSessionDuration(user.session_duration_minutes)}
                    </motion.span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <span className="text-sm text-gray-300 group-hover:text-emerald-400 transition-colors duration-300">
                    {getBrowserFromUserAgent(user.user_agent)}
                  </span>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-gray-300 group-hover:text-orange-400 transition-colors duration-300">
                    <MapPin className="h-3 w-3" />
                    <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded border border-white/10 group-hover:border-orange-400/30 transition-all duration-300">
                      {user.ip_address || 'نامشخص'}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSession?.(user.user_id);
                        }}
                        className="h-8 px-2 bg-white/5 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </motion.div>
                    
                    {user.is_online && (
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetOffline(user.user_id);
                          }}
                          className="h-8 px-2 bg-white/5 border-red-400/30 text-red-400 hover:bg-red-400/10 hover:border-red-400/50 hover:text-red-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,71,87,0.3)]"
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </TableCell>
              </motion.tr>
            ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default OnlineUsersTable;