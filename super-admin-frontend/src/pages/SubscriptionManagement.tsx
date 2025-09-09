import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/enhanced-input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Components
import SubscriptionOverviewDashboard from '@/components/subscription/SubscriptionOverviewDashboard';
import SubscriptionExtensionDialog from '@/components/subscription/SubscriptionExtensionDialog';
import SubscriptionPlanSwitchDialog from '@/components/subscription/SubscriptionPlanSwitchDialog';
import SubscriptionStatusDialog from '@/components/subscription/SubscriptionStatusDialog';
import SubscriptionHistoryDialog from '@/components/subscription/SubscriptionHistoryDialog';
import TenantSubscriptionTable from '@/components/subscription/TenantSubscriptionTable';

// Services and Types
import { subscriptionService, SubscriptionOverview, SubscriptionStats } from '@/services/subscriptionService';
import { useTenants } from '@/hooks/useTenants';
import { Tenant } from '@/types/tenant';

interface SubscriptionFilters {
  search: string;
  subscription_type: string;
  status: string;
  expiry_status: string;
}

const SubscriptionManagement: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState<SubscriptionFilters>({
    search: '',
    subscription_type: '',
    status: '',
    expiry_status: '',
  });

  // Dialog states
  const [isExtensionDialogOpen, setIsExtensionDialogOpen] = useState(false);
  const [isPlanSwitchDialogOpen, setIsPlanSwitchDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // API queries
  const { data: subscriptionOverview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['subscription-overview'],
    queryFn: () => subscriptionService.getSubscriptionOverview(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: subscriptionStats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: () => subscriptionService.getSubscriptionStats(),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: tenantsData, isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants(
    currentPage, 
    pageSize, 
    {
      search: filters.search,
      subscription_type: filters.subscription_type,
      is_active: filters.status,
    }
  );

  // Mutations
  const extendSubscriptionMutation = useMutation({
    mutationFn: ({ tenantId, months, reason }: { tenantId: string; months: number; reason?: string }) =>
      subscriptionService.extendSubscription(tenantId, { months, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-overview'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast({
        title: 'موفقیت',
        description: 'اشتراک با موفقیت تمدید شد',
      });
      setIsExtensionDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در تمدید اشتراک',
        variant: 'destructive',
      });
    },
  });

  const switchPlanMutation = useMutation({
    mutationFn: ({ 
      tenantId, 
      newPlan, 
      durationMonths, 
      reason 
    }: { 
      tenantId: string; 
      newPlan: 'free' | 'pro'; 
      durationMonths?: number; 
      reason?: string; 
    }) =>
      subscriptionService.switchSubscriptionPlan(tenantId, {
        new_plan: newPlan,
        duration_months: durationMonths,
        reason,
        immediate_effect: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-overview'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast({
        title: 'موفقیت',
        description: 'نوع اشتراک با موفقیت تغییر کرد',
      });
      setIsPlanSwitchDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در تغییر نوع اشتراک',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ 
      tenantId, 
      activate, 
      subscriptionType, 
      reason 
    }: { 
      tenantId: string; 
      activate: boolean; 
      subscriptionType?: 'free' | 'pro'; 
      reason?: string; 
    }) =>
      subscriptionService.updateSubscriptionStatus(tenantId, {
        activate,
        subscription_type: subscriptionType,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-overview'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast({
        title: 'موفقیت',
        description: 'وضعیت اشتراک با موفقیت به‌روزرسانی شد',
      });
      setIsStatusDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در به‌روزرسانی وضعیت اشتراک',
        variant: 'destructive',
      });
    },
  });

  // Computed values
  const tenants = tenantsData?.tenants || [];
  const pagination = tenantsData?.pagination;

  const filteredTenants = useMemo(() => {
    return tenants.filter(tenant => {
      // Apply expiry status filter
      if (filters.expiry_status) {
        const now = new Date();
        const expiryDate = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : null;
        
        switch (filters.expiry_status) {
          case 'expired':
            if (!expiryDate || expiryDate > now) return false;
            break;
          case 'expiring_soon':
            if (!expiryDate) return false;
            const diffTime = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0 || diffDays > 30) return false;
            break;
          case 'active':
            if (!expiryDate || expiryDate <= now) return false;
            break;
        }
      }
      
      return true;
    });
  }, [tenants, filters.expiry_status]);

  // Event handlers
  const handleFiltersChange = (newFilters: Partial<SubscriptionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      subscription_type: '',
      status: '',
      expiry_status: '',
    });
    setCurrentPage(1);
  };

  const handleRefreshData = () => {
    refetchOverview();
    refetchStats();
    refetchTenants();
  };

  const handleExtendSubscription = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsExtensionDialogOpen(true);
  };

  const handleSwitchPlan = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsPlanSwitchDialogOpen(true);
  };

  const handleUpdateStatus = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsStatusDialogOpen(true);
  };

  const handleViewHistory = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsHistoryDialogOpen(true);
  };

  const handleExtensionSubmit = (months: number, reason?: string) => {
    if (selectedTenant) {
      extendSubscriptionMutation.mutate({
        tenantId: selectedTenant.id,
        months,
        reason,
      });
    }
  };

  const handlePlanSwitchSubmit = (newPlan: 'free' | 'pro', durationMonths?: number, reason?: string) => {
    if (selectedTenant) {
      switchPlanMutation.mutate({
        tenantId: selectedTenant.id,
        newPlan,
        durationMonths,
        reason,
      });
    }
  };

  const handleStatusUpdateSubmit = (activate: boolean, subscriptionType?: 'free' | 'pro', reason?: string) => {
    if (selectedTenant) {
      updateStatusMutation.mutate({
        tenantId: selectedTenant.id,
        activate,
        subscriptionType,
        reason,
      });
    }
  };

  const isAnyMutationLoading = 
    extendSubscriptionMutation.isPending ||
    switchPlanMutation.isPending ||
    updateStatusMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مدیریت حرفه‌ای اشتراک‌ها</h1>
          <p className="text-slate-600 mt-1">کنترل کامل اشتراک‌ها، تمدید و تغییر نوع اشتراک تنانت‌ها</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshData}
          className="flex items-center gap-2"
          disabled={isOverviewLoading || isStatsLoading || isTenantsLoading}
        >
          <RefreshCw className={`h-4 w-4 ${(isOverviewLoading || isStatsLoading || isTenantsLoading) ? 'animate-spin' : ''}`} />
          به‌روزرسانی
        </Button>
      </div>

      {/* Subscription Overview Dashboard */}
      <SubscriptionOverviewDashboard
        overview={subscriptionOverview}
        stats={subscriptionStats}
        isLoading={isOverviewLoading || isStatsLoading}
      />

      {/* Filters */}
      <Card variant="filter">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">جستجو</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="نام تنانت، ایمیل یا دامنه..."
                  value={filters.search}
                  onChange={(e) => handleFiltersChange({ search: e.target.value })}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">نوع اشتراک</label>
              <select
                value={filters.subscription_type}
                onChange={(e) => handleFiltersChange({ subscription_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">همه</option>
                <option value="free">رایگان</option>
                <option value="pro">حرفه‌ای</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">وضعیت</label>
              <select
                value={filters.status}
                onChange={(e) => handleFiltersChange({ status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">همه</option>
                <option value="active">فعال</option>
                <option value="suspended">تعلیق</option>
                <option value="pending">در انتظار</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">وضعیت انقضا</label>
              <select
                value={filters.expiry_status}
                onChange={(e) => handleFiltersChange({ expiry_status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">همه</option>
                <option value="active">فعال</option>
                <option value="expiring_soon">به زودی منقضی</option>
                <option value="expired">منقضی شده</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              پاک کردن فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Subscription Table */}
      <TenantSubscriptionTable
        tenants={filteredTenants}
        onExtendSubscription={handleExtendSubscription}
        onSwitchPlan={handleSwitchPlan}
        onUpdateStatus={handleUpdateStatus}
        onViewHistory={handleViewHistory}
        isLoading={isTenantsLoading}
        pagination={pagination}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Subscription Extension Dialog */}
      <SubscriptionExtensionDialog
        tenant={selectedTenant}
        isOpen={isExtensionDialogOpen}
        onClose={() => {
          setIsExtensionDialogOpen(false);
          setSelectedTenant(null);
        }}
        onSubmit={handleExtensionSubmit}
        isLoading={extendSubscriptionMutation.isPending}
      />

      {/* Subscription Plan Switch Dialog */}
      <SubscriptionPlanSwitchDialog
        tenant={selectedTenant}
        isOpen={isPlanSwitchDialogOpen}
        onClose={() => {
          setIsPlanSwitchDialogOpen(false);
          setSelectedTenant(null);
        }}
        onSubmit={handlePlanSwitchSubmit}
        isLoading={switchPlanMutation.isPending}
      />

      {/* Subscription Status Dialog */}
      <SubscriptionStatusDialog
        tenant={selectedTenant}
        isOpen={isStatusDialogOpen}
        onClose={() => {
          setIsStatusDialogOpen(false);
          setSelectedTenant(null);
        }}
        onSubmit={handleStatusUpdateSubmit}
        isLoading={updateStatusMutation.isPending}
      />

      {/* Subscription History Dialog */}
      <SubscriptionHistoryDialog
        tenant={selectedTenant}
        isOpen={isHistoryDialogOpen}
        onClose={() => {
          setIsHistoryDialogOpen(false);
          setSelectedTenant(null);
        }}
      />
    </div>
  );
};

export default SubscriptionManagement;