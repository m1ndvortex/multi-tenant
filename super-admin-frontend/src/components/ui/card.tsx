import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-2xl transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Cybersecurity Glass Card (Crypto Dashboard Style)
        "cyber-glass": [
          "backdrop-blur-[16px] saturate-[150%]",
          "bg-gradient-to-br from-[#252A3A]/80 via-[#1A1D29]/90 to-[#0B0E1A]/95",
          "border border-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03)]",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:border-white/[0.06] hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Cybersecurity Neon Card with Very Subtle Multi-Color Border
        "cyber-neon": [
          "relative backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_6px_rgba(0,212,255,0.02)]",
          "before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-[#00D4FF]/12 before:via-[#00FF88]/8 before:to-[#FF6B35]/12",
          "before:rounded-2xl before:content-[''] before:-z-10",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_12px_rgba(0,212,255,0.06),0_0_20px_rgba(0,255,136,0.03)]",
          "hover:scale-[1.02] hover:-translate-y-1",
          "hover:before:from-[#00D4FF]/20 hover:before:via-[#00FF88]/15 hover:before:to-[#FF6B35]/20"
        ],
        
        // Alternative subtle neon variant that's more integrated
        "cyber-neon-subtle": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#00D4FF]/20 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_12px_rgba(0,212,255,0.06)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Cybersecurity Primary (Cyan Accent)
        "cyber-primary": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#00D4FF]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,212,255,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#00D4FF]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Cybersecurity Success (Green Accent)
        "cyber-success": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#00FF88]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,255,136,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#00FF88]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,255,136,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Cybersecurity Warning (Orange Accent)
        "cyber-warning": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#FF6B35]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(255,107,53,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#FF6B35]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,107,53,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Cybersecurity Danger (Red Accent)
        "cyber-danger": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#FF4757]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(255,71,87,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#FF4757]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,71,87,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Cybersecurity Info (Purple Accent)
        "cyber-info": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#A55EEA]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(165,94,234,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#A55EEA]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(165,94,234,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Cybersecurity Elevated (Modal/Dialog Style)
        "cyber-elevated": [
          "backdrop-blur-[25px] saturate-[200%]",
          "bg-gradient-to-br from-white/[0.08] to-white/[0.04]",
          "border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:bg-gradient-to-br hover:from-white/[0.12] hover:to-white/[0.06]",
          "hover:border-white/[0.12] hover:shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]"
        ],
        
        // Cybersecurity Minimal (Subtle Glass)
        "cyber-minimal": [
          "backdrop-blur-[12px] saturate-[120%]",
          "bg-white/[0.02] border border-white/[0.04]",
          "shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
          "hover:bg-white/[0.04] hover:border-white/[0.06]",
          "hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:scale-[1.01]"
        ],
        
        // Legacy gradient variants for backward compatibility
        "gradient-green": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#00FF88]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,255,136,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#00FF88]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,255,136,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        "gradient-blue": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#00D4FF]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,212,255,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#00D4FF]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        "gradient-purple": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#A55EEA]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(165,94,234,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#A55EEA]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(165,94,234,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        "gradient-red": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#FF4757]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(255,71,87,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#FF4757]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,71,87,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        "gradient-orange": [
          "backdrop-blur-[20px] saturate-[180%]",
          "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
          "border border-[#FF6B35]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(255,107,53,0.15)]",
          "hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04]",
          "hover:border-[#FF6B35]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(255,107,53,0.2)]",
          "hover:scale-[1.02] hover:-translate-y-1"
        ],
        
        // Standard variants with cybersecurity styling
        default: "backdrop-blur-[16px] saturate-[150%] bg-gradient-to-br from-[#252A3A]/80 via-[#1A1D29]/90 to-[#0B0E1A]/95 border border-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.06] hover:scale-[1.02] hover:-translate-y-1",
        professional: "backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-[#00D4FF]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(0,212,255,0.15)] hover:bg-gradient-to-br hover:from-white/[0.08] hover:to-white/[0.04] hover:border-[#00D4FF]/30 hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_30px_rgba(0,212,255,0.2)] hover:scale-[1.02] hover:-translate-y-1",
        filter: "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight text-white", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[#B8BCC8]", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }