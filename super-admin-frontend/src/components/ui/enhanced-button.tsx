/**
 * Enhanced Button Component
 * Provides consistent styling and hover effects with high contrast
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        // Primary gradient buttons
        "gradient-primary": "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl focus-visible:ring-blue-500",
        "gradient-success": "bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl focus-visible:ring-green-500",
        "gradient-warning": "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-yellow-500",
        "gradient-error": "bg-gradient-to-r from-red-600 to-pink-700 hover:from-red-700 hover:to-pink-800 text-white shadow-lg hover:shadow-xl focus-visible:ring-red-500",
        
        // Solid high-contrast buttons
        primary: "bg-blue-700 text-white hover:bg-blue-800 shadow-md hover:shadow-lg focus-visible:ring-blue-500",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 border border-gray-300 focus-visible:ring-gray-500",
        success: "bg-green-700 text-white hover:bg-green-800 shadow-md hover:shadow-lg focus-visible:ring-green-500",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 shadow-md hover:shadow-lg focus-visible:ring-yellow-500",
        error: "bg-red-700 text-white hover:bg-red-800 shadow-md hover:shadow-lg focus-visible:ring-red-500",
        
        // Outline variants with high contrast
        "outline-primary": "border-2 border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white focus-visible:ring-blue-500",
        "outline-secondary": "border-2 border-gray-400 text-gray-700 hover:bg-gray-400 hover:text-white focus-visible:ring-gray-500",
        "outline-success": "border-2 border-green-700 text-green-700 hover:bg-green-700 hover:text-white focus-visible:ring-green-500",
        "outline-warning": "border-2 border-yellow-600 text-yellow-700 hover:bg-yellow-600 hover:text-white focus-visible:ring-yellow-500",
        "outline-error": "border-2 border-red-700 text-red-700 hover:bg-red-700 hover:text-white focus-visible:ring-red-500",
        
        // Ghost variants
        ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
        "ghost-primary": "text-blue-700 hover:bg-blue-50 hover:text-blue-800 focus-visible:ring-blue-500",
        "ghost-success": "text-green-700 hover:bg-green-50 hover:text-green-800 focus-visible:ring-green-500",
        "ghost-warning": "text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800 focus-visible:ring-yellow-500",
        "ghost-error": "text-red-700 hover:bg-red-50 hover:text-red-800 focus-visible:ring-red-500",
        
        // Link variant
        link: "text-blue-700 underline-offset-4 hover:underline hover:text-blue-800 focus-visible:ring-blue-500",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(enhancedButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton, enhancedButtonVariants };