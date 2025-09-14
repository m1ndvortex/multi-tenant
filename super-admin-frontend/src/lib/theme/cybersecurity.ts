/**
 * Cybersecurity Theme Configuration
 * Comprehensive theme system for dark cybersecurity aesthetic with glassmorphism and neon effects
 */

export interface CyberTheme {
  colors: {
    background: {
      primary: string;
      secondary: string;
      surface: string;
      elevated: string;
      glass: string;
      gradient: {
        primary: string;
        card: string;
        neon: string;
      };
    };
    neon: {
      primary: string;
      secondary: string;
      tertiary: string;
      warning: string;
      danger: string;
      info: string;
      success: string;
      purple: string;
    };
    glass: {
      background: string;
      backgroundHover: string;
      border: string;
      borderHover: string;
      shadow: string;
      shadowHover: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      neon: string;
      numbers: string;
      inverse: string;
    };
    borders: {
      default: string;
      neon: string;
      success: string;
      warning: string;
      danger: string;
    };
  };
  animations: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
    easing: {
      smooth: string;
      bounce: string;
      sharp: string;
    };
  };
  effects: {
    blur: {
      light: string;
      medium: string;
      heavy: string;
    };
    glow: {
      small: string;
      medium: string;
      large: string;
    };
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
    accent: string;
  };
}

export const cyberTheme: CyberTheme = {
  colors: {
    background: {
      primary: '#0B0E1A',      // Deep dark blue-black (from crypto dashboard)
      secondary: '#1A1D29',    // Slightly lighter dark blue
      surface: '#252A3A',      // Card surface color (matching crypto cards)
      elevated: '#2D3348',     // Elevated elements
      glass: 'rgba(255, 255, 255, 0.03)', // Very subtle glassmorphism
      gradient: {
        primary: 'linear-gradient(135deg, #0B0E1A 0%, #1A1D29 50%, #252A3A 100%)',
        card: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        neon: 'linear-gradient(90deg, #00D4FF 0%, #00FF88 50%, #FF6B35 100%)',
      }
    },
    neon: {
      primary: '#00D4FF',      // Bright cyan (from crypto dashboard)
      secondary: '#00FF88',    // Bright green (matching Bitcoin color)
      tertiary: '#FF6B35',     // Orange accent (matching Solana)
      warning: '#FFB800',      // Golden yellow
      danger: '#FF4757',       // Bright red
      info: '#5352ED',         // Purple blue
      success: '#00FF88',      // Bright green
      purple: '#A55EEA',       // Purple accent (from cards)
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.03)',
      backgroundHover: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.06)',
      borderHover: 'rgba(255, 255, 255, 0.08)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      shadowHover: '0 16px 48px rgba(0, 0, 0, 0.5)',
    },
    text: {
      primary: '#FFFFFF',      // Pure white for main text
      secondary: '#B8BCC8',    // Light gray for secondary text
      muted: '#6B7280',        // Muted gray for less important text
      neon: '#00D4FF',         // Glowing cyan for highlights
      numbers: '#00FF88',      // Matrix green for numbers/stats
      inverse: '#0B0E1A',      // Dark background color
    },
    borders: {
      default: 'rgba(255, 255, 255, 0.08)',
      neon: 'rgba(0, 212, 255, 0.3)',
      success: 'rgba(0, 255, 136, 0.3)',
      warning: 'rgba(255, 184, 0, 0.3)',
      danger: 'rgba(255, 71, 87, 0.3)',
    },
  },
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      sharp: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
  effects: {
    blur: {
      light: 'blur(8px)',
      medium: 'blur(16px)',
      heavy: 'blur(24px)',
    },
    glow: {
      small: '0 0 10px currentColor',
      medium: '0 0 20px currentColor',
      large: '0 0 30px currentColor',
    },
  },
  fonts: {
    primary: "'Inter', system-ui, sans-serif",
    secondary: "'JetBrains Mono', 'Fira Code', monospace",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    accent: "'Orbitron', 'Inter', sans-serif",
  },
};

/**
 * CSS Custom Properties Generator
 * Generates CSS custom properties for the cybersecurity theme
 */
export const generateCyberThemeCSS = (theme: CyberTheme): string => {
  return `
    /* Cybersecurity Theme Variables */
    :root {
      /* Background Colors */
      --cyber-bg-primary: ${theme.colors.background.primary};
      --cyber-bg-secondary: ${theme.colors.background.secondary};
      --cyber-bg-surface: ${theme.colors.background.surface};
      --cyber-bg-elevated: ${theme.colors.background.elevated};
      --cyber-bg-glass: ${theme.colors.background.glass};
      
      /* Background Gradients */
      --cyber-gradient-primary: ${theme.colors.background.gradient.primary};
      --cyber-gradient-card: ${theme.colors.background.gradient.card};
      --cyber-gradient-neon: ${theme.colors.background.gradient.neon};
      
      /* Neon Colors */
      --cyber-neon-primary: ${theme.colors.neon.primary};
      --cyber-neon-secondary: ${theme.colors.neon.secondary};
      --cyber-neon-tertiary: ${theme.colors.neon.tertiary};
      --cyber-neon-warning: ${theme.colors.neon.warning};
      --cyber-neon-danger: ${theme.colors.neon.danger};
      --cyber-neon-info: ${theme.colors.neon.info};
      --cyber-neon-success: ${theme.colors.neon.success};
      --cyber-neon-purple: ${theme.colors.neon.purple};
      
      /* Glass Effects */
      --cyber-glass-bg: ${theme.colors.glass.background};
      --cyber-glass-bg-hover: ${theme.colors.glass.backgroundHover};
      --cyber-glass-border: ${theme.colors.glass.border};
      --cyber-glass-border-hover: ${theme.colors.glass.borderHover};
      --cyber-glass-shadow: ${theme.colors.glass.shadow};
      --cyber-glass-shadow-hover: ${theme.colors.glass.shadowHover};
      
      /* Text Colors */
      --cyber-text-primary: ${theme.colors.text.primary};
      --cyber-text-secondary: ${theme.colors.text.secondary};
      --cyber-text-muted: ${theme.colors.text.muted};
      --cyber-text-neon: ${theme.colors.text.neon};
      --cyber-text-numbers: ${theme.colors.text.numbers};
      --cyber-text-inverse: ${theme.colors.text.inverse};
      
      /* Border Colors */
      --cyber-border-default: ${theme.colors.borders.default};
      --cyber-border-neon: ${theme.colors.borders.neon};
      --cyber-border-success: ${theme.colors.borders.success};
      --cyber-border-warning: ${theme.colors.borders.warning};
      --cyber-border-danger: ${theme.colors.borders.danger};
      
      /* Animation Durations */
      --cyber-duration-fast: ${theme.animations.duration.fast}ms;
      --cyber-duration-normal: ${theme.animations.duration.normal}ms;
      --cyber-duration-slow: ${theme.animations.duration.slow}ms;
      
      /* Animation Easings */
      --cyber-easing-smooth: ${theme.animations.easing.smooth};
      --cyber-easing-bounce: ${theme.animations.easing.bounce};
      --cyber-easing-sharp: ${theme.animations.easing.sharp};
      
      /* Effects */
      --cyber-blur-light: ${theme.effects.blur.light};
      --cyber-blur-medium: ${theme.effects.blur.medium};
      --cyber-blur-heavy: ${theme.effects.blur.heavy};
      
      --cyber-glow-small: ${theme.effects.glow.small};
      --cyber-glow-medium: ${theme.effects.glow.medium};
      --cyber-glow-large: ${theme.effects.glow.large};
      
      /* Fonts */
      --cyber-font-primary: ${theme.fonts.primary};
      --cyber-font-secondary: ${theme.fonts.secondary};
      --cyber-font-mono: ${theme.fonts.mono};
      --cyber-font-accent: ${theme.fonts.accent};
    }
  `;
};

/**
 * Glassmorphism Utility Classes (Matching Crypto Dashboard Style)
 */
export const glassmorphismClasses = {
  base: 'backdrop-blur-[20px] saturate-[180%] bg-white/[0.03] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]',
  hover: 'hover:bg-white/[0.05] hover:border-white/[0.08]',
  card: 'backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl',
  cardCrypto: 'backdrop-blur-[16px] saturate-[150%] bg-gradient-to-br from-[#252A3A]/80 via-[#1A1D29]/90 to-[#0B0E1A]/95 border border-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03)] rounded-2xl',
  elevated: 'backdrop-blur-[25px] saturate-[200%] bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]',
  modal: 'backdrop-blur-[25px] saturate-[200%] bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-2xl',
  navigation: 'backdrop-blur-[20px] saturate-[180%] bg-white/[0.03] border-r border-white/[0.06]',
  neon: 'backdrop-blur-[20px] saturate-[180%] bg-gradient-to-br from-cyan-500/[0.08] to-emerald-500/[0.04] border border-cyan-400/20 shadow-[0_8px_32px_rgba(0,212,255,0.15),0_0_20px_rgba(0,212,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]',
};

/**
 * Neon Effect Utility Classes (Multi-Color Gradients)
 */
export const neonClasses = {
  glow: {
    primary: 'shadow-[0_0_20px_rgba(0,212,255,0.4)]',
    secondary: 'shadow-[0_0_20px_rgba(0,255,136,0.4)]',
    tertiary: 'shadow-[0_0_20px_rgba(255,107,53,0.4)]',
    warning: 'shadow-[0_0_20px_rgba(255,184,0,0.4)]',
    danger: 'shadow-[0_0_20px_rgba(255,71,87,0.4)]',
    info: 'shadow-[0_0_20px_rgba(83,82,237,0.4)]',
    purple: 'shadow-[0_0_20px_rgba(165,94,234,0.4)]',
    multiColor: 'shadow-[0_0_30px_rgba(0,212,255,0.2),0_0_60px_rgba(0,255,136,0.1)]',
  },
  border: {
    primary: 'border-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.5)]',
    secondary: 'border-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.5)]',
    tertiary: 'border-[#FF6B35] shadow-[0_0_10px_rgba(255,107,53,0.5)]',
    warning: 'border-[#FFB800] shadow-[0_0_10px_rgba(255,184,0,0.5)]',
    danger: 'border-[#FF4757] shadow-[0_0_10px_rgba(255,71,87,0.5)]',
    info: 'border-[#5352ED] shadow-[0_0_10px_rgba(83,82,237,0.5)]',
    purple: 'border-[#A55EEA] shadow-[0_0_10px_rgba(165,94,234,0.5)]',
    gradient: 'border-transparent bg-gradient-to-r from-[#00D4FF] via-[#00FF88] to-[#FF6B35] bg-clip-border shadow-[0_0_15px_rgba(0,212,255,0.3)]',
  },
  text: {
    primary: 'text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]',
    secondary: 'text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]',
    tertiary: 'text-[#FF6B35] drop-shadow-[0_0_8px_rgba(255,107,53,0.5)]',
    warning: 'text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]',
    danger: 'text-[#FF4757] drop-shadow-[0_0_8px_rgba(255,71,87,0.5)]',
    info: 'text-[#5352ED] drop-shadow-[0_0_8px_rgba(83,82,237,0.5)]',
    purple: 'text-[#A55EEA] drop-shadow-[0_0_8px_rgba(165,94,234,0.5)]',
    numbers: 'text-[#00FF88] drop-shadow-[0_0_12px_rgba(0,255,136,0.6)] font-bold',
    muted: 'text-gray-400 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]',
  },
  gradientBorder: {
    cyberCard: 'relative before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-[#00D4FF] before:via-[#00FF88] before:to-[#FF6B35] before:rounded-2xl before:content-[""] before:-z-10',
    animated: 'relative before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-[#00D4FF] before:via-[#00FF88] before:to-[#FF6B35] before:rounded-2xl before:content-[""] before:-z-10 before:animate-pulse',
  },
};

/**
 * RTL Configuration for Cybersecurity Theme (Persian Language Support)
 */
export interface RTLConfiguration {
  direction: 'rtl' | 'ltr';
  textAlign: 'right' | 'left';
  animations: {
    slideDirection: 'left' | 'right';
    expandDirection: 'left' | 'right';
    glowDirection: 'left' | 'right';
  };
  positioning: {
    marginAdjustments: Record<string, string>;
    paddingAdjustments: Record<string, string>;
    borderAdjustments: Record<string, string>;
  };
  fonts: {
    persian: string;
    fallback: string;
  };
  layout: {
    navigationSide: 'left' | 'right';
    iconPosition: 'left' | 'right';
    glowPosition: 'left' | 'right';
  };
}

export const rtlConfig: RTLConfiguration = {
  direction: 'rtl',
  textAlign: 'right',
  animations: {
    slideDirection: 'right',
    expandDirection: 'right',
    glowDirection: 'right',
  },
  positioning: {
    marginAdjustments: {
      'ml-1': 'mr-1', 'mr-1': 'ml-1',
      'ml-2': 'mr-2', 'mr-2': 'ml-2',
      'ml-3': 'mr-3', 'mr-3': 'ml-3',
      'ml-4': 'mr-4', 'mr-4': 'ml-4',
      'ml-6': 'mr-6', 'mr-6': 'ml-6',
      'ml-8': 'mr-8', 'mr-8': 'ml-8',
      'ml-auto': 'mr-auto', 'mr-auto': 'ml-auto',
    },
    paddingAdjustments: {
      'pl-1': 'pr-1', 'pr-1': 'pl-1',
      'pl-2': 'pr-2', 'pr-2': 'pl-2',
      'pl-3': 'pr-3', 'pr-3': 'pl-3',
      'pl-4': 'pr-4', 'pr-4': 'pl-4',
      'pl-6': 'pr-6', 'pr-6': 'pl-6',
      'pl-8': 'pr-8', 'pr-8': 'pl-8',
    },
    borderAdjustments: {
      'border-l': 'border-r', 'border-r': 'border-l',
      'border-l-2': 'border-r-2', 'border-r-2': 'border-l-2',
      'rounded-l': 'rounded-r', 'rounded-r': 'rounded-l',
      'rounded-tl': 'rounded-tr', 'rounded-tr': 'rounded-tl',
      'rounded-bl': 'rounded-br', 'rounded-br': 'rounded-bl',
    },
  },
  fonts: {
    persian: "'Vazirmatn', 'Tahoma', 'Arial Unicode MS', sans-serif",
    fallback: "'Inter', system-ui, sans-serif",
  },
  layout: {
    navigationSide: 'right',
    iconPosition: 'right',
    glowPosition: 'right',
  },
};

export const ltrConfig: RTLConfiguration = {
  direction: 'ltr',
  textAlign: 'left',
  animations: {
    slideDirection: 'left',
    expandDirection: 'left',
    glowDirection: 'left',
  },
  positioning: {
    marginAdjustments: {},
    paddingAdjustments: {},
    borderAdjustments: {},
  },
  fonts: {
    persian: "'Inter', system-ui, sans-serif",
    fallback: "'Inter', system-ui, sans-serif",
  },
  layout: {
    navigationSide: 'left',
    iconPosition: 'left',
    glowPosition: 'left',
  },
};