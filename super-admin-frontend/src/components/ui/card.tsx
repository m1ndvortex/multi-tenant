import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-xl transition-all duration-cyber-normal relative overflow-hidden",
  {
    variants: {
      variant: {
        // Cybersecurity glassmorphism cards
        "cyber-glass": "glass-morphism glass-morphism-hover border-white/10 hover:border-cyan-400/30 shadow-cyber-glass hover:shadow-cyber-glass-hover",
        "cyber-elevated": "glass-morphism glass-morphism-hover border-cyan-400/20 shadow-cyber-glass hover:shadow-neon-cyan/20",
        "cyber-danger": "glass-morphism glass-morphism-hover border-pink-400/30 shadow-cyber-glass hover:shadow-neon-pink/20",
        "cyber-success": "glass-morphism glass-morphism-hover border-emerald-400/30 shadow-cyber-glass hover:shadow-neon-green/20",
        "cyber-warning": "glass-morphism glass-morphism-hover border-orange-400/30 shadow-cyber-glass hover:shadow-neon-orange/20",
        "cyber-info": "glass-morphism glass-morphism-hover border-blue-400/30 shadow-cyber-glass hover:shadow-neon-blue/20",
        
        // Legacy variants (maintained for compatibility)
        professional: "glass-morphism glass-morphism-hover border-white/10 shadow-cyber-glass",
        
        // Gradient background cards (updated for dark theme)
        "gradient-green": "glass-morphism border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 hover:from-emerald-500/20 hover:to-teal-600/20 shadow-cyber-glass",
        "gradient-blue": "glass-morphism border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 hover:from-blue-500/20 hover:to-indigo-600/20 shadow-cyber-glass",
        "gradient-purple": "glass-morphism border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-violet-600/10 hover:from-purple-500/20 hover:to-violet-600/20 shadow-cyber-glass",
        "gradient-red": "glass-morphism border-red-400/20 bg-gradient-to-br from-red-500/10 to-rose-600/10 hover:from-red-500/20 hover:to-rose-600/20 shadow-cyber-glass",
        "gradient-orange": "glass-morphism border-orange-400/20 bg-gradient-to-br from-orange-500/10 to-amber-600/10 hover:from-orange-500/20 hover:to-amber-600/20 shadow-cyber-glass",
        
        // Filter/header cards
        filter: "glass-morphism border-white/10 bg-gradient-to-r from-white/5 to-white/10 shadow-cyber-glass",
        
        // Default
        default: "glass-morphism glass-morphism-hover border-white/10 shadow-cyber-glass",
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
    className={cn("text-2xl font-semibold leading-none tracking-tight text-cyber-text-primary font-accent", className)}
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
    className={cn("text-sm text-cyber-text-muted", className)}
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