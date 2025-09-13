/**
 * Cybersecurity-themed Form Components
 * Enhanced form components with glassmorphism, neon effects, and validation styling
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// Form Container
const formVariants = cva(
  "space-y-6 p-6 rounded-2xl backdrop-blur-md border",
  {
    variants: {
      variant: {
        default: "bg-white/5 border-white/10",
        cyber: "bg-gradient-to-br from-white/5 to-white/2 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        glass: "bg-white/3 border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        neon: "bg-gradient-to-br from-[#00D4FF]/5 to-[#00FF88]/5 border-[#00D4FF]/20 shadow-[0_0_30px_rgba(0,212,255,0.1)]",
      },
    },
    defaultVariants: {
      variant: "cyber",
    },
  }
);

export interface FormProps
  extends React.FormHTMLAttributes<HTMLFormElement>,
    VariantProps<typeof formVariants> {
  rtl?: boolean;
  animated?: boolean;
}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, variant, rtl = false, animated = true, children, ...props }, ref) => {
    const formContent = (
      <form
        ref={ref}
        className={cn(
          formVariants({ variant }),
          rtl && "font-[Vazirmatn] [&_label]:text-right [&_input]:text-right",
          className
        )}
        {...props}
      >
        {children}
      </form>
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {formContent}
        </motion.div>
      );
    }

    return formContent;
  }
);
Form.displayName = "Form";

// Form Field Container
export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  rtl?: boolean;
  animated?: boolean;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, rtl = false, animated = true, children, ...props }, ref) => {
    const fieldContent = (
      <div
        ref={ref}
        className={cn(
          "space-y-2",
          rtl && "text-right",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, x: rtl ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {fieldContent}
        </motion.div>
      );
    }

    return fieldContent;
  }
);
FormField.displayName = "FormField";

// Form Label
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "text-white/90",
        cyber: "text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]",
        success: "text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]",
        warning: "text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.3)]",
        danger: "text-[#FF4757] drop-shadow-[0_0_8px_rgba(255,71,87,0.3)]",
      },
      required: {
        true: "after:content-['*'] after:ml-1 after:text-[#FF4757]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      required: false,
    },
  }
);

export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  rtl?: boolean;
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, variant, required, rtl = false, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        labelVariants({ variant, required }),
        rtl && "font-[Vazirmatn] after:mr-1 after:ml-0",
        className
      )}
      {...props}
    />
  )
);
FormLabel.displayName = "FormLabel";

// Form Message (for validation feedback)
const messageVariants = cva(
  "text-sm flex items-center gap-2 transition-all duration-300",
  {
    variants: {
      variant: {
        default: "text-white/70",
        success: "text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.2)]",
        warning: "text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.2)]",
        danger: "text-[#FF4757] drop-shadow-[0_0_8px_rgba(255,71,87,0.2)]",
        info: "text-[#5352ED] drop-shadow-[0_0_8px_rgba(83,82,237,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface FormMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof messageVariants> {
  rtl?: boolean;
  animated?: boolean;
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, variant, rtl = false, animated = true, children, ...props }, ref) => {
    const getIcon = () => {
      switch (variant) {
        case 'success':
          return <CheckCircle className="h-4 w-4 flex-shrink-0" />;
        case 'warning':
          return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
        case 'danger':
          return <AlertCircle className="h-4 w-4 flex-shrink-0" />;
        case 'info':
          return <Info className="h-4 w-4 flex-shrink-0" />;
        default:
          return null;
      }
    };

    const messageContent = (
      <p
        ref={ref}
        className={cn(
          messageVariants({ variant }),
          rtl && "font-[Vazirmatn] flex-row-reverse",
          className
        )}
        {...props}
      >
        {getIcon()}
        {children}
      </p>
    );

    if (animated && children) {
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {messageContent}
          </motion.div>
        </AnimatePresence>
      );
    }

    return children ? messageContent : null;
  }
);
FormMessage.displayName = "FormMessage";

// Form Description
export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  rtl?: boolean;
}

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, rtl = false, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "text-sm text-white/60",
        rtl && "font-[Vazirmatn] text-right",
        className
      )}
      {...props}
    />
  )
);
FormDescription.displayName = "FormDescription";

// Form Group (for grouping related fields)
export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  rtl?: boolean;
  animated?: boolean;
}

const FormGroup = React.forwardRef<HTMLDivElement, FormGroupProps>(
  ({ className, title, description, rtl = false, animated = true, children, ...props }, ref) => {
    const groupContent = (
      <div
        ref={ref}
        className={cn(
          "space-y-4 p-4 rounded-xl bg-white/2 border border-white/5",
          rtl && "text-right",
          className
        )}
        {...props}
      >
        {title && (
          <div className="space-y-1">
            <h3 className={cn(
              "text-lg font-semibold text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]",
              rtl && "font-[Vazirmatn]"
            )}>
              {title}
            </h3>
            {description && (
              <p className={cn(
                "text-sm text-white/70",
                rtl && "font-[Vazirmatn]"
              )}>
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {groupContent}
        </motion.div>
      );
    }

    return groupContent;
  }
);
FormGroup.displayName = "FormGroup";

// Form Actions (for submit/cancel buttons)
export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  rtl?: boolean;
  animated?: boolean;
}

const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, rtl = false, animated = true, children, ...props }, ref) => {
    const actionsContent = (
      <div
        ref={ref}
        className={cn(
          "flex gap-3 pt-4 border-t border-white/10",
          rtl ? "flex-row-reverse" : "justify-end",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {actionsContent}
        </motion.div>
      );
    }

    return actionsContent;
  }
);
FormActions.displayName = "FormActions";

// Validation Hook for form state management
export const useFormValidation = (initialState: Record<string, any> = {}) => {
  const [values, setValues] = React.useState(initialState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouchedState] = React.useState<Record<string, boolean>>({});

  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const setError = (name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const setTouched = (name: string) => {
    setTouchedState(prev => ({ ...prev, [name]: true }));
  };

  const validate = (validationRules: Record<string, (value: any) => string | null>) => {
    const newErrors: Record<string, string> = {};
    
    Object.keys(validationRules).forEach(field => {
      const error = validationRules[field](values[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setValues(initialState);
    setErrors({});
    setTouchedState({});
  };

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0,
    isDirty: Object.keys(touched).length > 0,
  };
};

export {
  Form,
  FormField,
  FormLabel,
  FormMessage,
  FormDescription,
  FormGroup,
  FormActions,
};