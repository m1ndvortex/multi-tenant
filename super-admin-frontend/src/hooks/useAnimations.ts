/**
 * Custom hook for managing Framer Motion animations with cybersecurity theme
 * Provides consistent animation patterns and RTL support
 */

import { useCallback, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  animationPresets, 
  cyberAnimations, 
  createRTLVariants, 
  createPageTransition,
  createHoverAnimation,
  createStaggerAnimation,
  transitions,
  type AnimationPresets 
} from '../lib/theme/animations';
import { Variants, MotionProps } from 'framer-motion';

export interface UseAnimationsReturn {
  // Core animation presets
  presets: AnimationPresets;
  
  // Cybersecurity-specific animations
  cyber: typeof cyberAnimations;
  
  // RTL-aware animations
  rtlVariants: ReturnType<typeof createRTLVariants>;
  
  // Utility functions
  createPageTransition: (customDirection?: number) => MotionProps;
  createHoverEffect: (scale?: number, glowColor?: string) => Variants;
  createStagger: (delay?: number, duration?: number) => Variants;
  
  // Common animation props
  pageProps: MotionProps;
  cardProps: MotionProps;
  buttonProps: MotionProps;
  modalProps: MotionProps;
  
  // Transition configurations
  transitions: typeof transitions;
  
  // Theme-aware utilities
  getGlowColor: (variant?: 'primary' | 'secondary' | 'warning' | 'danger' | 'info') => string;
  isReducedMotion: boolean;
}

export const useAnimations = (): UseAnimationsReturn => {
  const { isRTL, actualTheme, cyberThemeConfig } = useTheme();

  // Check for reduced motion preference
  const isReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // RTL-aware variants
  const rtlVariants = useMemo(() => createRTLVariants(isRTL), [isRTL]);

  // Get appropriate glow color based on theme and variant
  const getGlowColor = useCallback((variant: 'primary' | 'secondary' | 'warning' | 'danger' | 'info' = 'primary') => {
    if (actualTheme === 'cyber') {
      switch (variant) {
        case 'primary':
          return cyberThemeConfig.colors.neon.primary;
        case 'secondary':
          return cyberThemeConfig.colors.neon.secondary;
        case 'warning':
          return cyberThemeConfig.colors.neon.warning;
        case 'danger':
          return cyberThemeConfig.colors.neon.danger;
        case 'info':
          return cyberThemeConfig.colors.neon.info;
        default:
          return cyberThemeConfig.colors.neon.primary;
      }
    }
    
    // Fallback colors for light/dark themes
    switch (variant) {
      case 'primary':
        return 'rgba(34, 197, 94, 0.3)';
      case 'secondary':
        return 'rgba(59, 130, 246, 0.3)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.3)';
      case 'danger':
        return 'rgba(239, 68, 68, 0.3)';
      case 'info':
        return 'rgba(59, 130, 246, 0.3)';
      default:
        return 'rgba(34, 197, 94, 0.3)';
    }
  }, [actualTheme, cyberThemeConfig]);

  // Create page transition with RTL support
  const createPageTransitionWithRTL = useCallback((_customDirection?: number) => {
    if (isReducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.01 },
      };
    }
    
    return createPageTransition(isRTL);
  }, [isRTL, isReducedMotion]);

  // Create hover effect with theme-aware colors
  const createHoverEffectWithTheme = useCallback((
    scale: number = 1.05, 
    glowColor?: string
  ) => {
    if (isReducedMotion) {
      return {
        rest: {},
        hover: {},
        tap: {},
      };
    }
    
    const color = glowColor || getGlowColor('primary');
    return createHoverAnimation(scale, color);
  }, [getGlowColor, isReducedMotion]);

  // Create stagger animation with reduced motion support
  const createStaggerWithMotion = useCallback((delay: number = 0.1, duration: number = 0.3) => {
    if (isReducedMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.01 } },
      };
    }
    
    return createStaggerAnimation(delay, duration);
  }, [isReducedMotion]);

  // Common animation props with reduced motion support
  const commonProps = useMemo(() => {
    if (isReducedMotion) {
      return {
        pageProps: {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.01 },
        },
        cardProps: {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.01 },
        },
        buttonProps: {
          whileHover: {},
          whileTap: {},
        },
        modalProps: {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.01 },
        },
      };
    }

    return {
      pageProps: {
        variants: animationPresets.pageTransition,
        initial: "hidden",
        animate: "visible",
        exit: "exit",
      },
      cardProps: {
        variants: animationPresets.cardEntrance,
        initial: "hidden",
        animate: "visible",
        whileHover: "hover",
      },
      buttonProps: {
        variants: animationPresets.buttonHover,
        initial: "rest",
        whileHover: "hover",
        whileTap: "tap",
      },
      modalProps: {
        variants: animationPresets.modalOverlay,
        initial: "hidden",
        animate: "visible",
        exit: "exit",
      },
    };
  }, [isReducedMotion]);

  return {
    // Core presets
    presets: animationPresets,
    cyber: cyberAnimations,
    rtlVariants,
    
    // Utility functions
    createPageTransition: createPageTransitionWithRTL,
    createHoverEffect: createHoverEffectWithTheme,
    createStagger: createStaggerWithMotion,
    
    // Common props
    ...commonProps,
    
    // Transitions
    transitions,
    
    // Theme utilities
    getGlowColor,
    isReducedMotion,
  };
};

/**
 * Hook for creating component-specific animations
 */
export const useComponentAnimation = (
  componentType: 'card' | 'button' | 'modal' | 'navigation' | 'page' = 'card',
  options: {
    variant?: 'primary' | 'secondary' | 'warning' | 'danger' | 'info';
    scale?: number;
    delay?: number;
    duration?: number;
  } = {}
) => {
  const animations = useAnimations();
  const { variant = 'primary', scale = 1.05, delay = 0.1, duration = 0.3 } = options;

  return useMemo(() => {
    switch (componentType) {
      case 'card':
        return {
          ...animations.cardProps,
          whileHover: animations.createHoverEffect(scale, variant),
        };
      
      case 'button':
        return {
          ...animations.buttonProps,
          variants: animations.createHoverEffect(scale, variant),
        };
      
      case 'modal':
        return animations.modalProps;
      
      case 'navigation':
        return {
          variants: animations.presets.navigationItem,
          initial: "rest",
          whileHover: "hover",
          animate: "rest",
        };
      
      case 'page':
        return animations.pageProps;
      
      default:
        return animations.cardProps;
    }
  }, [animations, componentType, scale, variant, delay, duration]);
};

export default useAnimations;