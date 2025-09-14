import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserCheck, 
  Users, 
  Clock, 
  FileText, 
  RefreshCw,
  AlertTriangle,
  Shield,
  Eye,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { impersonationService } from '@/services/impersonationService';
import { tenantService } from '@/services/tenantService';
import UserSelectionTable from '@/components/UserSelectionTable';
import ActiveSessionsTable from '@/components/ActiveSessionsTable';
import AuditTrailTable from '@/components/AuditTrailTable';
import ImpersonationStartDialog from '@/components/ImpersonationStartDialog';
import UserFilters from '@/components/UserFilters';
import {
  User,
  UserFilters as UserFiltersType,
  ActiveSession,
  AuditLogEntry,
  ImpersonationStartRequest,
} from '@/types/impersonation';
import { Tenant } from '@/types/tenant';

const UserImpersonation: React.FC = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // State for users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilters, setUserFilters] = useState<Partial<UserFiltersType>>({});
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // State for active sessions
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [terminatingSessionId, setTerminatingSessionId] = useState<string | null>(null);

  // State for audit trail
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // State for impersonation
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [impersonationDialogOpen, setImpersonationDialogOpen] = useState(false);
  const [impersonationLoading, setImpersonationLoading] = useState(false);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

  // State for tenants (for filters)
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Load initial data
  useEffect(() => {
    // Check for tenant_id in URL params and set filter
    const tenantId = searchParams.get('tenant_id');
    if (tenantId) {
      setUserFilters(prev => ({ ...prev, tenant_id: tenantId }));
    }
    
    loadUsers();
    loadActiveSessions();
    loadAuditLogs();
    loadTenants();
  }, [searchParams]);

  // Reload users when filters change
  useEffect(() => {
    loadUsers();
  }, [userFilters, usersPagination.page]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await impersonationService.getUsers(
        usersPagination.page,
        usersPagination.limit,
        userFilters
      );
      setUsers(response.users);
      setUsersPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
    } catch (error) {
      setUsers([]); // Ensure users is always an array
      toast({
        title: 'خطا در بارگذاری کاربران',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    setSessionsLoading(true);
    try {
      // Use enhanced API for better session tracking
      const sessions = await impersonationService.getEnhancedActiveSessions();
      setActiveSessions(sessions);
    } catch (error) {
      setActiveSessions([]); // Ensure activeSessions is always an array
      toast({
        title: 'خطا در بارگذاری جلسات فعال',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const logs = await impersonationService.getAuditLog(
        undefined, // admin_user_id
        undefined, // target_user_id
        undefined, // start_date
        undefined, // end_date
        50, // limit
        0 // offset
      );
      setAuditLogs(logs);
    } catch (error) {
      setAuditLogs([]); // Ensure auditLogs is always an array
      toast({
        title: 'خطا در بارگذاری سابقه عملیات',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setAuditLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await tenantService.getTenants(1, 100);
      setTenants(response.tenants || []); // Ensure it's always an array
    } catch (error) {
      setTenants([]); // Ensure tenants is always an array
      console.error('Failed to load tenants:', error);
    }
  };

  const handleImpersonate = (user: User) => {
    setSelectedUser(user);
    setImpersonationDialogOpen(true);
  };

  const handleStartImpersonation = async (data: ImpersonationStartRequest & { is_window_based?: boolean }) => {
    setImpersonationLoading(true);
    try {
      // Use enhanced impersonation API
      const response = await impersonationService.startEnhancedImpersonation(data);
      
      toast({
        title: 'جانشینی با موفقیت شروع شد',
        description: `جلسه جانشینی برای ${response.target_user.email} ایجاد شد`,
        variant: 'default',
      });

      // Set impersonating user ID
      setImpersonatingUserId(data.target_user_id);

      // Close dialog
      setImpersonationDialogOpen(false);
      setSelectedUser(null);

      // Handle window-based vs redirect-based impersonation
      if (data.is_window_based) {
        // Open in new window/tab
        const newWindow = impersonationService.openTenantAppInNewWindow(
          response.access_token, 
          response.target_user,
          response.session_id
        );
        
        if (!newWindow) {
          toast({
            title: 'خطا در باز کردن پنجره جدید',
            description: 'لطفاً popup blocker را غیرفعال کنید و دوباره تلاش کنید',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'پنجره جانشینی باز شد',
            description: 'جلسه جانشینی در پنجره جدید باز شد. بستن پنجره به صورت خودکار جلسه را خاتمه می‌دهد.',
            variant: 'default',
          });
        }
      } else {
        // Legacy redirect behavior
        impersonationService.redirectToTenantApp(response.access_token, response.target_user);
      }

      // Refresh data
      loadActiveSessions();
      loadAuditLogs();
    } catch (error) {
      toast({
        title: 'خطا در شروع جانشینی',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setImpersonationLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    setTerminatingSessionId(sessionId);
    try {
      // Use enhanced termination API
      await impersonationService.terminateEnhancedSession(sessionId);
      
      toast({
        title: 'جلسه با موفقیت خاتمه یافت',
        description: 'جلسه جانشینی به صورت اجباری خاتمه یافت و پنجره مربوطه بسته شد',
        variant: 'default',
      });

      // Refresh data
      loadActiveSessions();
      loadAuditLogs();
    } catch (error) {
      toast({
        title: 'خطا در خاتمه جلسه',
        description: error instanceof Error ? error.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setTerminatingSessionId(null);
    }
  };

  const handleFiltersChange = (newFilters: Partial<UserFiltersType>) => {
    setUserFilters(newFilters);
    setUsersPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFiltersReset = () => {
    setUserFilters({});
    setUsersPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    loadUsers();
    loadActiveSessions();
    loadAuditLogs();
  };

  // Ensure all arrays are properly initialized to prevent undefined errors
  const safeUsers = users || [];
  const safeActiveSessions = activeSessions || [];
  const safeAuditLogs = auditLogs || [];
  const safeTenants = tenants || [];

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 0 30px rgba(0,212,255,0.5)",
                    borderColor: "rgba(0,212,255,0.6)"
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <UserCheck className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
                </motion.div>
                <div>
                  <CardTitle className="text-white text-xl font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    جانشینی کاربر
                  </CardTitle>
                  <p className="text-gray-300 mt-1 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
                    مدیریت جلسات جانشینی و پشتیبانی از کاربران
                  </p>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleRefresh}
                  className="backdrop-blur-[16px] bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-400/30 text-cyan-400 hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-emerald-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all duration-300 flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  بروزرسانی
                </Button>
              </motion.div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Security Warning */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="backdrop-blur-[16px] bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-400/30 shadow-[0_8px_32px_rgba(255,107,53,0.15)] rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
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
                <AlertTriangle className="h-5 w-5 text-orange-400 drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]" />
              </motion.div>
              <div className="text-sm">
                <p className="font-bold mb-3 text-orange-300 drop-shadow-[0_0_8px_rgba(255,107,53,0.3)]">
                  نکات امنیتی مهم
                </p>
                <ul className="list-disc list-inside space-y-2 text-orange-200">
                  <li>تمام اقدامات جانشینی ثبت و نظارت می‌شود</li>
                  <li>از این قابلیت فقط برای پشتیبانی مشتریان استفاده کنید</li>
                  <li>جلسات جانشینی دارای محدودیت زمانی هستند</li>
                  <li>در صورت سوء استفاده، دسترسی شما محدود خواهد شد</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 backdrop-blur-[16px] bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-2">
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-emerald-500/20 data-[state=active]:border data-[state=active]:border-cyan-400/30 data-[state=active]:shadow-[0_0_15px_rgba(0,212,255,0.3)] data-[state=active]:text-cyan-400 text-gray-400 hover:text-gray-200 transition-all duration-300 rounded-xl"
            >
              <Users className="h-4 w-4" />
              انتخاب کاربر
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
                {safeUsers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="sessions" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-emerald-500/20 data-[state=active]:border data-[state=active]:border-cyan-400/30 data-[state=active]:shadow-[0_0_15px_rgba(0,212,255,0.3)] data-[state=active]:text-cyan-400 text-gray-400 hover:text-gray-200 transition-all duration-300 rounded-xl"
            >
              <Activity className="h-4 w-4" />
              جلسات فعال
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 shadow-[0_0_10px_rgba(255,107,53,0.3)]">
                {safeActiveSessions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-emerald-500/20 data-[state=active]:border data-[state=active]:border-cyan-400/30 data-[state=active]:shadow-[0_0_15px_rgba(0,212,255,0.3)] data-[state=active]:text-cyan-400 text-gray-400 hover:text-gray-200 transition-all duration-300 rounded-xl"
            >
              <Shield className="h-4 w-4" />
              سابقه عملیات
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30 shadow-[0_0_10px_rgba(165,94,234,0.3)]">
                {safeAuditLogs.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="users-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <UserFilters
                  filters={userFilters}
                  onFiltersChange={handleFiltersChange}
                  onReset={handleFiltersReset}
                  tenants={safeTenants.map(t => ({ id: t.id, name: t.name }))}
                />
                
                <UserSelectionTable
                  users={safeUsers}
                  onImpersonate={handleImpersonate}
                  isLoading={usersLoading}
                  impersonatingUserId={impersonatingUserId || undefined}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Active Sessions Tab */}
          <TabsContent value="sessions">
            <AnimatePresence mode="wait">
              <motion.div
                key="sessions-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ActiveSessionsTable
                  sessions={safeActiveSessions}
                  onTerminateSession={handleTerminateSession}
                  isLoading={sessionsLoading}
                  terminatingSessionId={terminatingSessionId || undefined}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit">
            <AnimatePresence mode="wait">
              <motion.div
                key="audit-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <AuditTrailTable
                  auditLogs={safeAuditLogs}
                  isLoading={auditLoading}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Impersonation Start Dialog */}
      <ImpersonationStartDialog
        isOpen={impersonationDialogOpen}
        onClose={() => {
          setImpersonationDialogOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleStartImpersonation}
        user={selectedUser}
        isLoading={impersonationLoading}
      />
    </div>
  );
};

export default UserImpersonation;