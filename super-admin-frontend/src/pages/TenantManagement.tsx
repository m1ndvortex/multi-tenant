import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Building2, Settings, Key, Eye } from 'lucide-react';
import TenantFilters from '@/components/TenantFilters';
import TenantTable from '@/components/TenantTable';
import EnhancedTenantTable from '@/components/tenant/EnhancedTenantTable';
import TenantForm from '@/components/TenantForm';
import TenantCredentialsDialog from '@/components/tenant/TenantCredentialsDialog';
import TenantFullEditDialog from '@/components/tenant/TenantFullEditDialog';
import TenantDetailsDialog from '@/components/tenant/TenantDetailsDialog';
import PaymentConfirmationDialog from '@/components/PaymentConfirmationDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import Pagination from '@/components/ui/pagination';
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  useSuspendTenant,
  useActivateTenant,
  useConfirmPayment,
} from '@/hooks/useTenants';
import { Tenant, TenantFilters as TenantFiltersType, TenantFormData } from '@/types/tenant';

const TenantManagement: React.FC = () => {
  const navigate = useNavigate();
  
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
  const [isFullEditDialogOpen, setIsFullEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [useEnhancedTable, setUseEnhancedTable] = useState(true);

  // API hooks
  const { data: tenantsData, isLoading } = useTenants(currentPage, pageSize, filters);
  const createTenantMutation = useCreateTenant();
  const updateTenantMutation = useUpdateTenant();
  const deleteTenantMutation = useDeleteTenant();
  const suspendTenantMutation = useSuspendTenant();
  const activateTenantMutation = useActivateTenant();
  const confirmPaymentMutation = useConfirmPayment();

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

  const handleUpdateTenant = (data: TenantFormData) => {
    if (selectedTenant) {
      updateTenantMutation.mutate(
        { id: selectedTenant.id, data },
        {
          onSuccess: () => {
            setIsEditDialogOpen(false);
            setSelectedTenant(null);
          },
        }
      );
    }
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
    // Navigate to impersonation page with tenant filter
    navigate(`/impersonation?tenant_id=${tenant.id}`);
  };

  // Enhanced functionality handlers
  const handleCredentialsUpdate = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsCredentialsDialogOpen(true);
  };

  const handleFullEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsFullEditDialogOpen(true);
  };

  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">مدیریت پیشرفته تنانت‌ها</h1>
          <p className="text-slate-600 mt-1">مدیریت جامع و نظارت بر تمام تنانت‌های پلتفرم با قابلیت‌های پیشرفته</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={useEnhancedTable ? "gradient-blue" : "outline"}
            onClick={() => setUseEnhancedTable(!useEnhancedTable)}
            className="flex items-center gap-2"
          >
            {useEnhancedTable ? <Settings className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {useEnhancedTable ? 'جدول پیشرفته' : 'جدول ساده'}
          </Button>
          <Button
            variant="gradient-green"
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            ایجاد تنانت جدید
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="gradient-green">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">کل تنانت‌ها</p>
                <p className="text-2xl font-bold text-green-900">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-blue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">فعال</p>
                <p className="text-2xl font-bold text-blue-900">{stats.active}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient-purple">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">حرفه‌ای</p>
                <p className="text-2xl font-bold text-purple-900">{stats.pro}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">P</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">در انتظار پرداخت</p>
                <p className="text-2xl font-bold text-orange-900">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
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

      {/* Tenants Table */}
      {useEnhancedTable ? (
        <EnhancedTenantTable
          tenants={tenants}
          onEdit={handleEditTenant}
          onFullEdit={handleFullEdit}
          onCredentialsUpdate={handleCredentialsUpdate}
          onDelete={handleDeleteTenant}
          onSuspend={handleSuspendTenant}
          onActivate={handleActivateTenant}
          onConfirmPayment={handleConfirmPayment}
          onImpersonate={handleImpersonate}
          onViewDetails={handleViewDetails}
          isLoading={isLoading}
        />
      ) : (
        <TenantTable
          tenants={tenants}
          onEdit={handleEditTenant}
          onDelete={handleDeleteTenant}
          onSuspend={handleSuspendTenant}
          onActivate={handleActivateTenant}
          onConfirmPayment={handleConfirmPayment}
          onImpersonate={handleImpersonate}
          isLoading={isLoading}
        />
      )}

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ایجاد تنانت جدید</DialogTitle>
          </DialogHeader>
          <TenantForm
            onSubmit={handleCreateTenant}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createTenantMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش تنانت</DialogTitle>
          </DialogHeader>
          <TenantForm
            tenant={selectedTenant || undefined}
            onSubmit={handleUpdateTenant}
            onCancel={() => {
              setIsEditDialogOpen(false);
              setSelectedTenant(null);
            }}
            isLoading={updateTenantMutation.isPending}
          />
        </DialogContent>
      </Dialog>

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

      {/* Enhanced Dialogs */}
      <TenantCredentialsDialog
        tenant={selectedTenant}
        isOpen={isCredentialsDialogOpen}
        onClose={() => {
          setIsCredentialsDialogOpen(false);
          setSelectedTenant(null);
        }}
      />

      <TenantFullEditDialog
        tenant={selectedTenant}
        isOpen={isFullEditDialogOpen}
        onClose={() => {
          setIsFullEditDialogOpen(false);
          setSelectedTenant(null);
        }}
      />

      <TenantDetailsDialog
        tenant={selectedTenant}
        isOpen={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false);
          setSelectedTenant(null);
        }}
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

export default TenantManagement;