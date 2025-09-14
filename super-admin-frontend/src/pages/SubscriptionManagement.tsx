/**
 * Professional Subscription Management Interface
 * Dedicated subscription management with full manual control
 * Enhanced with cybersecurity theme, glassmorphism, and neon effects
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useNavigation } from '@/contexts/NavigationContext';
import { SubscriptionType, TenantStatus } from '@/types/subscription';
import SubscriptionOverviewDashboard from '@/components/subscription/SubscriptionOverviewDashboard';
import SubscriptionExtensionDialog from '@/components/subscription/SubscriptionExtensionDialog';
import SubscriptionStatusDialog from '@/components/subscription/SubscriptionStatusDialog';
import SubscriptionPlanSwitchDialog from '@/components/subscription/SubscriptionPlanSwitchDialog';
import SubscriptionFullControlDialog from '@/components/subscription/SubscriptionFullControlDialog';
import SubscriptionHistoryDialog from '@/components/subscription/SubscriptionHistoryDialog';
import { AnimatedWrapper, CyberCard, NeonText, CyberSpinner } from '@/components/animations/CyberAnimations';
import { animationPresets, createStaggerAnimation } from '@/lib/theme/animations';
import { glassmorphismClasses, neonClasses } from '@/lib/theme/cybersecurity';

const SubscriptionManagement: React.FC = () => {
  const { setPageInfo } = useNavigation();
  const {
    overview,
    tenants,
    selectedTenant,
    filters,
    isLoading,
    isActionLoading,
    error,
    updateFilters,
    clearFilters,
    selectTenant,
    refreshAll,
    extendSubscription,
    updateSubscriptionStatus,
    switchSubscriptionPlan,
    fullSubscriptionControl,
  } = useSubscriptionManagement();

  // Dialog states
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [planSwitchDialogOpen, setPlanSwitchDialogOpen] = useState(false);
  const [fullControlDialogOpen, setFullControlDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Set page info
  useEffect(() => {
    setPageInfo('مدیریت اشتراک‌ها', 'مدیریت حرفه‌ای اشتراک‌ها با کنترل کامل دستی');
  }, [setPageInfo]);

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'نامحدود';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: TenantStatus) => {
    switch (status) {
      case TenantStatus.ACTIVE:
        return 'default';
      case TenantStatus.SUSPENDED:
        return 'secondary';
      case TenantStatus.CANCELLED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get subscription badge variant
  const getSubscriptionBadgeVariant = (type: SubscriptionType) => {
    return type === SubscriptionType.PRO ? 'default' : 'secondary';
  };

  // Get expiry status
  const getExpiryStatus = (tenant: any) => {
    if (!tenant.subscription_expires_at) return { text: 'نامحدود', variant: 'default' };
    
    const daysUntilExpiry = tenant.days_until_expiry;
    if (daysUntilExpiry < 0) return { text: 'منقضی شده', variant: 'destructive' };
    if (daysUntilExpiry <= 7) return { text: `${daysUntilExpiry} روز`, variant: 'destructive' };
    if (daysUntilExpiry <= 30) return { text: `${daysUntilExpiry} روز`, variant: 'secondary' };
    return { text: `${daysUntilExpiry} روز`, variant: 'default' };
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">خطا در بارگذاری</CardTitle>
            <CardDescription>
              خطایی در بارگذاری اطلاعات اشتراک‌ها رخ داد
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refreshAll} className="w-full">
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6" 
      dir="rtl"
      initial="hidden"
      animate="visible"
      variants={createStaggerAnimation(0.1, 0.3)}
    >
      {/* Overview Dashboard */}
      <AnimatedWrapper variant="cyber" delay={0.1}>
        <SubscriptionOverviewDashboard 
          overview={overview} 
          loading={isLoading}
          onRefresh={refreshAll}
        />
      </AnimatedWrapper>

      {/* Main Content */}
      <AnimatedWrapper variant="cyber" delay={0.2}>
        <Tabs defaultValue="tenants" className="space-y-6">
          <motion.div
            className={`${glassmorphismClasses.card} p-1`}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <TabsList className={`grid w-full grid-cols-2 bg-transparent border-0 ${glassmorphismClasses.base}`}>
              <TabsTrigger 
                value="tenants"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-emerald-500/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(0,212,255,0.3)] text-gray-300 hover:text-white transition-all duration-300"
              >
                <NeonText color="#00D4FF" intensity="medium">
                  مدیریت تنانت‌ها
                </NeonText>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-white data-[state=active]:shadow-[0_0_20px_rgba(0,255,136,0.3)] text-gray-300 hover:text-white transition-all duration-300"
              >
                <NeonText color="#00FF88" intensity="medium">
                  آمار و تحلیل
                </NeonText>
              </TabsTrigger>
            </TabsList>
          </motion.div>

        <TabsContent value="tenants" className="space-y-6">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <CyberCard variant="primary" className={`${glassmorphismClasses.card} border-cyan-500/20`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,212,255,0.8)]"></div>
                  <NeonText color="#00D4FF" intensity="medium">
                    فیلترها و جستجو
                  </NeonText>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileFocus={{ scale: 1.02 }}
                  >
                    <Input
                      placeholder="جستجو بر اساس نام یا ایمیل..."
                      value={filters.search || ''}
                      onChange={(e) => updateFilters({ search: e.target.value })}
                      className={`${glassmorphismClasses.base} border-white/10 focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(0,212,255,0.3)] bg-white/5 text-white placeholder:text-gray-400 transition-all duration-300`}
                    />
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                  >
                    <Select
                      value={filters.subscriptionType || 'all'}
                      onValueChange={(value) => 
                        updateFilters({ 
                          subscriptionType: value === 'all' ? undefined : value as SubscriptionType 
                        })
                      }
                    >
                      <SelectTrigger className={`${glassmorphismClasses.base} border-white/10 focus:border-emerald-400/50 focus:shadow-[0_0_20px_rgba(0,255,136,0.3)] bg-white/5 text-white transition-all duration-300`}>
                        <SelectValue placeholder="نوع اشتراک" />
                      </SelectTrigger>
                      <SelectContent className={`${glassmorphismClasses.elevated} border-white/10 bg-gray-900/95`}>
                        <SelectItem value="all" className="text-white hover:bg-white/10">همه</SelectItem>
                        <SelectItem value={SubscriptionType.FREE} className="text-white hover:bg-white/10">رایگان</SelectItem>
                        <SelectItem value={SubscriptionType.PRO} className="text-white hover:bg-white/10">حرفه‌ای</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                  >
                    <Select
                      value={filters.statusFilter || 'all'}
                      onValueChange={(value) => 
                        updateFilters({ 
                          statusFilter: value === 'all' ? undefined : value as any
                        })
                      }
                    >
                      <SelectTrigger className={`${glassmorphismClasses.base} border-white/10 focus:border-orange-400/50 focus:shadow-[0_0_20px_rgba(255,107,53,0.3)] bg-white/5 text-white transition-all duration-300`}>
                        <SelectValue placeholder="وضعیت" />
                      </SelectTrigger>
                      <SelectContent className={`${glassmorphismClasses.elevated} border-white/10 bg-gray-900/95`}>
                        <SelectItem value="all" className="text-white hover:bg-white/10">همه</SelectItem>
                        <SelectItem value="active" className="text-white hover:bg-white/10">فعال</SelectItem>
                        <SelectItem value="expired" className="text-white hover:bg-white/10">منقضی</SelectItem>
                        <SelectItem value="expiring" className="text-white hover:bg-white/10">در حال انقضا</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      variant="outline" 
                      onClick={clearFilters}
                      className={`w-full ${glassmorphismClasses.base} border-purple-500/30 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(165,94,234,0.3)] bg-white/5 text-white hover:bg-purple-500/10 transition-all duration-300`}
                    >
                      <NeonText color="#A55EEA" intensity="low">
                        پاک کردن فیلترها
                      </NeonText>
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </CyberCard>
          </motion.div>

          {/* Tenants Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <CyberCard variant="secondary" className={`${glassmorphismClasses.card} border-emerald-500/20`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,136,0.8)]"></div>
                      <NeonText color="#00FF88" intensity="medium">
                        لیست تنانت‌ها
                      </NeonText>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      مدیریت اشتراک‌های تنانت‌ها با کنترل کامل
                    </CardDescription>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      onClick={refreshAll} 
                      disabled={isLoading}
                      className={`${glassmorphismClasses.base} border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] bg-white/5 text-white hover:bg-cyan-500/10 transition-all duration-300 disabled:opacity-50`}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <CyberSpinner size="sm" color="#00D4FF" />
                          <span>در حال بارگذاری...</span>
                        </div>
                      ) : (
                        <NeonText color="#00D4FF" intensity="low">
                          به‌روزرسانی
                        </NeonText>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-8"
                    >
                      <div className="text-center space-y-4">
                        <CyberSpinner size="lg" color="#00D4FF" />
                        <motion.p 
                          className="text-sm text-gray-400"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          در حال بارگذاری اطلاعات تنانت‌ها...
                        </motion.p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="table"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="overflow-x-auto" 
                      dir="rtl"
                    >
                      <div className={`${glassmorphismClasses.base} rounded-xl overflow-hidden`}>
                        <table className="w-full text-right">
                          <thead>
                            <tr className="border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10">
                              <th className="text-right py-4 px-6 font-semibold text-white">
                                <NeonText color="#00D4FF" intensity="low">تنانت</NeonText>
                              </th>
                              <th className="text-right py-4 px-6 font-semibold text-white">
                                <NeonText color="#00FF88" intensity="low">نوع اشتراک</NeonText>
                              </th>
                              <th className="text-right py-4 px-6 font-semibold text-white">
                                <NeonText color="#FF6B35" intensity="low">وضعیت</NeonText>
                              </th>
                              <th className="text-right py-4 px-6 font-semibold text-white">
                                <NeonText color="#A55EEA" intensity="low">انقضا</NeonText>
                              </th>
                              <th className="text-right py-4 px-6 font-semibold text-white">
                                <NeonText color="#FFB800" intensity="low">عملیات</NeonText>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenants.map((tenant, index) => {
                              const expiryStatus = getExpiryStatus(tenant);
                              return (
                                <motion.tr 
                                  key={tenant.id} 
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05, duration: 0.3 }}
                                  className="border-b border-white/5 hover:bg-gradient-to-r hover:from-white/5 hover:to-white/10 transition-all duration-300 group"
                                  whileHover={{ scale: 1.01 }}
                                >
                                  <td className="py-4 px-6">
                                    <div className="space-y-1">
                                      <div className="font-medium text-white group-hover:text-cyan-300 transition-colors">
                                        {tenant.name}
                                      </div>
                                      <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                        {tenant.email}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                    >
                                      <Badge 
                                        variant={getSubscriptionBadgeVariant(tenant.subscription_type)}
                                        className={`${tenant.subscription_type === SubscriptionType.PRO 
                                          ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-400/30 text-emerald-300 shadow-[0_0_10px_rgba(0,255,136,0.3)]' 
                                          : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400/30 text-gray-300 shadow-[0_0_10px_rgba(156,163,175,0.3)]'
                                        } transition-all duration-300`}
                                      >
                                        {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                                      </Badge>
                                    </motion.div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                    >
                                      <Badge 
                                        variant={getStatusBadgeVariant(tenant.status)}
                                        className={`${
                                          tenant.status === TenantStatus.ACTIVE 
                                            ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-400/30 text-cyan-300 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                                            : tenant.status === TenantStatus.SUSPENDED
                                            ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-400/30 text-orange-300 shadow-[0_0_10px_rgba(255,107,53,0.3)]'
                                            : 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/30 text-red-300 shadow-[0_0_10px_rgba(255,71,87,0.3)]'
                                        } transition-all duration-300`}
                                      >
                                        {tenant.status === TenantStatus.ACTIVE ? 'فعال' : 
                                         tenant.status === TenantStatus.SUSPENDED ? 'تعلیق' : 'لغو شده'}
                                      </Badge>
                                    </motion.div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="space-y-1">
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                      >
                                        <Badge 
                                          variant={expiryStatus.variant as any}
                                          className={`${
                                            expiryStatus.variant === 'destructive'
                                              ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/30 text-red-300 shadow-[0_0_10px_rgba(255,71,87,0.3)]'
                                              : expiryStatus.variant === 'secondary'
                                              ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-400/30 text-yellow-300 shadow-[0_0_10px_rgba(255,184,0,0.3)]'
                                              : 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400/30 text-purple-300 shadow-[0_0_10px_rgba(165,94,234,0.3)]'
                                          } transition-all duration-300`}
                                        >
                                          {expiryStatus.text}
                                        </Badge>
                                      </motion.div>
                                      {tenant.subscription_expires_at && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {formatDate(tenant.subscription_expires_at)}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex gap-2 justify-start flex-wrap">
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            selectTenant(tenant);
                                            setExtensionDialogOpen(true);
                                          }}
                                          disabled={isActionLoading}
                                          className={`${glassmorphismClasses.base} border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] bg-white/5 text-emerald-300 hover:bg-emerald-500/10 transition-all duration-300 text-xs`}
                                        >
                                          تمدید
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            selectTenant(tenant);
                                            setStatusDialogOpen(true);
                                          }}
                                          disabled={isActionLoading}
                                          className={`${glassmorphismClasses.base} border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] bg-white/5 text-cyan-300 hover:bg-cyan-500/10 transition-all duration-300 text-xs`}
                                        >
                                          وضعیت
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            selectTenant(tenant);
                                            setPlanSwitchDialogOpen(true);
                                          }}
                                          disabled={isActionLoading}
                                          className={`${glassmorphismClasses.base} border-orange-500/30 hover:border-orange-400/50 hover:shadow-[0_0_15px_rgba(255,107,53,0.3)] bg-white/5 text-orange-300 hover:bg-orange-500/10 transition-all duration-300 text-xs`}
                                        >
                                          پلن
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            selectTenant(tenant);
                                            setFullControlDialogOpen(true);
                                          }}
                                          disabled={isActionLoading}
                                          className={`${glassmorphismClasses.base} border-purple-500/30 hover:border-purple-400/50 hover:shadow-[0_0_15px_rgba(165,94,234,0.3)] bg-white/5 text-purple-300 hover:bg-purple-500/10 transition-all duration-300 text-xs`}
                                        >
                                          کنترل کامل
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            selectTenant(tenant);
                                            setHistoryDialogOpen(true);
                                          }}
                                          className="text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 text-xs"
                                        >
                                          تاریخچه
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                        
                        {tenants.length === 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-12"
                          >
                            <div className="space-y-4">
                              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                              </div>
                              <NeonText color="#6B7280" intensity="low">
                                هیچ تنانتی یافت نشد
                              </NeonText>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </CyberCard>
          </motion.div>
        </TabsContent>

        <TabsContent value="analytics">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <CyberCard variant="accent" className={`${glassmorphismClasses.card} border-orange-500/20`}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,107,53,0.8)]"></div>
                  <CardTitle>
                    <NeonText color="#FF6B35" intensity="medium">
                      آمار و تحلیل اشتراک‌ها
                    </NeonText>
                  </CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  آمار تفصیلی و تحلیل عملکرد اشتراک‌ها
                </CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  <div className="space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-orange-500/20 to-purple-500/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <NeonText color="#FF6B35" intensity="medium" className="text-lg">
                        آمار تفصیلی در حال توسعه
                      </NeonText>
                      <p className="text-gray-400 text-sm">
                        نمودارها و آمار تفصیلی اشتراک‌ها در نسخه‌های آینده اضافه خواهد شد
                      </p>
                    </div>
                    <motion.div
                      className="flex justify-center space-x-1 space-x-reverse"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1, duration: 0.5 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-orange-400 rounded-full"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </motion.div>
                  </div>
                </motion.div>
              </CardContent>
            </CyberCard>
          </motion.div>
        </TabsContent>
      </Tabs>
      </AnimatedWrapper>

      {/* Dialogs */}
      {selectedTenant && (
        <>
          <SubscriptionExtensionDialog
            open={extensionDialogOpen}
            onOpenChange={setExtensionDialogOpen}
            tenant={selectedTenant}
            onExtend={extendSubscription}
            loading={isActionLoading}
          />

          <SubscriptionStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            tenant={selectedTenant}
            onUpdateStatus={updateSubscriptionStatus}
            loading={isActionLoading}
          />

          <SubscriptionPlanSwitchDialog
            open={planSwitchDialogOpen}
            onOpenChange={setPlanSwitchDialogOpen}
            tenant={selectedTenant}
            onSwitchPlan={switchSubscriptionPlan}
            loading={isActionLoading}
          />

          <SubscriptionFullControlDialog
            open={fullControlDialogOpen}
            onOpenChange={setFullControlDialogOpen}
            tenant={selectedTenant}
            onFullControl={fullSubscriptionControl}
            loading={isActionLoading}
          />

          <SubscriptionHistoryDialog
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
            tenant={selectedTenant}
          />
        </>
      )}
    </motion.div>
  );
};

export default SubscriptionManagement;