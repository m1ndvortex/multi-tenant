/**
 * Switch Component
 * A toggle switch component built with Radix UI
 */

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "../../lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-white/20 glass-morphism transition-all duration-cyber-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-bg-surface disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-cyan-400/20 data-[state=checked]:border-cyan-400 data-[state=checked]:shadow-neon-cyan/30 data-[state=unchecked]:bg-white/5",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-cyber-text-primary shadow-lg ring-0 transition-all duration-cyber-normal data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-cyber-neon-primary data-[state=checked]:shadow-neon-cyan/50"
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }