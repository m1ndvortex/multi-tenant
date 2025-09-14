/**
 * Tenant Users Group Component - Cybersecurity Theme
 * Groups online users by tenant with expandable sections and cybersecurity styling
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '../ui/card';
// import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  UserCheck, 
  UserX,
  Activity,
  Shield,
  Zap
} from 'lucide-react';
import { TenantOnlineUsers, OnlineUser } from '../../types/onlineUsers';
import OnlineUsersTable from './OnlineUsersTable';

interface TenantUsersGroupProps {
  tenantUsers: TenantOnlineUsers;
  expanded?: boolean;
  onToggle?: () => void;
  onUserSelect?: (user: OnlineUser) => void;
  onSetOffline?: (userId: string) => void;
  onViewSession?: (userId: string) => void;
  className?: string;
}

export const TenantUsersGroup: React.FC<TenantUsersGroupProps> = ({
  tenantUsers,
  expanded = false,
  onToggle,
  onUserSelect,
  onSetOffline,
  onViewSession,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.();
  };

  const totalUsers = tenantUsers.online_users_count + tenantUsers.offline_users_count;
  const onlinePercentage = totalUsers > 0 
    ? Math.round((tenantUsers.online_users_count / totalUsers) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -2 }}
    >
      <Card className={`bg-white/5 backdrop-blur-sm border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-300 ${className}`}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader 
              className="cursor-pointer hover:bg-white/5 transition-all duration-300 border-b border-white/10 group"
              onClick={handleToggle}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
                      )}
                    </motion.div>
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
                  </div>
                  
                  <div className="flex flex-col">
                    <motion.h3 
                      className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      {tenantUsers.tenant_name}
                    </motion.h3>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      شناسه: {tenantUsers.tenant_id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Online Users Count */}
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
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
                    <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-400/30 backdrop-blur-sm">
                      <motion.span
                        className="font-mono font-bold"
                        animate={{ 
                          textShadow: [
                            "0 0 0px rgba(0,255,136,0.4)",
                            "0 0 8px rgba(0,255,136,0.6)",
                            "0 0 0px rgba(0,255,136,0.4)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {tenantUsers.online_users_count}
                      </motion.span> آنلاین
                    </Badge>
                  </motion.div>

                  {/* Offline Users Count */}
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <UserX className="h-4 w-4 text-gray-400" />
                    <Badge className="bg-white/5 text-gray-400 border-gray-400/30 backdrop-blur-sm">
                      <span className="font-mono">{tenantUsers.offline_users_count}</span> آفلاین
                    </Badge>
                  </motion.div>

                  {/* Total Users */}
                  <motion.div 
                    className="flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Users className="h-4 w-4 text-orange-400" />
                    <Badge className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border-orange-400/30 backdrop-blur-sm">
                      <span className="font-mono font-bold">{totalUsers}</span> کل
                    </Badge>
                  </motion.div>

                  {/* Online Percentage */}
                  {totalUsers > 0 && (
                    <motion.div 
                      className="flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="h-4 w-4 text-purple-400" />
                      </motion.div>
                      <Badge className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-400 border-purple-400/30 backdrop-blur-sm">
                        <motion.span
                          className="font-mono font-bold"
                          animate={{ 
                            textShadow: [
                              "0 0 0px rgba(165,94,234,0.4)",
                              "0 0 8px rgba(165,94,234,0.6)",
                              "0 0 0px rgba(165,94,234,0.4)"
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {onlinePercentage}%
                        </motion.span> فعال
                      </Badge>
                    </motion.div>
                  )}
                </div>
            </div>

                {/* Progress Bar */}
                {totalUsers > 0 && (
                  <motion.div 
                    className="mt-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3 text-cyan-400" />
                        نرخ فعالیت
                      </span>
                      <motion.span 
                        className="font-mono font-bold text-cyan-400"
                        animate={{ 
                          textShadow: [
                            "0 0 0px rgba(0,212,255,0.4)",
                            "0 0 8px rgba(0,212,255,0.6)",
                            "0 0 0px rgba(0,212,255,0.4)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {onlinePercentage}%
                      </motion.span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                      <motion.div 
                        className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-orange-400 h-2 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${onlinePercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
          </CardHeader>
        </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="p-0">
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {tenantUsers.users.length > 0 ? (
                      <OnlineUsersTable
                        users={tenantUsers.users}
                        onUserSelect={onUserSelect}
                        onSetOffline={onSetOffline}
                        onViewSession={onViewSession}
                        className="border-0 shadow-none bg-transparent"
                      />
                    ) : (
                      <motion.div 
                        className="p-8 text-center"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
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
                          <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        </motion.div>
                        <h4 className="text-lg font-medium text-white mb-2">
                          هیچ کاربر آنلاینی یافت نشد
                        </h4>
                        <p className="text-gray-400">
                          در حال حاضر هیچ کاربری از این تنانت آنلاین نیست.
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
};

export default TenantUsersGroup;