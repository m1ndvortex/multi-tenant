/**
 * Cybersecurity-themed Loading Components
 * Various loading states with scanning animations, neon effects, and glassmorphism
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, Shield, Zap, Activity, Cpu, Database } from "lucide-react"
import { cn } from "@/lib/utils"

// Base Loading Spinner
const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      variant: {
        default: "text-white/70",
        cyber: "text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]",
        success: "text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]",
        warning: "text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]",
        danger: "text-[#FF4757] drop-shadow-[0_0_8px_rgba(255,71,87,0.5)]",
        neon: "text-[#00D4FF] drop-shadow-[0_0_12px_rgba(0,212,255,0.8)]",
      },
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "cyber",
      size: "default",
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  rtl?: boolean;
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, variant, size, rtl = false, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className={cn(spinnerVariants({ variant, size }))} />
    </div>
  )
);
LoadingSpinner.displayName = "LoadingSpinner";

// Scanning Line Loader
export interface ScanningLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  rtl?: boolean;
  height?: string;
  speed?: number;
}

const ScanningLoader = React.forwardRef<HTMLDivElement, ScanningLoaderProps>(
  ({ className, rtl = false, height = "h-1", speed = 2, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-white/10",
        height,
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-[#00D4FF] via-[#00FF88] to-[#FF6B35] shadow-[0_0_15px_rgba(0,212,255,0.5)]"
        animate={{
          x: rtl ? ['100%', '-100%'] : ['-100%', '100%'],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
);
ScanningLoader.displayName = "ScanningLoader";

// Pulse Loader
export interface PulseLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'cyber' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'default' | 'lg';
}

const PulseLoader = React.forwardRef<HTMLDivElement, PulseLoaderProps>(
  ({ className, variant = 'cyber', size = 'default', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-2 w-2',
      default: 'h-3 w-3',
      lg: 'h-4 w-4',
    };

    const colorClasses = {
      cyber: 'bg-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.6)]',
      success: 'bg-[#00FF88] shadow-[0_0_20px_rgba(0,255,136,0.6)]',
      warning: 'bg-[#FFB800] shadow-[0_0_20px_rgba(255,184,0,0.6)]',
      danger: 'bg-[#FF4757] shadow-[0_0_20px_rgba(255,71,87,0.6)]',
    };

    return (
      <div ref={ref} className={cn("flex items-center justify-center gap-1", className)} {...props}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={cn(
              "rounded-full",
              sizeClasses[size],
              colorClasses[variant]
            )}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
            }}
          />
        ))}
      </div>
    );
  }
);
PulseLoader.displayName = "PulseLoader";

// Matrix Rain Effect
export interface MatrixLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  rtl?: boolean;
}

const MatrixLoader = React.forwardRef<HTMLDivElement, MatrixLoaderProps>(
  ({ className, rtl = false, ...props }, ref) => {
    const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    return (
      <div 
        ref={ref}
        className={cn(
          "relative h-32 w-full overflow-hidden bg-black/20 rounded-lg",
          className
        )}
        {...props}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 text-[#00FF88] text-xs font-mono opacity-70"
            style={{ left: `${i * 5}%` }}
            animate={{
              y: ['-100%', '100%'],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          >
            {Array.from({ length: 10 }).map((_, j) => (
              <div key={j} className="mb-1">
                {characters[Math.floor(Math.random() * characters.length)]}
              </div>
            ))}
          </motion.div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-8 w-8 text-[#00D4FF] mx-auto mb-2 drop-shadow-[0_0_12px_rgba(0,212,255,0.8)]" />
            <p className="text-sm text-white/90 font-mono">SCANNING...</p>
          </div>
        </div>
      </div>
    );
  }
);
MatrixLoader.displayName = "MatrixLoader";

// System Status Loader
export interface SystemStatusLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  rtl?: boolean;
}

const SystemStatusLoader = React.forwardRef<HTMLDivElement, SystemStatusLoaderProps>(
  ({ className, rtl = false, ...props }, ref) => {
    const systems = [
      { name: 'Database', icon: Database, status: 'checking' },
      { name: 'CPU', icon: Cpu, status: 'checking' },
      { name: 'Network', icon: Activity, status: 'checking' },
      { name: 'Security', icon: Shield, status: 'checking' },
    ];

    return (
      <div 
        ref={ref}
        className={cn(
          "space-y-3 p-4 bg-gradient-to-br from-white/5 to-white/2 rounded-xl border border-white/10",
          className
        )}
        {...props}
      >
        <div className={cn(
          "flex items-center gap-2 mb-4",
          rtl && "flex-row-reverse font-[Vazirmatn]"
        )}>
          <Zap className="h-5 w-5 text-[#00D4FF] animate-pulse" />
          <span className="text-sm font-medium text-white/90">
            {rtl ? 'بررسی وضعیت سیستم...' : 'System Status Check...'}
          </span>
        </div>
        
        {systems.map((system, index) => (
          <motion.div
            key={system.name}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg bg-white/5",
              rtl && "flex-row-reverse font-[Vazirmatn]"
            )}
            initial={{ opacity: 0, x: rtl ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <div className={cn(
              "flex items-center gap-2",
              rtl && "flex-row-reverse"
            )}>
              <system.icon className="h-4 w-4 text-white/70" />
              <span className="text-sm text-white/90">{system.name}</span>
            </div>
            <PulseLoader variant="cyber" size="sm" />
          </motion.div>
        ))}
      </div>
    );
  }
);
SystemStatusLoader.displayName = "SystemStatusLoader";

// Full Page Loader
export interface FullPageLoaderProps {
  visible: boolean;
  message?: string;
  variant?: 'matrix' | 'scanning' | 'system' | 'simple';
  rtl?: boolean;
}

const FullPageLoader: React.FC<FullPageLoaderProps> = ({
  visible,
  message,
  variant = 'scanning',
  rtl = false,
}) => {
  const renderLoader = () => {
    switch (variant) {
      case 'matrix':
        return <MatrixLoader rtl={rtl} />;
      case 'system':
        return <SystemStatusLoader rtl={rtl} />;
      case 'scanning':
        return (
          <div className="text-center space-y-4">
            <Shield className="h-16 w-16 text-[#00D4FF] mx-auto animate-pulse drop-shadow-[0_0_20px_rgba(0,212,255,0.8)]" />
            <ScanningLoader className="w-64 mx-auto" rtl={rtl} />
            <p className={cn(
              "text-lg text-white/90 font-mono",
              rtl && "font-[Vazirmatn]"
            )}>
              {message || (rtl ? 'در حال بارگذاری...' : 'Loading...')}
            </p>
          </div>
        );
      default:
        return (
          <div className="text-center space-y-4">
            <LoadingSpinner variant="neon" size="xl" />
            <p className={cn(
              "text-lg text-white/90",
              rtl && "font-[Vazirmatn]"
            )}>
              {message || (rtl ? 'در حال بارگذاری...' : 'Loading...')}
            </p>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0E1A]/90 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderLoader()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Button Loading State
export interface ButtonLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  variant?: 'cyber' | 'success' | 'warning' | 'danger';
  rtl?: boolean;
}

const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  loading,
  children,
  variant = 'cyber',
  rtl = false,
}) => {
  return (
    <div className={cn(
      "flex items-center gap-2",
      rtl && "flex-row-reverse"
    )}>
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LoadingSpinner variant={variant} size="sm" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className={loading ? "opacity-70" : "opacity-100"}>
        {children}
      </span>
    </div>
  );
};

// Card Loading Skeleton with Cyber Theme
export interface CardLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  rtl?: boolean;
  animated?: boolean;
}

const CardLoader = React.forwardRef<HTMLDivElement, CardLoaderProps>(
  ({ className, rtl = false, animated = true, ...props }, ref) => {
    const content = (
      <div 
        ref={ref}
        className={cn(
          "p-6 space-y-4 bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 backdrop-blur-md relative overflow-hidden",
          className
        )}
        {...props}
      >
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded animate-pulse" />
          <div className="h-8 bg-white/15 rounded animate-pulse" />
          <div className="h-3 bg-white/10 rounded w-2/3 animate-pulse" />
        </div>
        
        {animated && (
          <motion.div
            className="absolute inset-y-0 w-1 bg-gradient-to-b from-transparent via-[#00D4FF]/60 to-transparent"
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
      </div>
    );

    return content;
  }
);
CardLoader.displayName = "CardLoader";

export {
  LoadingSpinner,
  ScanningLoader,
  PulseLoader,
  MatrixLoader,
  SystemStatusLoader,
  FullPageLoader,
  ButtonLoader,
  CardLoader,
};