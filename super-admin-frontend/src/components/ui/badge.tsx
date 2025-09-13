import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-cyber-normal focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Cybersecurity theme variants
        "cyber-primary":
          "border-cyan-400/50 bg-cyan-400/10 text-cyber-neon-primary cyber-text-glow hover:bg-cyan-400/20 hover:border-cyan-400 hover:shadow-neon-cyan/30",
        "cyber-secondary":
          "border-emerald-400/50 bg-emerald-400/10 text-cyber-neon-secondary cyber-text-glow hover:bg-emerald-400/20 hover:border-emerald-400 hover:shadow-neon-green/30",
        "cyber-danger":
          "border-pink-400/50 bg-pink-400/10 text-cyber-neon-danger cyber-text-glow hover:bg-pink-400/20 hover:border-pink-400 hover:shadow-neon-pink/30 animate-cyber-pulse",
        "cyber-warning":
          "border-orange-400/50 bg-orange-400/10 text-cyber-neon-warning cyber-text-glow hover:bg-orange-400/20 hover:border-orange-400 hover:shadow-neon-orange/30",
        "cyber-info":
          "border-blue-400/50 bg-blue-400/10 text-cyber-neon-info cyber-text-glow hover:bg-blue-400/20 hover:border-blue-400 hover:shadow-neon-blue/30",
        "cyber-success":
          "border-emerald-400/50 bg-emerald-400/10 text-cyber-neon-success cyber-text-glow hover:bg-emerald-400/20 hover:border-emerald-400 hover:shadow-neon-green/30",
        "cyber-glass":
          "glass-morphism border-white/20 text-cyber-text-primary hover:glass-morphism-hover hover:text-cyber-neon-primary hover:cyber-text-glow",
        
        // Legacy variants (updated for dark theme)
        default:
          "border-white/20 bg-white/10 text-cyber-text-primary hover:bg-white/20",
        secondary:
          "border-white/10 bg-cyber-bg-elevated text-cyber-text-secondary hover:bg-white/10",
        destructive:
          "border-red-400/50 bg-red-400/10 text-cyber-neon-danger hover:bg-red-400/20",
        outline: "border-white/20 text-cyber-text-primary hover:bg-white/5",
        success:
          "border-emerald-400/50 bg-emerald-400/10 text-cyber-neon-success hover:bg-emerald-400/20",
        warning:
          "border-orange-400/50 bg-orange-400/10 text-cyber-neon-warning hover:bg-orange-400/20",
        error:
          "border-red-400/50 bg-red-400/10 text-cyber-neon-danger hover:bg-red-400/20",
        "gradient-green":
          "border-transparent bg-gradient-to-r from-emerald-500/20 to-teal-600/20 text-cyber-neon-secondary hover:from-emerald-500/30 hover:to-teal-600/30",
        "gradient-blue":
          "border-transparent bg-gradient-to-r from-blue-500/20 to-indigo-600/20 text-cyber-neon-info hover:from-blue-500/30 hover:to-indigo-600/30",
        "gradient-purple":
          "border-transparent bg-gradient-to-r from-purple-500/20 to-violet-600/20 text-purple-300 hover:from-purple-500/30 hover:to-violet-600/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }