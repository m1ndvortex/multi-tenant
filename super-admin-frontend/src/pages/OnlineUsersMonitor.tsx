/**
 * Online Users Monitor Page - Cybersecurity Theme
 * Real-time monitoring of online users with cybersecurity-themed dark interface
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, 
  Building2, 
  RefreshCw,
  Eye,
  Settings,
  AlertCircle,
  X,
  Shield,
  Zap
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
import { OnlineUser, UserSession } from '../types/onlineUsers';

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
    loading,
    statsLoading,
    usersLoading,
    isConnected,
    refreshUsers,
    refreshStats,
    setUserOffline,
    getUserSession,
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
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-[#0B0E1A] via-[#1A1D29] to-[#252A3A] p-6 space-y-6" 
      dir="rtl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Cybersecurity Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-emerald-500/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto space-y-6">
        {/* Page Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <motion.h1 
              className="text-3xl font-bold text-white flex items-center gap-3"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Shield className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]" />
                <motion.div
                  className="absolute inset-0 h-8 w-8 text-cyan-400"
                  animate={{ 
                    filter: [
                      "drop-shadow(0 0 8px rgba(0,212,255,0.6))",
                      "drop-shadow(0 0 16px rgba(0,212,255,0.8))",
                      "drop-shadow(0 0 8px rgba(0,212,255,0.6))"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Shield className="h-8 w-8" />
                </motion.div>
              </motion.div>
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                مانیتور کاربران آنلاین
              </span>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Zap className="h-6 w-6 text-orange-400 drop-shadow-[0_0_6px_rgba(255,107,53,0.6)]" />
              </motion.div>
            </motion.h1>
            <motion.p 
              className="text-gray-300 mt-2 text-lg"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              نظارت بلادرنگ بر وضعیت کاربران آنلاین و فعالیت‌های آن‌ها
            </motion.p>
          </div>

          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={handleRefreshAll}
                disabled={loading}
                className="flex items-center gap-2 bg-white/5 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-2 bg-white/5 border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400/50 hover:text-emerald-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]"
              >
                <Settings className="h-4 w-4" />
                تنظیمات
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-400/30 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400">
                      <motion.div
                        animate={{ 
                          boxShadow: [
                            "0 0 0px rgba(255,71,87,0.4)",
                            "0 0 20px rgba(255,71,87,0.6)",
                            "0 0 0px rgba(255,71,87,0.4)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </motion.div>
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearError}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-Time Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <RealTimeConnectionStatus
            isConnected={isConnected}
            onReconnect={handleRefreshAll}
            onTogglePause={handleTogglePause}
            isPaused={isPaused}
            lastUpdate={stats ? new Date().toISOString() : undefined}
          />
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <OnlineUsersStatsCards
            stats={stats}
            loading={statsLoading}
          />
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <TabsTrigger 
                  value="overview" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-cyan-600/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-400/30 text-gray-300 hover:text-white transition-all duration-300 rounded-xl data-[state=active]:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                >
                  <Users className="h-4 w-4" />
                  نمای کلی
                </TabsTrigger>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <TabsTrigger 
                  value="tenants" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-emerald-600/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-400/30 text-gray-300 hover:text-white transition-all duration-300 rounded-xl data-[state=active]:shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                >
                  <Building2 className="h-4 w-4" />
                  بر اساس تنانت
                </TabsTrigger>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <TabsTrigger 
                  value="details" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-600/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-400/30 text-gray-300 hover:text-white transition-all duration-300 rounded-xl data-[state=active]:shadow-[0_0_20px_rgba(255,107,53,0.3)]"
                >
                  <Eye className="h-4 w-4" />
                  جزئیات کاربر
                  {selectedUser && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Badge className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-400 border-purple-400/30 text-xs backdrop-blur-sm">
                        انتخاب شده
                      </Badge>
                    </motion.div>
                  )}
                </TabsTrigger>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <TabsTrigger 
                  value="settings" 
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-purple-600/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-400/30 text-gray-300 hover:text-white transition-all duration-300 rounded-xl data-[state=active]:shadow-[0_0_20px_rgba(165,94,234,0.3)]"
                >
                  <Settings className="h-4 w-4" />
                  فیلترها
                </TabsTrigger>
              </motion.div>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <OnlineUsersTable
                  users={users}
                  loading={usersLoading}
                  onUserSelect={handleUserSelect}
                  onSetOffline={handleSetUserOffline}
                  onViewSession={handleViewSession}
                />
              </motion.div>
            </TabsContent>

            {/* Tenants Tab */}
            <TabsContent value="tenants" className="space-y-6">
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ staggerChildren: 0.1 }}
                >
                  {Object.values(usersByTenant).map((tenantData: any, index) => (
                    <motion.div
                      key={tenantData.tenant_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <TenantUsersGroup
                        tenantUsers={tenantData}
                        expanded={expandedTenants.has(tenantData.tenant_id)}
                        onToggle={() => handleTenantToggle(tenantData.tenant_id)}
                        onUserSelect={handleUserSelect}
                        onSetOffline={handleSetUserOffline}
                        onViewSession={handleViewSession}
                      />
                    </motion.div>
                  ))}
                </motion.div>
                
                {Object.keys(usersByTenant).length === 0 && !loading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="p-8 text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
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
                        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        هیچ تنانتی با کاربران آنلاین یافت نشد
                      </h3>
                      <p className="text-gray-400">
                        در حال حاضر هیچ کاربری در هیچ تنانتی آنلاین نیست.
                      </p>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            </TabsContent>

            {/* User Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <AnimatePresence mode="wait">
                {selectedUser ? (
                  <motion.div
                    key="user-details"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <UserActivityTimeline
                      user={selectedUser}
                      session={selectedUserSession || undefined}
                      onClose={() => {
                        setSelectedUser(null);
                        setSelectedUserSession(null);
                        setActiveTab('overview');
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-user"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="p-8 text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
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
                        <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      </motion.div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        هیچ کاربری انتخاب نشده
                      </h3>
                      <p className="text-gray-400 mb-4">
                        برای مشاهده جزئیات فعالیت، یک کاربر را از لیست انتخاب کنید.
                      </p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('overview')}
                          className="bg-white/5 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/50 hover:text-cyan-300 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                        >
                          بازگشت به لیست کاربران
                        </Button>
                      </motion.div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Settings/Filters Tab */}
            <TabsContent value="settings" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <OnlineUsersFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  tenants={mockTenants}
                  onRefresh={handleRefreshAll}
                  onClearFilters={() => setFilters({})}
                  loading={loading}
                />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OnlineUsersMonitor;