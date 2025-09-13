import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full rounded-lg px-3 py-2 text-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Cybersecurity Glass Input (Default)
        "cyber-glass": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#00D4FF]/50",
          "focus-visible:shadow-[0_0_20px_rgba(0,212,255,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-white/[0.12]"
        ],
        
        // Cybersecurity Neon Focus
        "cyber-neon": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.02] border border-white/[0.06]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.04] focus-visible:border-[#00D4FF]/60",
          "focus-visible:shadow-[0_0_25px_rgba(0,212,255,0.4),0_0_50px_rgba(0,255,136,0.2)]",
          "hover:bg-white/[0.03] hover:border-white/[0.08]"
        ],
        
        // Cybersecurity Success (Green Focus)
        "cyber-success": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#00FF88]/50",
          "focus-visible:shadow-[0_0_20px_rgba(0,255,136,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-white/[0.12]"
        ],
        
        // Cybersecurity Warning (Orange Focus)
        "cyber-warning": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#FF6B35]/50",
          "focus-visible:shadow-[0_0_20px_rgba(255,107,53,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-white/[0.12]"
        ],
        
        // Cybersecurity Danger (Red Focus)
        "cyber-danger": [
          "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-[#FF4757]/20",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.05] focus-visible:border-[#FF4757]/50",
          "focus-visible:shadow-[0_0_20px_rgba(255,71,87,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "hover:bg-white/[0.04] hover:border-[#FF4757]/30"
        ],
        
        // Cybersecurity Search (Enhanced Glass)
        "cyber-search": [
          "backdrop-blur-[20px] saturate-[180%] bg-white/[0.04] border border-white/[0.10]",
          "text-white placeholder:text-[#6B7280]",
          "focus-visible:bg-white/[0.06] focus-visible:border-[#00D4FF]/40",
          "focus-visible:shadow-[0_0_15px_rgba(0,212,255,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]",
          "hover:bg-white/[0.05] hover:border-white/[0.14]"
        ],
        
        // Legacy default for backward compatibility
        default: "backdrop-blur-[16px] saturate-[150%] bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-[#6B7280] focus-visible:bg-white/[0.05] focus-visible:border-[#00D4FF]/50 focus-visible:shadow-[0_0_20px_rgba(0,212,255,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.04] hover:border-white/[0.12]",
      },
      inputSize: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-2 py-1 text-xs",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }