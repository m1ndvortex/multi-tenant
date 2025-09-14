/**
 * Cybersecurity-themed Form Validation Utilities
 * Enhanced validation with accessibility and cybersecurity best practices
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export class FormValidator {
  private rules: Record<string, ValidationRule> = {};
  private values: Record<string, any> = {};

  constructor(rules: Record<string, ValidationRule> = {}) {
    this.rules = rules;
  }

  setRules(rules: Record<string, ValidationRule>) {
    this.rules = rules;
    return this;
  }

  setValues(values: Record<string, any>) {
    this.values = values;
    return this;
  }

  validateField(fieldName: string, value: any): string | null {
    const rule = this.rules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || `${fieldName} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // String validations
    if (typeof value === 'string') {
      // Min length validation
      if (rule.minLength && value.length < rule.minLength) {
        return rule.message || `${fieldName} must be at least ${rule.minLength} characters`;
      }

      // Max length validation
      if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message || `${fieldName} must not exceed ${rule.maxLength} characters`;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return rule.message || `${fieldName} format is invalid`;
      }
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  validate(): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    Object.keys(this.rules).forEach(fieldName => {
      const error = this.validateField(fieldName, this.values[fieldName]);
      if (error) {
        errors[fieldName] = error;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  // Security-focused validation patterns
  static patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    domain: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    noSpecialChars: /^[a-zA-Z0-9\s]+$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
  };

  // Common validation rules
  static rules = {
    required: (message?: string): ValidationRule => ({
      required: true,
      message: message || 'This field is required',
    }),

    email: (message?: string): ValidationRule => ({
      pattern: FormValidator.patterns.email,
      message: message || 'Please enter a valid email address',
    }),

    password: (message?: string): ValidationRule => ({
      pattern: FormValidator.patterns.password,
      minLength: 8,
      message: message || 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
    }),

    strongPassword: (message?: string): ValidationRule => ({
      pattern: FormValidator.patterns.strongPassword,
      minLength: 12,
      message: message || 'Password must be at least 12 characters with uppercase, lowercase, number, and special character',
    }),

    domain: (message?: string): ValidationRule => ({
      pattern: FormValidator.patterns.domain,
      message: message || 'Please enter a valid domain name',
    }),

    url: (message?: string): ValidationRule => ({
      pattern: FormValidator.patterns.url,
      message: message || 'Please enter a valid URL',
    }),

    minLength: (length: number, message?: string): ValidationRule => ({
      minLength: length,
      message: message || `Must be at least ${length} characters`,
    }),

    maxLength: (length: number, message?: string): ValidationRule => ({
      maxLength: length,
      message: message || `Must not exceed ${length} characters`,
    }),

    custom: (validator: (value: any) => string | null): ValidationRule => ({
      custom: validator,
    }),
  };
}

// Security validation helpers
export const SecurityValidation = {
  // Check for potential XSS patterns
  checkXSS: (value: string): string | null => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        return 'Input contains potentially dangerous content';
      }
    }
    return null;
  },

  // Check for SQL injection patterns
  checkSQLInjection: (value: string): string | null => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /('|(\\')|(;)|(\\;)|(\-\-)|(\#)|(\*)|(\%27)|(\%3B)|(\%23)|(\%2A))/gi,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        return 'Input contains potentially dangerous SQL patterns';
      }
    }
    return null;
  },

  // Sanitize input for security
  sanitizeInput: (value: string): string => {
    return value
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  },

  // Check password strength
  checkPasswordStrength: (password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else feedback.push('Use at least 12 characters for better security');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    return {
      score,
      feedback,
      isStrong: score >= 5,
    };
  },
};

// Accessibility helpers
export const AccessibilityHelpers = {
  // Generate ARIA attributes for form fields
  getAriaAttributes: (fieldName: string, error?: string, description?: string) => ({
    'aria-label': fieldName,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${fieldName}-error` : description ? `${fieldName}-description` : undefined,
  }),

  // Generate error message ID
  getErrorId: (fieldName: string) => `${fieldName}-error`,

  // Generate description ID
  getDescriptionId: (fieldName: string) => `${fieldName}-description`,

  // Check color contrast ratio
  checkContrast: (foreground: string, background: string): number => {
    // Simplified contrast calculation
    // In a real implementation, you'd use a proper color contrast library
    const getLuminance = (color: string): number => {
      // This is a simplified version - use a proper color library in production
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
};

import React from 'react';

// Form state management hook
export const useFormValidation = (
  initialValues: Record<string, any> = {},
  validationRules: Record<string, ValidationRule> = {}
) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validator = new FormValidator(validationRules);

  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const setFieldTouched = (name: string, touched = true) => {
    setTouched(prev => ({ ...prev, [name]: touched }));
  };

  const validateField = (name: string, value: any) => {
    const error = validator.validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error || '' }));
    return !error;
  };

  const validateForm = () => {
    validator.setValues(values);
    const result = validator.validate();
    setErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (onSubmit: (values: Record<string, any>) => Promise<void> | void) => {
    setIsSubmitting(true);
    
    try {
      const isValid = validateForm();
      if (isValid) {
        await onSubmit(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    isValid: Object.keys(errors).length === 0,
    isDirty: Object.keys(touched).length > 0,
  };
};