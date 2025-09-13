import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-cyber-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Cybersecurity theme variants with neon glow effects
        "cyber-primary": "glass-morphism glass-morphism-hover border-cyan-400/50 text-cyber-neon-primary hover:shadow-neon-cyan hover:border-cyan-400 cyber-text-glow transition-all duration-cyber-normal",
        "cyber-secondary": "glass-morphism glass-morphism-hover border-emerald-400/50 text-cyber-neon-secondary hover:shadow-neon-green hover:border-emerald-400 cyber-text-glow transition-all duration-cyber-normal",
        "cyber-danger": "glass-morphism glass-morphism-hover border-pink-400/50 text-cyber-neon-danger hover:shadow-neon-pink hover:border-pink-400 cyber-text-glow transition-all duration-cyber-normal animate-cyber-pulse",
        "cyber-ghost": "bg-transparent border border-white/10 text-cyber-text-secondary hover:glass-morphism hover:text-cyber-neon-primary hover:border-cyan-400/50 hover:cyber-text-glow transition-all duration-cyber-normal",
        
        // Legacy gradient variants (maintained for compatibility)
        "gradient-green": "bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl",
        "gradient-blue": "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl",
        "gradient-purple": "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl",
        
        // Outline variants with gradient borders
        "outline-gradient": "border-2 border-transparent bg-gradient-to-r from-green-500 to-teal-600 bg-clip-border hover:shadow-lg text-white",
        
        // Standard variants (updated for dark theme)
        default: "bg-cyber-bg-surface text-cyber-text-primary hover:bg-cyber-bg-elevated border border-white/10 hover:border-white/20",
        destructive: "bg-red-500/20 text-cyber-neon-danger border border-red-500/50 hover:bg-red-500/30 hover:shadow-neon-pink",
        outline: "border border-white/20 bg-transparent hover:glass-morphism hover:text-cyber-neon-primary text-cyber-text-secondary",
        secondary: "bg-cyber-bg-elevated text-cyber-text-primary hover:bg-white/10 border border-white/10",
        ghost: "hover:glass-morphism hover:text-cyber-neon-primary text-cyber-text-secondary",
        link: "text-cyber-neon-primary underline-offset-4 hover:underline cyber-text-glow",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }