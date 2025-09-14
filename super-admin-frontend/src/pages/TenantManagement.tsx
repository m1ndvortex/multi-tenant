import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Building2, Settings, Eye } from 'lucide-react';
import { AnimatedWrapper, CyberCard, NeonText, StaggerContainer } from '@/components/animations/CyberAnimations';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
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
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-[#0B0E1A] via-[#1A1D29] to-[#252A3A] p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-6">
        {/* Page Header with Cybersecurity Styling */}
        <AnimatedWrapper variant="cyber" className="flex items-center justify-between">
          <div>
            <NeonText 
              as="h1" 
              className="text-3xl font-bold mb-2" 
              color="#00D4FF"
              intensity="high"
            >
              مدیریت پیشرفته تنانت‌ها
            </NeonText>
            <p className="text-[#B8BCC8] mt-1 text-lg">
              مدیریت جامع و نظارت بر تمام تنانت‌های پلتفرم با قابلیت‌های پیشرفته
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={useEnhancedTable ? "gradient-blue" : "outline"}
                onClick={() => setUseEnhancedTable(!useEnhancedTable)}
                className={`
                  flex items-center gap-2 backdrop-blur-[20px] saturate-[180%] 
                  ${useEnhancedTable 
                    ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#00FF88]/20 border-[#00D4FF]/30 shadow-[0_0_20px_rgba(0,212,255,0.3)]' 
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.08]'
                  }
                  text-white transition-all duration-300
                `}
              >
                {useEnhancedTable ? <Settings className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {useEnhancedTable ? 'جدول پیشرفته' : 'جدول ساده'}
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="gradient-green"
                onClick={() => setIsCreateDialogOpen(true)}
                className="
                  flex items-center gap-2 backdrop-blur-[20px] saturate-[180%]
                  bg-gradient-to-r from-[#00FF88]/20 to-[#00D4FF]/20 
                  border-[#00FF88]/30 shadow-[0_0_20px_rgba(0,255,136,0.3)]
                  text-white hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]
                  transition-all duration-300
                "
              >
                <Plus className="h-4 w-4" />
                ایجاد تنانت جدید
              </Button>
            </motion.div>
          </div>
        </AnimatedWrapper>

        {/* Cybersecurity Stats Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-6" staggerDelay={0.1}>
          <CyberCard 
            variant="secondary" 
            glowIntensity="medium"
            className="
              backdrop-blur-[16px] saturate-[150%] 
              bg-gradient-to-br from-[#252A3A]/80 via-[#1A1D29]/90 to-[#0B0E1A]/95 
              border border-[#00FF88]/20 rounded-2xl
              shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(0,255,136,0.1)]
              hover:shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_30px_rgba(0,255,136,0.2)]
              transition-all duration-300
            "
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#B8BCC8] mb-2">کل تنانت‌ها</p>
                  <AnimatedCounter 
                    value={stats.total} 
                    className="text-3xl font-bold text-[#00FF88] drop-shadow-[0_0_12px_rgba(0,255,136,0.6)]"
                  />
                </div>
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 10px rgba(0,255,136,0.3)",
                      "0 0 20px rgba(0,255,136,0.6)",
                      "0 0 10px rgba(0,255,136,0.3)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="p-2 rounded-xl bg-gradient-to-br from-[#00FF88]/20 to-[#00D4FF]/10"
                >
                  <Building2 className="h-8 w-8 text-[#00FF88]" />
                </motion.div>
              </div>
            </CardContent>
          </CyberCard>

          <CyberCard 
            variant="primary" 
            glowIntensity="medium"
            className="
              backdrop-blur-[16px] saturate-[150%] 
              bg-gradient-to-br from-[#252A3A]/80 via-[#1A1D29]/90 to-[#0B0E1A]/95 
              border border-[#00D4FF]/20 rounded-2xl
              shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(0,212,255,0.1)]
              hover:shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_30px_rgba(0,212,255,0.2)]
              transition-all duration-300
            "
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#B8BCC8] mb-2">فعال</p>
                  <AnimatedCounter 
                    value={stats.active} 
                    className="text-3xl font-bold text-[#00D4FF] drop-shadow-[0_0_12px_rgba(0,212,255,0.6)]"
                  />
                </div>
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 10px rgba(0,212,255,0.3)",
                      "0 0 20px rgba(0,212,255,0.6)",
                      "0 0 10px rgba(0,212,255,0.3)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="p-2 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#00FF88]/10"
                >
                  <Users className="h-8 w-8 text-[#00D4FF]" />
                </motion.div>
              </div>
            </CardContent>
          </CyberCard>

          <CyberCard 
            variant="accent" 
            glowIntensity="medium"
            className="
              backdrop-blur-[16px] saturate-[150%] 
              bg-gradient-to-br from-[#252A3A]/80 via-[#1A1D29]/90 to-[#0B0E1A]/95 
              border border-[#A55EEA]/20 rounded-2xl
              shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(165,94,234,0.1)]
              hover:shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_30px_rgba(165,94,234,0.2)]
              transition-all duration-300
            "
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#B8BCC8] mb-2">حرفه‌ای</p>
                  <AnimatedCounter 
                    value={stats.pro} 
                    className="text-3xl font-bold text-[#A55EEA] drop-shadow-[0_0_12px_rgba(165,94,234,0.6)]"
                  />
                </div>
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 10px rgba(165,94,234,0.3)",
                      "0 0 20px rgba(165,94,234,0.6)",
                      "0 0 10px rgba(165,94,234,0.3)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="p-2 rounded-xl bg-gradient-to-br from-[#A55EEA]/20 to-[#FF6B35]/10"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#A55EEA] to-[#FF6B35] flex items-center justify-center shadow-[0_0_15px_rgba(165,94,234,0.4)]">
                    <span className="text-white text-sm font-bold">P</span>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </CyberCard>

          <CyberCard 
            variant="accent" 
            glowIntensity="medium"
            className="
              backdrop-blur-[16px] saturate-[150%] 
              bg-gradient-to-br from-[#252A3A]/80 via-[#1A1D29]/90 to-[#0B0E1A]/95 
              border border-[#FF6B35]/20 rounded-2xl
              shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(255,107,53,0.1)]
              hover:shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_30px_rgba(255,107,53,0.2)]
              transition-all duration-300
            "
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#B8BCC8] mb-2">در انتظار پرداخت</p>
                  <AnimatedCounter 
                    value={stats.pending} 
                    className="text-3xl font-bold text-[#FF6B35] drop-shadow-[0_0_12px_rgba(255,107,53,0.6)]"
                  />
                </div>
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 10px rgba(255,107,53,0.3)",
                      "0 0 20px rgba(255,107,53,0.6)",
                      "0 0 10px rgba(255,107,53,0.3)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="p-2 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FFB800]/10"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#FFB800] flex items-center justify-center shadow-[0_0_15px_rgba(255,107,53,0.4)]">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </CyberCard>
        </StaggerContainer>

        {/* Cybersecurity Filters */}
        <AnimatedWrapper variant="slideIn" delay={0.3}>
          <TenantFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </AnimatedWrapper>

        {/* Cybersecurity Tenants Table */}
        <AnimatedWrapper variant="fadeIn" delay={0.4}>
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
        </AnimatedWrapper>

        {/* Cybersecurity Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <AnimatedWrapper variant="fadeIn" delay={0.5}>
            <div className="flex justify-center">
              <div className="
                backdrop-blur-[20px] saturate-[180%] 
                bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4
                shadow-[0_8px_32px_rgba(0,0,0,0.4)]
              ">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </AnimatedWrapper>
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
    </motion.div>
  );
};

export default TenantManagement;