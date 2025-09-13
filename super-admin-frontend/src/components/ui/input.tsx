import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg glass-morphism border-white/20 bg-white/5 px-3 py-2 text-sm text-cyber-text-primary placeholder:text-cyber-text-muted file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:border-cyan-400 focus-visible:shadow-neon-cyan/30 focus-visible:cyber-text-glow disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-cyber-normal backdrop-blur-md",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }