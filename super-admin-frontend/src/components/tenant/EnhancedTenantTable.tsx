/**
 * Enhanced Tenant Table
 * Enhanced table with improved styling, high-contrast tenant names, and new functionality
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle,
  UserCheck,
  Key,
  Settings,
  Eye,
  Calendar,
  Users
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { CyberCard, CyberSpinner, NeonText } from '@/components/animations/CyberAnimations';

interface EnhancedTenantTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onFullEdit: (tenant: Tenant) => void;
  onCredentialsUpdate: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
  onSuspend: (tenant: Tenant) => void;
  onActivate: (tenant: Tenant) => void;
  onConfirmPayment: (tenant: Tenant) => void;
  onImpersonate?: (tenant: Tenant) => void;
  onViewDetails?: (tenant: Tenant) => void;
  isLoading?: boolean;
}

const EnhancedTenantTable: React.FC<EnhancedTenantTableProps> = ({
  tenants,
  onEdit,
  onFullEdit,
  onCredentialsUpdate,
  onDelete,
  onSuspend,
  onActivate,
  onConfirmPayment,
  onImpersonate,
  onViewDetails,
  isLoading = false,
}) => {
  const getSubscriptionBadge = (subscription_type: string) => {
    switch (subscription_type) {
      case 'free':
        return <Badge variant="secondary">رایگان</Badge>;
      case 'pro':
        return <Badge variant="gradient-green">حرفه‌ای</Badge>;
      case 'enterprise':
        return <Badge variant="gradient-purple">سازمانی</Badge>;
      default:
        return <Badge variant="secondary">{subscription_type}</Badge>;
    }
  };

  const getStatusBadge = (status: string | undefined, is_active: boolean) => {
    // Use status if available, otherwise fall back to is_active
    const actualStatus = status || (is_active ? 'active' : 'suspended');
    
    switch (actualStatus) {
      case 'active':
        return <Badge variant="success">فعال</Badge>;
      case 'suspended':
        return <Badge variant="error">تعلیق</Badge>;
      case 'pending':
        return <Badge variant="secondary">در انتظار</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">لغو شده</Badge>;
      default:
        return <Badge variant="secondary">نامشخص</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: faIR,
      });
    } catch {
      return 'نامشخص';
    }
  };

  const getExpirationStatus = (tenant: Tenant) => {
    if (tenant.subscription_type === 'free') {
      return null;
    }

    if (!tenant.subscription_expires_at) {
      return <Badge variant="secondary">نامحدود</Badge>;
    }

    const expirationDate = new Date(tenant.subscription_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">منقضی شده</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="error">{daysUntilExpiry} روز باقی‌مانده</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge variant="secondary">{daysUntilExpiry} روز باقی‌مانده</Badge>;
    } else {
      return <Badge variant="success">{daysUntilExpiry} روز باقی‌مانده</Badge>;
    }
  };

  if (isLoading) {
    return (
      <CyberCard 
        variant="primary" 
        glowIntensity="medium"
        className="
          backdrop-blur-[20px] saturate-[180%] 
          bg-gradient-to-br from-white/[0.05] to-white/[0.02] 
          border border-white/[0.08] rounded-2xl
          shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,212,255,0.1)]
        "
      >
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32 space-x-4">
            <CyberSpinner size="lg" color="#00D4FF" />
            <NeonText color="#00D4FF" intensity="medium" className="text-lg">
              در حال بارگذاری...
            </NeonText>
          </div>
        </CardContent>
      </CyberCard>
    );
  }

  if (tenants.length === 0) {
    return (
      <CyberCard 
        variant="primary" 
        glowIntensity="low"
        className="
          backdrop-blur-[20px] saturate-[180%] 
          bg-gradient-to-br from-white/[0.05] to-white/[0.02] 
          border border-white/[0.08] rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        "
      >
        <CardContent className="p-8">
          <div className="flex items-center justify-center h-32">
            <div className="text-[#6B7280] text-lg">هیچ تنانتی یافت نشد</div>
          </div>
        </CardContent>
      </CyberCard>
    );
  }

  return (
    <CyberCard 
      variant="primary" 
      glowIntensity="high"
      className="
        backdrop-blur-[20px] saturate-[180%] 
        bg-gradient-to-br from-white/[0.05] to-white/[0.02] 
        border border-white/[0.08] rounded-2xl overflow-hidden
        shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,212,255,0.1)]
        hover:shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_30px_rgba(0,212,255,0.15)]
        transition-all duration-300
      "
    >
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="
              bg-gradient-to-r from-[#252A3A]/60 via-[#1A1D29]/70 to-[#0B0E1A]/80
              border-b border-[#00D4FF]/20
              shadow-[0_4px_20px_rgba(0,212,255,0.1)]
            ">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#00D4FF] tracking-wider drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">
                  نام تنانت
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  دامنه
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  نوع اشتراک
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  وضعیت
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  انقضای اشتراک
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  تعداد کاربران
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  آخرین فعالیت
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  تاریخ ایجاد
                </TableHead>
                <TableHead className="px-6 py-5 text-right text-sm font-bold text-[#B8BCC8] tracking-wider">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant, index) => (
                <motion.tr
                  key={tenant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`
                    border-b border-white/[0.05] 
                    hover:bg-white/[0.03] transition-all duration-300
                    ${index % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'}
                  `}
                >
                  {/* Enhanced Cybersecurity Tenant Name Cell */}
                  <TableCell className="
                    px-6 py-5 text-sm font-semibold 
                    bg-gradient-to-r from-[#00D4FF]/10 to-[#00FF88]/5
                    border-r-2 border-[#00D4FF]/30
                    shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]
                  ">
                    <motion.div 
                      className="flex flex-col"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <NeonText 
                        color="#00D4FF" 
                        intensity="high" 
                        className="font-bold text-lg mb-1"
                      >
                        {tenant.name}
                      </NeonText>
                      {tenant.email && (
                        <span className="text-xs text-[#B8BCC8] mt-1 opacity-80">
                          {tenant.email}
                        </span>
                      )}
                    </motion.div>
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    {tenant.domain ? (
                      <motion.span 
                        className="text-[#00FF88] font-medium drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]"
                        whileHover={{ scale: 1.05 }}
                      >
                        {tenant.domain}
                      </motion.span>
                    ) : (
                      <span className="text-[#6B7280]">-</span>
                    )}
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getSubscriptionBadge(tenant.subscription_type)}
                    </motion.div>
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getStatusBadge(tenant.status, tenant.is_active)}
                    </motion.div>
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getExpirationStatus(tenant)}
                    </motion.div>
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    <motion.div 
                      className="flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        animate={{ 
                          color: ["#6B7280", "#00D4FF", "#6B7280"]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Users className="h-4 w-4" />
                      </motion.div>
                      <span className="text-[#B8BCC8] font-semibold">
                        {tenant.user_count || 0}
                      </span>
                    </motion.div>
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    <span className="text-[#B8BCC8]">
                      {tenant.last_activity || tenant.last_activity_at
                        ? formatDate(tenant.last_activity || (tenant.last_activity_at as string))
                        : 'هرگز'}
                    </span>
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    <motion.div 
                      className="flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <motion.div
                        animate={{ 
                          color: ["#6B7280", "#A55EEA", "#6B7280"]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Calendar className="h-4 w-4" />
                      </motion.div>
                      <span className="text-[#B8BCC8]">
                        {formatDate(tenant.created_at)}
                      </span>
                    </motion.div>
                  </TableCell>

                  <TableCell className="px-6 py-5 text-sm font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Details Button */}
                      {onViewDetails && (
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(tenant)}
                            className="
                              h-8 w-8 p-0 rounded-lg
                              bg-white/[0.03] border border-white/[0.06]
                              text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/30
                              hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]
                              transition-all duration-300
                            "
                            title="مشاهده جزئیات کامل"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}

                      {/* Credentials Update Button */}
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCredentialsUpdate(tenant)}
                          className="
                            h-8 w-8 p-0 rounded-lg
                            bg-white/[0.03] border border-white/[0.06]
                            text-[#A55EEA] hover:bg-[#A55EEA]/10 hover:border-[#A55EEA]/30
                            hover:shadow-[0_0_15px_rgba(165,94,234,0.2)]
                            transition-all duration-300
                          "
                          title="به‌روزرسانی اطلاعات ورود"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </motion.div>

                      {/* Full Edit Button */}
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFullEdit(tenant)}
                          className="
                            h-8 w-8 p-0 rounded-lg
                            bg-white/[0.03] border border-white/[0.06]
                            text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88]/30
                            hover:shadow-[0_0_15px_rgba(0,255,136,0.2)]
                            transition-all duration-300
                          "
                          title="ویرایش جامع"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </motion.div>

                      {/* Basic Edit Button */}
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(tenant)}
                          className="
                            h-8 w-8 p-0 rounded-lg
                            bg-white/[0.03] border border-white/[0.06]
                            text-[#B8BCC8] hover:bg-white/[0.05] hover:border-white/[0.08]
                            hover:shadow-[0_0_10px_rgba(184,188,200,0.2)]
                            transition-all duration-300
                          "
                          title="ویرایش ساده"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </motion.div>

                      {/* Suspend/Activate Button */}
                      {tenant.is_active ? (
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSuspend(tenant)}
                            className="
                              h-8 w-8 p-0 rounded-lg
                              bg-white/[0.03] border border-white/[0.06]
                              text-[#FF6B35] hover:bg-[#FF6B35]/10 hover:border-[#FF6B35]/30
                              hover:shadow-[0_0_15px_rgba(255,107,53,0.2)]
                              transition-all duration-300
                            "
                            title="تعلیق تنانت"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onActivate(tenant)}
                            className="
                              h-8 w-8 p-0 rounded-lg
                              bg-white/[0.03] border border-white/[0.06]
                              text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88]/30
                              hover:shadow-[0_0_15px_rgba(0,255,136,0.2)]
                              transition-all duration-300
                            "
                            title="فعال‌سازی تنانت"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}

                      {/* Confirm Payment Button */}
                      {tenant.subscription_type === 'pro' && tenant.status === 'pending' && (
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onConfirmPayment(tenant)}
                            className="
                              h-8 w-8 p-0 rounded-lg
                              bg-white/[0.03] border border-white/[0.06]
                              text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/30
                              hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]
                              transition-all duration-300
                            "
                            title="تأیید پرداخت"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}

                      {/* Impersonate Button */}
                      {onImpersonate && tenant.is_active && (
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onImpersonate(tenant)}
                            className="
                              h-8 w-8 p-0 rounded-lg
                              bg-white/[0.03] border border-white/[0.06]
                              text-[#A55EEA] hover:bg-[#A55EEA]/10 hover:border-[#A55EEA]/30
                              hover:shadow-[0_0_15px_rgba(165,94,234,0.2)]
                              transition-all duration-300
                            "
                            title="جانشینی کاربران تنانت"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}

                      {/* Delete Button */}
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(tenant)}
                          className="
                            h-8 w-8 p-0 rounded-lg
                            bg-white/[0.03] border border-white/[0.06]
                            text-[#FF4757] hover:bg-[#FF4757]/10 hover:border-[#FF4757]/30
                            hover:shadow-[0_0_15px_rgba(255,71,87,0.2)]
                            transition-all duration-300
                          "
                          title="حذف تنانت"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </CyberCard>
  );
};

export default EnhancedTenantTable;