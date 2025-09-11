/**
 * Online Users Monitor Page
 * Real-time monitoring of online users with tenant-wise breakdown
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, 
  Activity, 
  Building2, 
  RefreshCw,
  Eye,
  Settings,
  Download,
  AlertCircle,
  X
} from 'lucide-react';

// Import components
import OnlineUsersStatsCards from '../components/online-users/OnlineUsersStatsCards';
import OnlineUsersTable from '../components/online-users/OnlineUsersTable';
import TenantUsersGroup from '../components/online-users/TenantUsersGroup';
import OnlineUsersFilters from '../components/online-users/OnlineUsersFilters';
import UserActivityTimeline from '../components/online-users/UserActivityTimeline';
import RealTimeConnectionStatus from '../components/online-users/RealTimeConnectionStatus';

// Import hooks and types
import { useOnlineUsers } from '../hooks/useOnlineUsers';
import { OnlineUser, UserSession, OnlineUsersFilter } from '../types/onlineUsers';

// Mock tenants data - in real app, this would come from API
const mockTenants = [
  { id: '1', name: 'شرکت الف' },
  { id: '2', name: 'شرکت ب' },
  { id: '3', name: 'شرکت ج' },
];

export const OnlineUsersMonitor: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [selectedUserSession, setSelectedUserSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);

  const {
    users,
    stats,
    tenantUsers,
    loading,
    statsLoading,
    usersLoading,
    isConnected,
    refreshUsers,
    refreshStats,
    setUserOffline,
    bulkSetUsersOffline,
    getUserSession,
    getTenantUsers,
    cleanupExpiredUsers,
    filters,
    setFilters,
    error,
    clearError
  } = useOnlineUsers({
    enableRealTime: !isPaused,
    autoRefresh: false,
    initialFilters: { limit: 50 }
  });

  // Group users by tenant
  const usersByTenant = users.reduce((acc, user) => {
    const tenantId = user.tenant_id;
    if (!acc[tenantId]) {
      acc[tenantId] = {
        tenant_id: tenantId,
        tenant_name: user.tenant_name,
        online_users_count: 0,
        offline_users_count: 0,
        users: []
      };
    }
    
    acc[tenantId].users.push(user);
    if (user.is_online) {
      acc[tenantId].online_users_count++;
    } else {
      acc[tenantId].offline_users_count++;
    }
    
    return acc;
  }, {} as Record<string, any>);

  const handleUserSelect = async (user: OnlineUser) => {
    setSelectedUser(user);
    
    // Fetch detailed session information
    const session = await getUserSession(user.user_id);
    setSelectedUserSession(session);
  };

  const handleSetUserOffline = async (userId: string) => {
    const success = await setUserOffline(userId);
    if (success) {
      // Remove from selected user if it was the one set offline
      if (selectedUser?.user_id === userId) {
        setSelectedUser(null);
        setSelectedUserSession(null);
      }
    }
  };

  const handleViewSession = async (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    if (user) {
      await handleUserSelect(user);
      setActiveTab('details');
    }
  };

  const handleTenantToggle = (tenantId: string) => {
    const newExpanded = new Set(expandedTenants);
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId);
    } else {
      newExpanded.add(tenantId);
    }
    setExpandedTenants(newExpanded);
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refreshUsers(),
      refreshStats(),
      cleanupExpiredUsers()
    ]);
  };

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            مانیتور کاربران آنلاین
          </h1>
          <p className="text-gray-600 mt-2">
            نظارت بلادرنگ بر وضعیت کاربران آنلاین و فعالیت‌های آن‌ها
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            بروزرسانی
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            تنظیمات
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-Time Connection Status */}
      <RealTimeConnectionStatus
        isConnected={isConnected}
        onReconnect={handleRefreshAll}
        onTogglePause={handleTogglePause}
        isPaused={isPaused}
        lastUpdate={stats ? new Date().toISOString() : undefined}
      />

      {/* Statistics Cards */}
      <OnlineUsersStatsCards
        stats={stats}
        loading={statsLoading}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            نمای کلی
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            بر اساس تنانت
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            جزئیات کاربر
            {selectedUser && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                انتخاب شده
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            فیلترها
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OnlineUsersTable
            users={users}
            loading={usersLoading}
            onUserSelect={handleUserSelect}
            onSetOffline={handleSetUserOffline}
            onViewSession={handleViewSession}
          />
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-6">
          <div className="space-y-4">
            {Object.values(usersByTenant).map((tenantData: any) => (
              <TenantUsersGroup
                key={tenantData.tenant_id}
                tenantUsers={tenantData}
                expanded={expandedTenants.has(tenantData.tenant_id)}
                onToggle={() => handleTenantToggle(tenantData.tenant_id)}
                onUserSelect={handleUserSelect}
                onSetOffline={handleSetUserOffline}
                onViewSession={handleViewSession}
              />
            ))}
            
            {Object.keys(usersByTenant).length === 0 && !loading && (
              <Card className="p-8 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  هیچ تنانتی با کاربران آنلاین یافت نشد
                </h3>
                <p className="text-gray-500">
                  در حال حاضر هیچ کاربری در هیچ تنانتی آنلاین نیست.
                </p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* User Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedUser ? (
            <UserActivityTimeline
              user={selectedUser}
              session={selectedUserSession}
              onClose={() => {
                setSelectedUser(null);
                setSelectedUserSession(null);
                setActiveTab('overview');
              }}
            />
          ) : (
            <Card className="p-8 text-center">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                هیچ کاربری انتخاب نشده
              </h3>
              <p className="text-gray-500 mb-4">
                برای مشاهده جزئیات فعالیت، یک کاربر را از لیست انتخاب کنید.
              </p>
              <Button
                variant="outline"
                onClick={() => setActiveTab('overview')}
              >
                بازگشت به لیست کاربران
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Settings/Filters Tab */}
        <TabsContent value="settings" className="space-y-6">
          <OnlineUsersFilters
            filters={filters}
            onFiltersChange={setFilters}
            tenants={mockTenants}
            onRefresh={handleRefreshAll}
            onClearFilters={() => setFilters({})}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OnlineUsersMonitor;