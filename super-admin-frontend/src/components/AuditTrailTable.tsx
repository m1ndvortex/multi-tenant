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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  User,
  Shield,
  Globe,
  Zap
} from 'lucide-react';
import { AuditLogEntry } from '@/types/impersonation';
import { format } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface AuditTrailTableProps {
  auditLogs: AuditLogEntry[];
  isLoading?: boolean;
}

const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  auditLogs,
  isLoading = false,
}) => {
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'impersonation_started':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(0,255,136,0.3)] flex items-center gap-1">
            <Zap className="h-3 w-3" />
            شروع جانشینی
          </Badge>
        );
      case 'impersonation_ended':
        return (
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30 shadow-[0_0_10px_rgba(0,212,255,0.3)] flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            پایان جانشینی
          </Badge>
        );
      case 'impersonation_terminated':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-400/30 shadow-[0_0_10px_rgba(255,71,87,0.3)] flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            خاتمه اجباری
          </Badge>
        );
      case 'impersonation_failed':
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 shadow-[0_0_10px_rgba(255,107,53,0.3)] flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            شکست جانشینی
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 shadow-[0_0_10px_rgba(156,163,175,0.3)]">
            {action}
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <motion.div 
            className="flex items-center gap-2"
            animate={{ 
              boxShadow: [
                "0 0 10px rgba(0,255,136,0.4)",
                "0 0 20px rgba(0,255,136,0.6)",
                "0 0 10px rgba(0,255,136,0.4)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <CheckCircle className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
              موفق
            </Badge>
          </motion.div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400 drop-shadow-[0_0_8px_rgba(255,71,87,0.5)]" />
            <Badge className="bg-red-500/20 text-red-400 border-red-400/30 shadow-[0_0_10px_rgba(255,71,87,0.3)]">
              ناموفق
            </Badge>
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-400 drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]" />
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 shadow-[0_0_10px_rgba(255,107,53,0.3)]">
              هشدار
            </Badge>
          </div>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 shadow-[0_0_10px_rgba(156,163,175,0.3)]">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd HH:mm:ss', {
        locale: faIR,
      });
    } catch {
      return 'نامشخص';
    }
  };

  const formatDetails = (details: Record<string, any>) => {
    const importantFields = ['reason', 'duration_hours', 'error_message', 'session_duration'];
    const formatted = [];

    for (const [key, value] of Object.entries(details)) {
      if (importantFields.includes(key) && value) {
        let label = key;
        switch (key) {
          case 'reason':
            label = 'دلیل';
            break;
          case 'duration_hours':
            label = 'مدت (ساعت)';
            break;
          case 'error_message':
            label = 'پیام خطا';
            break;
          case 'session_duration':
            label = 'مدت جلسه';
            break;
        }
        formatted.push(`${label}: ${value}`);
      }
    }

    return formatted.length > 0 ? formatted.join(' | ') : '-';
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
                    "0 0 10px rgba(165,94,234,0.4)",
                    "0 0 20px rgba(165,94,234,0.6)",
                    "0 0 10px rgba(165,94,234,0.4)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/30"
              >
                <Shield className="h-5 w-5 text-purple-400 drop-shadow-[0_0_8px_rgba(165,94,234,0.5)]" />
              </motion.div>
              سابقه عملیات جانشینی
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
              />
              <div className="text-gray-300 mr-4 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
                در حال بارگذاری سابقه...
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
                  "0 0 10px rgba(165,94,234,0.4)",
                  "0 0 20px rgba(165,94,234,0.6)",
                  "0 0 10px rgba(165,94,234,0.4)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/30"
            >
              <Shield className="h-5 w-5 text-purple-400 drop-shadow-[0_0_8px_rgba(165,94,234,0.5)]" />
            </motion.div>
            سابقه عملیات جانشینی
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30 shadow-[0_0_10px_rgba(165,94,234,0.3)] mr-2">
              {auditLogs?.length || 0} رکورد
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!auditLogs || auditLogs.length === 0 ? (
            <div className="flex items-center justify-center h-32 p-6">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4 opacity-50" />
                <div className="text-gray-400 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
                  هیچ رکوردی در سابقه وجود ندارد
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/[0.08] hover:bg-white/[0.02]">
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">تاریخ و زمان</TableHead>
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">عملیات</TableHead>
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">وضعیت</TableHead>
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">ادمین</TableHead>
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">کاربر هدف</TableHead>
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">شناسه جلسه</TableHead>
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">IP آدرس</TableHead>
                    <TableHead className="text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(165,94,234,0.3)]">جزئیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {auditLogs.map((log, index) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-white/[0.05] hover:bg-gradient-to-r hover:from-white/[0.02] hover:to-white/[0.01] transition-all duration-300 group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-mono text-gray-300">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getActionBadge(log.action)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
                            <span className="text-sm font-mono text-gray-300">
                              {log.admin_user_id.substring(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.target_user_id ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
                              <span className="text-sm font-mono text-gray-300">
                                {log.target_user_id.substring(0, 8)}...
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.session_id ? (
                            <span className="text-sm font-mono text-gray-400">
                              {log.session_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.ip_address ? (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-300">
                                {log.ip_address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <span className="text-sm text-gray-300">
                              {formatDetails(log.details)}
                            </span>
                            {log.reason && (
                              <div className="text-xs text-gray-500 mt-1 p-2 bg-white/[0.02] rounded border border-white/[0.05]">
                                دلیل: {log.reason}
                              </div>
                            )}
                          </div>
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

export default AuditTrailTable;