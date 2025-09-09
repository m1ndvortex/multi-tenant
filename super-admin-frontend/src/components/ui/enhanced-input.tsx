/**
 * Enhanced Input Component
 * Provides clear placeholder text and visible input borders with high contrast
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const enhancedInputVariants = cva(
  "flex w-full rounded-lg border-2 bg-white px-4 py-3 text-sm font-medium transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 hover:border-gray-400",
        success: "border-green-300 text-gray-900 placeholder:text-gray-500 focus:border-green-600 focus:ring-2 focus:ring-green-100",
        warning: "border-yellow-300 text-gray-900 placeholder:text-gray-500 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-100",
        error: "border-red-300 text-gray-900 placeholder:text-gray-500 focus:border-red-600 focus:ring-2 focus:ring-red-100",
        "high-contrast": "border-gray-900 text-black placeholder:text-gray-700 focus:border-blue-800 focus:ring-2 focus:ring-blue-200",
      },
      size: {
        sm: "h-8 px-3 py-2 text-xs",
        default: "h-10 px-4 py-3 text-sm",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface EnhancedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof enhancedInputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type, 
    label, 
    helperText, 
    error, 
    leftIcon, 
    rightIcon,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const finalVariant = error ? "error" : variant;

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-semibold text-gray-900 leading-tight"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            id={inputId}
            className={cn(
              enhancedInputVariants({ variant: finalVariant, size, className }),
              leftIcon && "pl-10",
              rightIcon && "pr-10"
            )}
            ref={ref}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            "text-xs font-medium leading-tight",
            error ? "text-red-700" : "text-gray-600"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
EnhancedInput.displayName = "EnhancedInput";

// Search Input Component with enhanced visibility
export interface EnhancedSearchInputProps extends Omit<EnhancedInputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

const EnhancedSearchInput = React.forwardRef<HTMLInputElement, EnhancedSearchInputProps>(
  ({ onSearch, onClear, placeholder = "جستجو...", className, ...props }, ref) => {
    const [value, setValue] = React.useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onSearch?.(newValue);
    };

    const handleClear = () => {
      setValue("");
      onSearch?.("");
      onClear?.();
    };

    return (
      <EnhancedInput
        ref={ref}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("pr-10 enhanced-search-field", className)}
        leftIcon={
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        rightIcon={
          value && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )
        }
        {...props}
      />
    );
  }
);
EnhancedSearchInput.displayName = "EnhancedSearchInput";

export { EnhancedInput, EnhancedSearchInput, enhancedInputVariants };