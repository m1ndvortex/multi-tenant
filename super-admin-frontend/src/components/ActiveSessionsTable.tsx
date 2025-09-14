import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  StopCircle, 
  Clock, 
  User, 
  Shield, 
  Globe,
  Smartphone,
  ExternalLink,
  Monitor,
  Activity,
  AlertCircle,
  Zap
} from 'lucide-react';
import { ActiveSession } from '@/types/impersonation';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface ActiveSessionsTableProps {
  sessions: ActiveSession[];
  onTerminateSession: (sessionId: string) => void;
  isLoading?: boolean;
  terminatingSessionId?: string;
}

const ActiveSessionsTable: React.FC<ActiveSessionsTableProps> = ({
  sessions,
  onTerminateSession,
  isLoading = false,
  terminatingSessionId,
}) => {
  const getStatusBadge = (session: ActiveSession) => {
    if (session.window_closed_detected) {
      return (
        <motion.div
          animate={{ 
            boxShadow: [
              "0 0 10px rgba(255,184,0,0.4)",
              "0 0 20px rgba(255,184,0,0.6)",
              "0 0 10px rgba(255,184,0,0.4)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 shadow-[0_0_10px_rgba(255,184,0,0.3)] flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            پنجره بسته شده
          </Badge>
        </motion.div>
      );
    }
    
    switch (session.status) {
      case 'active':
        return (
          <motion.div
            animate={{ 
              boxShadow: [
                "0 0 10px rgba(0,255,136,0.4)",
                "0 0 20px rgba(0,255,136,0.6)",
                "0 0 10px rgba(0,255,136,0.4)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(0,255,136,0.3)] flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              فعال
            </Badge>
          </motion.div>
        );
      case 'expired':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-400/30 shadow-[0_0_10px_rgba(255,71,87,0.3)] flex items-center gap-1">
            <Clock className="h-3 w-3" />
            منقضی شده
          </Badge>
        );
      case 'terminated':
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 shadow-[0_0_10px_rgba(156,163,175,0.3)] flex items-center gap-1">
            <StopCircle className="h-3 w-3" />
            خاتمه یافته
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 shadow-[0_0_10px_rgba(156,163,175,0.3)]">
            {session.status}
          </Badge>
        );
    }
  };

  const getSessionTypeBadge = (session: ActiveSession) => {
    if (session.is_window_based) {
      return (
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30 shadow-[0_0_10px_rgba(0,212,255,0.3)] flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          پنجره جدید
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30 shadow-[0_0_10px_rgba(165,94,234,0.3)] flex items-center gap-1">
          <Monitor className="h-3 w-3" />
          تغییر مسیر
        </Badge>
      );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: faIR,
      });
    } catch {
      return 'نامشخص';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    try {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();
      
      if (diff <= 0) {
        return 'منقضی شده';
      }
      
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (hours > 0) {
        return `${hours} ساعت و ${remainingMinutes} دقیقه`;
      } else {
        return `${remainingMinutes} دقیقه`;
      }
    } catch {
      return 'نامشخص';
    }
  };

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return 'نامشخص';
    
    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    
    return 'نامشخص';
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 10px rgba(255,107,53,0.4)",
                    "0 0 20px rgba(255,107,53,0.6)",
                    "0 0 10px rgba(255,107,53,0.4)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="p-2 rounded-lg bg-orange-500/20 border border-orange-400/30"
              >
                <Activity className="h-5 w-5 text-orange-400 drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]" />
              </motion.div>
              جلسات فعال جانشینی
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full"
              />
              <div className="text-gray-300 mr-4 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
                در حال بارگذاری جلسات...
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 0 10px rgba(255,107,53,0.4)",
                  "0 0 20px rgba(255,107,53,0.6)",
                  "0 0 10px rgba(255,107,53,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 rounded-lg bg-orange-500/20 border border-orange-400/30"
            >
              <Activity className="h-5 w-5 text-orange-400 drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]" />
            </motion.div>
            جلسات فعال جانشینی
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 shadow-[0_0_10px_rgba(255,107,53,0.3)] mr-2">
              {sessions?.length || 0} جلسه
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!sessions || sessions.length === 0 ? (
            <div className="flex items-center justify-center h-32 p-6">
              <div className="text-center">
                <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4 opacity-50" />
                <div className="text-gray-400 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
                  هیچ جلسه فعالی وجود ندارد
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/[0.08] hover:bg-white/[0.02]">
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">شناسه جلسه</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">نوع جلسه</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">ادمین</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">کاربر هدف</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">تنانت</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">شروع</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">زمان باقی‌مانده</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">فعالیت</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">IP آدرس</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">مرورگر</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">وضعیت</TableHead>
                    <TableHead className="text-orange-400 font-semibold drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {sessions.map((session, index) => (
                      <motion.tr
                        key={session.session_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-white/[0.05] hover:bg-gradient-to-r hover:from-white/[0.02] hover:to-white/[0.01] transition-all duration-300 group"
                      >
                        <TableCell className="font-mono text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                            {session.session_id.substring(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSessionTypeBadge(session)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
                            <span className="text-sm text-gray-300 font-mono">
                              {session.admin_user_id.substring(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
                            <span className="text-sm text-gray-300 font-mono">
                              {session.target_user_id.substring(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {session.target_tenant_id ? (
                            <span className="text-sm text-gray-400 font-mono">
                              {session.target_tenant_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-300 text-sm">
                            {formatDate(session.started_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-400" />
                            <span className="text-sm font-medium text-orange-300 drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">
                              {getTimeRemaining(session.expires_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {session.activity_count !== undefined && (
                              <div className="flex items-center gap-1">
                                <Zap className="h-3 w-3 text-emerald-400" />
                                <span className="text-xs text-emerald-300">
                                  {session.activity_count} فعالیت
                                </span>
                              </div>
                            )}
                            {session.last_activity_at && (
                              <span className="text-xs text-gray-500">
                                آخرین: {formatDate(session.last_activity_at)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-300">
                              {session.ip_address || 'نامشخص'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-300">
                              {getBrowserInfo(session.user_agent)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(session)}
                        </TableCell>
                        <TableCell>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              onClick={() => onTerminateSession(session.session_id)}
                              disabled={
                                session.status !== 'active' || 
                                terminatingSessionId === session.session_id ||
                                session.window_closed_detected
                              }
                              className={`h-8 px-3 flex items-center gap-2 transition-all duration-300 ${
                                session.status === 'active' && !session.window_closed_detected
                                  ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 text-red-400 hover:shadow-[0_0_20px_rgba(255,71,87,0.4)] hover:border-red-400/50'
                                  : 'bg-gray-500/20 border border-gray-400/30 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <StopCircle className="h-4 w-4" />
                              {terminatingSessionId === session.session_id 
                                ? 'در حال خاتمه...' 
                                : session.window_closed_detected
                                ? 'پنجره بسته شده'
                                : 'خاتمه جلسه'
                              }
                            </Button>
                          </motion.div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ActiveSessionsTable;