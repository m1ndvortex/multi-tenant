import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/enhanced-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Building2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// Enhanced Components
import EnhancedTenantTable from '@/components/enhanced/EnhancedTenantTable';
import TenantCredentialsDialog, { TenantCredentialsData } from '@/components/enhanced/TenantCredentialsDialog';
import EnhancedTenantForm, { EnhancedTenantFormData } from '@/components/enhanced/EnhancedTenantForm';
import SubscriptionManagementDialog from '@/components/enhanced/SubscriptionManagementDialog';

// Existing Components
import TenantFilters from '@/components/TenantFilters';
import PaymentConfirmationDialog from '@/components/PaymentConfirmationDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Pagination from '@/components/ui/pagination';

// Services and Hooks
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  useSuspendTenant,
  useActivateTenant,
  useConfirmPayment,
} from '@/hooks/useTenants';
import { enhancedTenantService } from '@/services/enhancedTenantService';

// Types
import { Tenant, TenantFilters as TenantFiltersType, TenantFormData } from '@/types/tenant';

const EnhancedTenantManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState<TenantFiltersType>({
    search: '',
    subscription_type: '',
    is_active: '',
  });

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // API hooks
  const { data: tenantsData, isLoading } = useTenants(currentPage, pageSize, filters);
  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();
  const deleteTenantMutation = useDeleteTenant();
  const suspendTenantMutation = useSuspendTenant();
  const activateTenantMutation = useActivateTenant();
  const confirmPaymentMutation = useConfirmPayment();

  // Enhanced API mutations
  const updateCredentialsMutation = useMutation({
    mutationFn: ({ tenantId, credentials }: { tenantId: string; credentials: TenantCredentialsData }) =>
      enhancedTenantService.updateTenantCredentials(tenantId, credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'اطلاعات ورود تنانت با موفقیت به‌روزرسانی شد',
      });
      setIsCredentialsDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در به‌روزرسانی اطلاعات ورود',
        variant: 'destructive',
      });
    },
  });

  const fullUpdateMutation = useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: EnhancedTenantFormData }) =>
      enhancedTenantService.fullTenantUpdate(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'اطلاعات تنانت با موفقیت به‌روزرسانی شد',
      });
      setIsEditDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در به‌روزرسانی تنانت',
        variant: 'destructive',
      });
    },
  });

  const extendSubscriptionMutation = useMutation({
    mutationFn: ({ tenantId, months, reason }: { tenantId: string; months: number; reason?: string }) =>
      enhancedTenantService.extendSubscription(tenantId, months, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'اشتراک با موفقیت تمدید شد',
      });
      setIsSubscriptionDialogOpen(false);
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

  const changePlanMutation = useMutation({
    mutationFn: ({ tenantId, newPlan, reason }: { tenantId: string; newPlan: 'free' | 'pro'; reason?: string }) =>
      enhancedTenantService.changeSubscriptionPlan(tenantId, newPlan, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'نوع اشتراک با موفقیت تغییر کرد',
      });
      setIsSubscriptionDialogOpen(false);
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

  const activateSubscriptionMutation = useMutation({
    mutationFn: ({ tenantId, reason }: { tenantId: string; reason?: string }) =>
      enhancedTenantService.updateSubscriptionStatus(tenantId, true, undefined, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'اشتراک با موفقیت فعال شد',
      });
      setIsSubscriptionDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در فعال‌سازی اشتراک',
        variant: 'destructive',
      });
    },
  });

  const deactivateSubscriptionMutation = useMutation({
    mutationFn: ({ tenantId, reason }: { tenantId: string; reason?: string }) =>
      enhancedTenantService.updateSubscriptionStatus(tenantId, false, undefined, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'اشتراک با موفقیت تعلیق شد',
      });
      setIsSubscriptionDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در تعلیق اشتراک',
        variant: 'destructive',
      });
    },
  });

  // Computed values
  const tenants = tenantsData?.tenants || [];
  const pagination = tenantsData?.pagination;

  const stats = useMemo(() => {
    const total = pagination?.total || 0;
    if (!tenants.length) return { total, active: 0, pro: 0, pending: 0 };

    return {
      total,
      active: tenants.filter(t => (t.status ?? (t.is_active ? 'active' : 'suspended')) === 'active').length,
      pro: tenants.filter(t => t.subscription_type === 'pro').length,
      pending: tenants.filter(t => (t.status ?? (t.is_active ? 'active' : 'pending')) === 'pending').length,
    };
  }, [tenants, pagination]);

  // Event handlers
  const handleFiltersChange = (newFilters: TenantFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      subscription_type: '',
      is_active: '',
    });
    setCurrentPage(1);
  };

  const handleCreateTenant = (data: TenantFormData) => {
    createTenantMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
      },
    });
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTenant = (data: EnhancedTenantFormData) => {
    if (selectedTenant) {
      fullUpdateMutation.mutate({ tenantId: selectedTenant.id, data });
    }
  };

  const handleUpdateCredentials = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsCredentialsDialogOpen(true);
  };

  const handleCredentialsUpdate = (tenantId: string, credentials: TenantCredentialsData) => {
    updateCredentialsMutation.mutate({ tenantId, credentials });
  };

  const handleManageSubscription = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsSubscriptionDialogOpen(true);
  };

  const handleExtendSubscription = (tenantId: string, months: number, reason?: string) => {
    extendSubscriptionMutation.mutate({ tenantId, months, reason });
  };

  const handleChangePlan = (tenantId: string, newPlan: 'free' | 'pro', reason?: string) => {
    changePlanMutation.mutate({ tenantId, newPlan, reason });
  };

  const handleActivateSubscription = (tenantId: string, reason?: string) => {
    activateSubscriptionMutation.mutate({ tenantId, reason });
  };

  const handleDeactivateSubscription = (tenantId: string, reason?: string) => {
    deactivateSubscriptionMutation.mutate({ tenantId, reason });
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = (tenantId: string) => {
    deleteTenantMutation.mutate(tenantId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedTenant(null);
      },
    });
  };

  const handleSuspendTenant = (tenant: Tenant) => {
    suspendTenantMutation.mutate(tenant.id);
  };

  const handleActivateTenant = (tenant: Tenant) => {
    activateTenantMutation.mutate(tenant.id);
  };

  const handleConfirmPayment = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentConfirmation = (tenantId: string, duration: number) => {
    confirmPaymentMutation.mutate(
      { id: tenantId, duration },
      {
        onSuccess: () => {
          setIsPaymentDialogOpen(false);
          setSelectedTenant(null);
        },
      }
    );
  };

  const handleImpersonate = (tenant: Tenant) => {
    navigate(`/impersonation?tenant_id=${tenant.id}`);
  };

  const isAnyMutationLoading = 
    updateCredentialsMutation.isPending ||
    fullUpdateMutation.isPending ||
    extendSubscriptionMutation.isPending ||
    changePlanMutation.isPending ||
    activateSubscriptionMutation.isPending ||
    deactivateSubscriptionMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مدیریت پیشرفته تنانت‌ها</h1>
          <p className="text-slate-600 mt-1">مدیریت جامع و کنترل کامل تنانت‌های پلتفرم</p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          ایجاد تنانت جدید
        </Button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="gradient-super-admin">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-800">کل تنانت‌ها</p>
                <p className="text-2xl font-bold text-indigo-900">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card variant="success">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">فعال</p>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-tenant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">حرفه‌ای</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.pro}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">P</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="warning">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">در انتظار پرداخت</p>
                <p className="text-2xl font-bold text-orange-900">{stats.pending}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <TenantFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Enhanced Tenants Table */}
      <EnhancedTenantTable
        tenants={tenants}
        onEdit={handleEditTenant}
        onDelete={handleDeleteTenant}
        onSuspend={handleSuspendTenant}
        onActivate={handleActivateTenant}
        onConfirmPayment={handleConfirmPayment}
        onImpersonate={handleImpersonate}
        onUpdateCredentials={handleUpdateCredentials}
        onManageSubscription={handleManageSubscription}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create Tenant Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ایجاد تنانت جدید</DialogTitle>
          </DialogHeader>
          <EnhancedTenantForm
            onSubmit={handleCreateTenant}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createTenantMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ویرایش جامع تنانت</DialogTitle>
          </DialogHeader>
          <EnhancedTenantForm
            tenant={selectedTenant || undefined}
            onSubmit={handleUpdateTenant}
            onCancel={() => {
              setIsEditDialogOpen(false);
              setSelectedTenant(null);
            }}
            isLoading={fullUpdateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Tenant Credentials Dialog */}
      <TenantCredentialsDialog
        tenant={selectedTenant}
        isOpen={isCredentialsDialogOpen}
        onClose={() => {
          setIsCredentialsDialogOpen(false);
          setSelectedTenant(null);
        }}
        onUpdateCredentials={handleCredentialsUpdate}
        isLoading={updateCredentialsMutation.isPending}
      />

      {/* Subscription Management Dialog */}
      <SubscriptionManagementDialog
        tenant={selectedTenant}
        isOpen={isSubscriptionDialogOpen}
        onClose={() => {
          setIsSubscriptionDialogOpen(false);
          setSelectedTenant(null);
        }}
        onExtendSubscription={handleExtendSubscription}
        onChangePlan={handleChangePlan}
        onActivateSubscription={handleActivateSubscription}
        onDeactivateSubscription={handleDeactivateSubscription}
        isLoading={isAnyMutationLoading}
      />

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        tenant={selectedTenant}
        isOpen={isPaymentDialogOpen}
        onClose={() => {
          setIsPaymentDialogOpen(false);
          setSelectedTenant(null);
        }}
        onConfirm={handlePaymentConfirmation}
        isLoading={confirmPaymentMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        tenant={selectedTenant}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedTenant(null);
        }}
        onConfirm={handleConfirmDelete}
        isLoading={deleteTenantMutation.isPending}
      />
    </div>
  );
};

export default EnhancedTenantManagement;