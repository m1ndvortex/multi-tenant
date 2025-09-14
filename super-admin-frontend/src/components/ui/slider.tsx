/**
 * Cybersecurity-themed Slider Component
 * Enhanced range slider with glassmorphism, neon effects, and smooth animations
 */

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { motion } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      variant: {
        "cyber-glass": "",
        "cyber-success": "",
        "cyber-warning": "",
        "cyber-danger": "",
        "cyber-large": "",
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const trackVariants = cva(
  "relative w-full grow overflow-hidden rounded-full transition-all duration-300",
  {
    variants: {
      variant: {
        "cyber-glass": [
          "h-2 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
        ],
        "cyber-success": [
          "h-2 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
        ],
        "cyber-warning": [
          "h-2 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
        ],
        "cyber-danger": [
          "h-2 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
        ],
        "cyber-large": [
          "h-3 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
        ],
        default: "h-2 backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const rangeVariants = cva(
  "absolute h-full rounded-full transition-all duration-300",
  {
    variants: {
      variant: {
        "cyber-glass": [
          "bg-gradient-to-r from-[#00D4FF] to-[#00FF88]",
          "shadow-[0_0_15px_rgba(0,212,255,0.4),0_0_30px_rgba(0,255,136,0.2)]"
        ],
        "cyber-success": [
          "bg-gradient-to-r from-[#00FF88] to-[#00D4FF]",
          "shadow-[0_0_15px_rgba(0,255,136,0.4),0_0_30px_rgba(0,212,255,0.2)]"
        ],
        "cyber-warning": [
          "bg-gradient-to-r from-[#FF6B35] to-[#FFB800]",
          "shadow-[0_0_15px_rgba(255,107,53,0.4),0_0_30px_rgba(255,184,0,0.2)]"
        ],
        "cyber-danger": [
          "bg-gradient-to-r from-[#FF4757] to-[#FF6B35]",
          "shadow-[0_0_15px_rgba(255,71,87,0.4),0_0_30px_rgba(255,107,53,0.2)]"
        ],
        "cyber-large": [
          "bg-gradient-to-r from-[#00D4FF] to-[#00FF88]",
          "shadow-[0_0_15px_rgba(0,212,255,0.4),0_0_30px_rgba(0,255,136,0.2)]"
        ],
        default: "bg-gradient-to-r from-[#00D4FF] to-[#00FF88] shadow-[0_0_15px_rgba(0,212,255,0.4),0_0_30px_rgba(0,255,136,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const thumbVariants = cva(
  "block rounded-full border-2 transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        "cyber-glass": [
          "h-5 w-5 bg-white/90 backdrop-blur-sm border-[#00D4FF]/50",
          "hover:scale-110 hover:shadow-[0_0_20px_rgba(0,212,255,0.6)]",
          "focus-visible:scale-110 focus-visible:shadow-[0_0_25px_rgba(0,212,255,0.8)]"
        ],
        "cyber-success": [
          "h-5 w-5 bg-white/90 backdrop-blur-sm border-[#00FF88]/50",
          "hover:scale-110 hover:shadow-[0_0_20px_rgba(0,255,136,0.6)]",
          "focus-visible:scale-110 focus-visible:shadow-[0_0_25px_rgba(0,255,136,0.8)]"
        ],
        "cyber-warning": [
          "h-5 w-5 bg-white/90 backdrop-blur-sm border-[#FF6B35]/50",
          "hover:scale-110 hover:shadow-[0_0_20px_rgba(255,107,53,0.6)]",
          "focus-visible:scale-110 focus-visible:shadow-[0_0_25px_rgba(255,107,53,0.8)]"
        ],
        "cyber-danger": [
          "h-5 w-5 bg-white/90 backdrop-blur-sm border-[#FF4757]/50",
          "hover:scale-110 hover:shadow-[0_0_20px_rgba(255,71,87,0.6)]",
          "focus-visible:scale-110 focus-visible:shadow-[0_0_25px_rgba(255,71,87,0.8)]"
        ],
        "cyber-large": [
          "h-6 w-6 bg-white/90 backdrop-blur-sm border-[#00D4FF]/50",
          "hover:scale-110 hover:shadow-[0_0_20px_rgba(0,212,255,0.6)]",
          "focus-visible:scale-110 focus-visible:shadow-[0_0_25px_rgba(0,212,255,0.8)]"
        ],
        default: "h-5 w-5 bg-white/90 backdrop-blur-sm border-[#00D4FF]/50 hover:scale-110 hover:shadow-[0_0_20px_rgba(0,212,255,0.6)] focus-visible:scale-110 focus-visible:shadow-[0_0_25px_rgba(0,212,255,0.8)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface SliderProps 
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {
  animated?: boolean;
  rtl?: boolean;
  showValue?: boolean;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant, animated = true, rtl = false, showValue = false, ...props }, ref) => {
  const [value, setValue] = React.useState(props.value || props.defaultValue || [0]);

  const sliderElement = (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(sliderVariants({ variant }), className)}
      onValueChange={(newValue) => {
        setValue(newValue);
        props.onValueChange?.(newValue);
      }}
      {...props}
    >
      <SliderPrimitive.Track className={cn(trackVariants({ variant }))}>
        <SliderPrimitive.Range className={cn(rangeVariants({ variant }))} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn(thumbVariants({ variant }))} />
      {showValue && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-md bg-black/80 text-white text-xs">
          {value[0]}
        </div>
      )}
    </SliderPrimitive.Root>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        {sliderElement}
      </motion.div>
    );
  }

  return sliderElement;
});

Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider, sliderVariants };