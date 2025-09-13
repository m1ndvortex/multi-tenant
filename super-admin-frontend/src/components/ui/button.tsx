import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Cybersecurity Primary - Glassmorphism with neon cyan glow
        "cyber-primary": [
          "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.05] to-white/[0.02]",
          "border border-[#00D4FF]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,212,255,0.2)]",
          "hover:bg-gradient-to-r hover:from-white/[0.08] hover:to-white/[0.04] hover:border-[#00D4FF]/50",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.3)] hover:scale-[1.02]",
          "active:scale-[0.98] focus-visible:ring-[#00D4FF]/50"
        ],
        
        // Cybersecurity Secondary - Green neon accent
        "cyber-secondary": [
          "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.03] to-white/[0.01]",
          "border border-[#00FF88]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,255,136,0.2)]",
          "hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03] hover:border-[#00FF88]/50",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,255,136,0.3)] hover:scale-[1.02]",
          "active:scale-[0.98] focus-visible:ring-[#00FF88]/50"
        ],
        
        // Cybersecurity Danger - Red neon for destructive actions
        "cyber-danger": [
          "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.03] to-white/[0.01]",
          "border border-[#FF4757]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(255,71,87,0.2)]",
          "hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03] hover:border-[#FF4757]/50",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,71,87,0.3)] hover:scale-[1.02]",
          "active:scale-[0.98] focus-visible:ring-[#FF4757]/50"
        ],
        
        // Cybersecurity Warning - Orange neon
        "cyber-warning": [
          "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.03] to-white/[0.01]",
          "border border-[#FF6B35]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(255,107,53,0.2)]",
          "hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03] hover:border-[#FF6B35]/50",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,107,53,0.3)] hover:scale-[1.02]",
          "active:scale-[0.98] focus-visible:ring-[#FF6B35]/50"
        ],
        
        // Cybersecurity Ghost - Minimal glass effect
        "cyber-ghost": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.02] text-[#B8BCC8]",
          "hover:bg-white/[0.05] hover:text-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]",
          "hover:scale-[1.02] active:scale-[0.98]"
        ],
        
        // Cybersecurity Outline - Glass border with neon accent
        "cyber-outline": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.01] border border-white/[0.08]",
          "text-[#B8BCC8] hover:bg-white/[0.03] hover:border-[#00D4FF]/30 hover:text-white",
          "hover:shadow-[0_8px_24px_rgba(0,0,0,0.3),0_0_15px_rgba(0,212,255,0.1)] hover:scale-[1.02]",
          "active:scale-[0.98] focus-visible:ring-[#00D4FF]/30"
        ],
        
        // Multi-color gradient border (crypto-style)
        "cyber-gradient": [
          "relative backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.05] to-white/[0.02]",
          "text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          "before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-[#00D4FF] before:via-[#00FF88] before:to-[#FF6B35]",
          "before:rounded-lg before:content-[''] before:-z-10",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.2)] hover:scale-[1.02]",
          "active:scale-[0.98]"
        ],
        
        // Legacy gradient variants for backward compatibility
        "gradient-green": "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-[#00FF88]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,255,136,0.2)] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03] hover:border-[#00FF88]/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,255,136,0.3)] hover:scale-[1.02] active:scale-[0.98]",
        "gradient-blue": "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-[#00D4FF]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,212,255,0.2)] hover:bg-gradient-to-r hover:from-white/[0.08] hover:to-white/[0.04] hover:border-[#00D4FF]/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.3)] hover:scale-[1.02] active:scale-[0.98]",
        "gradient-purple": "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-[#A55EEA]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(165,94,234,0.2)] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03] hover:border-[#A55EEA]/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(165,94,234,0.3)] hover:scale-[1.02] active:scale-[0.98]",
        "outline-gradient": "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.05] to-white/[0.02] text-white shadow-[0_8px_32px_rgba(0,0,0,0.4)] before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-[#00D4FF] before:via-[#00FF88] before:to-[#FF6B35] before:rounded-lg before:content-[''] before:-z-10 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.2)] hover:scale-[1.02] active:scale-[0.98]",
        
        // Standard variants with cybersecurity styling
        default: "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-[#00D4FF]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,212,255,0.2)] hover:bg-gradient-to-r hover:from-white/[0.08] hover:to-white/[0.04] hover:border-[#00D4FF]/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.3)] hover:scale-[1.02] active:scale-[0.98]",
        destructive: "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-[#FF4757]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(255,71,87,0.2)] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03] hover:border-[#FF4757]/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,71,87,0.3)] hover:scale-[1.02] active:scale-[0.98]",
        outline: "backdrop-blur-[16px] saturate-[150%] bg-white/[0.01] border border-white/[0.08] text-[#B8BCC8] hover:bg-white/[0.03] hover:border-[#00D4FF]/30 hover:text-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.3),0_0_15px_rgba(0,212,255,0.1)] hover:scale-[1.02] active:scale-[0.98]",
        secondary: "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-[#00FF88]/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,255,136,0.2)] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03] hover:border-[#00FF88]/50 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,255,136,0.3)] hover:scale-[1.02] active:scale-[0.98]",
        ghost: "backdrop-blur-[16px] saturate-[150%] bg-white/[0.02] text-[#B8BCC8] hover:bg-white/[0.05] hover:text-white hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98]",
        link: "text-[#00D4FF] underline-offset-4 hover:underline hover:text-[#00FF88] transition-colors duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
        xl: "h-12 rounded-lg px-10 text-lg",
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