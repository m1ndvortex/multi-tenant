/**
 * Progress Component
 * A progress bar component built with Radix UI with cybersecurity theme
 */

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "../../lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const progressVariants = cva(
  "relative h-4 w-full overflow-hidden rounded-full transition-all duration-cyber-normal",
  {
    variants: {
      variant: {
        default: "glass-morphism border-white/20",
        cyber: "glass-morphism border-cyan-400/30 shadow-neon-cyan/20",
        success: "glass-morphism border-emerald-400/30 shadow-neon-green/20",
        warning: "glass-morphism border-orange-400/30 shadow-neon-orange/20",
        danger: "glass-morphism border-pink-400/30 shadow-neon-pink/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const indicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-cyber-normal relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-neon-cyan/50",
        cyber: "bg-gradient-to-r from-cyan-400 to-cyan-600 shadow-neon-cyan animate-cyber-glow",
        success: "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-neon-green",
        warning: "bg-gradient-to-r from-orange-400 to-orange-600 shadow-neon-orange",
        danger: "bg-gradient-to-r from-pink-400 to-pink-600 shadow-neon-pink animate-cyber-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, variant, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(progressVariants({ variant, className }))}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(indicatorVariants({ variant }))}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress, progressVariants }