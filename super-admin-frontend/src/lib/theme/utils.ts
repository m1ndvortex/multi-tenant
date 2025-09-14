/**
 * Theme Utility Functions
 * Helper functions for managing cybersecurity theme, glassmorphism, and RTL support
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { glassmorphismClasses, neonClasses } from './cybersecurity';

/**
 * Enhanced cn function with cybersecurity theme support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate glassmorphism classes based on variant
 */
export function getGlassmorphismClasses(
  variant: 'base' | 'card' | 'modal' | 'navigation' | 'hover' = 'base',
  includeHover: boolean = true
): string {
  const baseClasses = glassmorphismClasses[variant] || glassmorphismClasses.base;
  const hoverClasses = includeHover ? glassmorphismClasses.hover : '';
  
  return cn(baseClasses, hoverClasses);
}

/**
 * Generate neon effect classes based on type and variant
 */
export function getNeonClasses(
  type: 'glow' | 'border' | 'text',
  variant: 'primary' | 'secondary' | 'warning' | 'danger' | 'info' = 'primary'
): string {
  return neonClasses[type][variant] || neonClasses[type].primary;
}

/**
 * Generate cybersecurity button classes
 */
export function getCyberButtonClasses(
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md'
): string {
  const baseClasses = 'cyber-button relative overflow-hidden font-medium transition-all duration-300';
  
  const variantClasses = {
    primary: cn(
      'bg-cyber-bg-surface border-cyber-neon-primary text-cyber-neon-primary',
      'hover:bg-cyber-neon-primary hover:text-cyber-text-inverse',
      'hover:shadow-neon-cyan hover:scale-105'
    ),
    secondary: cn(
      'bg-cyber-bg-surface border-cyber-neon-secondary text-cyber-neon-secondary',
      'hover:bg-cyber-neon-secondary hover:text-cyber-text-inverse',
      'hover:shadow-neon-green hover:scale-105'
    ),
    ghost: cn(
      'bg-transparent border-cyber-glass-border text-cyber-text-secondary',
      'hover:bg-cyber-glass-bg-hover hover:border-cyber-neon-primary',
      'hover:text-cyber-neon-primary hover:shadow-cyber-glow'
    ),
    danger: cn(
      'bg-cyber-bg-surface border-cyber-neon-danger text-cyber-neon-danger',
      'hover:bg-cyber-neon-danger hover:text-cyber-text-inverse',
      'hover:shadow-neon-pink hover:scale-105'
    ),
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return cn(baseClasses, variantClasses[variant], sizeClasses[size]);
}

/**
 * Generate cybersecurity card classes
 */
export function getCyberCardClasses(
  variant: 'default' | 'elevated' | 'interactive' = 'default',
  includeAnimation: boolean = true
): string {
  const baseClasses = 'glass-card rounded-lg';
  
  const variantClasses = {
    default: 'p-6',
    elevated: 'p-6 shadow-cyber-glass-hover',
    interactive: cn(
      'p-6 cursor-pointer transition-all duration-300',
      'hover:shadow-cyber-glass-hover hover:scale-[1.02]',
      'hover:border-cyber-neon-primary/30'
    ),
  };

  const animationClasses = includeAnimation ? 'cyber-fade-in' : '';

  return cn(baseClasses, variantClasses[variant], animationClasses);
}

/**
 * Generate RTL-aware classes with cybersecurity theme support
 */
export function getRTLClasses(
  isRTL: boolean,
  classes: {
    ltr?: string;
    rtl?: string;
    common?: string;
  }
): string {
  const { ltr = '', rtl = '', common = '' } = classes;
  
  if (isRTL) {
    return cn(common, rtl);
  }
  
  return cn(common, ltr);
}

/**
 * Apply RTL transformations to class names
 */
export function applyRTLTransformations(
  className: string,
  isRTL: boolean
): string {
  if (!isRTL) return className;
  
  const rtlTransformations = {
    // Margins
    'ml-': 'mr-', 'mr-': 'ml-',
    // Padding
    'pl-': 'pr-', 'pr-': 'pl-',
    // Borders
    'border-l': 'border-r', 'border-r': 'border-l',
    'border-l-': 'border-r-', 'border-r-': 'border-l-',
    // Rounded corners
    'rounded-l': 'rounded-r', 'rounded-r': 'rounded-l',
    'rounded-tl': 'rounded-tr', 'rounded-tr': 'rounded-tl',
    'rounded-bl': 'rounded-br', 'rounded-br': 'rounded-bl',
    // Text alignment
    'text-left': 'text-right', 'text-right': 'text-left',
    // Positioning
    'left-': 'right-', 'right-': 'left-',
  };
  
  let transformedClass = className;
  
  Object.entries(rtlTransformations).forEach(([ltr, rtl]) => {
    const regex = new RegExp(ltr, 'g');
    transformedClass = transformedClass.replace(regex, rtl);
  });
  
  return transformedClass;
}

/**
 * Generate status indicator classes with neon effects
 */
export function getStatusClasses(
  status: 'online' | 'offline' | 'warning' | 'error' | 'info',
  includeGlow: boolean = true
): string {
  const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
  
  const statusClasses = {
    online: cn(
      'bg-cyber-neon-success/20 text-cyber-neon-success border border-cyber-neon-success/30',
      includeGlow && 'shadow-neon-green'
    ),
    offline: cn(
      'bg-cyber-text-muted/20 text-cyber-text-muted border border-cyber-text-muted/30'
    ),
    warning: cn(
      'bg-cyber-neon-warning/20 text-cyber-neon-warning border border-cyber-neon-warning/30',
      includeGlow && 'shadow-neon-orange'
    ),
    error: cn(
      'bg-cyber-neon-danger/20 text-cyber-neon-danger border border-cyber-neon-danger/30',
      includeGlow && 'shadow-neon-pink'
    ),
    info: cn(
      'bg-cyber-neon-info/20 text-cyber-neon-info border border-cyber-neon-info/30',
      includeGlow && 'shadow-neon-blue'
    ),
  };

  return cn(baseClasses, statusClasses[status]);
}

/**
 * Generate cybersecurity input classes
 */
export function getCyberInputClasses(
  variant: 'default' | 'search' | 'filter' = 'default',
  hasError: boolean = false
): string {
  const baseClasses = cn(
    'cyber-input w-full rounded-md px-3 py-2',
    'focus:ring-2 focus:ring-cyber-neon-primary/50',
    'placeholder:text-cyber-text-muted'
  );

  const variantClasses = {
    default: '',
    search: cn(
      'pl-10 bg-cyber-glass-bg/50',
      'focus:bg-cyber-glass-bg-hover'
    ),
    filter: cn(
      'text-sm bg-cyber-glass-bg/30',
      'focus:bg-cyber-glass-bg'
    ),
  };

  const errorClasses = hasError ? cn(
    'border-cyber-neon-danger focus:border-cyber-neon-danger',
    'focus:ring-cyber-neon-danger/50'
  ) : '';

  return cn(baseClasses, variantClasses[variant], errorClasses);
}

/**
 * Generate navigation item classes with cybersecurity theme
 */
export function getNavigationItemClasses(
  isActive: boolean = false,
  isRTL: boolean = false
): string {
  const baseClasses = cn(
    'flex items-center px-4 py-3 text-sm font-medium rounded-lg',
    'transition-all duration-300 group relative overflow-hidden'
  );

  const activeClasses = isActive ? cn(
    'bg-cyber-neon-primary/15 text-cyber-neon-primary border-r-2 border-cyber-neon-primary',
    'shadow-neon-cyan'
  ) : cn(
    'text-cyber-text-secondary hover:text-cyber-neon-primary',
    'hover:bg-cyber-glass-bg-hover'
  );

  const rtlClasses = isRTL ? 'border-l-2 border-r-0' : '';

  return cn(baseClasses, activeClasses, rtlClasses);
}

/**
 * Generate table classes with cybersecurity theme
 */
export function getCyberTableClasses(): {
  table: string;
  header: string;
  row: string;
  cell: string;
} {
  return {
    table: cn(
      'w-full glass-card rounded-lg overflow-hidden',
      'border-separate border-spacing-0'
    ),
    header: cn(
      'bg-cyber-bg-elevated/50 text-cyber-text-primary',
      'border-b border-cyber-glass-border'
    ),
    row: cn(
      'hover:bg-cyber-glass-bg-hover transition-colors duration-200',
      'border-b border-cyber-glass-border/50 last:border-b-0'
    ),
    cell: cn(
      'px-6 py-4 text-cyber-text-secondary',
      'first:rounded-l-lg last:rounded-r-lg'
    ),
  };
}

/**
 * Generate loading spinner classes with cybersecurity theme
 */
export function getCyberLoadingClasses(
  size: 'sm' | 'md' | 'lg' = 'md'
): string {
  const baseClasses = cn(
    'animate-spin rounded-full border-2 border-cyber-glass-border',
    'border-t-cyber-neon-primary'
  );

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return cn(baseClasses, sizeClasses[size]);
}

/**
 * Generate modal classes with cybersecurity theme
 */
export function getCyberModalClasses(): {
  overlay: string;
  content: string;
  header: string;
  body: string;
  footer: string;
} {
  return {
    overlay: cn(
      'fixed inset-0 z-50 bg-cyber-bg-primary/80 backdrop-blur-md',
      'flex items-center justify-center p-4'
    ),
    content: cn(
      'glass-card max-w-lg w-full max-h-[90vh] overflow-hidden',
      'animate-cyber-fade-in'
    ),
    header: cn(
      'flex items-center justify-between p-6',
      'border-b border-cyber-glass-border'
    ),
    body: 'p-6 overflow-y-auto',
    footer: cn(
      'flex items-center justify-end gap-3 p-6',
      'border-t border-cyber-glass-border'
    ),
  };
}

/**
 * Utility to check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Utility to get appropriate transition duration based on motion preference
 */
export function getTransitionDuration(
  normal: string = '300ms',
  reduced: string = '0ms'
): string {
  return prefersReducedMotion() ? reduced : normal;
}

/**
 * Generate responsive classes for cybersecurity theme
 */
export function getCyberResponsiveClasses(
  mobile: string,
  tablet: string = '',
  desktop: string = ''
): string {
  return cn(
    mobile,
    tablet && `md:${tablet}`,
    desktop && `lg:${desktop}`
  );
}

/**
 * Generate multi-color gradient border classes
 */
export function getGradientBorderClasses(
  variant: 'cyber' | 'neon' | 'animated' = 'cyber',
  rounded: boolean = true
): string {
  const baseClasses = 'relative';
  const roundedClass = rounded ? 'rounded-2xl' : '';
  
  const variants = {
    cyber: cn(
      'before:absolute before:inset-0 before:p-[1px]',
      'before:bg-gradient-to-r before:from-[#00D4FF] before:via-[#00FF88] before:to-[#FF6B35]',
      'before:content-[""] before:-z-10',
      roundedClass && `before:${roundedClass}`
    ),
    neon: cn(
      'before:absolute before:inset-0 before:p-[1px]',
      'before:bg-gradient-to-r before:from-cyan-400 before:via-emerald-400 before:to-orange-400',
      'before:content-[""] before:-z-10 before:animate-gradient-border',
      roundedClass && `before:${roundedClass}`
    ),
    animated: cn(
      'before:absolute before:inset-0 before:p-[1px]',
      'before:bg-gradient-to-r before:from-[#00D4FF] before:via-[#00FF88] before:to-[#FF6B35]',
      'before:content-[""] before:-z-10 before:animate-pulse',
      roundedClass && `before:${roundedClass}`
    ),
  };
  
  return cn(baseClasses, variants[variant]);
}

/**
 * Generate cybersecurity-themed hover effects
 */
export function getCyberHoverEffects(
  type: 'card' | 'button' | 'nav' | 'table-row' = 'card',
  intensity: 'subtle' | 'medium' | 'strong' = 'medium'
): string {
  const intensityMap = {
    subtle: {
      scale: 'hover:scale-[1.01]',
      glow: 'hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]',
      bg: 'hover:bg-white/[0.02]',
    },
    medium: {
      scale: 'hover:scale-[1.02]',
      glow: 'hover:shadow-[0_0_20px_rgba(0,212,255,0.3)]',
      bg: 'hover:bg-white/[0.05]',
    },
    strong: {
      scale: 'hover:scale-[1.05]',
      glow: 'hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]',
      bg: 'hover:bg-white/[0.08]',
    },
  };
  
  const typeEffects = {
    card: cn(
      'transition-all duration-300 ease-out',
      intensityMap[intensity].scale,
      intensityMap[intensity].glow,
      'hover:border-cyan-400/30'
    ),
    button: cn(
      'transition-all duration-200 ease-out',
      intensityMap[intensity].scale,
      intensityMap[intensity].glow,
      'hover:text-white'
    ),
    nav: cn(
      'transition-all duration-300 ease-out',
      'hover:translate-x-1',
      intensityMap[intensity].bg,
      'hover:border-cyan-400/20'
    ),
    'table-row': cn(
      'transition-colors duration-200 ease-out',
      intensityMap[intensity].bg
    ),
  };
  
  return typeEffects[type];
}

/**
 * Generate cybersecurity-themed loading states
 */
export function getCyberLoadingStates(
  type: 'skeleton' | 'spinner' | 'pulse' | 'scan' = 'skeleton'
): string {
  const loadingTypes = {
    skeleton: cn(
      'animate-pulse bg-gradient-to-r',
      'from-white/[0.05] via-white/[0.1] to-white/[0.05]',
      'bg-[length:200%_100%] animate-gradient-border'
    ),
    spinner: cn(
      'animate-spin rounded-full border-2',
      'border-white/10 border-t-cyan-400'
    ),
    pulse: cn(
      'animate-neon-pulse',
      'shadow-[0_0_20px_rgba(0,212,255,0.4)]'
    ),
    scan: cn(
      'relative overflow-hidden',
      'after:absolute after:inset-0',
      'after:bg-gradient-to-r after:from-transparent after:via-cyan-400/20 after:to-transparent',
      'after:animate-scan-line'
    ),
  };
  
  return loadingTypes[type];
}

/**
 * Generate Persian/RTL-aware text classes
 */
export function getPersianTextClasses(
  isRTL: boolean,
  size: 'sm' | 'base' | 'lg' | 'xl' = 'base'
): string {
  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };
  
  const rtlClasses = isRTL ? 'font-persian text-right' : 'font-sans text-left';
  
  return cn(sizeClasses[size], rtlClasses, 'leading-relaxed');
}

export default {
  cn,
  getGlassmorphismClasses,
  getNeonClasses,
  getCyberButtonClasses,
  getCyberCardClasses,
  getRTLClasses,
  getStatusClasses,
  getCyberInputClasses,
  getNavigationItemClasses,
  getCyberTableClasses,
  getCyberLoadingClasses,
  getCyberModalClasses,
  prefersReducedMotion,
  getTransitionDuration,
  getCyberResponsiveClasses,
};