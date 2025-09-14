/**
 * Cybersecurity-themed Checkbox Component
 * Enhanced checkbox with glassmorphism, neon effects, and smooth animations
 */

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Minus } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const checkboxVariants = cva(
  "peer shrink-0 rounded-md border transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Cybersecurity Glass Checkbox (Default)
        "cyber-glass": [
          "h-4 w-4 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(0,212,255,0.3)]",
          "data-[state=checked]:bg-[#00D4FF]/20 data-[state=checked]:border-[#00D4FF]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
          "data-[state=indeterminate]:bg-[#FFB800]/20 data-[state=indeterminate]:border-[#FFB800]/50"
        ],
        
        // Cybersecurity Success (Green)
        "cyber-success": [
          "h-4 w-4 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(0,255,136,0.3)]",
          "data-[state=checked]:bg-[#00FF88]/20 data-[state=checked]:border-[#00FF88]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(0,255,136,0.4)]",
          "data-[state=indeterminate]:bg-[#FFB800]/20 data-[state=indeterminate]:border-[#FFB800]/50"
        ],
        
        // Cybersecurity Warning (Orange)
        "cyber-warning": [
          "h-4 w-4 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(255,107,53,0.3)]",
          "data-[state=checked]:bg-[#FF6B35]/20 data-[state=checked]:border-[#FF6B35]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(255,107,53,0.4)]",
          "data-[state=indeterminate]:bg-[#FFB800]/20 data-[state=indeterminate]:border-[#FFB800]/50"
        ],
        
        // Cybersecurity Danger (Red)
        "cyber-danger": [
          "h-4 w-4 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(255,71,87,0.3)]",
          "data-[state=checked]:bg-[#FF4757]/20 data-[state=checked]:border-[#FF4757]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(255,71,87,0.4)]",
          "data-[state=indeterminate]:bg-[#FFB800]/20 data-[state=indeterminate]:border-[#FFB800]/50"
        ],
        
        // Large variant for better visibility
        "cyber-large": [
          "h-5 w-5 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(0,212,255,0.3)]",
          "data-[state=checked]:bg-[#00D4FF]/20 data-[state=checked]:border-[#00D4FF]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
          "data-[state=indeterminate]:bg-[#FFB800]/20 data-[state=indeterminate]:border-[#FFB800]/50"
        ],
        
        // Legacy default for backward compatibility
        default: "h-4 w-4 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12] focus-visible:shadow-[0_0_15px_rgba(0,212,255,0.3)] data-[state=checked]:bg-[#00D4FF]/20 data-[state=checked]:border-[#00D4FF]/50 data-[state=checked]:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface CheckboxProps 
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  indeterminate?: boolean;
  animated?: boolean;
  rtl?: boolean;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, variant, indeterminate, animated = true, rtl = false, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(false);

  const getIconColor = () => {
    switch (variant) {
      case 'cyber-success':
        return '#00FF88';
      case 'cyber-warning':
        return '#FF6B35';
      case 'cyber-danger':
        return '#FF4757';
      default:
        return '#00D4FF';
    }
  };

  const checkboxElement = (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(checkboxVariants({ variant }), className)}
      onCheckedChange={(checked) => {
        setIsChecked(!!checked);
        props.onCheckedChange?.(checked);
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <AnimatePresence>
          {(props.checked || isChecked) && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {indeterminate ? (
                <Minus 
                  className={variant === 'cyber-large' ? "h-3 w-3" : "h-3 w-3"} 
                  style={{ color: getIconColor() }}
                />
              ) : (
                <Check 
                  className={variant === 'cyber-large' ? "h-3 w-3" : "h-3 w-3"} 
                  style={{ color: getIconColor() }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {checkboxElement}
      </motion.div>
    );
  }

  return checkboxElement;
});

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox, checkboxVariants };