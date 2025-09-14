/**
 * Animation Configuration System
 * Central configuration for all cybersecurity-themed animations
 */

import { Variants } from 'framer-motion';
import { performanceMonitor, rtlManager } from './animations';
import { getRTLAnimations } from './rtl-animations';

/**
 * Animation Configuration Interface
 */
export interface AnimationConfig {
  enabled: boolean;
  performanceLevel: 'high' | 'medium' | 'low';
  reducedMotion: boolean;
  rtlSupport: boolean;
  cybersecurityTheme: boolean;
}

/**
 * Default Animation Configuration
 */
export const defaultAnimationConfig: AnimationConfig = {
  enabled: true,
  performanceLevel: 'high',
  reducedMotion: false,
  rtlSupport: true,
  cybersecurityTheme: true,
};

/**
 * Animation Presets for Different Components
 */
export const componentAnimations = {
  // Page-level animations
  page: {
    transition: {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.3, ease: "easeOut" }
      },
      exit: { 
        opacity: 0, 
        y: -20,
        transition: { duration: 0.2, ease: "easeIn" }
      }
    },
    
    stagger: {
      container: {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
          }
        }
      },
      item: {
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.3 }
        }
      }
    }
  },

  // Navigation animations
  navigation: {
    sidebar: {
      hidden: { x: '-100%', opacity: 0 },
      visible: { 
        x: 0, 
        opacity: 1,
        transition: { duration: 0.3, ease: "easeOut" }
      },
      exit: { 
        x: '-100%', 
        opacity: 0,
        transition: { duration: 0.2, ease: "easeIn" }
      }
    },
    
    item: {
      rest: { 
        x: 0, 
        scale: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)'
      },
      hover: { 
        x: 5, 
        scale: 1.02,
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        transition: { duration: 0.2 }
      },
      tap: { 
        scale: 0.98,
        transition: { duration: 0.1 }
      }
    },

    breadcrumb: {
      hidden: { opacity: 0, x: -20 },
      visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.1, duration: 0.3 }
      })
    }
  },

  // Card animations
  card: {
    entrance: {
      hidden: {
        opacity: 0,
        y: 30,
        scale: 0.95,
        rotateX: -15
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 20
        }
      },
      hover: {
        y: -8,
        scale: 1.02,
        rotateX: 5,
        boxShadow: '0 20px 40px rgba(0, 255, 255, 0.15)',
        transition: { duration: 0.2 }
      }
    },

    cybersecurity: {
      rest: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 0 0px transparent'
      },
      hover: {
        borderColor: 'rgba(0, 255, 255, 0.4)',
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
        transition: { duration: 0.2 }
      }
    }
  },

  // Button animations
  button: {
    primary: {
      rest: { 
        scale: 1,
        boxShadow: '0 0 0px transparent'
      },
      hover: {
        scale: 1.05,
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
        transition: { duration: 0.2 }
      },
      tap: {
        scale: 0.98,
        transition: { duration: 0.1 }
      }
    },

    secondary: {
      rest: { 
        scale: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)'
      },
      hover: {
        scale: 1.02,
        borderColor: 'rgba(0, 255, 136, 0.6)',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        transition: { duration: 0.2 }
      },
      tap: {
        scale: 0.98,
        transition: { duration: 0.1 }
      }
    }
  },

  // Form animations
  form: {
    field: {
      rest: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0 0 0px transparent'
      },
      focus: {
        borderColor: 'rgba(0, 255, 255, 0.6)',
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)',
        transition: { duration: 0.2 }
      }
    },

    label: {
      rest: {
        y: 0,
        scale: 1,
        color: 'rgba(255, 255, 255, 0.6)'
      },
      focus: {
        y: -20,
        scale: 0.85,
        color: 'rgba(0, 255, 255, 1)',
        transition: { duration: 0.2 }
      }
    },

    error: {
      hidden: { opacity: 0, height: 0, y: -10 },
      visible: { 
        opacity: 1, 
        height: 'auto', 
        y: 0,
        transition: { duration: 0.3 }
      }
    }
  },

  // Modal animations
  modal: {
    overlay: {
      hidden: {
        opacity: 0,
        backdropFilter: 'blur(0px)'
      },
      visible: {
        opacity: 1,
        backdropFilter: 'blur(20px)',
        transition: { duration: 0.3 }
      }
    },

    content: {
      hidden: {
        opacity: 0,
        scale: 0.8,
        y: 50
      },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 20
        }
      }
    }
  },

  // Table animations
  table: {
    row: {
      hidden: { opacity: 0, x: -20 },
      visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.05, duration: 0.3 }
      }),
      hover: {
        backgroundColor: 'rgba(0, 255, 255, 0.05)',
        x: 2,
        transition: { duration: 0.2 }
      }
    },

    header: {
      rest: { color: 'rgba(255, 255, 255, 0.8)' },
      hover: {
        color: 'rgba(0, 255, 255, 1)',
        transition: { duration: 0.2 }
      }
    }
  },

  // Loading animations
  loading: {
    spinner: {
      animate: {
        rotate: 360,
        transition: {
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }
      }
    },

    dots: {
      animate: {
        scale: [1, 1.3, 1],
        opacity: [0.4, 1, 0.4],
        transition: {
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    },

    pulse: {
      animate: {
        boxShadow: [
          '0 0 0px rgba(0, 255, 255, 0.4)',
          '0 0 20px rgba(0, 255, 255, 0.8)',
          '0 0 0px rgba(0, 255, 255, 0.4)'
        ],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    }
  },

  // Cybersecurity-specific animations
  cybersecurity: {
    neonGlow: {
      animate: {
        textShadow: [
          '0 0 5px #00D4FF',
          '0 0 20px #00FF88, 0 0 30px #00D4FF',
          '0 0 40px #FF6B35, 0 0 50px #00FF88',
          '0 0 20px #00FF88, 0 0 30px #00D4FF',
          '0 0 5px #00D4FF'
        ],
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    },

    scanLine: {
      animate: {
        y: ['-100%', '100%'],
        opacity: [0, 0.8, 1, 0.8, 0],
        transition: {
          duration: 2.5,
          repeat: Infinity,
          ease: "linear"
        }
      }
    },

    glitch: {
      animate: {
        x: [0, -3, 3, -1, 1, 0],
        textShadow: [
          '0 0 0px currentColor',
          '3px 0 0px #ff0066, -3px 0 0px #00ffff',
          '-2px 0 0px #ff0066, 2px 0 0px #00ff88',
          '0 0 0px currentColor'
        ],
        transition: {
          duration: 0.4,
          repeat: Infinity,
          repeatDelay: 4
        }
      }
    },

    matrixReveal: {
      hidden: {
        opacity: 0,
        y: 20,
        filter: 'blur(10px)',
        textShadow: '0 0 0px rgba(0, 255, 136, 0)'
      },
      visible: (i: number) => ({
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        textShadow: '0 0 10px rgba(0, 255, 136, 0.8)',
        transition: {
          delay: i * 0.1,
          duration: 0.6,
          ease: "easeOut"
        }
      })
    },

    holographic: {
      animate: {
        background: [
          'linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)',
          'linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(255,107,53,0.1) 50%, rgba(165,94,234,0.1) 100%)',
          'linear-gradient(225deg, rgba(255,107,53,0.1) 0%, rgba(165,94,234,0.1) 50%, rgba(0,212,255,0.1) 100%)',
          'linear-gradient(315deg, rgba(165,94,234,0.1) 0%, rgba(0,212,255,0.1) 50%, rgba(0,255,136,0.1) 100%)',
          'linear-gradient(45deg, rgba(0,212,255,0.1) 0%, rgba(0,255,136,0.1) 50%, rgba(255,107,53,0.1) 100%)'
        ],
        transition: {
          duration: 5,
          repeat: Infinity,
          ease: "linear"
        }
      }
    }
  }
};

/**
 * Get animation configuration based on performance and settings
 */
export const getAnimationConfig = (): AnimationConfig => {
  const performanceConfig = performanceMonitor.getPerformanceConfig();
  const rtlConfig = rtlManager.getConfig();

  return {
    enabled: performanceConfig.enableAnimations,
    performanceLevel: performanceConfig.performanceLevel,
    reducedMotion: performanceConfig.reducedMotion,
    rtlSupport: rtlConfig.isRTL,
    cybersecurityTheme: true,
  };
};

/**
 * Get optimized animation variants based on current configuration
 */
export const getOptimizedAnimations = (componentType: string, variantName: string): Variants => {
  const config = getAnimationConfig();
  const shouldAnimate = performanceMonitor.shouldEnableAnimation();

  // Return empty variants if animations are disabled
  if (!config.enabled || config.reducedMotion || !shouldAnimate) {
    return {};
  }

  // Get base animation
  const component = (componentAnimations as any)[componentType];
  if (!component || !component[variantName]) {
    console.warn(`Animation not found: ${componentType}.${variantName}`);
    return {};
  }

  let animation = component[variantName];

  // Apply RTL modifications if needed
  if (config.rtlSupport) {
    const rtlAnimations = getRTLAnimations();
    // Check if RTL variant exists and merge
    if (componentType in rtlAnimations) {
      const rtlVariant = (rtlAnimations as any)[componentType][variantName];
      if (rtlVariant) {
        animation = { ...animation, ...rtlVariant };
      }
    }
  }

  // Apply performance optimizations
  if (config.performanceLevel === 'low') {
    animation = optimizeForLowPerformance(animation);
  } else if (config.performanceLevel === 'medium') {
    animation = optimizeForMediumPerformance(animation);
  }

  return animation;
};

/**
 * Optimize animations for low performance devices
 */
const optimizeForLowPerformance = (animation: any): any => {
  const optimized = { ...animation };

  // Reduce animation duration
  if (optimized.transition) {
    optimized.transition.duration = (optimized.transition.duration || 0.3) * 0.5;
  }

  // Remove complex effects
  if (optimized.boxShadow) {
    delete optimized.boxShadow;
  }
  if (optimized.filter) {
    delete optimized.filter;
  }
  if (optimized.backdropFilter) {
    delete optimized.backdropFilter;
  }

  return optimized;
};

/**
 * Optimize animations for medium performance devices
 */
const optimizeForMediumPerformance = (animation: any): any => {
  const optimized = { ...animation };

  // Slightly reduce animation duration
  if (optimized.transition) {
    optimized.transition.duration = (optimized.transition.duration || 0.3) * 0.75;
  }

  // Reduce complex shadow effects
  if (optimized.boxShadow && Array.isArray(optimized.boxShadow)) {
    optimized.boxShadow = optimized.boxShadow.slice(0, 2); // Keep only first 2 shadows
  }

  return optimized;
};

/**
 * Create custom animation variants
 */
export const createCustomAnimation = (
  baseAnimation: string,
  customizations: Partial<Variants>
): Variants => {
  const [componentType, variantName] = baseAnimation.split('.');
  const baseVariants = getOptimizedAnimations(componentType, variantName);
  
  return {
    ...baseVariants,
    ...customizations,
  } as Variants;
};

/**
 * Animation presets for common use cases
 */
export const animationPresets = {
  // Quick fade in
  quickFadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } }
  },

  // Slide up
  slideUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  },

  // Scale in
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
  },

  // Cyber entrance
  cyberEntrance: {
    hidden: { 
      opacity: 0, 
      y: 20, 
      filter: 'blur(10px)',
      textShadow: '0 0 0px rgba(0, 255, 255, 0)'
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      textShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
      transition: { duration: 0.5 }
    }
  }
};

export default {
  componentAnimations,
  getAnimationConfig,
  getOptimizedAnimations,
  createCustomAnimation,
  animationPresets,
};