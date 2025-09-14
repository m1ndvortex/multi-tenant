/**
 * User Activity Timeline Component - Cybersecurity Theme
 * Shows detailed activity timeline for a specific user with cybersecurity styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  User, 
  Monitor, 
  Wifi, 
  Calendar,
  Globe,
  X,
  Shield,
  Zap,
  Eye,
  Clock
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
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}>
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <motion.div
                animate={{ 
                  filter: [
                    "drop-shadow(0 0 0px rgba(0,212,255,0.6))",
                    "drop-shadow(0 0 15px rgba(0,212,255,0.8))",
                    "drop-shadow(0 0 0px rgba(0,212,255,0.6))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className="h-5 w-5 text-cyan-400" />
              </motion.div>
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                جزئیات فعالیت کاربر
              </span>
            </CardTitle>
            
            {onClose && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* User Information */}
          <motion.div 
            className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-2xl p-4 border border-cyan-400/20 backdrop-blur-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <User className="h-5 w-5 text-cyan-400" />
              </motion.div>
              <span className="text-cyan-400">اطلاعات کاربر</span>
            </h3>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <label className="text-sm font-medium text-gray-400">نام کامل:</label>
                <p className="text-sm font-semibold text-white">{user.user_full_name}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <label className="text-sm font-medium text-gray-400">ایمیل:</label>
                <p className="text-sm text-gray-300">{user.user_email}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <label className="text-sm font-medium text-gray-400">تنانت:</label>
                <p className="text-sm font-semibold text-emerald-400">{user.tenant_name}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <label className="text-sm font-medium text-gray-400">وضعیت:</label>
                <motion.div
                  animate={user.is_online ? { 
                    boxShadow: [
                      "0 0 0px rgba(0,255,136,0.4)",
                      "0 0 15px rgba(0,255,136,0.6)",
                      "0 0 0px rgba(0,255,136,0.4)"
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge className={user.is_online ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-400/30' : 'bg-white/5 text-gray-400 border-gray-400/30'}>
                    <Wifi className="h-3 w-3 mr-1" />
                    {user.is_online ? 'آنلاین' : 'آفلاین'}
                  </Badge>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Session Information */}
          <motion.div 
            className="bg-gradient-to-r from-emerald-500/10 to-orange-500/10 rounded-2xl p-4 border border-emerald-400/20 backdrop-blur-sm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 0px rgba(0,255,136,0.4)",
                    "0 0 20px rgba(0,255,136,0.6)",
                    "0 0 0px rgba(0,255,136,0.4)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Monitor className="h-5 w-5 text-emerald-400" />
              </motion.div>
              <span className="text-emerald-400">اطلاعات جلسه</span>
            </h3>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <label className="text-sm font-medium text-gray-400">شناسه جلسه:</label>
                <p className="text-sm font-mono text-orange-400 bg-white/5 px-2 py-1 rounded border border-orange-400/20 backdrop-blur-sm">
                  {user.session_id || 'نامشخص'}
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <label className="text-sm font-medium text-gray-400">مدت جلسه:</label>
                <motion.p 
                  className="text-sm font-semibold text-emerald-400 font-mono"
                  animate={{ 
                    textShadow: [
                      "0 0 0px rgba(0,255,136,0.4)",
                      "0 0 8px rgba(0,255,136,0.6)",
                      "0 0 0px rgba(0,255,136,0.4)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {formatDuration(sessionDuration)}
                </motion.p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <label className="text-sm font-medium text-gray-400">شروع جلسه:</label>
                <p className="text-sm text-gray-300">
                  {session ? formatDateTime(session.session_start) : formatDateTime(user.created_at)}
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <label className="text-sm font-medium text-gray-400">آخرین فعالیت:</label>
                <p className="text-sm text-gray-300">
                  {formatDateTime(user.last_activity)}
                  <span className="text-xs text-gray-500 block">
                    ({formatRelativeTime(user.last_activity)})
                  </span>
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Technical Information */}
          <motion.div 
            className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl p-4 border border-purple-400/20 backdrop-blur-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <Globe className="h-5 w-5 text-purple-400" />
              </motion.div>
              <span className="text-purple-400">اطلاعات فنی</span>
            </h3>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <label className="text-sm font-medium text-gray-400">آدرس IP:</label>
                <p className="text-sm font-mono text-cyan-400 bg-white/5 px-2 py-1 rounded border border-cyan-400/20 backdrop-blur-sm">
                  {user.ip_address || 'نامشخص'}
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <label className="text-sm font-medium text-gray-400">مرورگر:</label>
                <p className="text-sm text-gray-300">{browser}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <label className="text-sm font-medium text-gray-400">سیستم عامل:</label>
                <p className="text-sm text-gray-300">{os}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
              >
                <label className="text-sm font-medium text-gray-400">User Agent:</label>
                <p className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10 break-all backdrop-blur-sm">
                  {user.user_agent || 'نامشخص'}
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div 
            className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-2xl p-4 border border-orange-400/20 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <motion.div
                animate={{ 
                  filter: [
                    "drop-shadow(0 0 0px rgba(255,107,53,0.4))",
                    "drop-shadow(0 0 15px rgba(255,107,53,0.6))",
                    "drop-shadow(0 0 0px rgba(255,107,53,0.4))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Calendar className="h-5 w-5 text-orange-400" />
              </motion.div>
              <span className="text-orange-400">تاریخچه فعالیت</span>
            </h3>
            
            <div className="space-y-3">
              <motion.div 
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-emerald-400/20 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <motion.div 
                  className="w-2 h-2 bg-emerald-400 rounded-full"
                  animate={{ 
                    boxShadow: [
                      "0 0 0px rgba(0,255,136,0.4)",
                      "0 0 10px rgba(0,255,136,0.8)",
                      "0 0 0px rgba(0,255,136,0.4)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <Zap className="h-3 w-3 text-emerald-400" />
                    آخرین فعالیت
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(user.last_activity)} - {formatRelativeTime(user.last_activity)}
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-cyan-400/20 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <motion.div 
                  className="w-2 h-2 bg-cyan-400 rounded-full"
                  animate={{ 
                    boxShadow: [
                      "0 0 0px rgba(0,212,255,0.4)",
                      "0 0 10px rgba(0,212,255,0.8)",
                      "0 0 0px rgba(0,212,255,0.4)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <Eye className="h-3 w-3 text-cyan-400" />
                    شروع جلسه
                  </p>
                  <p className="text-xs text-gray-400">
                    {session ? formatDateTime(session.session_start) : formatDateTime(user.created_at)}
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-purple-400/20 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
              >
                <motion.div 
                  className="w-2 h-2 bg-purple-400 rounded-full"
                  animate={{ 
                    boxShadow: [
                      "0 0 0px rgba(165,94,234,0.4)",
                      "0 0 10px rgba(165,94,234,0.8)",
                      "0 0 0px rgba(165,94,234,0.4)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="h-3 w-3 text-purple-400" />
                    ایجاد رکورد
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDateTime(user.created_at)}
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserActivityTimeline;