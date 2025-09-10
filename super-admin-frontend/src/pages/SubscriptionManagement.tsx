/**
 * Professional Subscription Management Interface
 * Dedicated subscription management with full manual control
 */

import React, { useState, useEffect } from 'react';
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
    <div className="space-y-6" dir="rtl">
      {/* Overview Dashboard */}
      <SubscriptionOverviewDashboard 
        overview={overview} 
        loading={isLoading}
        onRefresh={refreshAll}
      />

      {/* Main Content */}
      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tenants">مدیریت تنانت‌ها</TabsTrigger>
          <TabsTrigger value="analytics">آمار و تحلیل</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>فیلترها و جستجو</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="جستجو بر اساس نام یا ایمیل..."
                  value={filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                />
                
                <Select
                  value={filters.subscriptionType || 'all'}
                  onValueChange={(value) => 
                    updateFilters({ 
                      subscriptionType: value === 'all' ? undefined : value as SubscriptionType 
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="نوع اشتراک" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value={SubscriptionType.FREE}>رایگان</SelectItem>
                    <SelectItem value={SubscriptionType.PRO}>حرفه‌ای</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.statusFilter || 'all'}
                  onValueChange={(value) => 
                    updateFilters({ 
                      statusFilter: value === 'all' ? undefined : value as any
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه</SelectItem>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="expired">منقضی</SelectItem>
                    <SelectItem value="expiring">در حال انقضا</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tenants Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>لیست تنانت‌ها</CardTitle>
                  <CardDescription>
                    مدیریت اشتراک‌های تنانت‌ها با کنترل کامل
                  </CardDescription>
                </div>
                <Button onClick={refreshAll} disabled={isLoading}>
                  {isLoading ? 'در حال بارگذاری...' : 'به‌روزرسانی'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">در حال بارگذاری...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto" dir="rtl">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-3 px-4 font-semibold">تنانت</th>
                        <th className="text-right py-3 px-4 font-semibold">نوع اشتراک</th>
                        <th className="text-right py-3 px-4 font-semibold">وضعیت</th>
                        <th className="text-right py-3 px-4 font-semibold">انقضا</th>
                        <th className="text-right py-3 px-4 font-semibold">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((tenant) => {
                        const expiryStatus = getExpiryStatus(tenant);
                        return (
                          <tr key={tenant.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-gray-900">{tenant.name}</div>
                                <div className="text-sm text-gray-600">{tenant.email}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={getSubscriptionBadgeVariant(tenant.subscription_type)}>
                                {tenant.subscription_type === SubscriptionType.PRO ? 'حرفه‌ای' : 'رایگان'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={getStatusBadgeVariant(tenant.status)}>
                                {tenant.status === TenantStatus.ACTIVE ? 'فعال' : 
                                 tenant.status === TenantStatus.SUSPENDED ? 'تعلیق' : 'لغو شده'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <Badge variant={expiryStatus.variant as any}>
                                  {expiryStatus.text}
                                </Badge>
                                {tenant.subscription_expires_at && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {formatDate(tenant.subscription_expires_at)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2 justify-start">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    selectTenant(tenant);
                                    setExtensionDialogOpen(true);
                                  }}
                                  disabled={isActionLoading}
                                >
                                  تمدید
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    selectTenant(tenant);
                                    setStatusDialogOpen(true);
                                  }}
                                  disabled={isActionLoading}
                                >
                                  وضعیت
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    selectTenant(tenant);
                                    setPlanSwitchDialogOpen(true);
                                  }}
                                  disabled={isActionLoading}
                                >
                                  پلن
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    selectTenant(tenant);
                                    setFullControlDialogOpen(true);
                                  }}
                                  disabled={isActionLoading}
                                >
                                  کنترل کامل
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    selectTenant(tenant);
                                    setHistoryDialogOpen(true);
                                  }}
                                >
                                  تاریخچه
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {tenants.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      هیچ تنانتی یافت نشد
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>آمار و تحلیل اشتراک‌ها</CardTitle>
              <CardDescription>
                آمار تفصیلی و تحلیل عملکرد اشتراک‌ها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                آمار تفصیلی در نسخه‌های آینده اضافه خواهد شد
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
};

export default SubscriptionManagement;