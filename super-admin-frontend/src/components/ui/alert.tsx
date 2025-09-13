import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 transition-all duration-cyber-normal [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: "glass-morphism border-white/20 text-cyber-text-primary [&>svg]:text-cyber-neon-primary",
        destructive: "glass-morphism border-pink-400/50 text-cyber-neon-danger shadow-neon-pink/20 [&>svg]:text-cyber-neon-danger animate-cyber-pulse",
        success: "glass-morphism border-emerald-400/50 text-cyber-neon-success shadow-neon-green/20 [&>svg]:text-cyber-neon-success",
        warning: "glass-morphism border-orange-400/50 text-cyber-neon-warning shadow-neon-orange/20 [&>svg]:text-cyber-neon-warning",
        info: "glass-morphism border-blue-400/50 text-cyber-neon-info shadow-neon-blue/20 [&>svg]:text-cyber-neon-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight font-accent cyber-text-glow", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed text-cyber-text-secondary", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }