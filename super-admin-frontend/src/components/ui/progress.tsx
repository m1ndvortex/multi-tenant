/**
 * Progress Component
 * A cybersecurity-themed progress bar component with glassmorphism and neon effects
 */

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden backdrop-blur-sm border",
  {
    variants: {
      variant: {
        default: "bg-secondary border-border",
        cyber: "bg-white/5 border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
        "cyber-primary": "bg-[#00D4FF]/10 border-[#00D4FF]/20 shadow-[0_0_15px_rgba(0,212,255,0.2)]",
        "cyber-success": "bg-[#00FF88]/10 border-[#00FF88]/20 shadow-[0_0_15px_rgba(0,255,136,0.2)]",
        "cyber-warning": "bg-[#FFB800]/10 border-[#FFB800]/20 shadow-[0_0_15px_rgba(255,184,0,0.2)]",
        "cyber-danger": "bg-[#FF4757]/10 border-[#FF4757]/20 shadow-[0_0_15px_rgba(255,71,87,0.2)]",
        glass: "bg-white/3 border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md",
      },
      size: {
        sm: "h-2 rounded-full",
        default: "h-4 rounded-full",
        lg: "h-6 rounded-lg",
        xl: "h-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const indicatorVariants = cva(
  "h-full flex-1 transition-all duration-500 ease-out relative",
  {
    variants: {
      variant: {
        default: "bg-primary",
        cyber: "bg-gradient-to-r from-[#00D4FF] to-[#00FF88] shadow-[0_0_20px_rgba(0,212,255,0.4)]",
        "cyber-primary": "bg-gradient-to-r from-[#00D4FF] to-[#00D4FF]/70 shadow-[0_0_15px_rgba(0,212,255,0.5)]",
        "cyber-success": "bg-gradient-to-r from-[#00FF88] to-[#00FF88]/70 shadow-[0_0_15px_rgba(0,255,136,0.5)]",
        "cyber-warning": "bg-gradient-to-r from-[#FFB800] to-[#FFB800]/70 shadow-[0_0_15px_rgba(255,184,0,0.5)]",
        "cyber-danger": "bg-gradient-to-r from-[#FF4757] to-[#FF4757]/70 shadow-[0_0_15px_rgba(255,71,87,0.5)]",
        glass: "bg-gradient-to-r from-white/40 to-white/20 shadow-[0_0_10px_rgba(255,255,255,0.3)]",
      },
      animated: {
        true: "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-pulse",
        false: "",
      },
      glow: {
        none: "",
        subtle: "shadow-[0_0_10px_currentColor]",
        medium: "shadow-[0_0_20px_currentColor]",
        intense: "shadow-[0_0_30px_currentColor,0_0_60px_currentColor]",
      },
    },
    defaultVariants: {
      variant: "default",
      animated: false,
      glow: "none",
    },
  }
);

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorVariant?: VariantProps<typeof indicatorVariants>['variant'];
  animated?: boolean;
  glow?: VariantProps<typeof indicatorVariants>['glow'];
  showValue?: boolean;
  rtl?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ 
  className, 
  value, 
  variant, 
  size, 
  indicatorVariant, 
  animated = false, 
  glow = "none",
  showValue = false,
  rtl = false,
  ...props 
}, ref) => {
  const progressValue = value || 0;
  
  return (
    <div className="relative w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(progressVariants({ variant, size }), className)}
        {...props}
      >
        <motion.div
          className={cn(
            indicatorVariants({ 
              variant: indicatorVariant || variant, 
              animated, 
              glow 
            })
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progressValue}%` }}
          transition={{ 
            duration: 0.8, 
            ease: [0.4, 0, 0.2, 1] 
          }}
        />
        
        {/* Scanning line animation for cybersecurity theme */}
        {animated && variant?.includes('cyber') && (
          <motion.div
            className="absolute inset-y-0 w-1 bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            animate={{
              x: rtl ? [`100%`, `-100%`] : [`-100%`, `100%`],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </ProgressPrimitive.Root>
      
      {/* Value display */}
      {showValue && (
        <motion.div 
          className={cn(
            "absolute top-0 text-xs font-mono font-bold text-white/90 mt-1",
            rtl ? "right-0 font-[Vazirmatn]" : "left-0"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {rtl ? `${progressValue.toLocaleString('fa-IR')}%` : `${progressValue}%`}
        </motion.div>
      )}
    </div>
  );
});

Progress.displayName = ProgressPrimitive.Root.displayName;

// Predefined cybersecurity progress components
export const CyberProgress: React.FC<{
  value: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'default' | 'lg' | 'xl';
  animated?: boolean;
  showValue?: boolean;
  rtl?: boolean;
  className?: string;
}> = ({ 
  value, 
  variant = 'primary', 
  size = 'default', 
  animated = true, 
  showValue = false,
  rtl = false,
  className 
}) => {
  return (
    <Progress
      value={value}
      variant={`cyber-${variant}` as any}
      size={size}
      animated={animated}
      glow="medium"
      showValue={showValue}
      rtl={rtl}
      className={className}
    />
  );
};

export const SystemHealthProgress: React.FC<{
  value: number;
  label: string;
  status: 'healthy' | 'warning' | 'critical';
  rtl?: boolean;
}> = ({ value, label, status, rtl = false }) => {
  const variantMap = {
    healthy: 'success' as const,
    warning: 'warning' as const,
    critical: 'danger' as const,
  };

  return (
    <div className="space-y-2">
      <div className={cn(
        "flex justify-between items-center text-sm",
        rtl && "flex-row-reverse font-[Vazirmatn]"
      )}>
        <span className="text-white/90">{label}</span>
        <span className={cn(
          "font-mono font-bold tabular-nums",
          status === 'healthy' && "text-[#00FF88]",
          status === 'warning' && "text-[#FFB800]",
          status === 'critical' && "text-[#FF4757]"
        )}>
          {rtl ? `${value.toLocaleString('fa-IR')}%` : `${value}%`}
        </span>
      </div>
      <CyberProgress
        value={value}
        variant={variantMap[status]}
        animated={true}
        rtl={rtl}
      />
    </div>
  );
};

export const LoadingProgress: React.FC<{
  indeterminate?: boolean;
  rtl?: boolean;
  className?: string;
}> = ({ indeterminate = true, rtl = false, className }) => {
  if (indeterminate) {
    return (
      <div className={cn(
        "relative h-1 w-full overflow-hidden rounded-full bg-white/10",
        className
      )}>
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
  }

  return (
    <CyberProgress
      value={100}
      variant="primary"
      size="sm"
      animated={true}
      rtl={rtl}
      className={className}
    />
  );
};

export { Progress }