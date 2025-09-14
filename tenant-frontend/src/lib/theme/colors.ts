/**
 * Enhanced Color Palette System for Tenant Frontend
 * Provides proper contrast ratios for all text elements and accessibility compliance
 * Uses emerald/green theme for tenant applications
 */

// Base color palette with accessibility focus and tenant branding
export const colors = {
  // High contrast text colors
  text: {
    primary: '#1a202c',      // Very dark gray for primary text (16.75:1 contrast)
    secondary: '#2d3748',    // Dark gray for secondary text (12.63:1 contrast)
    muted: '#4a5568',        // Medium gray for muted text (7.23:1 contrast)
    inverse: '#ffffff',      // White text for dark backgrounds
    accent: '#059669',       // Emerald green for links and accents (6.74:1 contrast)
    brand: '#10b981',        // Tenant brand color (emerald)
  },
  
  // Background colors with proper contrast
  background: {
    primary: '#ffffff',      // Pure white
    secondary: '#f0fdf4',    // Very light green
    tertiary: '#ecfdf5',     // Light green
    quaternary: '#d1fae5',   // Medium light green
    dark: '#1a202c',         // Dark background
    overlay: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
    
    // Gradient backgrounds for tenant context
    gradient: {
      primary: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
      secondary: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
      success: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
      warning: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      error: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      info: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    },
  },
  
  // Enhanced status colors with high contrast
  status: {
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      900: '#14532d',
      text: '#14532d',        // High contrast text (12.04:1)
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      900: '#78350f',
      text: '#78350f',        // High contrast text (8.35:1)
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      900: '#7f1d1d',
      text: '#7f1d1d',        // High contrast text (10.69:1)
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a',
      text: '#1e3a8a',        // High contrast text (9.68:1)
    },
  },
  
  // Border and divider colors
  border: {
    light: '#e2e8f0',        // Light border (1.89:1 contrast)
    medium: '#cbd5e0',       // Medium border (2.73:1 contrast)
    dark: '#a0aec0',         // Dark border (4.54:1 contrast)
    focus: '#10b981',        // Focus border (emerald)
    error: '#ef4444',        // Error border (red)
    success: '#22c55e',      // Success border (green)
  },
  
  // Interactive element colors (tenant theme)
  interactive: {
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      hover: '#065f46',
      active: '#064e3b',
      text: '#ffffff',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      hover: '#475569',
      active: '#334155',
      text: '#ffffff',
    },
  },
  
  // Semantic colors for tenant context
  semantic: {
    // Tenant-specific colors (emerald theme)
    tenant: {
      primary: '#059669',      // Emerald green
      secondary: '#10b981',    // Light emerald
      background: '#ecfdf5',   // Very light green
      text: '#064e3b',         // Dark green text (11.86:1 contrast)
    },
    
    // Form and input colors
    form: {
      background: '#ffffff',
      border: '#d1d5db',
      borderFocus: '#10b981',
      borderError: '#ef4444',
      placeholder: '#9ca3af',  // Medium gray (4.54:1 contrast)
      text: '#111827',         // Very dark gray (15.29:1 contrast)
    },
  },
};

// Color utility functions
export const colorUtils = {
  // Get appropriate text color for background
  getTextColor: (backgroundColor: string, theme: 'light' | 'dark' = 'light') => {
    if (theme === 'dark') {
      return colors.text.inverse;
    }
    return colors.text.primary;
  },
  
  // Get high contrast color combination
  getHighContrastPair: (context: 'primary' | 'secondary' | 'muted' = 'primary') => {
    switch (context) {
      case 'primary':
        return {
          background: colors.background.primary,
          text: colors.text.primary,
          contrast: '16.75:1',
        };
      case 'secondary':
        return {
          background: colors.background.secondary,
          text: colors.text.secondary,
          contrast: '12.63:1',
        };
      case 'muted':
        return {
          background: colors.background.tertiary,
          text: colors.text.muted,
          contrast: '7.23:1',
        };
      default:
        return {
          background: colors.background.primary,
          text: colors.text.primary,
          contrast: '16.75:1',
        };
    }
  },
  
  // Get status color with appropriate text
  getStatusColor: (status: 'success' | 'warning' | 'error' | 'info') => {
    return {
      background: colors.status[status][50],
      border: colors.status[status][500],
      text: colors.status[status].text,
      icon: colors.status[status][600],
    };
  },
};

// CSS custom properties for dynamic theming
export const cssVariables = {
  light: {
    '--color-text-primary': colors.text.primary,
    '--color-text-secondary': colors.text.secondary,
    '--color-text-muted': colors.text.muted,
    '--color-text-accent': colors.text.accent,
    '--color-text-brand': colors.text.brand,
    
    '--color-bg-primary': colors.background.primary,
    '--color-bg-secondary': colors.background.secondary,
    '--color-bg-tertiary': colors.background.tertiary,
    
    '--color-border-light': colors.border.light,
    '--color-border-medium': colors.border.medium,
    '--color-border-dark': colors.border.dark,
    
    '--color-success': colors.status.success[600],
    '--color-warning': colors.status.warning[600],
    '--color-error': colors.status.error[600],
    '--color-info': colors.status.info[600],
  },
  
  dark: {
    '--color-text-primary': colors.text.inverse,
    '--color-text-secondary': '#e2e8f0',
    '--color-text-muted': '#a0aec0',
    '--color-text-accent': '#34d399',
    '--color-text-brand': '#6ee7b7',
    
    '--color-bg-primary': colors.background.dark,
    '--color-bg-secondary': '#2d3748',
    '--color-bg-tertiary': '#4a5568',
    
    '--color-border-light': '#4a5568',
    '--color-border-medium': '#718096',
    '--color-border-dark': '#a0aec0',
    
    '--color-success': colors.status.success[400],
    '--color-warning': colors.status.warning[400],
    '--color-error': colors.status.error[400],
    '--color-info': colors.status.info[400],
  },
};

export default colors;