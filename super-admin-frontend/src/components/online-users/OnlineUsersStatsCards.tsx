/**
 * Online Users Statistics Cards Component - Cybersecurity Theme
 * Displays real-time statistics about online users with cybersecurity styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Activity, 
  TrendingUp, 
  Clock,
  Shield,
  Zap,
  Eye
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
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20 bg-white/10" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2 bg-white/10" />
                <Skeleton className="h-3 w-12 bg-white/10" />
              </CardContent>
            </Card>
          </motion.div>
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

  // const getStatusColor = (value: number, threshold: number = 0): string => {
  //   if (value === 0) return 'text-gray-500';
  //   if (value > threshold) return 'text-green-600';
  //   return 'text-blue-600';
  // };

  return (
    <motion.div 
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Total Online Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-400/30 hover:shadow-[0_20px_40px_rgba(0,255,136,0.15)] transition-all duration-300 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
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
                <UserCheck className="h-4 w-4 text-emerald-400" />
              </motion.div>
              <span className="text-emerald-400">آنلاین</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="text-2xl font-bold text-emerald-400 mb-1 font-mono"
              animate={{ 
                textShadow: [
                  "0 0 0px rgba(0,255,136,0.4)",
                  "0 0 12px rgba(0,255,136,0.6)",
                  "0 0 0px rgba(0,255,136,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {stats.total_online_users.toLocaleString()}
            </motion.div>
            <Badge className="text-xs bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-400/30 backdrop-blur-sm">
              <Zap className="h-3 w-3 mr-1" />
              فعال
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Total Offline Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
        <Card className="bg-white/5 border border-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all duration-300 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <UserX className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">آفلاین</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400 mb-1 font-mono">
              {stats.total_offline_users.toLocaleString()}
            </div>
            <Badge className="text-xs bg-white/5 text-gray-400 border-gray-400/30 backdrop-blur-sm">
              غیرفعال
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-400/30 hover:shadow-[0_20px_40px_rgba(0,212,255,0.15)] transition-all duration-300 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Activity className="h-4 w-4 text-cyan-400" />
              </motion.div>
              <span className="text-cyan-400">فعالیت اخیر</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="text-2xl font-bold text-cyan-400 mb-1 font-mono"
              animate={{ 
                textShadow: [
                  "0 0 0px rgba(0,212,255,0.4)",
                  "0 0 12px rgba(0,212,255,0.6)",
                  "0 0 0px rgba(0,212,255,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {stats.recent_activity_count.toLocaleString()}
            </motion.div>
            <Badge className="text-xs bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-400 border-cyan-400/30 backdrop-blur-sm">
              <Eye className="h-3 w-3 mr-1" />
              ۵ دقیقه اخیر
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Peak Online Today */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-400/30 hover:shadow-[0_20px_40px_rgba(165,94,234,0.15)] transition-all duration-300 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <motion.div
                animate={{ 
                  y: [0, -4, 0],
                  filter: [
                    "drop-shadow(0 0 0px rgba(165,94,234,0.4))",
                    "drop-shadow(0 0 15px rgba(165,94,234,0.6))",
                    "drop-shadow(0 0 0px rgba(165,94,234,0.4))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </motion.div>
              <span className="text-purple-400">بیشترین امروز</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="text-2xl font-bold text-purple-400 mb-1 font-mono"
              animate={{ 
                textShadow: [
                  "0 0 0px rgba(165,94,234,0.4)",
                  "0 0 12px rgba(165,94,234,0.6)",
                  "0 0 0px rgba(165,94,234,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {stats.peak_online_today.toLocaleString()}
            </motion.div>
            <Badge className="text-xs bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-400 border-purple-400/30 backdrop-blur-sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              حداکثر
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Average Session Duration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-400/30 hover:shadow-[0_20px_40px_rgba(255,107,53,0.15)] transition-all duration-300 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Clock className="h-4 w-4 text-orange-400" />
              </motion.div>
              <span className="text-orange-400">میانگین جلسه</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="text-2xl font-bold text-orange-400 mb-1 font-mono"
              animate={{ 
                textShadow: [
                  "0 0 0px rgba(255,107,53,0.4)",
                  "0 0 12px rgba(255,107,53,0.6)",
                  "0 0 0px rgba(255,107,53,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {formatDuration(stats.average_session_duration)}
            </motion.div>
            <Badge className="text-xs bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border-orange-400/30 backdrop-blur-sm">
              <Clock className="h-3 w-3 mr-1" />
              مدت زمان
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Total Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        whileHover={{ y: -4, scale: 1.02 }}
      >
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-400/30 hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] transition-all duration-300 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  filter: [
                    "drop-shadow(0 0 0px rgba(59,130,246,0.4))",
                    "drop-shadow(0 0 15px rgba(59,130,246,0.6))",
                    "drop-shadow(0 0 0px rgba(59,130,246,0.4))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className="h-4 w-4 text-blue-400" />
              </motion.div>
              <span className="text-blue-400">کل کاربران</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="text-2xl font-bold text-blue-400 mb-1 font-mono"
              animate={{ 
                textShadow: [
                  "0 0 0px rgba(59,130,246,0.4)",
                  "0 0 12px rgba(59,130,246,0.6)",
                  "0 0 0px rgba(59,130,246,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {(stats.total_online_users + stats.total_offline_users).toLocaleString()}
            </motion.div>
            <Badge className="text-xs bg-gradient-to-r from-blue-500/20 to-indigo-600/20 text-blue-400 border-blue-400/30 backdrop-blur-sm">
              <Users className="h-3 w-3 mr-1" />
              مجموع
            </Badge>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default OnlineUsersStatsCards;