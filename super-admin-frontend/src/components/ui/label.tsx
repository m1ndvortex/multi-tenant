/**
 * Cybersecurity-themed Label Component
 * Enhanced label with neon effects and validation styling
 */

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "text-white/90",
        cyber: "text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]",
        success: "text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]",
        warning: "text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]",
        danger: "text-[#FF4757] drop-shadow-[0_0_8px_rgba(255,71,87,0.3)]",
        info: "text-[#5352ED] drop-shadow-[0_0_8px_rgba(83,82,237,0.3)]",
        muted: "text-white/60",
      },
      size: {
        default: "text-sm",
        sm: "text-xs",
        lg: "text-base",
        xl: "text-lg",
      },
      required: {
        true: "after:content-['*'] after:ml-1 after:text-[#FF4757]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      required: false,
    },
  }
);

interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  animated?: boolean;
  rtl?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, size, required, animated = true, rtl = false, ...props }, ref) => {
  const labelElement = (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        labelVariants({ variant, size, required }),
        rtl && "font-[Vazirmatn] after:mr-1 after:ml-0",
        className
      )}
      {...props}
    />
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: rtl ? 10 : -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {labelElement}
      </motion.div>
    );
  }

  return labelElement;
});

Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };