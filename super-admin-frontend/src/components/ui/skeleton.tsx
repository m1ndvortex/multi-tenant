import React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from '@/lib/utils';

const skeletonVariants = cva(
  "rounded-md relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "animate-pulse bg-slate-200",
        cyber: "bg-gradient-to-r from-white/5 to-white/10 border border-white/10",
        glass: "bg-white/5 backdrop-blur-sm border border-white/8",
        neon: "bg-gradient-to-r from-[#00D4FF]/10 to-[#00FF88]/10 border border-[#00D4FF]/20 shadow-[0_0_15px_rgba(0,212,255,0.1)]",
      },
      animation: {
        pulse: "animate-pulse",
        scan: "",
        glow: "",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animation: "pulse",
    },
  }
);

interface SkeletonProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  rtl?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, animation, rtl = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          skeletonVariants({ variant, animation }),
          rtl && "font-[Vazirmatn]",
          className
        )}
        {...props}
      >
        {/* Scanning line animation for cybersecurity theme */}
        {animation === 'scan' && variant !== 'default' && (
          <motion.div
            className="absolute inset-y-0 w-1 bg-gradient-to-b from-transparent via-white/60 to-transparent"
            animate={{
              x: rtl ? ['100%', '-100%'] : ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
        
        {/* Glow animation for neon variant */}
        {animation === 'glow' && variant === 'neon' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#00D4FF]/20 via-[#00FF88]/20 to-[#FF6B35]/20 rounded-md"
            animate={{
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined cybersecurity skeleton components
export const CyberStatCardSkeleton: React.FC<{ rtl?: boolean }> = ({ rtl = false }) => (
  <motion.div 
    className="p-6 space-y-3 bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className={cn(
      "flex items-center justify-between",
      rtl && "flex-row-reverse"
    )}>
      <div className="flex-1 space-y-2">
        <Skeleton variant="cyber" animation="scan" className="h-4 w-2/3" rtl={rtl} />
        <Skeleton variant="neon" animation="glow" className="h-8 w-1/2" rtl={rtl} />
        <Skeleton variant="cyber" animation="scan" className="h-3 w-1/3" rtl={rtl} />
      </div>
      <Skeleton variant="glass" className="w-12 h-12 rounded-xl" rtl={rtl} />
    </div>
  </motion.div>
);

export const CyberTableRowSkeleton: React.FC<{ 
  columns: number; 
  rtl?: boolean;
  variant?: 'cyber' | 'glass' | 'neon';
}> = ({ columns, rtl = false, variant = 'cyber' }) => (
  <motion.tr
    initial={{ opacity: 0, x: rtl ? 20 : -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <Skeleton 
          variant={variant} 
          animation="scan" 
          className="h-4 w-full" 
          rtl={rtl} 
        />
      </td>
    ))}
  </motion.tr>
);

export const CyberChartSkeleton: React.FC<{ 
  height?: string; 
  rtl?: boolean;
}> = ({ height = "h-64", rtl = false }) => (
  <motion.div 
    className={cn(
      "w-full rounded-2xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 backdrop-blur-md flex items-center justify-center relative overflow-hidden",
      height
    )}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    <div className="text-center space-y-2 z-10">
      <Skeleton variant="neon" animation="glow" className="h-6 w-32 mx-auto" rtl={rtl} />
      <Skeleton variant="cyber" animation="scan" className="h-4 w-24 mx-auto" rtl={rtl} />
    </div>
    
    {/* Animated background grid */}
    <motion.div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
      animate={{
        backgroundPosition: rtl ? ['0 0', '-20px -20px'] : ['0 0', '20px 20px'],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  </motion.div>
);

export const CyberUserListSkeleton: React.FC<{ 
  count?: number; 
  rtl?: boolean;
}> = ({ count = 5, rtl = false }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <motion.div 
        key={index} 
        className={cn(
          "flex items-center p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/2 border border-white/10 backdrop-blur-sm",
          rtl ? "flex-row-reverse space-x-reverse space-x-3" : "space-x-3"
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Skeleton variant="neon" animation="glow" className="w-10 h-10 rounded-full flex-shrink-0" rtl={rtl} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="cyber" animation="scan" className="h-4 w-3/4" rtl={rtl} />
          <Skeleton variant="glass" className="h-3 w-1/2" rtl={rtl} />
        </div>
        <Skeleton variant="cyber" className="w-16 h-6 rounded-full" rtl={rtl} />
      </motion.div>
    ))}
  </div>
);

export const CyberAlertSkeleton: React.FC<{ 
  count?: number; 
  rtl?: boolean;
}> = ({ count = 3, rtl = false }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <motion.div 
        key={index} 
        className={cn(
          "flex items-start p-4 rounded-lg border border-white/10 bg-gradient-to-r from-white/5 to-white/2 backdrop-blur-sm",
          rtl ? "flex-row-reverse space-x-reverse space-x-3" : "space-x-3"
        )}
        initial={{ opacity: 0, x: rtl ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Skeleton variant="neon" animation="glow" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" rtl={rtl} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="cyber" animation="scan" className="h-4 w-3/4" rtl={rtl} />
          <Skeleton variant="glass" className="h-3 w-full" rtl={rtl} />
          <Skeleton variant="cyber" className="h-3 w-1/3" rtl={rtl} />
        </div>
        <Skeleton variant="glass" className="w-8 h-8 rounded" rtl={rtl} />
      </motion.div>
    ))}
  </div>
);

export const CyberSystemHealthSkeleton: React.FC<{ rtl?: boolean }> = ({ rtl = false }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <motion.div 
        key={index} 
        className={cn(
          "flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/2 border border-white/10 backdrop-blur-sm",
          rtl && "flex-row-reverse"
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Skeleton variant="cyber" animation="scan" className="h-4 w-1/3" rtl={rtl} />
        <div className={cn(
          "flex items-center gap-2",
          rtl && "flex-row-reverse"
        )}>
          <Skeleton variant="neon" animation="glow" className="h-4 w-12" rtl={rtl} />
          <Skeleton variant="cyber" animation="scan" className="w-16 h-2 rounded-full" rtl={rtl} />
        </div>
      </motion.div>
    ))}
  </div>
);

export const CyberDashboardSkeleton: React.FC<{ rtl?: boolean }> = ({ rtl = false }) => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <CyberStatCardSkeleton key={index} rtl={rtl} />
      ))}
    </div>
    
    {/* Charts Section */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CyberChartSkeleton height="h-80" rtl={rtl} />
      <CyberChartSkeleton height="h-80" rtl={rtl} />
    </div>
    
    {/* Table Section */}
    <motion.div 
      className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Skeleton variant="cyber" animation="scan" className="h-6 w-48 mb-4" rtl={rtl} />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <CyberTableRowSkeleton key={index} columns={4} rtl={rtl} />
        ))}
      </div>
    </motion.div>
  </div>
);

export const LoadingScanLine: React.FC<{ 
  rtl?: boolean;
  className?: string;
}> = ({ rtl = false, className }) => (
  <div className={cn("relative h-1 w-full overflow-hidden rounded-full bg-white/10", className)}>
    <motion.div
      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-[#00D4FF] via-[#00FF88] to-[#FF6B35] shadow-[0_0_15px_rgba(0,212,255,0.5)]"
      animate={{
        x: rtl ? ['100%', '-100%'] : ['-100%', '100%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  </div>
);

export { Skeleton };