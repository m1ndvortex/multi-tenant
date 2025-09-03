import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/tenantService';
import { TenantFilters, TenantFormData } from '@/types/tenant';
import { useToast } from '@/hooks/use-toast';

export const useTenants = (
  page: number = 1,
  limit: number = 10,
  filters: Partial<TenantFilters> = {}
) => {
  return useQuery({
    queryKey: ['tenants', page, limit, filters],
    queryFn: () => tenantService.getTenants(page, limit, filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useTenant = (id: string) => {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantService.getTenant(id),
    enabled: !!id,
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TenantFormData) => tenantService.createTenant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'تنانت جدید با موفقیت ایجاد شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در ایجاد تنانت',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TenantFormData> }) =>
      tenantService.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'تنانت با موفقیت به‌روزرسانی شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در به‌روزرسانی تنانت',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tenantService.deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'تنانت با موفقیت حذف شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در حذف تنانت',
        variant: 'destructive',
      });
    },
  });
};

export const useSuspendTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tenantService.suspendTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'تنانت با موفقیت تعلیق شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در تعلیق تنانت',
        variant: 'destructive',
      });
    },
  });
};

export const useActivateTenant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tenantService.activateTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'تنانت با موفقیت فعال شد',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در فعال‌سازی تنانت',
        variant: 'destructive',
      });
    },
  });
};

export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, duration }: { id: string; duration: number }) =>
      tenantService.confirmPayment(id, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: 'موفقیت',
        description: 'پرداخت تأیید شد و اشتراک فعال گردید',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در تأیید پرداخت',
        variant: 'destructive',
      });
    },
  });
};