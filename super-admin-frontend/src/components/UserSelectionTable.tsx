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
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Clock, ExternalLink, User as UserIcon, Shield, Activity } from 'lucide-react';
import { User } from '@/types/impersonation';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';

interface UserSelectionTableProps {
  users: User[];
  onImpersonate: (user: User) => void;
  isLoading?: boolean;
  impersonatingUserId?: string;
}

const UserSelectionTable: React.FC<UserSelectionTableProps> = ({
  users,
  onImpersonate,
  isLoading = false,
  impersonatingUserId,
}) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30 shadow-[0_0_10px_rgba(165,94,234,0.3)] flex items-center gap-1">
            <Shield className="h-3 w-3" />
            مدیر
          </Badge>
        );
      case 'manager':
        return (
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30 shadow-[0_0_10px_rgba(0,212,255,0.3)] flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            مدیر کل
          </Badge>
        );
      case 'user':
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 shadow-[0_0_10px_rgba(156,163,175,0.3)] flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            کاربر
          </Badge>
        );
      case 'accountant':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(0,255,136,0.3)] flex items-center gap-1">
            <Activity className="h-3 w-3" />
            حسابدار
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-400/30 shadow-[0_0_10px_rgba(156,163,175,0.3)]">
            {role}
          </Badge>
        );
    }
  };

  const getStatusBadge = (is_active: boolean) => {
    return is_active ? (
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
    ) : (
      <Badge className="bg-red-500/20 text-red-400 border-red-400/30 shadow-[0_0_10px_rgba(255,71,87,0.3)] flex items-center gap-1">
        <div className="w-2 h-2 bg-red-400 rounded-full" />
        غیرفعال
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'هرگز';
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: faIR,
      });
    } catch {
      return 'نامشخص';
    }
  };

  if (isLoading) {
    return (
      <Card className="backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full"
            />
            <div className="text-gray-300 mr-4 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
              در حال بارگذاری کاربران...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card className="backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <UserIcon className="h-12 w-12 text-gray-500 mx-auto mb-4 opacity-50" />
              <div className="text-gray-400 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
                هیچ کاربری یافت نشد
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.08] hover:bg-white/[0.02]">
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">ایمیل</TableHead>
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">نام</TableHead>
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">تنانت</TableHead>
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">نقش</TableHead>
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">وضعیت</TableHead>
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">آخرین ورود</TableHead>
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">تاریخ ایجاد</TableHead>
                  <TableHead className="text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-white/[0.05] hover:bg-gradient-to-r hover:from-white/[0.02] hover:to-white/[0.01] transition-all duration-300 group"
                    >
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {user.name || (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {user.tenant_name || 'نامشخص'}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">
                            {user.tenant_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user.is_active)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-300 text-sm">
                            {formatDate(user.last_login)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-300 text-sm">
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              onClick={() => onImpersonate(user)}
                              disabled={!user.is_active || impersonatingUserId === user.id}
                              className={`h-8 px-3 flex items-center gap-2 transition-all duration-300 ${
                                impersonatingUserId === user.id
                                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                                  : user.is_active
                                  ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30 text-cyan-400 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:border-cyan-400/50'
                                  : 'bg-gray-500/20 border border-gray-400/30 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {impersonatingUserId === user.id ? (
                                <>
                                  <Eye className="h-4 w-4" />
                                  در حال جانشینی
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="h-4 w-4" />
                                  جایگزینی
                                </>
                              )}
                            </Button>
                          </motion.div>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default UserSelectionTable;