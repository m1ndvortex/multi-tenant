/**
 * Cybersecurity Theme System - Main Export
 * Comprehensive theming system with animations, RTL support, and performance optimization
 */

// Core theme exports
export * from './cybersecurity';
export * from './animations';
export * from './hooks';
export * from './rtl-animations';
export * from './animation-config';

// Animation components (commented out to avoid JSX compilation issues in theme files)
// export * from '../../components/animations/CyberAnimations';
// export * from '../../components/animations/PerformanceMonitor';

// Re-export commonly used items with aliases for convenience
export {
  performanceMonitor as animationPerformanceMonitor,
  rtlManager as animationRTLManager,
  cyberAnimations as cybersecurityAnimations,
} from './animations';

export {
  useAnimationConfig,
  useCyberHover,
  useNeonText,
  usePageTransition,
  useStaggerAnimation,
  useCyberLoading,
  useModalAnimation,
  useCardAnimation,
} from './hooks';

// Animation components exports (commented out to avoid JSX compilation issues)
// These should be imported directly from their respective files when needed
/*
export {
  AnimatedWrapper,
  CyberCard,
  NeonText,
  CyberButton,
  ScanningLine,
  MatrixText,
  GlitchText,
  HolographicBackground,
  StaggerContainer,
  CyberSpinner,
  PulseEffect,
  PageTransition,
  FloatingElement,
} from '../../components/animations/CyberAnimations';

export {
  PerformanceMonitor,
  PerformanceWarning,
  PerformanceStats,
} from '../../components/animations/PerformanceMonitor';
*/

export {
  getRTLAnimations,
  createRTLVariants,
  createRTLStagger,
} from './rtl-animations';

export {
  componentAnimations,
  getAnimationConfig,
  getOptimizedAnimations,
  createCustomAnimation,
  animationPresets,
} from './animation-config';

// Theme configuration
export interface CybersecurityThemeConfig {
  animations: {
    enabled: boolean;
    performanceLevel: 'high' | 'medium' | 'low';
    reducedMotion: boolean;
  };
  rtl: {
    enabled: boolean;
    language: 'fa' | 'en' | 'ar';
    direction: 'ltr' | 'rtl';
  };
  cybersecurity: {
    glowEffects: boolean;
    neonColors: boolean;
    glassmorphism: boolean;
    scanningLines: boolean;
  };
  performance: {
    monitoring: boolean;
    autoOptimization: boolean;
    frameRateTarget: number;
  };
}

export const defaultThemeConfig: CybersecurityThemeConfig = {
  animations: {
    enabled: true,
    performanceLevel: 'high',
    reducedMotion: false,
  },
  rtl: {
    enabled: true,
    language: 'en',
    direction: 'ltr',
  },
  cybersecurity: {
    glowEffects: true,
    neonColors: true,
    glassmorphism: true,
    scanningLines: true,
  },
  performance: {
    monitoring: true,
    autoOptimization: true,
    frameRateTarget: 60,
  },
};

// Utility functions
export const initializeCybersecurityTheme = (config?: Partial<CybersecurityThemeConfig>) => {
  const finalConfig = { ...defaultThemeConfig, ...config };
  
  // Initialize performance monitoring
  if (finalConfig.performance.monitoring) {
    console.log('🔒 Cybersecurity Theme: Performance monitoring enabled');
  }
  
  // Initialize RTL support
  if (finalConfig.rtl.enabled) {
    document.documentElement.dir = finalConfig.rtl.direction;
    document.documentElement.lang = finalConfig.rtl.language;
    console.log(`🔒 Cybersecurity Theme: RTL support enabled (${finalConfig.rtl.language})`);
  }
  
  // Initialize animations
  if (finalConfig.animations.enabled) {
    console.log(`🔒 Cybersecurity Theme: Animations enabled (${finalConfig.animations.performanceLevel} performance)`);
  }
  
  return finalConfig;
};

export const getCybersecurityThemeStatus = () => {
  // Import the instances from animations module
  const { performanceMonitor: perfMonitor, rtlManager: rtlMgr } = require('./animations');
  
  return {
    animations: {
      enabled: perfMonitor.shouldEnableAnimation(),
      frameRate: perfMonitor.getMetrics().frameRate,
      performanceLevel: perfMonitor.getPerformanceConfig().performanceLevel,
    },
    rtl: {
      enabled: rtlMgr.getConfig().isRTL,
      language: rtlMgr.getConfig().language,
      direction: rtlMgr.getConfig().textDirection,
    },
    performance: {
      metrics: perfMonitor.getMetrics(),
      config: perfMonitor.getPerformanceConfig(),
    },
  };
};

// Export performance monitor instance for global access
export { performanceMonitor, rtlManager } from './animations';