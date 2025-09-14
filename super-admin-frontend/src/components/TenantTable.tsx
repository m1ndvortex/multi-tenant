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
  UserCheck
} from 'lucide-react';
import { Tenant } from '@/types/tenant';
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { CyberCard, CyberSpinner } from '@/components/animations/CyberAnimations';

interface TenantTableProps {
  tenants: Tenant[];
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenant: Tenant) => void;
  onSuspend: (tenant: Tenant) => void;
  onActivate: (tenant: Tenant) => void;
  onConfirmPayment: (tenant: Tenant) => void;
  onImpersonate?: (tenant: Tenant) => void;
  isLoading?: boolean;
}

const TenantTable: React.FC<TenantTableProps> = ({
  tenants,
  onEdit,
  onDelete,
  onSuspend,
  onActivate,
  onConfirmPayment,
  onImpersonate,
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

  const getStatusBadge = (is_active: boolean) => {
    return is_active ? (
      <Badge variant="success">فعال</Badge>
    ) : (
      <Badge variant="error">غیرفعال</Badge>
    );
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

  if (isLoading) {
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
          <div className="flex items-center justify-center h-32 space-x-4">
            <CyberSpinner size="lg" color="#00D4FF" />
            <div className="text-[#B8BCC8] text-lg">در حال بارگذاری...</div>
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
      glowIntensity="medium"
      className="
        backdrop-blur-[20px] saturate-[180%] 
        bg-gradient-to-br from-white/[0.05] to-white/[0.02] 
        border border-white/[0.08] rounded-2xl overflow-hidden
        shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
        hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,212,255,0.1)]
        transition-all duration-300
      "
    >
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="
              bg-gradient-to-r from-[#252A3A]/50 to-[#1A1D29]/50 
              border-b border-white/[0.08]
            ">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">نام</TableHead>
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">دامنه</TableHead>
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">نوع اشتراک</TableHead>
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">وضعیت</TableHead>
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">تعداد کاربران</TableHead>
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">آخرین فعالیت</TableHead>
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">تاریخ ایجاد</TableHead>
                <TableHead className="text-[#B8BCC8] font-semibold text-right px-6 py-4">عملیات</TableHead>
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
                  <TableCell className="font-medium px-6 py-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="
                        font-bold text-[#00D4FF] text-base
                        drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]
                        hover:drop-shadow-[0_0_12px_rgba(0,212,255,0.5)]
                        transition-all duration-300
                      "
                    >
                      {tenant.name}
                    </motion.div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {tenant.domain ? (
                      <span className="text-[#00FF88] font-medium drop-shadow-[0_0_6px_rgba(0,255,136,0.3)]">
                        {tenant.domain}
                      </span>
                    ) : (
                      <span className="text-[#6B7280]">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getSubscriptionBadge(tenant.subscription_type)}
                    </motion.div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getStatusBadge(tenant.is_active)}
                    </motion.div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-[#B8BCC8] font-medium">
                      {tenant.user_count || 0}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-[#B8BCC8]">
                      {tenant.last_activity || tenant.last_activity_at
                        ? formatDate(tenant.last_activity || (tenant.last_activity_at as string))
                        : 'هرگز'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span className="text-[#B8BCC8]">
                      {formatDate(tenant.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* Edit Button */}
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(tenant)}
                          className="
                            h-8 w-8 p-0 rounded-lg
                            bg-white/[0.03] border border-white/[0.06]
                            text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/30
                            hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]
                            transition-all duration-300
                          "
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

export default TenantTable;