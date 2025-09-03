import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  AlertTriangle
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
      const sessions = await impersonationService.getActiveSessions();
      setActiveSessions(sessions);
    } catch (error) {
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
      setTenants(response.tenants);
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  };

  const handleImpersonate = (user: User) => {
    setSelectedUser(user);
    setImpersonationDialogOpen(true);
  };

  const handleStartImpersonation = async (data: ImpersonationStartRequest) => {
    setImpersonationLoading(true);
    try {
      const response = await impersonationService.startImpersonation(data);
      
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

      // Redirect to tenant application
      impersonationService.redirectToTenantApp(response.access_token, response.target_user);

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
      await impersonationService.terminateSession(sessionId);
      
      toast({
        title: 'جلسه با موفقیت خاتمه یافت',
        description: 'جلسه جانشینی به صورت اجباری خاتمه یافت',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="gradient-blue">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-slate-900">جانشینی کاربر</CardTitle>
                <p className="text-slate-600 mt-1">
                  مدیریت جلسات جانشینی و پشتیبانی از کاربران
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              بروزرسانی
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Warning */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-medium mb-1">نکات امنیتی مهم</p>
              <ul className="list-disc list-inside space-y-1">
                <li>تمام اقدامات جانشینی ثبت و نظارت می‌شود</li>
                <li>از این قابلیت فقط برای پشتیبانی مشتریان استفاده کنید</li>
                <li>جلسات جانشینی دارای محدودیت زمانی هستند</li>
                <li>در صورت سوء استفاده، دسترسی شما محدود خواهد شد</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            انتخاب کاربر
            <Badge variant="secondary">{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            جلسات فعال
            <Badge variant="secondary">{activeSessions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            سابقه عملیات
            <Badge variant="secondary">{auditLogs.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <UserFilters
            filters={userFilters}
            onFiltersChange={handleFiltersChange}
            onReset={handleFiltersReset}
            tenants={tenants.map(t => ({ id: t.id, name: t.name }))}
          />
          
          <UserSelectionTable
            users={users}
            onImpersonate={handleImpersonate}
            isLoading={usersLoading}
            impersonatingUserId={impersonatingUserId}
          />
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions">
          <ActiveSessionsTable
            sessions={activeSessions}
            onTerminateSession={handleTerminateSession}
            isLoading={sessionsLoading}
            terminatingSessionId={terminatingSessionId}
          />
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit">
          <AuditTrailTable
            auditLogs={auditLogs}
            isLoading={auditLoading}
          />
        </TabsContent>
      </Tabs>

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