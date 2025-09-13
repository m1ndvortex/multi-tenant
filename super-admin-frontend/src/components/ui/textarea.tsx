/**
 * Textarea Component
 * A textarea input component with cybersecurity theme
 */

import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg glass-morphism border-white/20 bg-white/5 px-3 py-2 text-sm text-cyber-text-primary placeholder:text-cyber-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:border-cyan-400 focus-visible:shadow-neon-cyan/30 focus-visible:cyber-text-glow disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-cyber-normal backdrop-blur-md resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }