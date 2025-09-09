/**
 * Enhanced Card Component
 * Provides gradient backgrounds and improved contrast for better visibility
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const enhancedCardVariants = cva(
  "rounded-xl transition-all duration-300 border-0 shadow-lg hover:shadow-xl",
  {
    variants: {
      variant: {
        // Professional cards with high contrast
        professional: "bg-white text-gray-900 shadow-lg hover:shadow-xl",
        
        // Gradient background cards for different contexts
        "gradient-super-admin": "bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900 border border-indigo-100",
        "gradient-tenant": "bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-gray-900 border border-emerald-100",
        "gradient-success": "bg-gradient-to-br from-green-50 via-white to-emerald-50 text-gray-900 border border-green-200",
        "gradient-warning": "bg-gradient-to-br from-yellow-50 via-white to-orange-50 text-gray-900 border border-yellow-200",
        "gradient-error": "bg-gradient-to-br from-red-50 via-white to-pink-50 text-gray-900 border border-red-200",
        "gradient-info": "bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-900 border border-blue-200",
        
        // Filter/header cards with enhanced visibility
        filter: "bg-gradient-to-r from-slate-50 to-slate-100 text-gray-900 border border-slate-200 shadow-sm",
        
        // High contrast cards for important content
        "high-contrast": "bg-white text-black border-2 border-gray-300 shadow-xl",
        
        // Dark variant
        dark: "bg-gray-900 text-white border border-gray-700",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "professional",
      size: "default",
    },
  }
);

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(enhancedCardVariants({ variant, size, className }))}
      {...props}
    />
  )
);
EnhancedCard.displayName = "EnhancedCard";

const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 pb-4", className)}
    {...props}
  />
));
EnhancedCardHeader.displayName = "EnhancedCardHeader";

const EnhancedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-bold leading-tight tracking-tight text-gray-900",
      className
    )}
    {...props}
  />
));
EnhancedCardTitle.displayName = "EnhancedCardTitle";

const EnhancedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-medium text-gray-600 leading-relaxed", className)}
    {...props}
  />
));
EnhancedCardDescription.displayName = "EnhancedCardDescription";

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
EnhancedCardContent.displayName = "EnhancedCardContent";

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between pt-4 border-t border-gray-200", className)}
    {...props}
  />
));
EnhancedCardFooter.displayName = "EnhancedCardFooter";

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
  enhancedCardVariants,
};