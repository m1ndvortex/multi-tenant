import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardContent, CardHeader } from '@/components/ui/card';
import { Tenant, TenantFormData } from '@/types/tenant';
import { CyberCard, NeonText, CyberSpinner } from '@/components/animations/CyberAnimations';

interface TenantFormProps {
  tenant?: Tenant;
  onSubmit: (data: TenantFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TenantForm: React.FC<TenantFormProps> = ({
  tenant,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    domain: '',
    subscription_type: 'free',
    subscription_expires_at: '',
    is_active: true,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        domain: tenant.domain || '',
        subscription_type: tenant.subscription_type === 'enterprise' 
          ? 'pro' 
          : tenant.subscription_type as 'free' | 'pro',
        subscription_expires_at: tenant.subscription_expires_at 
          ? new Date(tenant.subscription_expires_at).toISOString().split('T')[0]
          : '',
        is_active: tenant.is_active,
      });
    }
  }, [tenant]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: keyof TenantFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <CyberCard 
      variant="primary" 
      glowIntensity="medium"
      className="
        backdrop-blur-[20px] saturate-[180%] 
        bg-gradient-to-br from-white/[0.05] to-white/[0.02] 
        border border-white/[0.08] rounded-2xl
        shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,212,255,0.1)]
        hover:shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_30px_rgba(0,212,255,0.15)]
        transition-all duration-300
      "
    >
      <CardHeader className="pb-4">
        <NeonText 
          as="h2" 
          color="#00D4FF" 
          intensity="high" 
          className="text-xl font-bold text-center"
        >
          {tenant ? 'ویرایش تنانت' : 'ایجاد تنانت جدید'}
        </NeonText>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, staggerChildren: 0.1 }}
        >
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label htmlFor="name" className="text-sm font-medium text-[#B8BCC8] block">
              نام تنانت *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="نام کسب‌وکار یا شرکت"
              required
              className="
                backdrop-blur-[16px] saturate-[150%]
                bg-white/[0.03] border border-white/[0.06] rounded-xl
                text-white placeholder:text-[#6B7280]
                focus:border-[#00D4FF]/30 focus:shadow-[0_0_15px_rgba(0,212,255,0.2)]
                hover:bg-white/[0.05] hover:border-white/[0.08]
                transition-all duration-300
              "
            />
          </motion.div>

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label htmlFor="domain" className="text-sm font-medium text-[#B8BCC8] block">
              دامنه (اختیاری)
            </label>
            <Input
              id="domain"
              type="text"
              value={formData.domain}
              onChange={(e) => handleInputChange('domain', e.target.value)}
              placeholder="example.com"
              className="
                backdrop-blur-[16px] saturate-[150%]
                bg-white/[0.03] border border-white/[0.06] rounded-xl
                text-white placeholder:text-[#6B7280]
                focus:border-[#00FF88]/30 focus:shadow-[0_0_15px_rgba(0,255,136,0.2)]
                hover:bg-white/[0.05] hover:border-white/[0.08]
                transition-all duration-300
              "
            />
          </motion.div>

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label htmlFor="subscription_type" className="text-sm font-medium text-[#B8BCC8] block">
              نوع اشتراک
            </label>
            <Select
              value={formData.subscription_type}
              onValueChange={(value: 'free' | 'pro') => handleInputChange('subscription_type', value)}
            >
              <SelectTrigger 
                id="subscription_type"
                className="
                  backdrop-blur-[16px] saturate-[150%]
                  bg-white/[0.03] border border-white/[0.06] rounded-xl
                  text-white hover:bg-white/[0.05] hover:border-white/[0.08]
                  focus:border-[#A55EEA]/30 focus:shadow-[0_0_15px_rgba(165,94,234,0.2)]
                  transition-all duration-300
                "
              >
                <SelectValue placeholder="انتخاب نوع اشتراک" />
              </SelectTrigger>
              <SelectContent className="
                backdrop-blur-[20px] saturate-[180%]
                bg-[#1A1D29]/95 border border-white/[0.08] rounded-xl
                shadow-[0_16px_48px_rgba(0,0,0,0.5)]
              ">
                <SelectItem value="free" className="text-white hover:bg-white/[0.05]">رایگان</SelectItem>
                <SelectItem value="pro" className="text-white hover:bg-white/[0.05]">حرفه‌ای</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {formData.subscription_type === 'pro' && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label htmlFor="subscription_expires_at" className="text-sm font-medium text-[#B8BCC8] block">
                تاریخ انقضای اشتراک
              </label>
              <Input
                id="subscription_expires_at"
                type="date"
                value={formData.subscription_expires_at}
                onChange={(e) => handleInputChange('subscription_expires_at', e.target.value)}
                className="
                  backdrop-blur-[16px] saturate-[150%]
                  bg-white/[0.03] border border-white/[0.06] rounded-xl
                  text-white hover:bg-white/[0.05] hover:border-white/[0.08]
                  focus:border-[#FF6B35]/30 focus:shadow-[0_0_15px_rgba(255,107,53,0.2)]
                  transition-all duration-300
                "
              />
            </motion.div>
          )}

          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label htmlFor="is_active" className="text-sm font-medium text-[#B8BCC8] block">
              وضعیت
            </label>
            <Select
              value={formData.is_active ? 'true' : 'false'}
              onValueChange={(value) => handleInputChange('is_active', value === 'true')}
            >
              <SelectTrigger 
                id="is_active"
                className="
                  backdrop-blur-[16px] saturate-[150%]
                  bg-white/[0.03] border border-white/[0.06] rounded-xl
                  text-white hover:bg-white/[0.05] hover:border-white/[0.08]
                  focus:border-[#00FF88]/30 focus:shadow-[0_0_15px_rgba(0,255,136,0.2)]
                  transition-all duration-300
                "
              >
                <SelectValue placeholder="انتخاب وضعیت" />
              </SelectTrigger>
              <SelectContent className="
                backdrop-blur-[20px] saturate-[180%]
                bg-[#1A1D29]/95 border border-white/[0.08] rounded-xl
                shadow-[0_16px_48px_rgba(0,0,0,0.5)]
              ">
                <SelectItem value="true" className="text-white hover:bg-white/[0.05]">فعال</SelectItem>
                <SelectItem value="false" className="text-white hover:bg-white/[0.05]">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          <motion.div 
            className="flex gap-4 pt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1"
            >
              <Button
                type="submit"
                variant="gradient-green"
                disabled={isLoading || !formData.name.trim()}
                className="
                  w-full flex items-center justify-center gap-2 
                  backdrop-blur-[20px] saturate-[180%]
                  bg-gradient-to-r from-[#00FF88]/20 to-[#00D4FF]/20 
                  border-[#00FF88]/30 shadow-[0_0_20px_rgba(0,255,136,0.3)]
                  text-white hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300
                "
              >
                {isLoading ? (
                  <>
                    <CyberSpinner size="sm" color="#00FF88" />
                    در حال پردازش...
                  </>
                ) : (
                  tenant ? 'به‌روزرسانی' : 'ایجاد'
                )}
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1"
            >
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="
                  w-full backdrop-blur-[16px] saturate-[150%]
                  bg-white/[0.03] border border-[#FF4757]/30 rounded-xl
                  text-[#FF4757] hover:bg-[#FF4757]/10 hover:border-[#FF4757]/50
                  hover:shadow-[0_0_15px_rgba(255,71,87,0.2)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-300
                "
              >
                انصراف
              </Button>
            </motion.div>
          </motion.div>
        </motion.form>
      </CardContent>
    </CyberCard>
  );
};

export default TenantForm;