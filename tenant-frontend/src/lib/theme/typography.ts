/**
 * Enhanced Typography System for Tenant Frontend
 * Provides high-contrast font colors and accessibility compliance
 */

export const typography = {
  // Font families with fallbacks
  fontFamily: {
    primary: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
    secondary: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
  },

  // Font sizes with consistent scale
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  // Font weights for hierarchy
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights for readability
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },

  // Letter spacing for different contexts
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// High-contrast text color utilities for tenant theme
export const textColors = {
  // Primary text colors with high contrast
  primary: {
    light: '#1a202c',      // Very dark gray for light backgrounds
    dark: '#ffffff',       // Pure white for dark backgrounds
  },
  
  // Secondary text colors
  secondary: {
    light: '#2d3748',      // Dark gray for secondary text
    dark: '#e2e8f0',       // Light gray for dark backgrounds
  },
  
  // Muted text colors
  muted: {
    light: '#4a5568',      // Medium gray for muted text
    dark: '#a0aec0',       // Medium light gray for dark backgrounds
  },
  
  // Accent colors for links and highlights (tenant green theme)
  accent: {
    light: '#059669',      // Emerald green for links
    dark: '#34d399',       // Light emerald for dark backgrounds
  },
  
  // Status colors with high contrast
  success: {
    light: '#14532d',      // Dark green
    dark: '#86efac',       // Light green
  },
  
  warning: {
    light: '#78350f',      // Dark orange
    dark: '#fbbf24',       // Light yellow
  },
  
  error: {
    light: '#7f1d1d',      // Dark red
    dark: '#fca5a5',       // Light red
  },
  
  info: {
    light: '#1e3a8a',      // Dark blue
    dark: '#93c5fd',       // Light blue
  },
};

// Typography component classes
export const typographyClasses = {
  // Headings with proper hierarchy
  h1: 'text-4xl font-bold leading-tight tracking-tight',
  h2: 'text-3xl font-bold leading-tight tracking-tight',
  h3: 'text-2xl font-semibold leading-tight tracking-tight',
  h4: 'text-xl font-semibold leading-normal',
  h5: 'text-lg font-medium leading-normal',
  h6: 'text-base font-medium leading-normal',
  
  // Body text variants
  body: 'text-base font-normal leading-normal',
  bodyLarge: 'text-lg font-normal leading-relaxed',
  bodySmall: 'text-sm font-normal leading-normal',
  
  // Special text variants
  caption: 'text-xs font-normal leading-tight',
  overline: 'text-xs font-medium leading-tight tracking-wider uppercase',
  
  // Interactive text
  link: 'text-base font-medium leading-normal hover:underline focus:underline',
  button: 'text-sm font-semibold leading-tight tracking-wide',
  
  // Table text
  tableHeader: 'text-sm font-semibold leading-tight tracking-wider',
  tableCell: 'text-sm font-medium leading-normal',
  
  // Special emphasis for important data
  importantData: 'text-base font-bold leading-normal',
};

// Accessibility-compliant color combinations
export const accessibleCombinations = {
  // High contrast combinations for critical text
  highContrast: {
    light: {
      background: '#ffffff',
      text: '#000000',
      contrast: '21:1', // WCAG AAA
    },
    dark: {
      background: '#000000',
      text: '#ffffff',
      contrast: '21:1', // WCAG AAA
    },
  },
  
  // Standard combinations for regular text
  standard: {
    light: {
      background: '#ffffff',
      text: '#1a202c',
      contrast: '16.75:1', // WCAG AAA
    },
    dark: {
      background: '#1a202c',
      text: '#ffffff',
      contrast: '16.75:1', // WCAG AAA
    },
  },
  
  // Muted combinations for secondary text
  muted: {
    light: {
      background: '#ffffff',
      text: '#4a5568',
      contrast: '7.23:1', // WCAG AA
    },
    dark: {
      background: '#1a202c',
      text: '#a0aec0',
      contrast: '7.23:1', // WCAG AA
    },
  },
};

export default typography;