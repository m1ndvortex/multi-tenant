import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        error:
          "border-transparent bg-red-500 text-white hover:bg-red-600",
        "gradient-green":
          "border-transparent bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700",
        "gradient-blue":
          "border-transparent bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700",
        "gradient-purple":
          "border-transparent bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:from-purple-600 hover:to-violet-700",
        // Cybersecurity-themed variants with neon glow effects
        "cyber-primary":
          "border-[#00D4FF]/30 bg-gradient-to-r from-[#00D4FF]/20 to-[#00D4FF]/10 text-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.3)] hover:shadow-[0_0_20px_rgba(0,212,255,0.5)] hover:bg-[#00D4FF]/20 backdrop-blur-md",
        "cyber-success":
          "border-[#00FF88]/30 bg-gradient-to-r from-[#00FF88]/20 to-[#00FF88]/10 text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)] hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] hover:bg-[#00FF88]/20 backdrop-blur-md",
        "cyber-warning":
          "border-[#FFB800]/30 bg-gradient-to-r from-[#FFB800]/20 to-[#FFB800]/10 text-[#FFB800] shadow-[0_0_10px_rgba(255,184,0,0.3)] hover:shadow-[0_0_20px_rgba(255,184,0,0.5)] hover:bg-[#FFB800]/20 backdrop-blur-md",
        "cyber-danger":
          "border-[#FF4757]/30 bg-gradient-to-r from-[#FF4757]/20 to-[#FF4757]/10 text-[#FF4757] shadow-[0_0_10px_rgba(255,71,87,0.3)] hover:shadow-[0_0_20px_rgba(255,71,87,0.5)] hover:bg-[#FF4757]/20 backdrop-blur-md",
        "cyber-info":
          "border-[#5352ED]/30 bg-gradient-to-r from-[#5352ED]/20 to-[#5352ED]/10 text-[#5352ED] shadow-[0_0_10px_rgba(83,82,237,0.3)] hover:shadow-[0_0_20px_rgba(83,82,237,0.5)] hover:bg-[#5352ED]/20 backdrop-blur-md",
        "cyber-purple":
          "border-[#A55EEA]/30 bg-gradient-to-r from-[#A55EEA]/20 to-[#A55EEA]/10 text-[#A55EEA] shadow-[0_0_10px_rgba(165,94,234,0.3)] hover:shadow-[0_0_20px_rgba(165,94,234,0.5)] hover:bg-[#A55EEA]/20 backdrop-blur-md",
        "cyber-gradient":
          "border-transparent bg-gradient-to-r from-[#00D4FF]/20 via-[#00FF88]/20 to-[#FF6B35]/20 text-white shadow-[0_0_15px_rgba(0,212,255,0.2),0_0_30px_rgba(0,255,136,0.1)] hover:shadow-[0_0_25px_rgba(0,212,255,0.3),0_0_50px_rgba(0,255,136,0.2)] backdrop-blur-md relative before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-[#00D4FF] before:via-[#00FF88] before:to-[#FF6B35] before:rounded-full before:content-[''] before:-z-10",
        "cyber-glass":
          "border-white/10 bg-white/5 text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-md",
        "cyber-status-online":
          "border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] shadow-[0_0_8px_rgba(0,255,136,0.4)] animate-pulse",
        "cyber-status-offline":
          "border-[#6B7280]/40 bg-[#6B7280]/10 text-[#6B7280] shadow-[0_0_8px_rgba(107,114,128,0.2)]",
        "cyber-status-error":
          "border-[#FF4757]/40 bg-[#FF4757]/10 text-[#FF4757] shadow-[0_0_8px_rgba(255,71,87,0.4)] animate-pulse",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-base",
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
      size: "default",
      glow: "none",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  animated?: boolean;
  pulse?: boolean;
  rtl?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, glow, animated = false, pulse = false, rtl = false, ...props }, ref) => {
    const badgeContent = (
      <div 
        ref={ref}
        className={cn(
          badgeVariants({ variant, size, glow }), 
          pulse && "animate-pulse",
          rtl && "font-[Vazirmatn]",
          className
        )} 
        {...props} 
      />
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 17 
          }}
        >
          {badgeContent}
        </motion.div>
      );
    }

    return badgeContent;
  }
);

Badge.displayName = "Badge";

// Predefined cybersecurity badge components
export const StatusBadge: React.FC<{
  status: 'online' | 'offline' | 'error' | 'warning' | 'success';
  children: React.ReactNode;
  animated?: boolean;
  rtl?: boolean;
}> = ({ status, children, animated = true, rtl = false }) => {
  const variantMap = {
    online: 'cyber-status-online' as const,
    offline: 'cyber-status-offline' as const,
    error: 'cyber-status-error' as const,
    warning: 'cyber-warning' as const,
    success: 'cyber-success' as const,
  };

  return (
    <Badge 
      variant={variantMap[status]} 
      animated={animated}
      pulse={status === 'online' || status === 'error'}
      rtl={rtl}
      glow="subtle"
    >
      {children}
    </Badge>
  );
};

export const CyberBadge: React.FC<{
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gradient' | 'glass';
  children: React.ReactNode;
  animated?: boolean;
  glow?: 'none' | 'subtle' | 'medium' | 'intense';
  rtl?: boolean;
}> = ({ 
  variant = 'primary', 
  children, 
  animated = true, 
  glow = 'subtle',
  rtl = false 
}) => {
  const cyberVariant = `cyber-${variant}` as const;
  
  return (
    <Badge 
      variant={cyberVariant} 
      animated={animated}
      glow={glow}
      rtl={rtl}
    >
      {children}
    </Badge>
  );
};

export const NumberBadge: React.FC<{
  value: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  animated?: boolean;
  rtl?: boolean;
}> = ({ value, variant = 'primary', animated = true, rtl = false }) => {
  return (
    <motion.div
      key={value}
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <CyberBadge 
        variant={variant} 
        animated={animated}
        glow="medium"
        rtl={rtl}
      >
        <span className="font-mono font-bold tabular-nums">
          {rtl ? value.toLocaleString('fa-IR') : value.toLocaleString()}
        </span>
      </CyberBadge>
    </motion.div>
  );
};

export { Badge, badgeVariants }