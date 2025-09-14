/**
 * Cybersecurity-themed Textarea Component
 * Enhanced textarea with glassmorphism, neon effects, and validation styling
 */

import * as React from "react"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-lg px-3 py-2 text-sm transition-all duration-300 resize-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Cybersecurity Glass Textarea (Default)
        "cyber-glass": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#00D4FF]/50",
          "focus-visible:shadow-[0_0_20px_rgba(0,212,255,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-white/[0.12]"
        ],
        
        // Cybersecurity Neon Focus
        "cyber-neon": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.02] border border-white/[0.06]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.04] focus-visible:border-[#00D4FF]/60",
          "focus-visible:shadow-[0_0_25px_rgba(0,212,255,0.4),0_0_50px_rgba(0,255,136,0.2)]",
          "hover:bg-white/[0.03] hover:border-white/[0.08]"
        ],
        
        // Cybersecurity Success (Green Focus)
        "cyber-success": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#00FF88]/50",
          "focus-visible:shadow-[0_0_20px_rgba(0,255,136,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-white/[0.12]"
        ],
        
        // Cybersecurity Warning (Orange Focus)
        "cyber-warning": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#FF6B35]/50",
          "focus-visible:shadow-[0_0_20px_rgba(255,107,53,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-white/[0.12]"
        ],
        
        // Cybersecurity Danger (Red Focus)
        "cyber-danger": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-[#FF4757]/20",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#FF4757]/50",
          "focus-visible:shadow-[0_0_20px_rgba(255,71,87,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-[#FF4757]/30"
        ],
        
        // Legacy default for backward compatibility
        default: "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-[#6B7280] focus-visible:bg-white/[0.05] focus-visible:border-[#00D4FF]/50 focus-visible:shadow-[0_0_20px_rgba(0,212,255,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.04] hover:border-white/[0.12]",
      },
      textareaSize: {
        default: "min-h-[80px] px-3 py-2",
        sm: "min-h-[60px] px-2 py-1 text-xs",
        lg: "min-h-[120px] px-4 py-3 text-base",
        xl: "min-h-[160px] px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      textareaSize: "default",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  animated?: boolean;
  rtl?: boolean;
  loading?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, textareaSize, animated = true, rtl = false, loading = false, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const textareaElement = (
      <textarea
        ref={ref}
        className={cn(
          textareaVariants({ variant, textareaSize }),
          rtl && "font-[Vazirmatn] text-right",
          loading && "cursor-wait opacity-70",
          className
        )}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          {textareaElement}
          {loading && (
            <motion.div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-[#00D4FF]/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: '200% 100%' }}
            />
          )}
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-lg border border-[#00D4FF]/30 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.div>
      );
    }

    return (
      <div className="relative">
        {textareaElement}
        {loading && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-[#00D4FF]/10 to-transparent animate-pulse" />
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };