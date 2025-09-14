/**
 * Cybersecurity Theme Context and Provider
 * Manages theme state, RTL support, and animation preferences
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { cyberTheme, generateCyberThemeCSS, rtlConfig, ltrConfig } from './cybersecurity';
import type { CyberTheme, RTLConfiguration } from './cybersecurity';

interface ThemeContextType {
  theme: CyberTheme;
  isRTL: boolean;
  language: 'en' | 'fa';
  animationsEnabled: boolean;
  reducedMotion: boolean;
  rtlConfig: RTLConfiguration;
  
  // Theme actions
  toggleRTL: () => void;
  setLanguage: (lang: 'en' | 'fa') => void;
  toggleAnimations: () => void;
  setReducedMotion: (reduced: boolean) => void;
  
  // Utility functions
  applyTheme: () => void;
  getDirectionClasses: () => string;
  getFontClasses: () => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultLanguage?: 'en' | 'fa';
  defaultAnimations?: boolean;
}

export function CyberThemeProvider({ 
  children, 
  defaultLanguage = 'en',
  defaultAnimations = true 
}: ThemeProviderProps) {
  const [language, setLanguageState] = useState<'en' | 'fa'>(defaultLanguage);
  const [animationsEnabled, setAnimationsEnabled] = useState(defaultAnimations);
  const [reducedMotion, setReducedMotionState] = useState(false);
  
  const isRTL = language === 'fa';
  const currentRtlConfig = isRTL ? rtlConfig : ltrConfig;

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotionState(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotionState(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme CSS variables
  const applyTheme = () => {
    const css = generateCyberThemeCSS(cyberTheme);
    
    // Remove existing theme style
    const existingStyle = document.getElementById('cyber-theme-vars');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Add new theme style
    const style = document.createElement('style');
    style.id = 'cyber-theme-vars';
    style.textContent = css;
    document.head.appendChild(style);
    
    // Set document direction and class
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Add cybersecurity theme class
    document.body.classList.add('cyber-theme');
    
    // Add reduced motion class if needed
    if (reducedMotion || !animationsEnabled) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  };

  // Apply theme on mount and when dependencies change
  useEffect(() => {
    applyTheme();
  }, [language, animationsEnabled, reducedMotion]);

  const toggleRTL = () => {
    setLanguageState(prev => prev === 'fa' ? 'en' : 'fa');
  };

  const setLanguage = (lang: 'en' | 'fa') => {
    setLanguageState(lang);
  };

  const toggleAnimations = () => {
    setAnimationsEnabled(prev => !prev);
  };

  const setReducedMotion = (reduced: boolean) => {
    setReducedMotionState(reduced);
  };

  const getDirectionClasses = () => {
    return isRTL ? 'rtl' : 'ltr';
  };

  const getFontClasses = () => {
    return isRTL ? 'font-persian' : 'font-sans';
  };

  const contextValue: ThemeContextType = {
    theme: cyberTheme,
    isRTL,
    language,
    animationsEnabled,
    reducedMotion,
    rtlConfig: currentRtlConfig,
    
    toggleRTL,
    setLanguage,
    toggleAnimations,
    setReducedMotion,
    
    applyTheme,
    getDirectionClasses,
    getFontClasses,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use cybersecurity theme context
 */
export function useCyberTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useCyberTheme must be used within a CyberThemeProvider');
  }
  return context;
}

/**
 * Hook for RTL-aware styling
 */
export function useRTL() {
  const { isRTL, rtlConfig, getDirectionClasses, getFontClasses } = useCyberTheme();
  
  const getRTLClass = (ltrClass: string, rtlClass?: string) => {
    if (!isRTL) return ltrClass;
    return rtlClass || rtlConfig.positioning.marginAdjustments[ltrClass] || ltrClass;
  };
  
  const getDirectionalStyle = (property: string, ltrValue: string, rtlValue?: string) => {
    return {
      [property]: isRTL ? (rtlValue || ltrValue) : ltrValue
    };
  };
  
  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'right' : 'left',
    getRTLClass,
    getDirectionalStyle,
    getDirectionClasses,
    getFontClasses,
  };
}

/**
 * Hook for animation preferences
 */
export function useAnimations() {
  const { animationsEnabled, reducedMotion, toggleAnimations } = useCyberTheme();
  
  const shouldAnimate = animationsEnabled && !reducedMotion;
  
  const getAnimationClass = (animationClass: string, fallbackClass?: string) => {
    return shouldAnimate ? animationClass : (fallbackClass || '');
  };
  
  const getTransitionDuration = (normal: string = '300ms', reduced: string = '0ms') => {
    return shouldAnimate ? normal : reduced;
  };
  
  return {
    shouldAnimate,
    animationsEnabled,
    reducedMotion,
    toggleAnimations,
    getAnimationClass,
    getTransitionDuration,
  };
}

/**
 * Hook for cybersecurity theme utilities
 */
export function useCyberUtils() {
  const { theme, isRTL } = useCyberTheme();
  
  const getCyberColor = (colorPath: string) => {
    const keys = colorPath.split('.');
    let value: any = theme.colors;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value || '#FFFFFF';
  };
  
  const getCyberGradient = (type: 'primary' | 'card' | 'neon') => {
    return theme.colors.background.gradient[type];
  };
  
  const getNeonShadow = (color: 'primary' | 'secondary' | 'tertiary' | 'warning' | 'danger') => {
    const colorMap = {
      primary: 'rgba(0, 212, 255, 0.4)',
      secondary: 'rgba(0, 255, 136, 0.4)',
      tertiary: 'rgba(255, 107, 53, 0.4)',
      warning: 'rgba(255, 184, 0, 0.4)',
      danger: 'rgba(255, 71, 87, 0.4)',
    };
    
    return `0 0 20px ${colorMap[color]}`;
  };
  
  return {
    getCyberColor,
    getCyberGradient,
    getNeonShadow,
    isRTL,
  };
}

export default CyberThemeProvider;