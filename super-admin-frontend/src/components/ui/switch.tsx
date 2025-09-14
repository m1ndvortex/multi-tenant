/**
 * Cybersecurity-themed Switch Component
 * Enhanced toggle switch with glassmorphism, neon effects, and smooth animations
 */

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Cybersecurity Glass Switch (Default)
        "cyber-glass": [
          "h-6 w-11 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(0,212,255,0.3)]",
          "data-[state=checked]:bg-[#00D4FF]/20 data-[state=checked]:border-[#00D4FF]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
          "data-[state=unchecked]:bg-white/[0.03] data-[state=unchecked]:border-white/[0.08]"
        ],
        
        // Cybersecurity Success (Green)
        "cyber-success": [
          "h-6 w-11 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(0,255,136,0.3)]",
          "data-[state=checked]:bg-[#00FF88]/20 data-[state=checked]:border-[#00FF88]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(0,255,136,0.4)]",
          "data-[state=unchecked]:bg-white/[0.03] data-[state=unchecked]:border-white/[0.08]"
        ],
        
        // Cybersecurity Warning (Orange)
        "cyber-warning": [
          "h-6 w-11 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(255,107,53,0.3)]",
          "data-[state=checked]:bg-[#FF6B35]/20 data-[state=checked]:border-[#FF6B35]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(255,107,53,0.4)]",
          "data-[state=unchecked]:bg-white/[0.03] data-[state=unchecked]:border-white/[0.08]"
        ],
        
        // Cybersecurity Danger (Red)
        "cyber-danger": [
          "h-6 w-11 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(255,71,87,0.3)]",
          "data-[state=checked]:bg-[#FF4757]/20 data-[state=checked]:border-[#FF4757]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(255,71,87,0.4)]",
          "data-[state=unchecked]:bg-white/[0.03] data-[state=unchecked]:border-white/[0.08]"
        ],
        
        // Large variant for better visibility
        "cyber-large": [
          "h-7 w-12 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "hover:bg-white/[0.05] hover:border-white/[0.12]",
          "focus-visible:shadow-[0_0_15px_rgba(0,212,255,0.3)]",
          "data-[state=checked]:bg-[#00D4FF]/20 data-[state=checked]:border-[#00D4FF]/50",
          "data-[state=checked]:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
          "data-[state=unchecked]:bg-white/[0.03] data-[state=unchecked]:border-white/[0.08]"
        ],
        
        // Legacy default for backward compatibility
        default: "h-6 w-11 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12] focus-visible:shadow-[0_0_15px_rgba(0,212,255,0.3)] data-[state=checked]:bg-[#00D4FF]/20 data-[state=checked]:border-[#00D4FF]/50 data-[state=checked]:shadow-[0_0_20px_rgba(0,212,255,0.4)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const thumbVariants = cva(
  "pointer-events-none block rounded-full shadow-lg ring-0 transition-all duration-300",
  {
    variants: {
      variant: {
        "cyber-glass": [
          "h-4 w-4 bg-white/90 backdrop-blur-sm",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:bg-[#00D4FF] data-[state=checked]:shadow-[0_0_15px_rgba(0,212,255,0.6)]"
        ],
        "cyber-success": [
          "h-4 w-4 bg-white/90 backdrop-blur-sm",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:bg-[#00FF88] data-[state=checked]:shadow-[0_0_15px_rgba(0,255,136,0.6)]"
        ],
        "cyber-warning": [
          "h-4 w-4 bg-white/90 backdrop-blur-sm",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:bg-[#FF6B35] data-[state=checked]:shadow-[0_0_15px_rgba(255,107,53,0.6)]"
        ],
        "cyber-danger": [
          "h-4 w-4 bg-white/90 backdrop-blur-sm",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:bg-[#FF4757] data-[state=checked]:shadow-[0_0_15px_rgba(255,71,87,0.6)]"
        ],
        "cyber-large": [
          "h-5 w-5 bg-white/90 backdrop-blur-sm",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
          "data-[state=checked]:bg-[#00D4FF] data-[state=checked]:shadow-[0_0_15px_rgba(0,212,255,0.6)]"
        ],
        default: "h-4 w-4 bg-white/90 backdrop-blur-sm data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:shadow-[0_0_15px_rgba(0,212,255,0.6)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface SwitchProps 
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {
  animated?: boolean;
  rtl?: boolean;
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, variant, animated = true, rtl = false, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(false);

  const switchElement = (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(switchVariants({ variant }), className)}
      onCheckedChange={(checked) => {
        setIsChecked(checked);
        props.onCheckedChange?.(checked);
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(thumbVariants({ variant }))}
        data-state={props.checked || isChecked ? "checked" : "unchecked"}
      />
    </SwitchPrimitive.Root>
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
        {switchElement}
      </motion.div>
    );
  }

  return switchElement;
});

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch, switchVariants };